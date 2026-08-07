import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact, Input, KeyCode, RigidBody2D, Vec2, input, } from 'cc';
import { PlayerState } from '../common/GameTypes';

const { ccclass, property } = _decorator;

const PLAYER_MOVE = 370;
const PLAYER_JUMP_Y = 600;
const BALL_SHOT_X = 550;
const BALL_SHOT_Y = 220;
const SHOOT_DISTANCE_X = 80;
const SHOOT_DISTANCE_Y = 80;
const SHOOT_COOLDOWN = 0.5;

/** Điều khiển cầu thủ: di chuyển, nhảy, sút (F001). */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: RigidBody2D, tooltip: 'RigidBody2D Dynamic của Player' })
    private readonly rigidBody: RigidBody2D | null = null;

    @property({ type: Collider2D, tooltip: 'FootSensor phát hiện chạm đất' })
    private readonly footSensor: Collider2D | null = null;

    @property({ type: RigidBody2D, tooltip: 'RigidBody2D của bóng' })
    private readonly ballBody: RigidBody2D | null = null;

    @property({ tooltip: 'Hướng mặt: -1 trái, 1 phải' })
    private facingSign = 1;

    private readonly _velocity = new Vec2();
    private readonly _ballOffset = new Vec2();
    private readonly _shotVelocity = new Vec2();

    private _moveAxis = 0;
    private _jumpQueued = false;
    private _shootQueued = false;
    private _groundContactCount = 0;
    private _shootCooldownLeft = 0;
    private _playerState: PlayerState = PlayerState.Idle;

    public get playerState(): PlayerState {
        return this._playerState;
    }

    public get isGrounded(): boolean {
        return this._groundContactCount > 0;
    }

    protected onLoad(): void {
        if (this.rigidBody == null) {
            throw new Error('[PlayerController] rigidBody is required');
        }
        if (this.footSensor == null) {
            throw new Error('[PlayerController] footSensor is required');
        }
        if (this.ballBody == null) {
            throw new Error('[PlayerController] ballBody is required');
        }
        if (this.facingSign === 0) {
            throw new Error('[PlayerController] facingSign must be -1 or 1');
        }
        this.facingSign = this.facingSign < 0 ? -1 : 1;
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.footSensor!.on(Contact2DType.BEGIN_CONTACT, this.onFootBeginContact, this);
        this.footSensor!.on(Contact2DType.END_CONTACT, this.onFootEndContact, this);
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.footSensor?.off(Contact2DType.BEGIN_CONTACT, this.onFootBeginContact, this);
        this.footSensor?.off(Contact2DType.END_CONTACT, this.onFootEndContact, this);
    }

    protected update(deltaTime: number): void {
        if (this._shootCooldownLeft > 0) {
            this._shootCooldownLeft = Math.max(0, this._shootCooldownLeft - deltaTime);
        }

        this.applyMoveAndJump();
        if (this._shootQueued) {
            this._shootQueued = false;
            this.tryShoot();
        }
        this.refreshPlayerState();
    }

    /** Đặt hướng mặt từ MatchSetup / spawn. */
    public setFacingSign(sign: number): void {
        if (sign === 0) {
            throw new Error('[PlayerController] facingSign must be -1 or 1');
        }
        this.facingSign = sign < 0 ? -1 : 1;
    }

    private onKeyDown(event: { keyCode: KeyCode }): void {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._moveAxis = -1;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._moveAxis = 1;
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._jumpQueued = true;
                break;
            case KeyCode.KEY_X:
            case KeyCode.KEY_B:
                this._shootQueued = true;
                break;
            default:
                break;
        }
    }

    private onKeyUp(event: { keyCode: KeyCode }): void {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                if (this._moveAxis < 0) {
                    this._moveAxis = 0;
                }
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                if (this._moveAxis > 0) {
                    this._moveAxis = 0;
                }
                break;
            default:
                break;
        }
    }

    private onFootBeginContact(
        _self: Collider2D,
        _other: Collider2D,
        _contact: IPhysics2DContact | null,
    ): void {
        this._groundContactCount += 1;
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
            this.facingSign = this._moveAxis < 0 ? -1 : 1;
        }

        if (this._jumpQueued) {
            this._jumpQueued = false;
            if (this.isGrounded) {
                body.linearVelocity = this._velocity.set(
                    body.linearVelocity.x,
                    PLAYER_JUMP_Y,
                );
            }
        }
    }

    /** Sút bóng nếu trong vùng và hết cooldown. */
    private tryShoot(): void {
        if (this._shootCooldownLeft > 0) {
            return;
        }
        if (!this.isBallInShootRange()) {
            return;
        }

        this._shotVelocity.set(this.facingSign * BALL_SHOT_X, BALL_SHOT_Y);
        this.ballBody!.linearVelocity = this._shotVelocity;
        this._shootCooldownLeft = SHOOT_COOLDOWN;
    }

    private isBallInShootRange(): boolean {
        const playerPos = this.node.worldPosition;
        const ballPos = this.ballBody!.node.worldPosition;
        this._ballOffset.set(ballPos.x - playerPos.x, ballPos.y - playerPos.y);
        return (
            Math.abs(this._ballOffset.x) <= SHOOT_DISTANCE_X &&
            Math.abs(this._ballOffset.y) <= SHOOT_DISTANCE_Y
        );
    }

    private refreshPlayerState(): void {
        if (!this.isGrounded) {
            this._playerState = PlayerState.Jump;
            return;
        }
        this._playerState = this._moveAxis !== 0 ? PlayerState.Run : PlayerState.Idle;
    }
}
