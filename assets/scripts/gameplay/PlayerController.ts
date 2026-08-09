import {
    _decorator,
    BoxCollider2D,
    Collider2D,
    Component,
    Contact2DType,
    IPhysics2DContact,
    Input,
    KeyCode,
    PhysicsSystem2D,
    RigidBody2D,
    Vec2,
    input,
} from 'cc';
import { IState } from '../common/GameTypes';

const { ccclass, property } = _decorator;

const PLAYER_MOVE = 10;
const PLAYER_JUMP_Y = 10;
const MAX_JUMPS = 2;

/** Điều khiển cầu thủ: di chuyển ngang + nhảy tối đa 2 lần (F001). */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: RigidBody2D, tooltip: 'RigidBody2D Dynamic của Player' })
    private readonly rigidBody: RigidBody2D | null = null;

    @property({ type: Collider2D, tooltip: 'FootSensor phát hiện chạm đất' })
    private readonly footSensor: Collider2D | null = null;

    private readonly velocity = new Vec2();
    private bodyCollider: BoxCollider2D | null = null;
    private groundContacts = 0;
    private leftHeld = false;
    private rightHeld = false;
    private jumpQueued = false;
    private jumpsUsed = 0;

    public moveAxis = 0;
    public facing = 1;
    public playerState: IState = IState.Idle;

    public get isGrounded(): boolean {
        return this.groundContacts > 0;
    }

    protected onLoad(): void {
        if (this.rigidBody == null) {
            throw new Error('[PlayerController] rigidBody is required');
        }
        if (this.footSensor == null) {
            throw new Error('[PlayerController] footSensor is required');
        }
        this.bodyCollider = this.getComponent(BoxCollider2D);
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.bindGroundContacts(this.footSensor!);
        if (this.bodyCollider != null) {
            this.bindGroundContacts(this.bodyCollider);
        }
        this.groundContacts = 0;
        this.jumpsUsed = 0;
        this.rigidBody!.linearVelocity = this.velocity.set(0, 0);
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.unbindGroundContacts(this.footSensor!);
        if (this.bodyCollider != null) {
            this.unbindGroundContacts(this.bodyCollider);
        }
        this.groundContacts = 0;
        this.jumpsUsed = 0;
        this.leftHeld = false;
        this.rightHeld = false;
        this.moveAxis = 0;
    }

    protected update(): void {
        this.applyMoveAndJump();
    }

    public requestJump(): void {
        this.jumpQueued = true;
    }

    private bindGroundContacts(collider: Collider2D): void {
        collider.on(Contact2DType.BEGIN_CONTACT, this.onGroundBegin, this);
        collider.on(Contact2DType.END_CONTACT, this.onGroundEnd, this);
    }

    private unbindGroundContacts(collider: Collider2D): void {
        collider.off(Contact2DType.BEGIN_CONTACT, this.onGroundBegin, this);
        collider.off(Contact2DType.END_CONTACT, this.onGroundEnd, this);
    }

    private onKeyDown(event: { keyCode: KeyCode }): void {
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

    private onGroundBegin(collider: Collider2D, other: Collider2D, contact: IPhysics2DContact | null): void {
        if (other.group !== PhysicsSystem2D.PhysicsGroup['Ground']) {
            return;
        }
        const wasAirborne = this.groundContacts === 0;
        this.groundContacts += 1;
        if (wasAirborne) {
            this.jumpsUsed = 0;
        }
    }

    private onGroundEnd(collider: Collider2D, other: Collider2D, contact: IPhysics2DContact | null): void {
        if (other.group !== PhysicsSystem2D.PhysicsGroup['Ground']) {
            return;
        }
        this.groundContacts = Math.max(0, this.groundContacts - 1);
    }

    private applyMoveAndJump(): void {
        const body = this.rigidBody!;
        body.linearVelocity = this.velocity.set(
            this.moveAxis * PLAYER_MOVE,
            body.linearVelocity.y,
        );

        if (this.moveAxis !== 0) {
            this.facing = this.moveAxis;
        }

        if (this.jumpQueued) {
            this.jumpQueued = false;
            if (this.jumpsUsed < MAX_JUMPS) {
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
}
