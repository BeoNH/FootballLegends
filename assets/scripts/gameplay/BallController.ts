import {
    _decorator,
    Collider2D,
    Component,
    Contact2DType,
    IPhysics2DContact,
    PhysicsSystem2D,
    RigidBody2D,
    Vec2,
} from 'cc';

const { ccclass } = _decorator;

const BODY_LIFT_SPEED = 15;
const SETTLE_FACTOR = 0.85;
const SETTLE_EPSILON = 0.5;

const BALL_SHOT_X = 18;
const BALL_SHOT_Y = 12;
const SHOOT_BODY_SKIP_TIME = 0.5;

/** Bóng: nảy sàn / BodySensor (F002) + sút cung (F003). */
@ccclass('BallController')
export class BallController extends Component {
    private readonly velocity = new Vec2();
    private rigidBody: RigidBody2D | null = null;
    private ballCollider: Collider2D | null = null;

    private isInBodySensor = false;
    private bodyLiftLocked = false;
    private skipBodySensorLift = false;

    private hasBaseline = false;
    private rememberedGroundSpeed = 0;
    private settlePeakSpeed = 0;
    private settlingToRemembered = false;

    protected onLoad(): void {
        this.resolvePhysicsRefs();
    }

    protected onEnable(): void {
        this.ballCollider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        this.ballCollider?.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        this.resetRuntimeState();
    }

    protected update(): void {
        if (!this.isInBodySensor || this.bodyLiftLocked || this.skipBodySensorLift) {
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

    /** Sút cung — khóa BodySensor lift sau sút. */
    public shoot(shootSign: number): void {
        const body = this.rigidBody;
        if (body == null) {
            return;
        }
        body.linearVelocity = this.velocity.set(shootSign * BALL_SHOT_X, BALL_SHOT_Y);
        this.settlingToRemembered = true;
        this.settlePeakSpeed = BALL_SHOT_Y;
        this.skipBodySensorLift = true;
        this.unschedule(this.endSkipBodySensorLift);
        this.scheduleOnce(this.endSkipBodySensorLift, SHOOT_BODY_SKIP_TIME);
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
        this.bodyLiftLocked = false;
        this.skipBodySensorLift = false;
        this.hasBaseline = false;
        this.rememberedGroundSpeed = 0;
        this.settlePeakSpeed = 0;
        this.settlingToRemembered = false;
    }

    private onBeginContact(_self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null): void {
        const groups = PhysicsSystem2D.PhysicsGroup;
        if (other.group === groups['Ground']) {
            this.onGroundBegin(contact);
            return;
        }
        if (other.group === groups['BodySensor']) {
            if (!this.isInBodySensor) {
                this.isInBodySensor = true;
                this.tryBodySensorLift();
            }
        }
    }

    private onEndContact(_self: Collider2D, other: Collider2D, _contact: IPhysics2DContact | null): void {
        if (other.group !== PhysicsSystem2D.PhysicsGroup['BodySensor']) {
            return;
        }
        this.isInBodySensor = false;
        this.bodyLiftLocked = false;
    }

    private onGroundBegin(contact: IPhysics2DContact | null): void {
        const body = this.rigidBody;
        if (body == null) {
            return;
        }

        const incomingY = body.linearVelocity.y;
        if (incomingY >= 0) {
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

    private tryBodySensorLift(): void {
        if (this.skipBodySensorLift || this.bodyLiftLocked) {
            return;
        }
        const body = this.rigidBody;
        if (body == null || body.linearVelocity.y > 0) {
            return;
        }

        this.bodyLiftLocked = true;
        this.settlingToRemembered = true;
        this.settlePeakSpeed = BODY_LIFT_SPEED;
        body.linearVelocity = this.velocity.set(0, BODY_LIFT_SPEED);
    }

    private endSkipBodySensorLift = (): void => {
        this.skipBodySensorLift = false;
    };
}
