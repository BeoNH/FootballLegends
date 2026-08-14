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
    input,
} from 'cc';
import { IState, Side } from '../common/GameTypes';
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

/** Điều khiển cầu thủ: move + jump (F001) + sút X / face ball (F003). */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: Node, tooltip: 'Node Ball để sút và hướng mặt' })
    private readonly ballNode: Node | null = null;

    @property({ type: Node, tooltip: 'Child Visual để flip mặt' })
    private readonly visualNode: Node | null = null;

    public moveAxis = 0;
    public playerState: IState = IState.Idle;
    public facingSign = 1;
    public side: Side = Side.Human;

    private readonly velocity = new Vec2();
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

    public get isGrounded(): boolean {
        return this.groundContacts > 0;
    }

    protected onLoad(): void {
        this.resolvePhysicsRefs();
        this.resolveBallRefs();
        this.applyPhysicsDefaults();
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.footSensor?.on(Contact2DType.BEGIN_CONTACT, this.onGroundBegin, this);
        this.footSensor?.on(Contact2DType.END_CONTACT, this.onGroundEnd, this);
        this.resetRuntimeState();
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.footSensor?.off(Contact2DType.BEGIN_CONTACT, this.onGroundBegin, this);
        this.footSensor?.off(Contact2DType.END_CONTACT, this.onGroundEnd, this);
        this.clearInputState();
    }

    protected update(dt: number): void {
        this.tickShootCooldown(dt);
        this.faceTowardBall();
        this.applyMoveAndJump();
    }

    public requestJump(): void {
        this.jumpQueued = true;
    }

    public requestShoot(): void {
        if (this.shootCooldownLeft > 0 || this.ballController == null) {
            return;
        }
        if (!this.isBallInFrontShootRange()) {
            return;
        }
        this.ballController.shoot(this.side);
        this.shootCooldownLeft = SHOOT_COOLDOWN;
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

    private resetRuntimeState(): void {
        this.groundContacts = 0;
        this.jumpsUsed = 0;
        this.shootCooldownLeft = 0;
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
    }

    private tickShootCooldown(dt: number): void {
        if (this.shootCooldownLeft <= 0) {
            return;
        }
        this.shootCooldownLeft = Math.max(0, this.shootCooldownLeft - dt);
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
            case KeyCode.KEY_X:
                this.requestShoot();
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

    private applyMoveAndJump(): void {
        const body = this.rigidBody;
        if (body == null) {
            return;
        }

        body.linearVelocity = this.velocity.set(
            this.moveAxis * PLAYER_MOVE,
            body.linearVelocity.y,
        );

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
    private isBallInFrontShootRange(): boolean {
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

    private onGroundBegin(_self: Collider2D, other: Collider2D, _contact: IPhysics2DContact | null): void {
        if (other.group !== PhysicsSystem2D.PhysicsGroup['Ground']) {
            return;
        }
        const wasAirborne = this.groundContacts === 0;
        this.groundContacts += 1;
        if (wasAirborne) {
            this.jumpsUsed = 0;
        }
    }

    private onGroundEnd(_self: Collider2D, other: Collider2D, _contact: IPhysics2DContact | null): void {
        if (other.group !== PhysicsSystem2D.PhysicsGroup['Ground']) {
            return;
        }
        this.groundContacts = Math.max(0, this.groundContacts - 1);
    }
}
