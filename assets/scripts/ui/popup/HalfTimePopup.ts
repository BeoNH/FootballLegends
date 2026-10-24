import { _decorator, Label } from 'cc';
import BroadcastReceiver from '../../common/BroadcastReceiver';
import { GAME_EVENTS } from '../../common/GameEvents';
import { UiPopup } from './UiPopup';

const { ccclass, property } = _decorator;

/** Popup nghỉ giữa hiệp (prefab độc lập): data = {score1, score2}. Continue → MATCH_START_HALF2. */
@ccclass('HalfTimePopup')
export class HalfTimePopup extends UiPopup {
    @property({ type: Label, tooltip: 'Hiển thị tỉ số, vd "1 - 0"' })
    private readonly scoreLabel: Label | null = null;

    protected onLoad(): void {
        this.destroyOnHide = false;
        super.onLoad();
    }

    protected onShow(data?: { score1: number; score2: number }): void {
        if (this.scoreLabel != null && data != null) {
            this.scoreLabel.string = `${data.score1} - ${data.score2}`;
        }
    }

    public onClickContinue(): void {
        this.hide();
        BroadcastReceiver.send(GAME_EVENTS.MATCH_START_HALF2);
    }
}
