import { Collider2D, Contact2DType, ERigidBody2DType, Sprite } from 'cc';
import { Sfx } from '../app/Sfx';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { UIKit } from '../app/UIKit';
import {
    BOTS_FAST_THRESHOLD, cx, cy, FRICTION_MU, G_HEAD, G_PBODY, HALF_W, INDENT, PHYS_TIME_COEF, PLAYER_BODY_BOTTOM, PLAYER_BODY_TOP,
    PLAYER_FLOOR_BOTTOM, PLAYER_FLOOR_TOP, PLAYER_G_EFF, PLAYER_GRAVITY_SCALE, PLAYER_HEAD_R, PLAYER_HEAD_Y, PLAYER_JUMP_Y, PLAYER_MOVE,
    PLAYER_SPAWN_Y, SHOOT_DISTANCE_X, SHOOT_DISTANCE_Y, STEP, SUPER_SHOT_PTS, SUPER_SHOT_FALLBACK, T_KOEF, TAG,
    TELEPORT_DIST, TELEPORT_FRAMES, TELEPORT_TWEEN, TELEPORT_X_MAX, TELEPORT_X_MIN,
} from './GameConsts';
import { BaseController, PlayerController, PlayerController2, PlayerControllerGeneral } from './Controllers';
import { IController, IGameContext, IPlayerView } from './GameTypes';
import { EnergyBar } from './Hud';
import { FrameAnim } from './FrameAnim';
import { addBox, addCircle, addPolygon, PhysBody, toCocosPoly } from './Physics';
import { createPlayerView } from './PlayerView';
import type { BallObject } from './BallObject';

const SHADOWS = ['ShadowMC0000', 'ShadowMC_or0000', 'ShadowMC_pi0000'];

/**
 * Cầu thủ (port PlayerObject, SPEC §3.5-3.7).
 * Body composite quanh COM (đã align): đầu sensor r=24, body rect 20x64, floor hình thang.
 * Logic dùng toạ độ/vận tốc kiểu Phaser (y xuống) thông qua PhysBody.
 */
export class PlayerObject {
    readonly body: PhysBody;
    readonly view: IPlayerView;
    controller: IController;
    energyBar: EnergyBar | null = null;
    readonly ball: BallObject;

    // ---- định danh ----
    readonly direction: number; // -1 đội trái (tấn công sang phải), +1 đội phải
    readonly playerID: number;
    readonly type: string; // 'P' | 'B'
    readonly superPower: number; // skinIndex % 2: 0 Fireball, 1 Teleport (P3)
    energyID = 0;

    // ---- hằng số hành vi ----
    private timeBodyHead = 0.5;
    private delayIdle = 3;
    private delayShot = 0.5;
    private chanceToBeStunned = 0.8;
    private delayStunned = 1;
    private superShotPts = SUPER_SHOT_PTS;
    private superKoef = T_KOEF;
    private velX = PLAYER_MOVE;
    private velY = -PLAYER_JUMP_Y;

    // ---- trạng thái ----
    state = 'idle';
    isOnGround = false;
    isDoubleJump = false;
    isSuperActive = false;
    isSuperHit = false;
    canAct = true;
    canJump = false;
    notCollide = false;
    /** -2 đang trong trận; ±1/0 sau bàn thắng/hết giờ (SPEC §3.7 Ăn mừng). */
    activeState = -2;
    superShotCount = 0;
    private deltaIdle = 0;
    private deltaShoot = -1;
    private deltaStunned = -1;
    private deltaBodyHead = -1;
    /** số contact floor-collider đang chạm (fc của nape). */
    private fc = 0;
    /** Mô phỏng ma sát nape: true = floor.friction = 4 (hiệu dụng mu=2), false = 0 khi đang nhấn di chuyển. */
    private frictionOn = true;
    /** scale.x của graphic (+1 mặt phải, -1 mặt trái). */
    facing = 1;
    private shadow: Sprite;
    private indentX: number;
    /** Hiệu ứng teleport (chỉ P có superPower 1): 30 frame teleprte0000..0029 @30fps, dùng chung cho điểm đi & đến. */
    private teleport: FrameAnim | null = null;
    /** Teleport tween (thời gian THẬT, như Phaser tween): 0 nghỉ, 1 thu nhỏ, 2 phóng to. */
    private tpPhase = 0;
    private tpT = 0;
    private tpFromX = 1;
    /** Đồng hồ thật từ lúc freeze của Fireball; dùng làm fallback nếu view không bắn frame event 'shot'. */
    private superHitTimer = 0;

    constructor(private ctx: IGameContext, direction: number, skinIndex: number, playerID: number, type: string, shadowColor = 0, makeBot?: (p: PlayerObject) => IController) {
        this.direction = direction;
        this.playerID = playerID;
        this.type = type;
        this.ball = ctx.ball;
        this.superPower = skinIndex % 2;
        if (type === 'B' && ctx.botsSkill > BOTS_FAST_THRESHOLD) this.velX *= 1.15;
        this.indentX = HALF_W + direction * (INDENT + (playerID === 2 ? 100 : 0));

        const L = ctx.layers;
        // ---- vật lý ----
        this.body = new PhysBody(L.physRoot, 'Player' + playerID + (direction < 0 ? 'L' : 'R'), ERigidBody2DType.Dynamic, {
            gravityScale: PLAYER_GRAVITY_SCALE, fixedRotation: true, listen: true,
        });
        this.createShapes();

        // ---- đồ hoạ ----
        this.view = createPlayerView(L.players, skinIndex, direction < 0 ? 0 : 1);
        this.view.onComplete = (a) => this.onAnimationComplete(a);
        this.view.onFrameEvent = (n) => this.onLabel(n);
        this.shadow = UIKit.sprite(L.shadows, SHADOWS[shadowColor] || SHADOWS[0]);
        this.facing = -direction;

        // ---- controller ----
        if (type === 'P') {
            const np = Inventory.numPlayers;
            if (np === 0) { this.controller = new PlayerControllerGeneral(this); this.energyID = 1; }
            else if (direction < 0 && playerID < 2) { this.controller = new PlayerController(this); this.energyID = 2; }
            else { this.controller = new PlayerController2(this); this.energyID = 3; }
            if (this.superPower === 1) this.teleport = new FrameAnim(L.effects, 1);
            this.energyBar = new EnergyBar(L.gui, this.energyID, this.superPower);
            this.superShotCount = MatchData.energies[this.energyID - 1] || 0;
            this.energyBar.setEnergy(this.superShotCount);
        } else {
            this.controller = makeBot ? makeBot(this) : new BaseController(this);
        }
        this.restart();
    }

    /**
     * Shapes quanh COM (SPEC §3.5, toạ độ Phaser sau align()):
     *  head r=24 @ (0,-5.84) sensor; body rect x±10, y -26.84..37.16; floor trapezoid y 37.16..41.16.
     * Friction Box2D = 0 cho mọi shape; ma sát nape (đứng yên mu=2) được mô phỏng thủ công trong applyFriction().
     */
    private createShapes(): void {
        const head = addCircle(this.body, PLAYER_HEAD_R, 0, -PLAYER_HEAD_Y, { group: G_HEAD, tag: TAG.HEAD, sensor: true, owner: this });
        void head;
        const bodyCol = addBox(this.body, 20, PLAYER_BODY_BOTTOM - PLAYER_BODY_TOP, 0, -(PLAYER_BODY_TOP + PLAYER_BODY_BOTTOM) / 2, { group: G_PBODY, tag: TAG.PBODY, owner: this });
        bodyCol.on(Contact2DType.BEGIN_CONTACT, this.onBodyBegin, this);
        const floorPts = toCocosPoly([[-3, PLAYER_FLOOR_TOP], [-2, PLAYER_FLOOR_BOTTOM], [2, PLAYER_FLOOR_BOTTOM], [3, PLAYER_FLOOR_TOP]]);
        const floor = addPolygon(this.body, floorPts, { group: G_PBODY, tag: TAG.PFLOOR, owner: this });
        floor.on(Contact2DType.BEGIN_CONTACT, this.onFloorBegin, this);
        floor.on(Contact2DType.END_CONTACT, this.onFloorEnd, this);
    }

    private onFloorBegin(self: Collider2D, other: Collider2D): void {
        if (other.tag !== TAG.FLOOR && other.tag !== TAG.GROUND) return;
        this.onFloorGround();
        this.fc++;
    }

    /** BEGIN COLLISION playerBody x ground (tường/xà/trần, KHÔNG phải sàn cát) -> onBodyGround. */
    private onBodyBegin(self: Collider2D, other: Collider2D): void {
        if (other.tag === TAG.GROUND) this.onBodyGround();
    }

    private onFloorEnd(self: Collider2D, other: Collider2D): void {
        if (other.tag !== TAG.FLOOR && other.tag !== TAG.GROUND) return;
        this.fc--;
        if (this.fc <= 0) { this.fc = 0; this.onEndFloorGround(); }
    }

    // ================= accessors =================
    getX(): number { return this.body.px; }
    getY(): number { return this.body.py; }

    // ================= view =================
    private setFacingScale(s: number): void {
        // Teleport tween ghi đè scale sau faceToBall (Phaser: tweens.update chạy sau state.update) => bỏ qua ghi view khi đang tween.
        if (this.tpPhase !== 0) return;
        this.facing = s;
        this.view.setFacing(s);
    }

    faceToBall(toGoal = false): void {
        if (toGoal) this.setFacingScale(-this.direction);
        else this.setFacingScale(this.getX() <= this.ball.getX() ? 1 : -1);
    }

    faceToOpponent(): void {
        this.setFacingScale(this.ctx.getNearestOpponentDirection(this.getX(), this.direction));
    }

    playState(s = ''): void {
        if (s !== '') this.state = s;
        if (this.state.indexOf('fly') >= 0 || this.state === 'sad1') this.view.stopAt(this.state);
        else this.view.play(this.state);
        this.deltaIdle = 0;
    }

    // ================= state checks =================
    checkHit(): boolean { return this.state.indexOf('hit') >= 0; }
    checkIdle(): boolean { return this.state === 'idle'; }
    checkTackle(): boolean { return this.state.indexOf('tackle') >= 0; }
    checkActiveTackle(): boolean { return this.state === 'tackle anim'; }
    checkStun(): boolean { return this.state === 'stun'; }
    checkFly(): boolean { return this.state.indexOf('fly') >= 0; }
    checkRun(): boolean { return this.state === 'run'; }

    /** Chọn pose rơi theo vy (Phaser, dương = xuống). */
    checkVelocity(): boolean {
        const vy = this.body.vy;
        if (vy !== 0 && !this.isOnGround) {
            this.state = vy < 0 ? 'fly1' : vy < 150 ? 'fly2' : vy < 300 ? 'fly3' : vy < 450 ? 'fly4' : 'fly5';
            return true;
        }
        return false;
    }

    // ================= vòng lặp =================
    /**
     * Mô phỏng ma sát nape (floor 4 x ground 1 -> mu=2) khi KHÔNG nhấn di chuyển & đang chạm đất:
     * giảm |vx| một lượng mu * g_eff(1350) * (0.9*t). Gọi ngay sau physics step, trước update().
     */
    applyFriction(t: number): void {
        if (!this.frictionOn || this.fc <= 0) return;
        const vx = this.body.vx;
        if (vx === 0) return;
        const dv = FRICTION_MU * PLAYER_G_EFF * PHYS_TIME_COEF * t;
        this.body.setVel(vx > 0 ? Math.max(0, vx - dv) : Math.min(0, vx + dv), this.body.vy);
    }

    /** Mỗi tick logic (t đã nhân timeScale). Thứ tự đúng SPEC §3.6. */
    update(t: number): void {
        this.updateRay();
        if (this.activeState === -2 && this.energyBar) {
            this.superShotCount += t * this.superKoef;
            this.energyBar.setEnergy(this.superShotCount);
        }
        if (this.deltaShoot >= 0) { this.deltaShoot += t; if (this.deltaShoot >= this.delayShot) this.deltaShoot = -1; }
        if (this.deltaStunned >= 0) { this.deltaStunned += t; if (this.deltaStunned >= this.delayStunned) this.deltaStunned = -1; }
        if (this.deltaBodyHead >= 0) {
            this.deltaBodyHead += t;
            if (this.deltaBodyHead >= this.timeBodyHead) { this.deltaBodyHead = -1; this.notCollide = false; }
        }
        if (!this.canAct) {
            // bị bóng lửa kéo đi (P3); nếu bóng hết lửa thì thả
            if (this.ball.superHit) this.body.setVel(this.ball.vx, this.ball.vy);
            else this.canAct = true;
            return;
        }
        if (this.checkStun()) return;

        if (this.type === 'B' && this.controller.think) this.controller.think(t);

        if (!this.checkTackle()) this.faceToBall();
        if (this.checkActiveTackle()) this.ctx.tackle(this.getX(), this.getY(), this.direction, this.facing);
        if (!(this.isOnGround || this.state === 'jump' || this.checkHit())) {
            this.checkVelocity();
            this.playState();
        }
        if (this.controller.readyToJump()) this.canJump = true;
        if (this.activeState !== -2 || this.isSuperActive) {
            this.onGoal();
        } else {
            this.jump(this.controller.getJump());
            this.move(this.controller.getMove());
            this.shoot(this.controller.getShoot());
            this.tackle(this.controller.getTackle());
            this.superShot(this.controller.getSuperShot());
        }
        if (this.checkIdle() && this.activeState === -2) {
            this.deltaIdle += t;
            if (this.deltaIdle >= this.delayIdle) {
                this.deltaIdle = 0;
                if (Math.random() < 0.5) this.jumpIdle(); else this.moveIdle();
            }
        }
    }

    // ================= hành vi =================
    shoot(pressed: boolean, superFlag = false): void {
        if (this.ball.superHit) return;
        if ((pressed && this.deltaShoot < 0 && !this.checkTackle()) || this.isSuperActive) {
            this.deltaShoot = 0;
            this.playState(superFlag ? 'superhit' : 'hit');
            if (this.checkDistanceToShoot() || this.isSuperActive) {
                if (superFlag) {
                    this.continueSuperHit();
                    Sfx.play('fireball');
                } else {
                    // hướng sút luôn về khung thành đối phương, bắn NGAY (anim chỉ trang trí)
                    this.ball.shoot(-this.direction);
                }
                this.notCollide = true;
                this.deltaBodyHead = 0;
            }
        }
    }

    checkDistanceToShoot(): boolean {
        const dx = Math.abs(this.getX() - this.ball.getX());
        const dy = Math.abs(this.getY() - this.ball.getY());
        return dx <= SHOOT_DISTANCE_X && dy <= SHOOT_DISTANCE_Y;
    }

    /**
     * Trượt tackle. Hit-test ở FootballGameCore.tackle giữ ĐÚNG bản gốc (dùng `direction`,
     * nên vùng trúng nằm phía sau lưng người tackle - TODO: cân nhắc đảo dấu, PORT_PLAN #1).
     */
    tackle(pressed: boolean): void {
        if (this.isOnGround && pressed && !this.checkHit() && !this.checkTackle()) {
            Sfx.play('slide'); // bản gốc gọi key không tồn tại (im lặng); port phát slide.ogg
            this.faceToOpponent();
            this.move(0);
            this.playState('tackle start');
        }
    }

    /** Super shot: Fireball (superPower 0) / Teleport (1). Cần đủ năng lượng và bóng không đang là bóng lửa. */
    superShot(pressed: boolean): void {
        if (pressed && !this.ball.superHit && this.superShotCount >= this.superShotPts) {
            if (this.superPower === 0) {
                this.superHit();
            } else {
                this.isSuperActive = true;
                this.superShotCount = 0;
                if (this.energyBar) this.energyBar.reset();
                this.superDefence();
            }
        }
    }

    // ---------------- Fireball ----------------
    /** Sút lửa: anim 'superhit'; chỉ tiêu năng lượng/đóng băng nếu bóng trong hộp 80x80 (xem shoot()). */
    private superHit(): void {
        this.shoot(true, true);
    }

    /** Bóng trong tầm: đóng băng game (slow(3)) tới frame event 'shot' của anim superhit. */
    private continueSuperHit(): void {
        this.ctx.slow(3);
        this.superShotCount = 0;
        if (this.energyBar) this.energyBar.reset();
        this.isSuperHit = true;
        this.superHitTimer = 0;
    }

    // ---------------- Teleport ----------------
    /** Biến mất: pose fly1 đóng băng, hiệu ứng teleport tại chỗ, slow(1), scale -> 0 trong 300ms (thời gian thật). */
    private superDefence(): void {
        this.playState('fly1');
        this.startTeleportFx(this.getX(), this.getY());
        this.ctx.slow(1);
        this.tpFromX = this.facing;
        this.tpPhase = 1;
        this.tpT = 0;
    }

    /** Xuất hiện phía sau bóng (x = ball.x + 60*direction, clamp 30..770, y = ball.y), hiệu ứng + sfx, scale -> 1. */
    private continueDefence(): void {
        this.notCollide = true;
        let x = this.ball.getX() + TELEPORT_DIST * this.direction;
        if (x < TELEPORT_X_MIN && this.direction < 0) x = TELEPORT_X_MIN;
        else if (x > TELEPORT_X_MAX && this.direction > 0) x = TELEPORT_X_MAX;
        this.body.setPos(x, this.ball.getY());
        this.updateGraphic();
        this.startTeleportFx(x, this.ball.getY());
        Sfx.play('teleport');
        this.tpPhase = 2;
        this.tpT = 0;
    }

    /** Sút THƯỜNG (vx ±550) rồi trả lại game speed. */
    private finishDefence(): void {
        this.tpPhase = 0;
        this.view.node.setScale(1, 1, 1);
        this.facing = 1;
        this.ball.shoot(-this.direction);
        this.deltaBodyHead = 0;
        this.deltaShoot = 0;
        this.isSuperActive = false;
        this.ctx.slow(0);
    }

    private startTeleportFx(x: number, y: number): void {
        if (this.teleport) this.teleport.play('teleprte', TELEPORT_FRAMES, 30, false, cx(x), cy(y));
    }

    /** Tiến tween teleport theo thời gian THẬT (Phaser tween), gọi mỗi khung hình. */
    private tickSuper(dt: number): void {
        if (this.teleport) this.teleport.tick(dt);
        if (this.isSuperHit) {
            // fallback khi view không bắn frame event 'shot'
            this.superHitTimer += dt;
            if (this.superHitTimer >= SUPER_SHOT_FALLBACK) this.onLabel('shot');
        }
        if (this.tpPhase === 0) return;
        this.tpT += dt;
        const k = Math.min(1, this.tpT / TELEPORT_TWEEN);
        if (this.tpPhase === 1) this.view.node.setScale(this.tpFromX * (1 - k), 1 - k, 1);
        else this.view.node.setScale(k, k, 1);
        if (k >= 1) {
            if (this.tpPhase === 1) this.continueDefence(); else this.finishDefence();
        }
    }

    jump(pressed: boolean): void {
        if (this.canAct && pressed && this.canJump && !this.checkTackle()) {
            if (this.isDoubleJump) return;
            if (this.isOnGround) this.isOnGround = false; else this.isDoubleJump = true;
            this.body.setVel(this.body.vx, this.velY);
            this.canJump = false;
            if (!this.checkHit()) this.playState('jump');
        }
    }

    jumpIdle(k = 1): void {
        this.body.setVel(0, -250 * k);
        this.isOnGround = false;
        this.playState('jump');
    }

    moveIdle(): void {
        this.body.setVel(200 * this.direction, 0);
        this.playState('run');
    }

    /** Gán vận tốc ngang trực tiếp (không gia tốc). force = cho phép khi đang tackle. */
    move(m: number, force = false): void {
        if (!this.canAct) return;
        if (this.checkTackle() && !force) return;
        if (m === 0) {
            this.frictionOn = true;
            if (this.isOnGround) {
                if (this.checkRun() || this.checkFly()) this.playState('stop');
            } else {
                this.body.setVel(this.body.vx * 0.9, this.body.vy);
            }
        } else {
            this.frictionOn = false;
            this.body.setVel(m * this.velX, this.body.vy);
            if (this.state === 'idle') this.playState('run');
        }
    }

    /** Sensor đầu chạm bóng. Trả false nếu bỏ qua lần chạm (notCollide). */
    ballCollision(): boolean {
        let t = true;
        if (this.ball.superHit) {
            if (this.ball.isShooting() * this.direction > 0) {
                this.canAct = false;
                this.playState('superStart');
                this.body.setVel(this.ball.vx, this.ball.vy);
            }
        } else if (this.notCollide) {
            t = false;
            this.notCollide = false;
        } else {
            this.body.setVel(this.body.vx, 0);
        }
        return t;
    }

    onFloorGround(): void {
        this.canJump = true;
        this.isOnGround = true;
        this.isDoubleJump = false;
        this.body.setVel(this.body.vx, 0);
        if (!this.checkStun() && this.canAct && !this.checkHit()) this.playState('landing');
        this.controller.clearJump();
    }

    onEndFloorGround(): void {}

    /** Thân chạm Ground khi đang bị bóng lửa kéo: thả ra, anim superEnd. */
    onBodyGround(): void {
        if (!this.canAct) {
            this.canAct = true;
            this.playState('superEnd');
        }
    }

    getStun(dir: number, force = false): void {
        if (force) {
            this.doStun(dir);
            this.deltaStunned = 0;
        } else if (this.deltaStunned < 0) {
            if (Math.random() < this.chanceToBeStunned) this.doStun(dir); else this.jumpIdle(2);
            this.deltaStunned = 0;
        }
    }

    doStun(dir: number): void {
        this.move(0);
        this.playState('stun');
        this.body.setVel(500 * dir, this.body.vy);
    }

    /** Ăn mừng/buồn sau bàn thắng hoặc hết giờ. */
    onGoal(): void {
        if (this.activeState === -this.direction) {
            if (this.isOnGround && this.state !== 'happy') this.playState('happy');
        } else if (this.activeState === this.direction) {
            if (this.isOnGround && this.state.indexOf('sad') < 0) this.playState('sad');
        } else if (this.activeState === 0 && this.isOnGround && this.state !== 'idle') {
            this.playState('idle');
        }
    }

    unActive(t: number): void {
        this.activeState = t;
        if (this.checkActiveTackle()) this.playState('tackle end');
        this.move(0, true);
    }

    // ================= animation events =================
    private onAnimationComplete(e: string): void {
        if (e === 'stop') this.state = 'idle';
        else if (e === 'landing') this.state = this.controller.getMove() === 0 ? 'idle' : 'run';
        else if (e.indexOf('hit') >= 0 || e === 'hulk_hit' || e === 'tackle end' || e === 'stun') { if (!this.checkVelocity()) this.state = 'idle'; }
        else if (e === 'tackle start') { this.state = 'tackle anim'; this.move(this.facing, true); }
        else if (e === 'tackle anim') { this.state = 'tackle end'; this.move(0); }
        else if (e === 'jump') this.state = 'fly1';
        else if (e === 'superStart') this.state = 'super';
        else if (e === 'sad') this.state = 'sad1';
        this.playState();
    }

    /** Frame event của view (anim 'superhit' frame 4 = 'shot'): bắn bóng lửa, hết đóng băng. */
    private onLabel(name: string): void {
        if (this.isSuperHit && name === 'shot') {
            this.ball.shoot(-this.direction, true);
            this.ctx.slow(0);
            this.isSuperHit = false;
            this.isSuperActive = false;
        }
    }

    // ================= vòng đời =================
    restart(): void {
        this.body.setPos(this.indentX, PLAYER_SPAWN_Y);
        this.body.setVel(0, 0);
        this.updateGraphic();
        this.faceToBall(true);
        this.controller.restart();
        this.updateRay();
        this.isOnGround = false;
        this.isDoubleJump = false;
        this.isSuperHit = false;
        this.isSuperActive = false;
        if (this.tpPhase !== 0) { this.tpPhase = 0; this.view.node.setScale(1, 1, 1); }
        if (this.teleport) this.teleport.stop();
        this.deltaStunned = -1;
        this.deltaShoot = -1;
        this.deltaBodyHead = -1;
        this.deltaIdle = 0;
        this.activeState = -2;
        this.canAct = true;
        this.state = 'idle';
        this.playState('idle');
        if (this.view.tick) this.view.tick(STEP, 1);
        this.notCollide = false;
    }

    stopVelocity(): void {
        this.body.setVel(0, 0);
    }

    private updateRay(): void {
        const x = this.getX(), y = this.getY();
        const gy = this.ctx.physics.groundY(x, y);
        if (gy < 0) return;
        this.shadow.node.setPosition(cx(x), cy(gy), 0);
        UIKit.fade(this.shadow.node, Math.max(0, 1 - (gy - y) / 400));
    }

    private updateGraphic(): void {
        const p = this.body.node.position;
        this.view.node.setPosition(p.x, p.y, 0);
    }

    /** Mỗi khung hình: đồng bộ vị trí view + tiến animation theo thời gian thực. */
    updateGraphics(dt: number, ts: number): void {
        this.updateGraphic();
        if (this.view.tick) this.view.tick(dt, ts);
        this.tickSuper(dt);
    }

    release(): void {
        if (this.energyID > 0) MatchData.energies[this.energyID - 1] = this.superShotCount;
        if (this.energyBar) { this.energyBar.destroy(); this.energyBar = null; }
        this.controller.dispose();
    }
}

