import { _decorator, Component, input, Input, KeyCode, Node, RigidBody2D, tween, Tween, Vec2, Vec3 } from 'cc';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { GAME_EVENTS } from '../common/GameEvents';
import { ISuperUsedPayload, Side } from '../common/GameTypes';
import { SlowMo } from '../common/SlowMo';
import { BallController } from './BallController';
import { MatchData, SUPER_COST } from './MatchData';
import { PlayerController } from './PlayerController';

const { ccclass, property } = _decorator;

/** Slot Super. */
const SLOT_FIREBALL = 0;
const SLOT_TELEPORT = 1;

/** Fireball: đứng hình (gốc slowSignal 3 = 0) trước khi sút (gốc chờ anim label 'shot'). */
const FIREBALL_FREEZE_TIME = 0.4;
const FIREBALL_MULT = 1.8;
/** Teleport: gốc slow level 1 = 0.05 suốt 2 tween 0.3s (thời gian thực). */
const TELEPORT_SLOWMO = 0.05;
const TELEPORT_OUT_TIME = 0.3;
const TELEPORT_IN_TIME = 0.3;
/** Đặt cầu thủ SAU lưng bóng (gốc ballX + 60·direction, direction = -hướng tấn công). */
const TELEPORT_OFFSET = 60;
/** Gốc sân 800px, lề 30 -> nửa sân hữu dụng 370 quanh tâm. Chỉnh bằng @property nếu scene khác tỉ lệ. */
const FIELD_HALF_WIDTH = 370;

/**
 * Super của cầu thủ human: phím Z / K (hoặc `requestSuper()` cho touch).
 * Cần energy đầy (SUPER_COST). Fireball cần bóng trong vùng sút; Teleport thì không.
 */
@ccclass('SuperAbility')
export class SuperAbility extends Component {
    @property({ type: PlayerController, tooltip: 'Cầu thủ human sở hữu Super' })
    private readonly player: PlayerController | null = null;

    @property({ type: BallController, tooltip: 'Bóng' })
    private readonly ball: BallController | null = null;

    @property({ type: Node, tooltip: 'Child Visual của player (scale-out/in khi Teleport); trống = bỏ hiệu ứng scale' })
    private readonly visualNode: Node | null = null;

    @property({ tooltip: 'Nửa bề rộng sân hữu dụng (world) quanh vị trí bóng lúc kickoff, dùng clamp Teleport' })
    private readonly fieldHalfWidth = FIELD_HALF_WIDTH;

    private busy = false;
    private centerX = 0;
    private readonly pos = new Vec3();
    private readonly zero = new Vec2();
    private readonly baseVisualScale = new Vec3(1, 1, 1);
    private readonly scaleProxy = { t: 1 };

    protected onLoad(): void {
        if (this.player == null) {
            console.warn('[SuperAbility] player is required');
        }
        if (this.ball == null) {
            console.warn('[SuperAbility] ball is required');
        } else {
            this.centerX = this.ball.node.worldPosition.x;
        }
        if (this.visualNode != null) {
            this.baseVisualScale.set(this.visualNode.scale);
        }
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_KICKOFF, this.cancel, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_END, this.cancel, this);
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        BroadcastReceiver.unRegisterByTarget(this);
        this.cancel();
    }

    /** Kích hoạt Super (phím Z/K hoặc nút touch). Bỏ qua nếu chưa đủ energy / đang bận / bị khóa / stun. */
    public requestSuper(): void {
        const player = this.player;
        if (player == null || this.ball == null || this.busy) {
            return;
        }
        if (!player.isInputEnabled || player.isBusy() || this.energy() < SUPER_COST) {
            return;
        }
        if (MatchData.superSlot === SLOT_TELEPORT) {
            this.startTeleport(player);
        } else if (player.isBallInFrontShootRange()) {
            this.startFireball();
        }
    }

    private onKeyDown(event: { keyCode: KeyCode }): void {
        if (event.keyCode === KeyCode.KEY_Z || event.keyCode === KeyCode.KEY_K) {
            this.requestSuper();
        }
    }

    private energy(): number {
        return this.player?.side === Side.Bot ? MatchData.energy2 : MatchData.energy1;
    }

    /** Trừ energy về 0 (MatchController tự gửi ENERGY_CHANGED) và báo SUPER_USED. */
    private consume(slot: number): void {
        const side = this.player?.side ?? Side.Human;
        if (side === Side.Bot) {
            MatchData.energy2 = 0;
        } else {
            MatchData.energy1 = 0;
        }
        BroadcastReceiver.send(GAME_EVENTS.SUPER_USED, { side, slot } as ISuperUsedPayload);
    }

    /** Fireball: trừ energy, đứng hình rồi sút ×FIREBALL_MULT. */
    private startFireball(): void {
        this.busy = true;
        this.consume(SLOT_FIREBALL);
        SlowMo.play(0, FIREBALL_FREEZE_TIME);
        this.scheduleOnce(this.fireFireball, FIREBALL_FREEZE_TIME);
    }

    private fireFireball = (): void => {
        SlowMo.reset();
        this.busy = false;
        if (this.player != null && this.player.isInputEnabled) {
            this.ball?.shoot(this.player.side, FIREBALL_MULT);
        }
    };

    /** Teleport: scale-out -> dịch tới sau lưng bóng -> scale-in -> sút thường. */
    private startTeleport(player: PlayerController): void {
        this.busy = true;
        this.consume(SLOT_TELEPORT);
        SlowMo.set(TELEPORT_SLOWMO);
        this.scaleProxy.t = 1;
        tween(this.scaleProxy)
            .to(TELEPORT_OUT_TIME, { t: 0 }, { onUpdate: this.applyVisualScale })
            .call(() => this.moveBehindBall(player))
            .to(TELEPORT_IN_TIME, { t: 1 }, { onUpdate: this.applyVisualScale })
            .call(this.finishTeleport)
            .start();
    }

    private moveBehindBall(player: PlayerController): void {
        const ball = this.ball;
        if (ball == null || !player.isInputEnabled) {
            return;
        }
        const ballPos = ball.node.worldPosition;
        const min = this.centerX - this.fieldHalfWidth;
        const max = this.centerX + this.fieldHalfWidth;
        const x = Math.min(max, Math.max(min, ballPos.x - TELEPORT_OFFSET * player.side));
        this.pos.set(x, ballPos.y, player.node.worldPosition.z);
        player.node.setWorldPosition(this.pos);
        const body = player.getComponent(RigidBody2D);
        if (body != null) {
            body.linearVelocity = this.zero;
        }
    }

    private finishTeleport = (): void => {
        SlowMo.reset();
        this.busy = false;
        const player = this.player;
        if (player != null && player.isInputEnabled) {
            this.ball?.shoot(player.side);
        }
    };

    /** Scale Visual = base × t, giữ dấu x do PlayerController lật mặt. */
    private applyVisualScale = (): void => {
        const v = this.visualNode;
        if (v == null) {
            return;
        }
        const sign = v.scale.x < 0 ? -1 : 1;
        const t = this.scaleProxy.t;
        v.setScale(sign * Math.abs(this.baseVisualScale.x) * t, this.baseVisualScale.y * t, this.baseVisualScale.z);
    };

    /** Hủy Super đang chạy (kickoff / hết trận / disable): dừng tween, khôi phục scale + slow-mo. */
    private cancel = (): void => {
        this.unschedule(this.fireFireball);
        Tween.stopAllByTarget(this.scaleProxy);
        if (this.busy) {
            this.busy = false;
            SlowMo.reset();
            this.scaleProxy.t = 1;
            this.applyVisualScale();
        }
    };
}
