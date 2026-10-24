import { _decorator, Component, Label } from 'cc';
import { GAME_EVENTS } from '../common/GameEvents';
import { IEnergyPayload, IMatchCountdownPayload, IMatchResultPayload, IMatchTimePayload, MatchPhase, Side } from '../common/GameTypes';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { BallController } from './BallController';
import { SlowMo } from '../common/SlowMo';
import { ENERGY_RATE, MatchData, SUPER_COST } from './MatchData';
import { PlayerController } from './PlayerController';

const { ccclass, property } = _decorator;

/** Thời gian thực mỗi hiệp (giây). */
const HALF_DURATION = 30;
/** Hệ số quy đổi giây thực → phút hiển thị (30s × 1.5 = 45). */
const DISPLAY_RATE = 1.5;
const HALF_DISPLAY = 45;
const GOAL_PAUSE_TIME = 1.5;
/** Tốc độ timer đếm ngược (timer += rate × dt); step = floor(3 × timer). */
const COUNTDOWN_RATE = 1.5;
/** Timer đếm ngược kết thúc (≈0.9s thực). */
const COUNTDOWN_END = 1.35;
/** Tự sang hiệp 2 sau N giây nếu không có popup gửi MATCH_START_HALF2; 0 = chỉ chờ event. */
const AUTO_RESUME_HALFTIME = 0;

/** Phiên đấu: countdown, 2 hiệp, overtime, GoalSensor, kickoff */
@ccclass('MatchController')
export class MatchController extends Component {
    @property({ type: PlayerController, tooltip: 'Cầu thủ human' })
    private readonly player: PlayerController | null = null;

    @property({ type: PlayerController, tooltip: 'Bot đối thủ (có thể để trống)' })
    private readonly bot: PlayerController | null = null;

    @property({ type: BallController, tooltip: 'Bóng' })
    private readonly ball: BallController | null = null;

    @property({ type: Label, tooltip: 'Tỉ số T_1 (human) – tùy chọn, để trống nếu dùng HudMatch' })
    private readonly scoreLabelT1: Label | null = null;

    @property({ type: Label, tooltip: 'Tỉ số T_2 (đối thủ) – tùy chọn, để trống nếu dùng HudMatch' })
    private readonly scoreLabelT2: Label | null = null;

    @property({ type: Label, tooltip: 'Đồng hồ 00–90 – tùy chọn, để trống nếu dùng HudMatch' })
    private readonly timeLabel: Label | null = null;

    @property({ tooltip: 'Tạm thời: tự bắt đầu trận khi load, không cần Menu (F009 sẽ bỏ)' })
    private readonly autoStart = true;

    private phase: MatchPhase = MatchPhase.Idle;
    /** Giây thực đã chạy trong hiệp hiện tại. */
    private halfElapsed = 0;
    private countdownTimer = 0;
    private lastCountdownN = -1;
    private lastDisplay = -1;
    /** World X tâm sân = X bóng lúc kickoff. */
    private centerX = 0;
    /** Energy nguyên đã gửi event gần nhất (throttle ENERGY_CHANGED). */
    private lastEnergy1 = -1;
    private lastEnergy2 = -1;

    protected onLoad(): void {
        this.validateRefs();
        if (this.ball != null) {
            this.centerX = this.ball.node.worldPosition.x;
        }
        this.refreshScoreLabels();
        this.refreshTimeLabel(0);
    }

    protected onEnable(): void {
        this.ball?.setGoalCallback(this.onGoalSensorHit);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_START, this.startMatch, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_START_HALF2, this.startHalf2, this);
    }

    protected start(): void {
        if (this.autoStart && this.phase === MatchPhase.Idle) {
            this.startMatch();
        }
    }

    protected onDisable(): void {
        this.ball?.setGoalCallback(null);
        BroadcastReceiver.unRegisterByTarget(this);
        this.unscheduleAllCallbacks();
        SlowMo.reset();
    }

    protected onDestroy(): void {
        BroadcastReceiver.unRegisterByTarget(this);
    }

    protected update(dt: number): void {
        if (this.phase === MatchPhase.Countdown) {
            this.updateCountdown(dt);
            return;
        }
        if (this.phase === MatchPhase.Playing || this.phase === MatchPhase.Overtime) {
            this.tickEnergy(dt);
        }
        if (this.phase !== MatchPhase.Playing) {
            return;
        }
        this.halfElapsed = Math.min(HALF_DURATION, this.halfElapsed + dt);
        this.refreshTimeLabel(this.currentDisplay());
        if (this.halfElapsed >= HALF_DURATION) {
            this.onHalfEnd();
        }
    }

    private validateRefs(): void {
        if (this.player == null) {
            console.warn('[MatchController] player is required');
        }
        if (this.ball == null) {
            console.warn('[MatchController] ball is required');
        }
    }

    /** Bắt đầu trận mới (Menu / Rematch / autoStart): reset toàn bộ → Countdown hiệp 1. */
    private startMatch = (): void => {
        this.unscheduleAllCallbacks();
        SlowMo.reset();
        MatchData.reset();
        this.lastEnergy1 = -1;
        this.lastEnergy2 = -1;
        this.syncEnergyEvents();
        this.halfElapsed = 0;
        this.lastDisplay = -1;
        this.refreshScoreLabels();
        this.refreshTimeLabel(0);
        this.enterCountdown();
    };

    /** Hiệp 2: gọi từ event MATCH_START_HALF2 hoặc auto-resume. */
    private startHalf2 = (): void => {
        if (this.phase !== MatchPhase.HalfTime) {
            return;
        }
        this.unschedule(this.startHalf2);
        MatchData.half = 2;
        this.halfElapsed = 0;
        this.enterCountdown();
    };

    /** Đưa mọi thứ về vị trí, khóa input, đếm 3-2-1-GO. */
    private enterCountdown(): void {
        this.resetPositions();
        this.setAllInput(false);
        this.phase = MatchPhase.Countdown;
        this.countdownTimer = 0;
        this.lastCountdownN = -1;
    }

    private updateCountdown(dt: number): void {
        this.countdownTimer += COUNTDOWN_RATE * dt;
        const step = Math.floor(3 * this.countdownTimer);
        const n = step < 3 ? 3 - step : 0;
        if (n !== this.lastCountdownN) {
            this.lastCountdownN = n;
            const payload: IMatchCountdownPayload = { n };
            BroadcastReceiver.send(GAME_EVENTS.MATCH_COUNTDOWN, payload);
        }
        if (this.countdownTimer >= COUNTDOWN_END) {
            this.phase = MatchPhase.Playing;
            SlowMo.reset();
            this.setAllInput(true);
            BroadcastReceiver.send(GAME_EVENTS.MATCH_KICKOFF);
        }
    }

    private onHalfEnd(): void {
        SlowMo.reset();
        if (MatchData.half === 1) {
            this.phase = MatchPhase.HalfTime;
            this.setAllInput(false);
            this.ball?.enterRestMode();
            BroadcastReceiver.send(GAME_EVENTS.MATCH_HALFTIME);
            if (AUTO_RESUME_HALFTIME > 0) {
                this.scheduleOnce(this.startHalf2, AUTO_RESUME_HALFTIME);
            }
            return;
        }
        if (MatchData.score1 === MatchData.score2) {
            this.phase = MatchPhase.Overtime;
            MatchData.isOvertime = true;
            this.refreshTimeLabel(2 * HALF_DISPLAY);
            BroadcastReceiver.send(GAME_EVENTS.MATCH_OVERTIME);
            return;
        }
        this.enterFullTime();
    }

    /** sensorX > tâm sân → GoalRight → T_1 (human); ngược lại T_2. */
    private onGoalSensorHit = (sensorWorldX: number): void => {
        if (this.phase !== MatchPhase.Playing && this.phase !== MatchPhase.Overtime) {
            return;
        }
        if (sensorWorldX > this.centerX) {
            MatchData.score1 += 1;
        } else {
            MatchData.score2 += 1;
        }
        this.refreshScoreLabels();
        this.enterGoalPause();
        BroadcastReceiver.send(GAME_EVENTS.MATCH_GOAL, {
            scoreT1: MatchData.score1,
            scoreT2: MatchData.score2,
        });
    };

    private enterGoalPause(): void {
        // Gốc không có slow-mo khi ghi bàn (slow(0) = tốc độ thường) -> chỉ hủy slow-mo Super đang chạy.
        SlowMo.reset();
        this.phase = MatchPhase.GoalPause;
        this.setAllInput(false);
        this.ball?.enterRestMode();
        this.unschedule(this.finishGoalPause);
        this.scheduleOnce(this.finishGoalPause, GOAL_PAUSE_TIME);
    }

    private finishGoalPause = (): void => {
        if (this.phase !== MatchPhase.GoalPause) {
            return;
        }
        if (MatchData.isOvertime) {
            this.enterFullTime();
            return;
        }
        this.kickoff();
    };

    private kickoff(): void {
        this.resetPositions();
        SlowMo.reset();
        this.phase = MatchPhase.Playing;
        this.setAllInput(true);
        BroadcastReceiver.send(GAME_EVENTS.MATCH_KICKOFF);
    }

    private enterFullTime(): void {
        SlowMo.reset();
        this.phase = MatchPhase.FullTime;
        this.setAllInput(false);
        this.ball?.enterRestMode();
        this.unscheduleAllCallbacks();
        BroadcastReceiver.send(GAME_EVENTS.MATCH_END, { phase: MatchPhase.FullTime });
        const result: IMatchResultPayload = { score1: MatchData.score1, score2: MatchData.score2 };
        BroadcastReceiver.send(GAME_EVENTS.MATCH_RESULT, result);
    }

    /** Energy +ENERGY_RATE/s (tối đa SUPER_COST), giữ qua hiệp; chỉ gửi event khi giá trị nguyên đổi / đầy. */
    private tickEnergy(dt: number): void {
        MatchData.energy1 = Math.min(SUPER_COST, MatchData.energy1 + ENERGY_RATE * dt);
        MatchData.energy2 = Math.min(SUPER_COST, MatchData.energy2 + ENERGY_RATE * dt);
        this.syncEnergyEvents();
    }

    private syncEnergyEvents(): void {
        const e1 = Math.floor(MatchData.energy1);
        if (e1 !== this.lastEnergy1) {
            this.lastEnergy1 = e1;
            BroadcastReceiver.send(GAME_EVENTS.ENERGY_CHANGED, { side: Side.Human, value: e1, max: SUPER_COST } as IEnergyPayload);
        }
        const e2 = Math.floor(MatchData.energy2);
        if (e2 !== this.lastEnergy2) {
            this.lastEnergy2 = e2;
            BroadcastReceiver.send(GAME_EVENTS.ENERGY_CHANGED, { side: Side.Bot, value: e2, max: SUPER_COST } as IEnergyPayload);
        }
    }

    /** Reset vị trí player/bot/bóng (resetToKickoff của player tự bật input → caller khóa lại nếu cần). */
    private resetPositions(): void {
        this.player?.resetToKickoff();
        this.bot?.resetToKickoff();
        this.ball?.resetToKickoff();
    }

    private setAllInput(enabled: boolean): void {
        this.player?.setInputEnabled(enabled);
        this.bot?.setInputEnabled(enabled);
    }

    /** Phút hiển thị 0–90: hiệp 1 → 0–45, hiệp 2 → 45–90. */
    private currentDisplay(): number {
        const base = MatchData.half === 2 ? HALF_DISPLAY : 0;
        return Math.min(base + HALF_DISPLAY, base + Math.floor(this.halfElapsed * DISPLAY_RATE));
    }

    private refreshScoreLabels(): void {
        if (this.scoreLabelT1 != null) {
            this.scoreLabelT1.string = `${MatchData.score1}`;
        }
        if (this.scoreLabelT2 != null) {
            this.scoreLabelT2.string = `${MatchData.score2}`;
        }
    }

    private refreshTimeLabel(display: number): void {
        if (display === this.lastDisplay) {
            return;
        }
        this.lastDisplay = display;
        if (this.timeLabel != null) {
            this.timeLabel.string = display < 10 ? `0${display}` : `${display}`;
        }
        const payload: IMatchTimePayload = { display };
        BroadcastReceiver.send(GAME_EVENTS.MATCH_TIME, payload);
    }
}
