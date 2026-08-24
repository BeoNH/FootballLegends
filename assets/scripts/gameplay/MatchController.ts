import { _decorator, Component, Label } from 'cc';
import { GAME_EVENTS } from '../common/GameEvents';
import { MatchPhase } from '../common/GameTypes';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { BallController } from './BallController';
import { PlayerController } from './PlayerController';

const { ccclass, property } = _decorator;

const MATCH_DURATION = 90;
const GOAL_PAUSE_TIME = 1.5;

/** Phiên đấu: timer 00–90, GoalSensor, kickoff */
@ccclass('MatchController')
export class MatchController extends Component {
    @property({ type: PlayerController, tooltip: 'Cầu thủ human' })
    private readonly player: PlayerController | null = null;

    @property({ type: BallController, tooltip: 'Bóng' })
    private readonly ball: BallController | null = null;

    @property({ type: Label, tooltip: 'Tỉ số T_1 (human)' })
    private readonly scoreLabelT1: Label | null = null;

    @property({ type: Label, tooltip: 'Tỉ số T_2 (đối thủ)' })
    private readonly scoreLabelT2: Label | null = null;

    @property({ type: Label, tooltip: 'Đồng hồ 00–90' })
    private readonly timeLabel: Label | null = null;

    // @property({ type: PlayerController, tooltip: 'AI đối thủ — dùng sau' })
    // private readonly aiPlayer: PlayerController | null = null;

    private phase: MatchPhase = MatchPhase.Playing;
    private matchElapsed = 0;
    private scoreT1 = 0;
    private scoreT2 = 0;
    private timeDisplay = '00';

    protected onLoad(): void {
        this.validateRefs();
        this.refreshScoreLabels();
        this.refreshTimeLabel();
    }

    protected onEnable(): void {
        this.ball?.setGoalCallback(this.onGoalSensorHit);
    }

    protected onDisable(): void {
        this.ball?.setGoalCallback(null);
        this.unschedule(this.finishGoalPause);
    }

    protected update(dt: number): void {
        if (this.phase !== MatchPhase.Playing) {
            return;
        }
        this.matchElapsed = Math.min(MATCH_DURATION, this.matchElapsed + dt);
        this.refreshTimeLabel();
        if (this.matchElapsed >= MATCH_DURATION) {
            this.enterFullTime();
        }
    }

    private validateRefs(): void {
        if (this.player == null) {
            console.warn('[MatchController] player is required');
        }
        if (this.ball == null) {
            console.warn('[MatchController] ball is required');
        }
        if (this.scoreLabelT1 == null) {
            console.warn('[MatchController] scoreLabelT1 is required');
        }
        if (this.scoreLabelT2 == null) {
            console.warn('[MatchController] scoreLabelT2 is required');
        }
        if (this.timeLabel == null) {
            console.warn('[MatchController] timeLabel is required');
        }
    }

    /** x>0 GoalRight → T_1; x<0 GoalLeft → T_2. */
    private onGoalSensorHit = (sensorWorldX: number): void => {
        if (this.phase !== MatchPhase.Playing) {
            return;
        }
        if (sensorWorldX > 0) {
            this.scoreT1 += 1;
        } else {
            this.scoreT2 += 1;
        }
        this.refreshScoreLabels();
        this.enterGoalPause();
        BroadcastReceiver.send(GAME_EVENTS.MATCH_GOAL, {
            scoreT1: this.scoreT1,
            scoreT2: this.scoreT2,
        });
    };

    private enterGoalPause(): void {
        this.phase = MatchPhase.GoalPause;
        this.player?.setInputEnabled(false);
        this.ball?.enterRestMode();
        this.unschedule(this.finishGoalPause);
        this.scheduleOnce(this.finishGoalPause, GOAL_PAUSE_TIME);
    }

    private finishGoalPause = (): void => {
        if (this.phase !== MatchPhase.GoalPause) {
            return;
        }
        if (this.matchElapsed >= MATCH_DURATION) {
            this.enterFullTime();
            return;
        }
        this.kickoff();
    };

    private kickoff(): void {
        this.player?.resetToKickoff();
        this.ball?.resetToKickoff();
        this.phase = MatchPhase.Playing;
        BroadcastReceiver.send(GAME_EVENTS.MATCH_KICKOFF);
    }

    private enterFullTime(): void {
        this.phase = MatchPhase.FullTime;
        this.matchElapsed = MATCH_DURATION;
        this.refreshTimeLabel();
        this.player?.setInputEnabled(false);
        this.ball?.enterRestMode();
        this.unschedule(this.finishGoalPause);
        BroadcastReceiver.send(GAME_EVENTS.MATCH_END, { phase: MatchPhase.FullTime });
    }

    private refreshScoreLabels(): void {
        if (this.scoreLabelT1 != null) {
            this.scoreLabelT1.string = `${this.scoreT1}`;
        }
        if (this.scoreLabelT2 != null) {
            this.scoreLabelT2.string = `${this.scoreT2}`;
        }
    }

    private refreshTimeLabel(): void {
        const seconds = Math.floor(this.matchElapsed);
        const next = seconds < 10 ? `0${seconds}` : `${seconds}`;
        if (next === this.timeDisplay) {
            return;
        }
        this.timeDisplay = next;
        if (this.timeLabel != null) {
            this.timeLabel.string = next;
        }
    }
}
