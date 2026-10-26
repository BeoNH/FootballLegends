import { Collider2D, Contact2DType, ERigidBody2DType, Node, Sprite } from 'cc';
import { Sfx } from '../app/Sfx';
import { UIKit } from '../app/UIKit';
import {
    BALL_BOUNCE_HEAD, BALL_BOUNCE_Y, BALL_FIRE_FPS, BALL_FIRE_FRAMES, BALL_FIRE_OFFSET_X, BALL_FIRE_SCALE, BALL_GRAVITY_SCALE, BALL_RADIUS,
    BALL_RESTITUTION, BALL_SHOT_X, BALL_SHOT_Y, cx, cy, G_BALL, HALF_H, HALF_W, SUPER_SHOT_KOEF, SUPER_SPLASH_FRAMES, SUPER_SPLASH_SCALE, TAG,
} from './GameConsts';
import { FrameAnim } from './FrameAnim';
import { IGameContext } from './GameTypes';
import { addCircle, PhysBody } from './Physics';
import type { PlayerObject } from './PlayerObject';

/** Số hạt trail tối đa (Phaser: emitter 100 hạt; 1 hạt/tick nên 48 là đủ cho life 1s ở 40Hz). */
const TRAIL_MAX = 48;
const TRAIL_LIFE = 1.0;

interface Particle { node: Node; age: number; alive: boolean; }

/**
 * Bóng (port BallObject, SPEC §3.4). Vật lý Box2D: chỉ trọng lực/tường/xà; mọi cú nảy
 * (sàn, mặt ngang, đầu) và cú sút đều gán thẳng vận tốc như bản nape.
 */
export class BallObject {
    readonly body: PhysBody;
    readonly graphic: Node;
    private ball1: Sprite;
    /** Bóng lửa (super): sprite BallGraphic0001 + đuôi lửa ball_fire (FrameAnim lặp) ở (-30,0) scale 1.5. */
    private ball2: Sprite;
    private fire: FrameAnim;
    private shadow: Sprite;
    private splash: FrameAnim;
    private trail: Particle[] = [];
    private trailOn = false;
    private trailIdx = 0;

    state = 'ground';
    /** Cờ bóng lửa (P3: fireball). Khi true Player.bounceHead/shoot bị khoá, chạm đất kết thúc super. */
    superHit = false;

    constructor(private ctx: IGameContext) {
        const L = ctx.layers;
        // ---- vật lý ----
        this.body = new PhysBody(L.physRoot, 'Ball', ERigidBody2DType.Dynamic, { gravityScale: BALL_GRAVITY_SCALE, listen: true });
        const col = addCircle(this.body, BALL_RADIUS, 0, 0, { group: G_BALL, tag: TAG.BALL, friction: 0, restitution: BALL_RESTITUTION, owner: this });
        col.on(Contact2DType.BEGIN_CONTACT, this.onBegin, this);

        // ---- đồ hoạ ----
        this.graphic = UIKit.node(L.ball, 'BallGfx');
        this.ball1 = UIKit.sprite(this.graphic, 'BallGraphic0000');
        this.ball2 = UIKit.sprite(this.graphic, 'BallGraphic0001');
        this.ball2.node.active = false;
        // đuôi lửa là con của graphic (quay theo hướng bay), nằm sau sprite bóng 0001 như bản gốc (child thêm sau => vẽ trên)
        this.fire = new FrameAnim(this.graphic, BALL_FIRE_SCALE);
        this.fire.node.setPosition(BALL_FIRE_OFFSET_X, 0, 0);
        this.shadow = UIKit.sprite(L.shadows, 'ShadowMC0000');
        this.splash = new FrameAnim(L.effects, 0.72);
        for (let i = 0; i < TRAIL_MAX; i++) {
            const sp = UIKit.sprite(L.effects, 'particleStar0000');
            sp.node.active = false;
            this.trail.push({ node: sp.node, age: 0, alive: false });
        }
        this.restart();
    }

    // ---------------- contact (gọi trong lúc Box2D step) ----------------
    private onBegin(self: Collider2D, other: Collider2D, contact: any): void {
        switch (other.tag) {
            case TAG.FLOOR:
                this.onFloorCollision();
                break;
            case TAG.GROUND: {
                // nape: bounce chỉ khi normal.angle == ±π/2 (mặt ngang). Box2D: |nx| ~ 0.
                let vertical = false;
                if (contact) {
                    const wm = contact.getWorldManifold();
                    vertical = Math.abs(wm.normal.x) < 1e-3;
                }
                this.onGroundCollision(this.ctx.goalLatched, vertical);
                break;
            }
            case TAG.GOAL_L:
                this.ctx.reportGoal(-1);
                break;
            case TAG.GOAL_R:
                this.ctx.reportGoal(1);
                break;
            case TAG.HEAD: {
                const owner = (other as any).flOwner as PlayerObject;
                if (owner) {
                    const can = owner.ballCollision(); // phải gọi trước (có side effect), giống nape
                    this.bounceHead(owner.direction, can);
                }
                break;
            }
        }
    }

    // ---------------- hành vi (SPEC §3.4) ----------------
    isShooting(): number {
        return this.state === 'shoot' ? (this.body.vx > 0 ? 1 : -1) : 0;
    }

    /** dir: +1 sút sang phải, -1 sang trái. */
    shoot(dir: number, superShot = false): void {
        let k = 1;
        if (superShot) {
            k = SUPER_SHOT_KOEF;
            this.superHit = true;
            this.gotoAndStop(2);
        } else {
            Sfx.play('b_shot');
        }
        this.body.setVel(dir * BALL_SHOT_X * k, BALL_SHOT_Y);
        const sc = this.superHit ? SUPER_SPLASH_SCALE : 0.72;
        this.splash.play(this.superHit ? 'SuperBallSplashMC' : 'BallSplashMC', this.superHit ? SUPER_SPLASH_FRAMES : 4, 30, false, this.body.node.position.x, this.body.node.position.y);
        this.splash.node.setScale(sc, sc, 1);
        this.setState('shoot');
    }

    private gotoAndStop(f: number): void {
        this.ball1.node.active = f === 1;
        this.ball2.node.active = f !== 1;
        if (f === 1) this.fire.stop();
        else if (!this.fire.node.active) this.fire.play('ball_fire', BALL_FIRE_FRAMES, BALL_FIRE_FPS, true);
    }

    setState(s = ''): void {
        if (s !== '') this.state = s;
        if (this.state === 'shoot') {
            this.trailOn = true;
            if (!this.superHit) this.graphic.setScale(1.2, 0.8, 1);
            else this.gotoAndStop(2);
        } else {
            this.trailOn = false;
            this.graphic.setScale(1, 1, 1);
            if (this.superHit) this.gotoAndStop(1);
        }
    }

    /** Kết thúc cú super khi chạm sàn/mặt ngang: hết cờ lửa, trả game speed. */
    checkSuperHit(): void {
        if (this.superHit) {
            this.superHit = false;
            this.gotoAndStop(1);
            this.ctx.slow(0);
        }
    }

    onFloorCollision(): void {
        this.setState('ground');
        Sfx.play('b_bounce');
        this.checkSuperHit();
        this.doBounce();
    }

    onGroundCollision(isGoal: boolean, verticalNormal: boolean): void {
        this.setState('ground');
        Sfx.play('b_bounce');
        this.checkSuperHit();
        if (isGoal) {
            this.body.setVel(this.body.vx * 0.3, this.body.vy * 0.3);
        } else if (verticalNormal) {
            this.doBounce();
        }
    }

    /** Nảy cố định: vy = -470 (không phụ thuộc tốc độ rơi), vx *= 0.6, spin = -2*atan(vy/vx). */
    doBounce(): void {
        const vx = this.body.vx, vy = this.body.vy;
        let t = Math.atan(vy / vx);
        if (isNaN(t) || t === -Math.PI / 2) this.body.angVel = 0;
        else this.body.angVel = -2 * t;
        this.body.setVel(vx * 0.6, BALL_BOUNCE_Y);
    }

    bounceHead(headDir: number, canBounce: boolean): void {
        if (canBounce && !this.superHit) {
            Sfx.play('b_bounce');
            this.body.setVel(BALL_BOUNCE_HEAD * -headDir, BALL_BOUNCE_Y);
            this.setState('head');
        }
    }

    getX(): number { return this.body.px; }
    getY(): number { return this.body.py; }

    restart(): void {
        this.superHit = false;
        this.gotoAndStop(1);
        this.splash.stop();
        this.body.setPos(HALF_W, HALF_H);
        this.body.setVel(0, 0);
        this.body.angVel = 0;
        this.body.setAngleDeg(0);
        this.setState('ground');
        this.trailOn = false;
        for (const p of this.trail) { p.alive = false; p.node.active = false; }
        this.updateGraphic();
        this.updateRay();
    }

    stopVelocity(): void {
        this.body.setVel(0, 0);
    }

    /** Bóng bị gán vận tốc (tickle) - dùng cho bóng lửa kéo người (P3). */
    get vx(): number { return this.body.vx; }
    get vy(): number { return this.body.vy; }

    // ---------------- cập nhật ----------------
    /** Mỗi tick logic (t đã nhân timeScale). */
    update(t: number): void {
        this.updateRay();
        if (this.state === 'shoot') {
            // rotation = velocity.angle; Cocos y lên nên góc = atan2(-vyPhaser, vx).
            const deg = Math.atan2(-this.body.vy, this.body.vx) * 180 / Math.PI;
            this.body.angVel = 0;
            this.body.setAngleDeg(deg);
            this.emitTrail();
        }
    }

    private emitTrail(): void {
        if (!this.trailOn) return;
        const p = this.trail[this.trailIdx];
        this.trailIdx = (this.trailIdx + 1) % TRAIL_MAX;
        p.age = 0; p.alive = true;
        // Phaser: emitX = x + 30 - round(45*rand), emitY = y + 14 - round(21*rand)
        const x = this.body.px + 30 - Math.round(45 * Math.random());
        const y = this.body.py + 14 - Math.round(21 * Math.random());
        p.node.setPosition(cx(x), cy(y), 0);
        p.node.setScale(0.8, 0.8, 1);
        UIKit.fade(p.node, 1);
        p.node.active = true;
    }

    /** Shadow: tia thẳng xuống tới mặt rắn; alpha = max(0, 1 - dist/400). */
    private updateRay(): void {
        const x = this.body.px, y = this.body.py;
        const gy = this.ctx.physics.groundY(x, y);
        if (gy < 0) return;
        this.shadow.node.setPosition(cx(x), cy(gy), 0);
        UIKit.fade(this.shadow.node, Math.max(0, 1 - (gy - y) / 400));
    }

    private updateGraphic(): void {
        const p = this.body.node.position;
        this.graphic.setPosition(p.x, p.y, 0);
        this.graphic.angle = this.body.angleDeg;
    }

    /** Mỗi khung hình (render): đồng bộ node đồ hoạ + animation hiệu ứng (thời gian thực). */
    updateGraphics(dt: number): void {
        this.updateGraphic();
        this.splash.tick(dt);
        this.fire.tick(dt);
        for (const p of this.trail) {
            if (!p.alive) continue;
            p.age += dt;
            if (p.age >= TRAIL_LIFE) { p.alive = false; p.node.active = false; continue; }
            const k = 1 - p.age / TRAIL_LIFE;
            UIKit.fade(p.node, k);
            p.node.setScale(0.8 * k, 0.8 * k, 1);
        }
    }

    release(): void {
        // Node bị huỷ cùng screen root; không giữ tham chiếu.
    }
}
