import {
    _decorator,
    Collider2D,
    Component,
    Contact2DType,
    game,
    IPhysics2DContact,
    Node,
    PhysicsSystem2D,
    RigidBody2D,
    Vec2,
    Vec3,
} from 'cc';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { GAME_EVENTS } from '../common/GameEvents';
import { IBallShotPayload } from '../common/GameTypes';

const { ccclass } = _decorator;

const BODY_LIFT_SPEED = 15;
/** Đẩy ngang khi đỡ bằng BodySensor (gốc 75 px/s ≈ 2.3 m/s), theo hướng tấn công của cầu thủ chạm. */
const HEAD_PUSH_X = 2.3;
const SETTLE_FACTOR = 0.85;
const SETTLE_EPSILON = 0.5;

/** Âm thanh nảy: |vy| tối thiểu và khoảng cách tối thiểu giữa 2 lần phát (s). */
const BOUNCE_SOUND_MIN_VY = 3;
const BOUNCE_SOUND_INTERVAL = 0.1;
const BALL_SHOT_X = 18;
const BALL_SHOT_Y = 12;
const SHOOT_BODY_SKIP_TIME = 0.3;
const BALL_REST_GRAVITY_SCALE = 8;
const BALL_REST_LINEAR_DAMPING = 6;

/** Bóng: nảy sàn (Editor) + đỡ BodySensor + sút cung + settle về baseline |vy|. */
@ccclass('BallController')
export class BallController extends Component {
    private readonly velocity = new Vec2();
    private readonly kickoffWorldPos = new Vec3();
    private rigidBody: RigidBody2D | null = null;
    private ballCollider: Collider2D | null = null;

    private isInBodySensor = false;
    /** Side (hướng tấn công) của cầu thủ đang chạm BodySensor. */
    private bodySensorSide = 0;
    /** Dấu hướng bóng đang bay sau cú sút (0 = không phải bóng sút). */
    private shootingSign = 0;
    private lastBounceSoundTime = -1;
    private bodyLiftLocked = false;
    /** Bóng đang bay do Fireball: chạm BodySensor đối thủ -> stun thay vì đỡ. */
    private fireball = false;
    private skipBodySensorLift = false;
    private restMode = false;
    private restSettled = false;
    private playGravityScale = 1;
    private playLinearDamping = 0;
    private onGoalSensor: ((sensorWorldX: number) => void) | null = null;

    /** Đã khóa |vy| lần chạm sàn đầu — không ghi đè. */
    private hasBaseline = false;
    /** |vy| baseline khi chạm sàn lần đầu (độ cao nảy nhớ). */
    private rememberedGroundSpeed = 0;
    /** |vy| đích tạm khi đang settle sau đỡ/sút. */
    private settlePeakSpeed = 0;
    /** true = đang giảm dần vy về rememberedGroundSpeed. */
    private settlingToRemembered = false;

    protected onLoad(): void {
        this.resolvePhysicsRefs();
        this.node.getWorldPosition(this.kickoffWorldPos);
        if (this.rigidBody != null) {
            this.playGravityScale = this.rigidBody.gravityScale;
            this.playLinearDamping = this.rigidBody.linearDamping;
        }
    }

    protected onEnable(): void {
        this.ballCollider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        this.ballCollider?.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        this.resetRuntimeState();
    }

    /** Retry đỡ bóng mỗi frame khi còn overlap BodySensor. */
    protected update(): void {
        if (this.restSettled) {
            this.freezeRestVelocity();
            return;
        }
        if (!this.isInBodySensor || this.bodyLiftLocked || this.skipBodySensorLift || this.restMode) {
            return;
        }
        this.tryBodySensorLift();
    }

    protected onDisable(): void {
        this.ballCollider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        this.ballCollider?.off(Contact2DType.END_CONTACT, this.onEndContact, this);
        this.unschedule(this.endSkipBodySensorLift);
        this.resetRuntimeState();
    }

    /**
     * Sút cung: vx = shootSign × BALL_SHOT_X, vy = BALL_SHOT_Y.
     * multiplier > 1 (Fireball ×1.8 vx) -> đánh dấu fireball đến khi chạm sàn/reset.
     * Bật settle về baseline; khóa đỡ BodySensor 0.5s.
     */
    public shoot(shootSign: number, multiplier = 1): void {
        if (this.restMode) {
            return;
        }
        const body = this.rigidBody;
        if (body == null) {
            return;
        }
        body.linearVelocity = this.velocity.set(shootSign * BALL_SHOT_X * multiplier, BALL_SHOT_Y);
        this.shootingSign = shootSign;
        this.fireball = multiplier > 1;
        this.settlingToRemembered = true;
        this.settlePeakSpeed = BALL_SHOT_Y;
        this.skipBodySensorLift = true;
        const shotPayload: IBallShotPayload = { fireball: this.fireball };
        BroadcastReceiver.send(GAME_EVENTS.BALL_SHOT, shotPayload);
        this.unschedule(this.endSkipBodySensorLift);
        this.scheduleOnce(this.endSkipBodySensorLift, SHOOT_BODY_SKIP_TIME);
    }

    /** Bóng đang bay sau cú sút: trả hướng sút (+1/-1), 0 nếu không. Bot dùng để nhảy chắn. */
    public isShooting(): number {
        return this.shootingSign;
    }

    /** Bóng đang bay do Fireball. */
    public isFireball(): boolean {
        return this.fireball;
    }

    /** MatchController đăng ký: bóng vào GoalSensor → world X của sensor. */
    public setGoalCallback(callback: ((sensorWorldX: number) => void) | null): void {
        this.onGoalSensor = callback;
    }

    /** Tăng gravity/damping, tắt đỡ/nảy — bóng rơi rồi đứng im. */
    public enterRestMode(): void {
        this.restMode = true;
        this.restSettled = false;
        this.shootingSign = 0;
        this.fireball = false;
        this.skipBodySensorLift = true;
        this.settlingToRemembered = false;
        const body = this.rigidBody;
        if (body == null) {
            return;
        }
        body.gravityScale = BALL_REST_GRAVITY_SCALE;
        body.linearDamping = BALL_REST_LINEAR_DAMPING;
    }

    /** Trả bóng về spawn; khôi phục gravity/damping Editor. */
    public resetToKickoff(): void {
        this.resetRuntimeState();
        this.node.setWorldPosition(this.kickoffWorldPos);
        const body = this.rigidBody;
        if (body == null) {
            return;
        }
        body.gravityScale = this.playGravityScale;
        body.linearDamping = this.playLinearDamping;
        body.linearVelocity = this.velocity.set(0, 0);
    }

    private resolvePhysicsRefs(): void {
        const ballGroup = PhysicsSystem2D.PhysicsGroup['Ball'];
        this.rigidBody = this.getComponent(RigidBody2D);
        this.ballCollider = this.getComponents(Collider2D).find((collider) => collider.group === ballGroup) ?? null;

        if (this.rigidBody == null) {
            console.warn('[BallController] RigidBody2D is required on Ball');
        }
        if (this.ballCollider == null) {
            console.warn('[BallController] Collider2D group Ball is required');
        }
    }

    private resetRuntimeState(): void {
        this.isInBodySensor = false;
        this.bodySensorSide = 0;
        this.shootingSign = 0;
        this.fireball = false;
        this.bodyLiftLocked = false;
        this.skipBodySensorLift = false;
        this.hasBaseline = false;
        this.rememberedGroundSpeed = 0;
        this.settlePeakSpeed = 0;
        this.settlingToRemembered = false;
        this.restMode = false;
        this.restSettled = false;
    }

    /** Phân luồng va chạm: Ground → nảy/settle; BodySensor → đỡ bóng. */
    private onBeginContact(_self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null): void {
        const groups = PhysicsSystem2D.PhysicsGroup;
        if (other.group === groups['Ground']) {
            this.onGroundBegin(contact);
            return;
        }
        if (other.group === groups['GoalSensor']) {
            this.onGoalSensor?.(other.node.worldPosition.x);
            return;
        }
        if (other.group === groups['BodySensor']) {
            if (!this.isInBodySensor) {
                this.isInBodySensor = true;
                const player = this.resolvePlayer(other.node);
                this.bodySensorSide = player?.side ?? 0;
                if (this.fireball && player != null && player.side !== this.shootingSign) {
                    // Fireball trúng đối thủ: stun thay vì đỡ bóng (gốc: kéo theo đối thủ).
                    this.bodyLiftLocked = true;
                    player.applyStun?.(this.shootingSign);
                    return;
                }
                this.tryBodySensorLift();
            }
        }
    }

    /** Rời BodySensor → mở lại đỡ bóng lần overlap sau. */
    private onEndContact(_self: Collider2D, other: Collider2D, _contact: IPhysics2DContact | null): void {
        if (other.group !== PhysicsSystem2D.PhysicsGroup['BodySensor']) {
            return;
        }
        this.isInBodySensor = false;
        this.bodyLiftLocked = false;
    }

    /**
     * Chạm sàn: lần đầu ghi nhớ |vy|; đang settle thì chỉnh vy về baseline.
     * Không settle → để physics Editor nảy tự nhiên.
     */
    private onGroundBegin(contact: IPhysics2DContact | null): void {
        const body = this.rigidBody;
        if (body == null) {
            return;
        }

        const incomingY = body.linearVelocity.y;
        if (incomingY >= 0) {
            return;
        }

        this.shootingSign = 0;
        this.fireball = false;

        const now = game.totalTime / 1000;
        if (-incomingY > BOUNCE_SOUND_MIN_VY && now - this.lastBounceSoundTime >= BOUNCE_SOUND_INTERVAL) {
            this.lastBounceSoundTime = now;
            BroadcastReceiver.send(GAME_EVENTS.BALL_BOUNCE);
        }

        if (this.restMode) {
            if (contact != null) {
                contact.disabledOnce = true;
            }
            this.restSettled = true;
            this.freezeRestVelocity();
            return;
        }

        const impactSpeedY = -incomingY;
        if (!this.hasBaseline) {
            this.rememberedGroundSpeed = impactSpeedY;
            this.hasBaseline = true;
        }

        if (!this.settlingToRemembered) {
            return;
        }

        if (contact != null) {
            contact.disabledOnce = true;
        }

        this.settlePeakSpeed =
            this.rememberedGroundSpeed +
            (this.settlePeakSpeed - this.rememberedGroundSpeed) * SETTLE_FACTOR;

        if (this.settlePeakSpeed - this.rememberedGroundSpeed <= SETTLE_EPSILON) {
            this.settlePeakSpeed = this.rememberedGroundSpeed;
            this.settlingToRemembered = false;
        }

        body.linearVelocity = this.velocity.set(body.linearVelocity.x, this.settlePeakSpeed);
    }

    /** Lấy PlayerController trên node sensor hoặc tổ tiên (tra theo tên để tránh import vòng). */
    private resolvePlayer(sensorNode: Node): { side?: number; applyStun?: (dir: number) => void } | null {
        let node: Node | null = sensorNode;
        while (node != null) {
            const player = node.getComponent('PlayerController') as { side?: number; applyStun?: (dir: number) => void } | null;
            if (player != null && player.side != null) {
                return player;
            }
            node = node.parent;
        }
        return null;
    }

    /** Đỡ bóng (header): đẩy ngang HEAD_PUSH_X theo hướng tấn công của cầu thủ, bắn lên BODY_LIFT_SPEED; một lần / overlap. */
    private tryBodySensorLift(): void {
        if (this.skipBodySensorLift || this.bodyLiftLocked || this.restMode) {
            return;
        }
        const body = this.rigidBody;
        if (body == null || body.linearVelocity.y > 0) {
            return;
        }

        this.bodyLiftLocked = true;
        this.settlingToRemembered = true;
        this.settlePeakSpeed = BODY_LIFT_SPEED;
        body.linearVelocity = this.velocity.set(HEAD_PUSH_X * this.bodySensorSide, BODY_LIFT_SPEED);
    }

    private freezeRestVelocity(): void {
        const body = this.rigidBody;
        if (body == null) {
            return;
        }
        body.linearVelocity = this.velocity.set(0, 0);
        body.angularVelocity = 0;
        body.gravityScale = 0;
    }

    private endSkipBodySensorLift = (): void => {
        this.skipBodySensorLift = false;
    };
}
