import { EventKeyboard, input, Input, KeyCode, Node } from 'cc';
import { backToModeMenu } from '../app/Features';
import { FLScreen } from '../app/Screen';
import { UIKit } from '../app/UIKit';
import { P2C } from '../app/Coords';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { MusicButton } from '../app/MusicButton';
import { ScreenManager } from '../app/ScreenManager';
import { buildPlaygroundBg } from './MenuScreen';
import { SelectPlayer } from './RandomStateScreen';
import { buildPreMatchPanel, buildWarningPopup, dimmer } from './TournamentUI';

/** Màn trước trận / nghỉ giữa hiệp của tournament (SPEC §1.4 PreMatch). matchState 1 = Match Preview, 2 = Half-Time. */
export class PreMatchScreen extends FLScreen {
    private sp!: SelectPlayer;
    private popup: Node | null = null;
    private done = false;
    private keyHandler = (e: EventKeyboard) => { if (e.keyCode === KeyCode.SPACE && !this.popup) this.onPlay(); };

    build(): void {
        buildPlaygroundBg(this.root);
        dimmer(this.root, 204);
        const content = UIKit.node(this.root, 'content', 0, 0);

        // SelectPlayer trái (-228,122), không mũi tên, cố định team của giải
        this.sp = new SelectPlayer(content, 0, -228, 122, false, () => { /* không đổi team */ }, Inventory.teams[0]);
        if (Inventory.gameMode === 0) this.sp.setUp(Inventory.numPlayers);
        MusicButton.create(this.root);

        // panel (id = matchState - 1) tại (170,122)
        buildPreMatchPanel(content, MatchData.matchState - 1, 170, 122);

        const gw = ScreenManager.gameWidthLogic;
        UIKit.button(this.root, { skin: 'yellow', w: 192, h: 80, text: 'PLAY', style: 'calibri40', x: P2C.x(gw - 96 - 10), y: P2C.y(444) }, () => this.onPlay());
        if (MatchData.matchState === 2) {
            UIKit.button(this.root, { skin: 'blue', w: 192, h: 80, text: 'LEAVE\nTOURNAMENT', style: 'calibri20_blue', x: P2C.x(96 + 10), y: P2C.y(444) }, () => this.onLeave());
        } else {
            UIKit.button(this.root, { skin: 'blue', w: 192, h: 80, text: 'BACK', style: 'calibri40', x: P2C.x(96 + 10), y: P2C.y(444) }, () => this.onBack());
        }
        input.on(Input.EventType.KEY_UP, this.keyHandler, this);
    }

    onExit(): void { input.off(Input.EventType.KEY_UP, this.keyHandler, this); }

    private onPlay(): void {
        if (this.done) return;
        this.done = true;
        Inventory.team = this.sp.emblem - 1;
        Inventory.save();
        ScreenManager.go('Gameplay');
    }

    private onBack(): void {
        if (this.done) return;
        this.done = true;
        ScreenManager.go('Tournament');
    }

    /** Popup xác nhận rời giải: panel scale 1.43, OK (-> huỷ giải, Menu2) / CANCEL. */
    private onLeave(): void {
        if (this.popup || this.done) return;
        const pop = this.popup = buildWarningPopup(this.root, 1.43, 128, () => this.closePopup());
        const t = (s: string, y: number, st: 'calibri30' | 'calibri20') => UIKit.label(pop, s, st, 0, y);
        t('WARNING', 155, 'calibri30');
        t('IF YOU CONTINUE', 120, 'calibri20');
        t('YOU WILL LOST,', 90, 'calibri20');
        t('YOUR PROGRESS', 60, 'calibri20');
        UIKit.button(pop, { skin: 'blue', w: 226, h: 80, text: 'OK', style: 'calibri30', x: 0, y: -30 }, () => {
            if (this.done) return;
            this.done = true;
            Inventory.breakTournament();
            ScreenManager.go(backToModeMenu());
        });
        UIKit.button(pop, { skin: 'blue', w: 226, h: 80, text: 'CANCEL', style: 'calibri30', x: 0, y: -115 }, () => this.closePopup());
    }

    private closePopup(): void {
        if (this.popup) { this.popup.destroy(); this.popup = null; }
    }
}
