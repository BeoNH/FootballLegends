import {
    _decorator,
    Collider2D,
    Component,
    Contact2DType,
    IPhysics2DContact,
    Input,
    KeyCode,
    RigidBody2D,
    Vec2,
    input,
} from 'cc';
import { PlayerState } from '../common/GameTypes';

const { ccclass, property } = _decorator;

const PLAYER_MOVE = 370;
const PLAYER_JUMP_Y = 600;
const MAX_JUMPS = 2;

/** Điều khiển cầu thủ: di chuyển ngang + nhảy tối đa 2 lần (F001). */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: RigidBody2D, tooltip: 'RigidBody2D Dynamic của Player' })
    private readonly rigidBody: RigidBody2D | null = null;

    @property({ type: Collider2D, tooltip: 'FootSensor phát hiện chạm đất' })
    private readonly footSensor: Collider2D | null = null;

    private readonly _velocity = new Vec2();

    private _moveAxis = 0;
    private _leftHeld = false;
    private _rightHeld = false;
    private _jumpQueued = false;
    private _groundContactCount = 0;
    private _jumpsRemaining = MAX_JUMPS;
    private _playerState: PlayerState = PlayerState.Idle;
    private _facingSign = 1;

    public get playerState(): PlayerState {
        return this._playerState;
    }

    public get isGrounded(): boolean {
        return this._groundContactCount > 0;
    }

    public get moveAxis(): number {
        return this._moveAxis;
    }

    public get facing(): number {
        return this._facingSign;
    }

    public get jumpsRemaining(): number {
        return this._jumpsRemaining;
    }

    protected onLoad(): void {
        if (this.rigidBody == null) {
            throw new Error('[PlayerController] rigidBody is required');
        }
        if (this.footSensor == null) {
            throw new Error('[PlayerController] footSensor is required');
        }
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        if (this.footSensor != null) {
            this.footSensor.on(Contact2DType.BEGIN_CONTACT, this.onFootBeginContact, this);
            this.footSensor.on(Contact2DType.END_CONTACT, this.onFootEndContact, this);
        }
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.footSensor?.off(Contact2DType.BEGIN_CONTACT, this.onFootBeginContact, this);
        this.footSensor?.off(Contact2DType.END_CONTACT, this.onFootEndContact, this);
        this._groundContactCount = 0;
        this._jumpsRemaining = MAX_JUMPS;
    }

    protected update(_deltaTime: number): void {
        this.applyMoveAndJump();
        this.refreshPlayerState();
    }

    /** Đặt intent di chuyển ngang: -1 trái, 0 dừng, 1 phải. */
    public setMoveIntent(axis: number): void {
        this._moveAxis = axis < 0 ? -1 : axis > 0 ? 1 : 0;
    }

    /** Yêu cầu nhảy (tối đa MAX_JUMPS lần trước khi chạm đất lại). */
    public requestJump(): void {
        this._jumpQueued = true;
    }

    private onKeyDown(event: { keyCode: KeyCode }): void {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._leftHeld = true;
                this.syncMoveIntentFromKeyboard();
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._rightHeld = true;
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
                this._leftHeld = false;
                this.syncMoveIntentFromKeyboard();
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._rightHeld = false;
                this.syncMoveIntentFromKeyboard();
                break;
            default:
                break;
        }
    }

    private syncMoveIntentFromKeyboard(): void {
        if (this._leftHeld && this._rightHeld) {
            this.setMoveIntent(0);
            return;
        }
        if (this._leftHeld) {
            this.setMoveIntent(-1);
            return;
        }
        if (this._rightHeld) {
            this.setMoveIntent(1);
            return;
        }
        this.setMoveIntent(0);
    }

    private onFootBeginContact(
        _self: Collider2D,
        _other: Collider2D,
        _contact: IPhysics2DContact | null,
    ): void {
        const wasAirborne = !this.isGrounded;
        this._groundContactCount += 1;
        if (wasAirborne && this.isGrounded) {
            this._jumpsRemaining = MAX_JUMPS;
        }
    }

    private onFootEndContact(
        _self: Collider2D,
        _other: Collider2D,
        _contact: IPhysics2DContact | null,
    ): void {
        this._groundContactCount = Math.max(0, this._groundContactCount - 1);
    }

    private applyMoveAndJump(): void {
        const body = this.rigidBody!;
        body.linearVelocity = this._velocity.set(
            this._moveAxis * PLAYER_MOVE,
            body.linearVelocity.y,
        );

        if (this._moveAxis !== 0) {
            this._facingSign = this._moveAxis < 0 ? -1 : 1;
        }

        if (!this._jumpQueued) {
            return;
        }
        this._jumpQueued = false;
        if (this._jumpsRemaining <= 0) {
            return;
        }
        body.linearVelocity = this._velocity.set(body.linearVelocity.x, PLAYER_JUMP_Y);
        this._jumpsRemaining -= 1;
    }

    private refreshPlayerState(): void {
        if (!this.isGrounded) {
            this._playerState = PlayerState.Jump;
            return;
        }
        this._playerState = this._moveAxis !== 0 ? PlayerState.Run : PlayerState.Idle;
    }
}
