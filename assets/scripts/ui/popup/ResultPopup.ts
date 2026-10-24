import { _decorator, Label } from 'cc';
import BroadcastReceiver from '../../common/BroadcastReceiver';
import { GAME_EVENTS } from '../../common/GameEvents';
import { IMatchResultPayload } from '../../common/GameTypes';
import { POPUP_MENU, PopupManager } from './PopupManager';
import { UiPopup } from './UiPopup';

const { ccclass, property } = _decorator;

/** Popup kết quả (prefab độc lập): data = IMatchResultPayload. Rematch → MATCH_START (MatchController tự reset MatchData). */
@ccclass('ResultPopup')
export class ResultPopup extends UiPopup {
    @property({ type: Label, tooltip: 'YOU WON!!! / YOU LOST / DRAW' })
    private readonly titleLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Tỉ số cuối, vd "2 - 1"' })
    private readonly scoreLabel: Label | null = null;

    protected onLoad(): void {
        this.destroyOnHide = false;
        super.onLoad();
    }

    protected onShow(data?: IMatchResultPayload): void {
        if (data == null) {
            return;
        }
        if (this.titleLabel != null) {
            this.titleLabel.string = data.score1 > data.score2 ? 'YOU WON!!!' : data.score1 < data.score2 ? 'YOU LOST' : 'DRAW';
        }
        if (this.scoreLabel != null) {
            this.scoreLabel.string = `${data.score1} - ${data.score2}`;
        }
    }

    public onClickRematch(): void {
        this.hide();
        BroadcastReceiver.send(GAME_EVENTS.MATCH_START);
    }

    public onClickMenu(): void {
        this.hide();
        void PopupManager.instance?.show(POPUP_MENU);
    }
}
