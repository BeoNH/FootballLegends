import {
    _decorator,
    BoxCollider2D,
    Collider2D,
    Component,
    Contact2DType,
    IPhysics2DContact,
    Input,
    KeyCode,
    Node,
    PhysicsSystem2D,
    RigidBody2D,
    Vec2,
    Vec3,
    input,
} from 'cc';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { GAME_EVENTS } from '../common/GameEvents';
import { IPlayerSidePayload, IState, Side } from '../common/GameTypes';
import { BallController } from './BallController';

const { ccclass, property } = _decorator;

const PLAYER_GRAVITY_SCALE = 2;
const PLAYER_BODY_FRICTION = 0;
const PLAYER_FOOT_FRICTION = 0;

const PLAYER_MOVE = 12;
const PLAYER_JUMP_Y = 20;
const MAX_JUMPS = 2;

const SHOOT_DISTANCE_X = 60;
const SHOOT_DISTANCE_Y = 60;
const SHOOT_COOLDOWN = 0.5;

const TACKLE_TIME = 0.4;
const TACKLE_SPEED = PLAYER_MOVE * 1.3;
const TACKLE_COOLDOWN = 0.6;
/** Hộp trúng tackle: tới TACKLE_X px phía trước mặt, lệch dọc tối đa TACKLE_Y px. */
const TACKLE_X = 40;
const TACKLE_Y = 50;
const STUN_CHANCE = 0.8;
const STUN_TIME = 1.0;
/** Gốc 500 px/s → m/s (PTM 32), giảm tuyến tính về 0 trong STUN_TIME. */
const STUN_PUSH = 500 / 32;

/** Điều khiển cầu thủ: A/D move, W nhảy đôi, S tackle, X sút vùng phía trước, luôn quay mặt về bóng. */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: Node, tooltip: 'Node Ball để sút và hướng mặt' })
    private readonly ballNode: Node | null = null;

    @property({ type: Node, tooltip: 'Child Visual để flip mặt' })
    private readonly visualNode: Node | null = null;

    @property({ tooltip: 'true = người chơi (nhận keyboard); false = bot, được AiController điều khiển' })
    public isHuman = true;

    @property({ type: Component, tooltip: 'Đối thủ — kéo node có PlayerController (dùng cho tackle/stun ở feature sau)' })
    public opponent: PlayerController | null = null;

    public moveAxis = 0;
    public playerState: IState = IState.Idle;
    public facingSign = 1;
    @property({ tooltip: 'Hướng tấn công: 1 = human (sút sang phải), -1 = bot (sút sang trái)' })
    public side: Side = Side.Human;

    private readonly velocity = new Vec2();
    private readonly kickoffWorldPos = new Vec3();
    private inputEnabled = true;
    private rigidBody: RigidBody2D | null = null;
    private bodyCollider: BoxCollider2D | null = null;
    private footSensor: BoxCollider2D | null = null;
    private ballController: BallController | null = null;

    private groundContacts = 0;
    private jumpsUsed = 0;
    private jumpQueued = false;
    private leftHeld = false;
    private rightHeld = false;
    private shootCooldownLeft = 0;
    private tackleTimeLeft = 0;
    private tackleCooldownLeft = 0;
    private tackleDir = 1;
    private tackleHit = false;
    private stunTimeLeft = 0;
    private stunDir = 1;

    public get isGrounded(): boolean {
        return this.groundContacts > 0;
    }

    protected onLoad(): void {
        this.resolvePhysicsRefs();
        this.resolveBallRefs();
        this.applyPhysicsDefaults();
        this.node.getWorldPosition(this.kickoffWorldPos);
    }

    /** Input đang mở (không bị khóa bởi countdown / goal pause / full time). */
    public get isInputEnabled(): boolean {
        return this.inputEnabled;
    }

    protected onEnable(): void {
        if (this.isHuman) {
            input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        }
        this.footSensor?.on(Contact2DType.BEGIN_CONTACT, this.onFootStandBegin, this);
        this.footSensor?.on(Contact2DType.END_CONTACT, this.onFootStandEnd, this);
        this.resetRuntimeState();
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.footSensor?.off(Contact2DType.BEGIN_CONTACT, this.onFootStandBegin, this);
        this.footSensor?.off(Contact2DType.END_CONTACT, this.onFootStandEnd, this);
        this.clearInputState();
    }

    protected update(dt: number): void {
        this.tickShootCooldown(dt);
        this.tickTackleStun(dt);
        this.faceTowardBall();
        this.applyMoveAndJump();
    }

    /** Khóa / mở A/D/W/X — GoalPause và FullTime. */
    public setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled;
        if (enabled) {
            return;
        }
        this.leftHeld = false;
        this.rightHeld = false;
        this.moveAxis = 0;
        this.jumpQueued = false;
        this.tackleTimeLeft = 0;
        this.stunTimeLeft = 0;
        if (this.rigidBody != null) {
            this.rigidBody.linearVelocity = this.velocity.set(0, this.rigidBody.linearVelocity.y);
        }
    }

    /** Đưa player về spawn lúc onLoad; mở lại jump / cooldown. */
    public resetToKickoff(): void {
        this.node.setWorldPosition(this.kickoffWorldPos);
        this.resetRuntimeState();
        this.playerState = IState.Idle;
        this.leftHeld = false;
        this.rightHeld = false;
        this.moveAxis = 0;
        this.jumpQueued = false;
        this.setInputEnabled(true);
    }

    /** Hàng đợi nhảy (W / ↑) — apply trong update. */
    public requestJump(): void {
        if (!this.inputEnabled) {
            return;
        }
        this.jumpQueued = true;
    }

    /** Sút nếu bóng trong vùng 60×60 phía trước mặt; cooldown 0.5s. */
    public requestShoot(): void {
        if (!this.inputEnabled || this.stunTimeLeft > 0 || this.shootCooldownLeft > 0 || this.ballController == null) {
            return;
        }
        if (!this.isBallInFrontShootRange()) {
            return;
        }
        this.ballController.shoot(this.side);
        this.shootCooldownLeft = SHOOT_COOLDOWN;
    }

    /** Tackle (S / ↓): trượt TACKLE_TIME theo hướng mặt, chỉ khi đứng đất; cooldown TACKLE_COOLDOWN. */
    public requestTackle(): void {
        if (!this.inputEnabled || !this.isGrounded || this.tackleCooldownLeft > 0 || this.isBusy()) {
            return;
        }
        this.tackleDir = this.facingSign;
        this.tackleTimeLeft = TACKLE_TIME;
        this.tackleCooldownLeft = TACKLE_COOLDOWN;
        this.tackleHit = false;
        this.playerState = IState.Tackle;
        BroadcastReceiver.send(GAME_EVENTS.PLAYER_TACKLE, { side: this.side } as IPlayerSidePayload);
    }

    /** Bị stun STUN_TIME, bị đẩy theo dir; hủy tackle đang chạy. */
    public applyStun(dir: number): void {
        this.tackleTimeLeft = 0;
        this.stunTimeLeft = STUN_TIME;
        this.stunDir = dir;
        this.jumpQueued = false;
        this.playerState = IState.Stun;
        BroadcastReceiver.send(GAME_EVENTS.PLAYER_STUN, { side: this.side } as IPlayerSidePayload);
    }

    /** Đang tackle hoặc stun — không nhận input di chuyển / nhảy. */
    public isBusy(): boolean {
        return this.tackleTimeLeft > 0 || this.stunTimeLeft > 0;
    }

    private tickTackleStun(dt: number): void {
        this.tackleCooldownLeft = Math.max(0, this.tackleCooldownLeft - dt);
        this.stunTimeLeft = Math.max(0, this.stunTimeLeft - dt);
        if (this.tackleTimeLeft > 0) {
            this.tackleTimeLeft = Math.max(0, this.tackleTimeLeft - dt);
            this.checkTackleHit();
        }
    }

    /** Một lần trúng / tackle: 80% stun đối thủ, 20% đối thủ nhảy né. */
    private checkTackleHit(): void {
        const opp = this.opponent;
        if (this.tackleHit || opp == null) {
            return;
        }
        const dx = (opp.node.worldPosition.x - this.node.worldPosition.x) * this.tackleDir;
        const dy = opp.node.worldPosition.y - this.node.worldPosition.y;
        if (dx < 0 || dx > TACKLE_X || Math.abs(dy) > TACKLE_Y) {
            return;
        }
        this.tackleHit = true;
        if (Math.random() < STUN_CHANCE) {
            opp.applyStun(this.tackleDir);
        } else {
            opp.requestJump();
        }
    }

    private resolvePhysicsRefs(): void {
        const playerBodyGroup = PhysicsSystem2D.PhysicsGroup['PlayerBody'];
        const playerFootGroup = PhysicsSystem2D.PhysicsGroup['FootSensor'];

        this.rigidBody = this.getComponent(RigidBody2D);
        const boxes = this.getComponents(BoxCollider2D);
        this.bodyCollider = boxes.find((collider) => collider.group === playerBodyGroup) ?? null;
        this.footSensor = boxes.find((collider) => collider.group === playerFootGroup) ?? null;

        if (this.rigidBody == null) {
            console.warn('[PlayerController] RigidBody2D is required on Player');
        }
        if (this.bodyCollider == null) {
            console.warn('[PlayerController] BoxCollider2D group PlayerBody is required');
        }
        if (this.footSensor == null) {
            console.warn('[PlayerController] BoxCollider2D group FootSensor is required');
        }
    }

    private resolveBallRefs(): void {
        if (this.ballNode == null) {
            console.warn('[PlayerController] ballNode is required for shoot / face ball');
        } else {
            this.ballController = this.ballNode.getComponent(BallController);
            if (this.ballController == null) {
                console.warn('[PlayerController] BallController is required on ballNode');
            }
        }
        if (this.visualNode == null) {
            console.warn('[PlayerController] visualNode is required for face ball');
        }
    }

    private applyPhysicsDefaults(): void {
        if (this.rigidBody != null) {
            this.rigidBody.gravityScale = PLAYER_GRAVITY_SCALE;
        }
        if (this.bodyCollider != null) {
            this.bodyCollider.friction = PLAYER_BODY_FRICTION;
        }
        if (this.footSensor != null) {
            this.footSensor.friction = PLAYER_FOOT_FRICTION;
        }
    }

    /** Giữ nguyên groundContacts: foot vẫn đang chạm đất thì không có BEGIN_CONTACT mới để đếm lại. */
    private resetRuntimeState(): void {
        this.jumpsUsed = 0;
        this.shootCooldownLeft = 0;
        this.tackleTimeLeft = 0;
        this.tackleCooldownLeft = 0;
        this.stunTimeLeft = 0;
        if (this.rigidBody != null) {
            this.rigidBody.linearVelocity = this.velocity.set(0, 0);
        }
    }

    private clearInputState(): void {
        this.groundContacts = 0;
        this.jumpsUsed = 0;
        this.leftHeld = false;
        this.rightHeld = false;
        this.moveAxis = 0;
        this.shootCooldownLeft = 0;
        this.tackleTimeLeft = 0;
        this.tackleCooldownLeft = 0;
        this.stunTimeLeft = 0;
    }

    private tickShootCooldown(dt: number): void {
        if (this.shootCooldownLeft <= 0) {
            return;
        }
        this.shootCooldownLeft = Math.max(0, this.shootCooldownLeft - dt);
    }

    /** A/D hoặc ←/→ → moveAxis; W nhảy; X sút. */
    private onKeyDown(event: { keyCode: KeyCode }): void {
        if (!this.inputEnabled) {
            return;
        }
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.leftHeld = true;
                this.syncMoveIntentFromKeyboard();
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.rightHeld = true;
                this.syncMoveIntentFromKeyboard();
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.requestJump();
                break;
            case KeyCode.KEY_X:
                this.requestShoot();
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.requestTackle();
                break;
            default:
                break;
        }
    }

    private onKeyUp(event: { keyCode: KeyCode }): void {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.leftHeld = false;
                this.syncMoveIntentFromKeyboard();
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.rightHeld = false;
                this.syncMoveIntentFromKeyboard();
                break;
            default:
                break;
        }
    }

    private syncMoveIntentFromKeyboard(): void {
        if (this.leftHeld && this.rightHeld) {
            this.moveAxis = 0;
            return;
        }
        if (this.leftHeld) {
            this.moveAxis = -1;
            return;
        }
        if (this.rightHeld) {
            this.moveAxis = 1;
            return;
        }
        this.moveAxis = 0;
    }

    /** Áp vận tốc ngang + nhảy đôi; cập nhật Idle/Run/Jump. */
    private applyMoveAndJump(): void {
        const body = this.rigidBody;
        if (body == null) {
            return;
        }

        if (this.isBusy()) {
            // Tackle / Stun: không ghi đè vận tốc ngang bằng input.
            const vx = this.stunTimeLeft > 0
                ? this.stunDir * STUN_PUSH * (this.stunTimeLeft / STUN_TIME)
                : this.tackleDir * TACKLE_SPEED;
            body.linearVelocity = this.velocity.set(vx, body.linearVelocity.y);
            this.jumpQueued = false;
            this.playerState = this.stunTimeLeft > 0 ? IState.Stun : IState.Tackle;
            return;
        }

        const axis = this.inputEnabled ? this.moveAxis : 0;
        body.linearVelocity = this.velocity.set(
            axis * PLAYER_MOVE,
            body.linearVelocity.y,
        );

        if (this.jumpQueued) {
            this.jumpQueued = false;
            if (this.inputEnabled && this.jumpsUsed < MAX_JUMPS) {
                body.linearVelocity = this.velocity.set(body.linearVelocity.x, PLAYER_JUMP_Y);
                this.jumpsUsed += 1;
            }
        }

        if (!this.isGrounded) {
            this.playerState = IState.Jump;
            return;
        }
        this.playerState = this.moveAxis !== 0 ? IState.Run : IState.Idle;
    }

    /** Flip Visual theo vị trí bóng (facingSign). */
    private faceTowardBall(): void {
        if (this.visualNode == null || this.ballNode == null) {
            return;
        }
        const ballX = this.ballNode.worldPosition.x;
        const playerX = this.node.worldPosition.x;
        this.facingSign = ballX >= playerX ? 1 : -1;
        const visualScale = this.visualNode.scale;
        this.visualNode.setScale(
            this.facingSign * Math.abs(visualScale.x),
            visualScale.y,
            visualScale.z,
        );
    }

    /** Vùng sút chỉ phía trước mặt (theo facingSign). */
    public isBallInFrontShootRange(): boolean {
        if (this.ballNode == null) {
            return false;
        }
        const ballPos = this.ballNode.worldPosition;
        const playerPos = this.node.worldPosition;
        const dx = ballPos.x - playerPos.x;
        const dy = ballPos.y - playerPos.y;
        if (Math.abs(dy) > SHOOT_DISTANCE_Y) {
            return false;
        }
        const forwardDx = dx * this.facingSign;
        if (forwardDx < 0 || forwardDx > SHOOT_DISTANCE_X) {
            return false;
        }
        return true;
    }

    /** FootSensor chạm Ground/Wall → grounded; Ground nhảy đôi, Wall nhảy 1 (jumpsUsed=1). */
    private onFootStandBegin(_self: Collider2D, other: Collider2D, _contact: IPhysics2DContact | null): void {
        const groups = PhysicsSystem2D.PhysicsGroup;
        const isGround = other.group === groups['Ground'];
        const isWall = other.group === groups['Wall'];
        if (!isGround && !isWall) {
            return;
        }
        const wasAirborne = this.groundContacts === 0;
        this.groundContacts += 1;
        if (wasAirborne) {
            this.jumpsUsed = isWall ? 1 : 0;
        }
    }

    private onFootStandEnd(_self: Collider2D, other: Collider2D, _contact: IPhysics2DContact | null): void {
        const groups = PhysicsSystem2D.PhysicsGroup;
        if (other.group !== groups['Ground'] && other.group !== groups['Wall']) {
            return;
        }
        this.groundContacts = Math.max(0, this.groundContacts - 1);
        if (this.groundContacts === 0) {
            // Rơi khỏi mép (không nhảy) tính là đã dùng 1 lần nhảy.
            this.jumpsUsed = Math.max(this.jumpsUsed, 1);
        }
    }
}
