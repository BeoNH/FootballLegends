import {
    BoxCollider2D, CircleCollider2D, Collider2D, ERigidBody2DType, Node, PhysicsSystem2D, PolygonCollider2D, RigidBody2D, Vec2,
} from 'cc';
import { UIKit } from '../app/UIKit';
import {
    cx, cy, FLOOR_POLYS, G_BALL, G_GOAL, G_GROUND, G_HEAD, G_PBODY, GOAL_SENSORS, GROUND_POLYS, HALF_H, HALF_W, LINEAR_DAMPING,
    PHYS_TIME_COEF, Pt, PTM, TAG, WORLD_GRAVITY_PX,
} from './GameConsts';

/**
 * Wrapper RigidBody2D: toàn bộ API dùng toạ độ/vận tốc kiểu Phaser (px, y xuống)
 * để logic gameplay port từ nape giữ nguyên dấu. Tự đổi sang Box2D (m/s, y lên).
 */
export class PhysBody {
    readonly node: Node;
    readonly rb: RigidBody2D;
    /** Vec2 riêng của body (RigidBody2D.linearVelocity giữ reference, nên không dùng chung scratch). */
    private readonly _v = new Vec2();

    constructor(parent: Node, name: string, type: ERigidBody2DType, o: { gravityScale?: number; damping?: number; fixedRotation?: boolean; listen?: boolean } = {}) {
        this.node = UIKit.node(parent, name);
        const rb = this.node.addComponent(RigidBody2D);
        rb.type = type;
        rb.enabledContactListener = !!o.listen; // phải đặt TRƯỚC khi thêm collider (đăng ký fixture)
        if (type === ERigidBody2DType.Dynamic) {
            rb.gravityScale = o.gravityScale != null ? o.gravityScale : 1;
            rb.linearDamping = o.damping != null ? o.damping : LINEAR_DAMPING;
            rb.angularDamping = LINEAR_DAMPING;
            rb.fixedRotation = !!o.fixedRotation;
            rb.allowSleep = false;
        }
        this.rb = rb;
    }

    get px(): number { return this.node.position.x + HALF_W; }
    get py(): number { return HALF_H - this.node.position.y; }

    /** Vận tốc Phaser px/s (y xuống). */
    get vx(): number { return this.rb.linearVelocity.x * PTM; }
    get vy(): number { return -this.rb.linearVelocity.y * PTM; }

    setVel(vxPhaser: number, vyPhaser: number): void {
        this._v.set(vxPhaser / PTM, -vyPhaser / PTM);
        this.rb.linearVelocity = this._v;
    }

    /** Vận tốc góc nape (rad/s, chiều kim đồng hồ) -> Box2D (CCW). */
    set angVel(wNape: number) { this.rb.angularVelocity = -wNape; }

    /** Dịch chuyển tức thời (Phaser px) + ép đồng bộ sang Box2D (không phụ thuộc cờ dirty của node). */
    setPos(pxPhaser: number, pyPhaser: number): void {
        this.node.setPosition(cx(pxPhaser), cy(pyPhaser), 0);
        const impl: any = this.rb.impl;
        if (impl && impl.syncPositionToPhysics) impl.syncPositionToPhysics();
    }

    setAngleDeg(deg: number): void {
        this.node.angle = deg;
        const impl: any = this.rb.impl;
        if (impl && impl.syncRotationToPhysics) impl.syncRotationToPhysics();
    }

    get angleDeg(): number { return this.node.angle; }
}

export interface ColOpts {
    group: number; tag: number; sensor?: boolean; friction?: number; restitution?: number; density?: number;
    /** gắn owner để callback tra ngược. */
    owner?: any;
}

function setupCol<T extends Collider2D>(c: T, o: ColOpts): T {
    c.group = o.group;
    c.tag = o.tag;
    c.sensor = !!o.sensor;
    c.friction = o.friction != null ? o.friction : 0;
    c.restitution = o.restitution != null ? o.restitution : 0;
    c.density = o.density != null ? o.density : 1;
    (c as any).flOwner = o.owner;
    return c;
}

/** Danh sách điểm Phaser -> điểm Cocos (CCW). Dùng cho PolygonCollider2D. */
export function toCocosPoly(pts: Pt[], dx = 0, dy = 0): Vec2[] {
    const out = pts.map((p) => new Vec2(p[0] + dx, -(p[1] + dy)));
    let area = 0;
    for (let i = 0; i < out.length; i++) {
        const a = out[i], b = out[(i + 1) % out.length];
        area += a.x * b.y - b.x * a.y;
    }
    if (area < 0) out.reverse();
    return out;
}

export function addPolygon(body: PhysBody, ptsCocos: Vec2[], o: ColOpts): PolygonCollider2D {
    const c = body.node.addComponent(PolygonCollider2D);
    setupCol(c, o);
    c.points = ptsCocos;
    c.apply();
    return c;
}

export function addCircle(body: PhysBody, r: number, ox: number, oy: number, o: ColOpts): CircleCollider2D {
    const c = body.node.addComponent(CircleCollider2D);
    setupCol(c, o);
    c.radius = r;
    c.offset = new Vec2(ox, oy);
    c.apply();
    return c;
}

export function addBox(body: PhysBody, w: number, h: number, ox: number, oy: number, o: ColOpts): BoxCollider2D {
    const c = body.node.addComponent(BoxCollider2D);
    setupCol(c, o);
    c.size.set(w, h);
    c.offset = new Vec2(ox, oy);
    c.apply();
    return c;
}

/**
 * Thế giới vật lý của trận (port NapePhysics). Quản lý:
 *  - cấu hình PhysicsSystem2D (autoSimulation tắt, gravity, collision matrix),
 *  - hình học tĩnh (SPEC §2.2),
 *  - tick: syncSceneToPhysics -> step(0.9*t) -> syncPhysicsToScene.
 */
export class FLPhysics {
    /** Node gốc vật lý: KHÔNG scale (collider co theo world scale), đặt ở tâm màn. */
    readonly root: Node;
    private savedAuto = true;
    private savedEnable = true;
    private groundSurfaces: Pt[][] = [];
    private disposed = false;

    constructor(root: Node) {
        this.root = root;
        this.setupSystem();
        this.buildGeometry();
    }

    private setupSystem(): void {
        const ps = PhysicsSystem2D.instance;
        this.savedAuto = ps.autoSimulation;
        this.savedEnable = ps.enable;
        ps.enable = true;
        ps.autoSimulation = false; // tự quản vòng lặp fixed-step
        ps.debugDrawFlags = 0;
        ps.gravity = new Vec2(0, -WORLD_GRAVITY_PX); // setter nhận px/s^2, nội bộ chia 32 -> (0, -450/32) m/s^2
        ps.resetAccumulator(0);
        // Ma trận va chạm (Box2D: va nhau khi (maskA & catB) && (maskB & catA)).
        const m = ps.collisionMatrix as any;
        m[G_GROUND] = G_BALL | G_PBODY;
        m[G_BALL] = G_GROUND | G_HEAD | G_GOAL;
        m[G_PBODY] = G_GROUND;
        m[G_HEAD] = G_BALL;
        m[G_GOAL] = G_BALL;
    }

    private buildGeometry(): void {
        const stat = new PhysBody(this.root, 'Static', ERigidBody2DType.Static, { listen: false });
        const add = (polys: Pt[][], tag: number) => {
            for (const p of polys) {
                addPolygon(stat, toCocosPoly(p, -HALF_W, -HALF_H), { group: G_GROUND, tag });
                this.groundSurfaces.push(p);
            }
        };
        // toCocosPoly: out = (x+dx, -(y+dy)); dx=-400, dy=-240 => (x-400, 240-y)
        add(FLOOR_POLYS, TAG.FLOOR);
        add(GROUND_POLYS, TAG.GROUND);
        for (const s of GOAL_SENSORS) {
            const pts: Pt[] = [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]];
            addPolygon(stat, toCocosPoly(pts, -HALF_W, -HALF_H), { group: G_GOAL, tag: s.id < 0 ? TAG.GOAL_L : TAG.GOAL_R, sensor: true });
        }
    }

    /** Một tick vật lý: t = STEP*timeScale (đã nhân), step thực = 0.9*t. */
    update(t: number): void {
        if (this.disposed) return;
        const ps = PhysicsSystem2D.instance;
        const world = ps.physicsWorld;
        world.syncSceneToPhysics();
        ps.step(PHYS_TIME_COEF * t);
        world.syncPhysicsToScene();
    }

    /**
     * Bắn tia thẳng xuống từ (px, py) Phaser, trả y Phaser của mặt rắn gần nhất bên dưới
     * (thay cho Space.rayCast của nape; hình học tĩnh nên tính thẳng, không cần raycast engine).
     * Trả -1 nếu không trúng.
     */
    groundY(px: number, py: number): number {
        let best = 1e9;
        for (const poly of this.groundSurfaces) {
            const n = poly.length;
            for (let i = 0; i < n; i++) {
                const a = poly[i], b = poly[(i + 1) % n];
                if (a[0] === b[0]) continue;
                const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
                if (px < lo || px > hi) continue;
                const y = a[1] + (b[1] - a[1]) * (px - a[0]) / (b[0] - a[0]);
                if (y >= py - 0.5 && y < best) best = y;
            }
        }
        return best > 1e8 ? -1 : best;
    }

    /** Khôi phục cấu hình hệ thống khi rời màn. */
    release(): void {
        if (this.disposed) return;
        this.disposed = true;
        const ps = PhysicsSystem2D.instance;
        ps.autoSimulation = this.savedAuto;
        ps.enable = this.savedEnable;
        const m = ps.collisionMatrix as any;
        for (const g of [G_GROUND, G_BALL, G_PBODY, G_HEAD, G_GOAL]) m[g] = 0;
    }
}
