import { _decorator, Node } from 'cc';
import BroadcastReceiver from '../../common/BroadcastReceiver';
import { GAME_EVENTS } from '../../common/GameEvents';
import { MatchData } from '../../gameplay/MatchData';
import { UiPopup } from './UiPopup';

const { ccclass, property } = _decorator;

/** Menu đầu trận (prefab độc lập, mở qua PopupManager): Play + chọn Super (0 = Fireball, 1 = Teleport). */
@ccclass('MenuPopup')
export class MenuPopup extends UiPopup {
    @property({ type: Node, tooltip: 'Tùy chọn: node highlight của Fireball' })
    private readonly highlight0: Node | null = null;

    @property({ type: Node, tooltip: 'Tùy chọn: node highlight của Teleport' })
    private readonly highlight1: Node | null = null;

    protected onLoad(): void {
        this.destroyOnHide = false;
        super.onLoad();
    }

    protected onShow(): void {
        this.selectSlot(MatchData.superSlot);
    }

    public onClickPlay(): void {
        this.hide();
        BroadcastReceiver.send(GAME_EVENTS.MATCH_START);
    }

    public onClickSuper0(): void {
        this.selectSlot(0);
    }

    public onClickSuper1(): void {
        this.selectSlot(1);
    }

    private selectSlot(slot: number): void {
        MatchData.superSlot = slot;
        if (this.highlight0 != null) {
            this.highlight0.active = slot === 0;
        }
        if (this.highlight1 != null) {
            this.highlight1.active = slot === 1;
        }
    }
}
