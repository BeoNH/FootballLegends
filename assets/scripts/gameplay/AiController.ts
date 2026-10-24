import { _decorator, Component, Vec3 } from 'cc';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { GAME_EVENTS } from '../common/GameEvents';
import { BallController } from './BallController';
import { MatchData } from './MatchData';
import { PlayerController } from './PlayerController';

const { ccclass, property } = _decorator;

// Thông số port từ AIController2 (gốc); khoảng cách là world units (px).
const D_MOVE = 60;
const D_SHOOT_X = 78;
const D_SHOOT_Y = 90;
const D_JUMP_X = 100;
/** Bóng phải cao hơn bot ít nhất ngần này (world Y hướng lên) mới nhảy. */
const D_JUMP_Y = 100;
const D_MOVE_ATTACK = 150;
const DELTA_BALL_CLOSE_TO_GOAL = 150;
const DELTA_BASE_POINT = 35;
const DELAY_FOR_JUMP = 0.8;
const INACTIVE_TIME = 6;
const BOT_SKILL = 0.3;
const NEED_BACK_TIME = 0.3;

/** Bước quyết định cố định (gốc chạy 40Hz) để xác suất không phụ thuộc FPS. */
const AI_STEP = 0.025;
const MAX_STEPS_PER_FRAME = 4;

/** Xác suất needBack theo chiến thuật (thua / hòa / thắng). */
const NEED_BACK_CHANCE_LOSING = 0.2;
const NEED_BACK_CHANCE_DRAW = 0.7;
const NEED_BACK_CHANCE_WINNING = 0.9;

/** AI bot: port AIController2. Điều khiển PlayerController qua moveAxis / requestJump / requestShoot. Không tackle/super. */
@ccclass('AiController')
export class AiController extends Component {
    @property({ type: Component, tooltip: 'PlayerController của chính bot này (isHuman = false)' })
    private readonly player: PlayerController | null = null;

    @property({ type: BallController, tooltip: 'BallController của bóng' })
    private readonly ball: BallController | null = null;

    @property({ type: Component, tooltip: 'PlayerController của đối thủ (human) — dùng xác định tâm sân' })
    private readonly opponent: PlayerController | null = null;

    /** -1 tấn công, 0 cân bằng, 1 phòng ngự. */
    private strategy = 0;
    private needBack = false;
    private needBackTimer = 0;
    private jumpDelayLeft = 0;
    private inactiveTimer = 0;
    private currentMove = 0;
    private accumulator = 0;
    private basePointX = 0;
    private centerX = 0;
    private active = false;

    private readonly tmpPos = new Vec3();

    protected onLoad(): void {
        if (this.player == null || this.ball == null) {
            console.warn('[AiController] player và ball là bắt buộc');
        }
    }

    protected onEnable(): void {
        BroadcastReceiver.register(GAME_EVENTS.MATCH_KICKOFF, this.onKickoff, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_START, this.stopAi, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_END, this.stopAi, this);
    }

    protected onDisable(): void {
        BroadcastReceiver.unRegisterByTarget(this);
        this.stopAi();
    }

    protected update(dt: number): void {
        const player = this.player;
        if (!this.active || player == null || this.ball == null) {
            return;
        }
        if (!player.isInputEnabled) {
            // Input bị khóa (goal pause / half time...): không giữ lệnh cũ.
            this.currentMove = 0;
            return;
        }
        this.accumulator += dt;
        let steps = 0;
        while (this.accumulator >= AI_STEP && steps < MAX_STEPS_PER_FRAME) {
            this.accumulator -= AI_STEP;
            steps += 1;
            this.tick();
        }
        if (this.accumulator > AI_STEP) {
            this.accumulator = 0;
        }
    }

    /** Chọn strategy theo tỉ số (bot = T_2) và lấy base point = X kickoff. */
    private onKickoff = (): void => {
        const player = this.player;
        if (player == null) {
            return;
        }
        this.basePointX = player.node.worldPosition.x;
        const opp = this.opponent;
        this.centerX = opp != null ? (this.basePointX + opp.node.worldPosition.x) * 0.5 : 0;

        const diff = MatchData.score2 - MatchData.score1;
        if (diff < 0) {
            this.strategy = -1;
            this.needBack = Math.random() < NEED_BACK_CHANCE_LOSING;
        } else if (diff === 0) {
            this.strategy = 0;
            this.needBack = Math.random() < NEED_BACK_CHANCE_DRAW;
        } else {
            this.strategy = 1;
            this.needBack = Math.random() < NEED_BACK_CHANCE_WINNING;
        }
        this.needBackTimer = 0;
        this.jumpDelayLeft = DELAY_FOR_JUMP;
        this.inactiveTimer = 0;
        this.currentMove = 0;
        this.accumulator = 0;
        this.active = true;
    };

    private stopAi = (): void => {
        this.active = false;
        this.currentMove = 0;
        if (this.player != null) {
            this.player.moveAxis = 0;
        }
    };

    private tick(): void {
        const player = this.player;
        const ball = this.ball;
        if (player == null || ball == null) {
            return;
        }
        const ballPos = ball.node.getWorldPosition(this.tmpPos);
        const ballX = ballPos.x;
        const ballY = ballPos.y;
        const pos = player.node.worldPosition;
        const dx = ballX - pos.x;
        const dy = ballY - pos.y;

        player.moveAxis = this.computeMove(pos.x, ballX, dx, -player.side);

        if (this.jumpDelayLeft > 0) {
            this.jumpDelayLeft -= AI_STEP;
        } else if (Math.abs(dx) <= D_JUMP_X && dy >= D_JUMP_Y && this.roll()) {
            player.requestJump();
        }

        // Thủ môn: bóng đang bay về phía bot (hướng sút = hướng goal nhà của bot) → roll nhảy chắn.
        if (ball.isShooting() === -player.side && Math.abs(dx) <= D_JUMP_X && this.roll()) {
            player.requestJump();
        }

        if (Math.abs(dx) <= D_SHOOT_X && Math.abs(dy) <= D_SHOOT_Y && this.roll()) {
            player.requestShoot();
        }
    }

    /** ownDir = hướng về goal nhà của bot (ngược hướng tấn công). */
    private computeMove(playerX: number, ballX: number, dx: number, ownDir: number): number {
        if (this.needBack) {
            this.currentMove = ownDir;
            this.needBackTimer += AI_STEP;
            if (this.needBackTimer >= NEED_BACK_TIME) {
                this.needBack = false;
            }
        } else if ((ballX - playerX) * ownDir >= DELTA_BALL_CLOSE_TO_GOAL) {
            // Bóng nằm sau lưng bot, phía goal nhà → chạy về.
            this.currentMove = ownDir;
        } else if (this.strategy === -1) {
            this.currentMove = this.moveToBall(dx);
        } else if (this.strategy === 0) {
            this.currentMove = this.ballOnOwnSide(ballX, ownDir) || Math.abs(dx) < D_MOVE_ATTACK
                ? this.moveToBall(dx)
                : this.moveToBasePoint(playerX);
        } else {
            this.currentMove = this.ballOnOwnSide(ballX, ownDir)
                ? this.moveToBall(dx)
                : this.moveToBasePoint(playerX);
        }

        if (this.currentMove === 0) {
            this.inactiveTimer += AI_STEP;
            if (this.inactiveTimer >= INACTIVE_TIME) {
                this.strategy = -1;
                this.inactiveTimer = 0;
            }
        } else {
            this.inactiveTimer = 0;
        }
        return this.currentMove;
    }

    private moveToBall(dx: number): number {
        if (dx <= -D_MOVE) {
            return this.roll() ? -1 : 0;
        }
        if (dx >= D_MOVE) {
            return this.roll() ? 1 : 0;
        }
        return 0;
    }

    private moveToBasePoint(playerX: number): number {
        if (Math.abs(playerX - this.basePointX) < DELTA_BASE_POINT) {
            return 0;
        }
        return playerX < this.basePointX ? 1 : -1;
    }

    private ballOnOwnSide(ballX: number, ownDir: number): boolean {
        return (ballX - this.centerX) * ownDir >= 0;
    }

    private roll(): boolean {
        return Math.random() <= BOT_SKILL;
    }
}
