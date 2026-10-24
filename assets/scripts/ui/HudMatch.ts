import { _decorator, Component, Label, Node, Sprite, tween, Tween, Vec3 } from 'cc';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { GAME_EVENTS } from '../common/GameEvents';
import { IEnergyPayload, IMatchCountdownPayload, IMatchTimePayload, Side } from '../common/GameTypes';
import { NumberScrolling } from './NumberScrolling';

const { ccclass, property } = _decorator;

const BANNER_SECONDS = 1.5;
/** Số bước của thanh energy radial (gốc: 36 frame, mỗi bước 10°). */
const ENERGY_STEPS = 36;
/** Tên child hiện khi energy đầy (gợi ý phím Super), nằm cạnh sprite fill. */
const HINT_NODE = 'Hint';

/** HUD trận: score, timer, countdown, banner, energy. Chỉ nghe event, không giữ ref MatchController. */
@ccclass('HudMatch')
export class HudMatch extends Component {
    @property({ type: Label, tooltip: 'Tỉ số T_1 (human)' })
    private readonly scoreLabelT1: Label | null = null;

    @property({ type: Label, tooltip: 'Tỉ số T_2 (đối thủ)' })
    private readonly scoreLabelT2: Label | null = null;

    @property({ type: NumberScrolling, tooltip: 'Tùy chọn: cuộn số T_1 (thay cho gán chuỗi)' })
    private readonly scrollT1: NumberScrolling | null = null;

    @property({ type: NumberScrolling, tooltip: 'Tùy chọn: cuộn số T_2' })
    private readonly scrollT2: NumberScrolling | null = null;

    @property({ type: Label, tooltip: 'Đồng hồ 00–90' })
    private readonly timeLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Đếm ngược 3-2-1-GO!' })
    private readonly countdownLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Banner GOAL!!! / HALF TIME! / OVERTIME! / FULL TIME!' })
    private readonly bannerLabel: Label | null = null;

    @property({ type: Sprite, tooltip: 'Sprite fill energy human (Filled + Radial, ball sáng)' })
    private readonly energyHuman: Sprite | null = null;

    @property({ type: Sprite, tooltip: 'Sprite fill energy bot (Filled + Radial, ball sáng)' })
    private readonly energyBot: Sprite | null = null;

    protected onLoad(): void {
        if (this.countdownLabel != null) {
            this.countdownLabel.node.active = false;
        }
        if (this.bannerLabel != null) {
            this.bannerLabel.node.active = false;
        }
        this.setScore(0, 0, false);
        this.setTime(0);
        this.setEnergy(this.energyHuman, 0, 1);
        this.setEnergy(this.energyBot, 0, 1);

        BroadcastReceiver.register(GAME_EVENTS.MATCH_START, this.onStart, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_COUNTDOWN, this.onCountdown, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_TIME, this.onTime, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_GOAL, this.onGoal, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_HALFTIME, this.onHalfTime, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_OVERTIME, this.onOvertime, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_END, this.onEnd, this);
        BroadcastReceiver.register(GAME_EVENTS.ENERGY_CHANGED, this.onEnergy, this);
    }

    protected onDestroy(): void {
        BroadcastReceiver.unRegisterByTarget(this);
    }

    private onStart(): void {
        this.setScore(0, 0, false);
        this.setTime(0);
        this.hideBanner();
    }

    private onCountdown(data: IMatchCountdownPayload): void {
        const label = this.countdownLabel;
        if (label == null) {
            return;
        }
        label.node.active = true;
        label.string = data.n > 0 ? `${data.n}` : 'GO!';
        label.node.setScale(1.6, 1.6, 1);
        Tween.stopAllByTarget(label.node);
        tween(label.node).to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        if (data.n <= 0) {
            this.unschedule(this.hideCountdown);
            this.scheduleOnce(this.hideCountdown, 0.6);
        }
    }

    private hideCountdown = (): void => {
        if (this.countdownLabel != null) {
            this.countdownLabel.node.active = false;
        }
    };

    private onTime(data: IMatchTimePayload): void {
        this.setTime(data.display);
    }

    private onGoal(data: { scoreT1: number; scoreT2: number }): void {
        this.setScore(data.scoreT1, data.scoreT2, true);
        this.showBanner('GOAL!!!');
    }

    private onHalfTime(): void {
        this.showBanner('HALF TIME!');
    }

    private onOvertime(): void {
        this.showBanner('OVERTIME!');
    }

    private onEnd(): void {
        this.showBanner('FULL TIME!');
    }

    private onEnergy(data: IEnergyPayload): void {
        this.setEnergy(data.side === Side.Human ? this.energyHuman : this.energyBot, data.value, data.max);
    }

    private setScore(s1: number, s2: number, animate: boolean): void {
        this.applyScore(this.scoreLabelT1, this.scrollT1, s1, animate);
        this.applyScore(this.scoreLabelT2, this.scrollT2, s2, animate);
    }

    private applyScore(label: Label | null, scroll: NumberScrolling | null, value: number, animate: boolean): void {
        if (scroll != null) {
            if (animate) {
                void scroll.to(value);
            } else {
                scroll.setValue(value);
            }
        } else if (label != null) {
            label.string = `${value}`;
        }
    }

    private setTime(display: number): void {
        if (this.timeLabel != null) {
            this.timeLabel.string = display < 10 ? `0${display}` : `${display}`;
        }
    }

    private setEnergy(sprite: Sprite | null, value: number, max: number): void {
        if (sprite != null) {
            const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
            // Lượng tử hóa theo bước như gốc; radial: fillStart 0.25 (đỉnh), fillRange âm = chiều kim đồng hồ
            sprite.fillRange = -Math.floor(ratio * ENERGY_STEPS) / ENERGY_STEPS;
            const hint = sprite.node.parent?.getChildByName(HINT_NODE);
            if (hint != null) {
                hint.active = ratio >= 1;
            }
        }
    }

    private showBanner(text: string): void {
        const label = this.bannerLabel;
        if (label == null) {
            return;
        }
        label.string = text;
        label.node.active = true;
        label.node.setScale(0.3, 0.3, 1);
        Tween.stopAllByTarget(label.node);
        tween(label.node).to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        this.unschedule(this.hideBanner);
        this.scheduleOnce(this.hideBanner, BANNER_SECONDS);
    }

    private hideBanner = (): void => {
        if (this.bannerLabel != null) {
            Tween.stopAllByTarget(this.bannerLabel.node);
            this.bannerLabel.node.active = false;
        }
    };
}
