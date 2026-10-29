import { EventKeyboard, input, Input, KeyCode, Node, tween, Vec3 } from 'cc';
import { Res } from '../app/Res';
import { FLScreen } from '../app/Screen';
import { UIKit } from '../app/UIKit';
import { P2C } from '../app/Coords';
import { MusicButton } from '../app/MusicButton';
import { ScreenManager } from '../app/ScreenManager';
import { Inventory } from '../app/Inventory';
import { PlayersData } from '../app/PlayersData';
import { MatchData } from '../app/MatchData';
import { Features, isMenu2Skipped } from '../app/Features';
import { buildWarningPopup } from './TournamentUI';
import { HistoryPopup, ListPopup, RankPopup } from './ListPopup';

/** Nền sân (PlaygroundUI): bg 1400x480 đặt giữa + 2 khung thành (Goals0000 112x145, anchor trái-trên như Phaser). */
export function buildPlaygroundBg(root: Node): void {
    UIKit.sprite(root, '0bg_00000', 0, 0);
    // Goals ở (277,172) và (1125,172) trong hệ bg 1400 (gốc bg = -700 so với tâm); anchor (0,1) = góc trái-trên
    UIKit.sprite(root, 'Goals0000', 277 - 700, P2C.y(172), 0, 1);
    const gr = UIKit.sprite(root, 'Goals0000', 1125 - 700, P2C.y(172), 0, 1);
    gr.node.setScale(-1, 1, 1);
}

/** Cột nút bên phải (sidebar 350 rộng): tâm nút x = gw - 151 (phaser), y = 160/240/320. */
export function sidebarX(): number { return P2C.x(ScreenManager.gameWidthLogic - 350 + 199); }

export abstract class MenuBase extends FLScreen {
    /** Cầu thủ trang trí của CLB đã lưu (Inventory.getTeam()) tại (580,360) scale 0.64 + shadow. */
    private buildDecoPlayer(): void {
        if (!Res.dbAsset || !Res.dbAtlas) return;
        const sh = UIKit.sprite(this.root, 'ShadowMC0000', (580 - 700), P2C.y(360));
        sh.node.setScale(1.5, 1.5, 1);
        const d = PlayersData.createPlayer(this.root, 580 - 700, P2C.y(360), 0.64);
        PlayersData.switchPlayer(d, 2 * Inventory.getTeam(), 0);
    }

    protected popup: Node | null = null;
    protected done = false;
    private keyHandler = (e: EventKeyboard) => { if (e.keyCode === KeyCode.SPACE && this.popup) this.startNew(); };

    /** Sau khi chọn 1/2 PLAYER: Menu2, hoặc thẳng vào mode duy nhất được bật nếu Menu2 bị bỏ qua. */
    protected chooseMode(numPlayers: number): void {
        Inventory.numPlayers = numPlayers;
        if (!isMenu2Skipped()) { ScreenManager.go('Menu2'); return; }
        if (Features.friendly) this.startFriendly(); else this.onTournament();
    }

    protected startFriendly(): void { Inventory.gameMode = 1; ScreenManager.go('RandomState'); }

    protected abstract buttons(): { text: string; skin: 'yellow' | 'blue'; click: () => void }[];

    build(): void {
        buildPlaygroundBg(this.root);
        this.buildDecoPlayer();
        const logo = UIKit.sprite(this.root, 'logo_game0000', 0, P2C.y(45));
        logo.node.setPosition(0, P2C.y(-145), 0);
        tween(logo.node).to(0.5, { position: new Vec3(0, P2C.y(45), 0) }, { easing: 'backOut' }).start();

        const side = UIKit.node(this.root, 'sidebar', 0, 0);
        const x = sidebarX();
        // Chỉ các nút đang bật; giữ khoảng cách 80, căn giữa quanh tâm sidebar.
        const list = this.buttons();
        list.forEach((b, i) => {
            UIKit.button(side, { skin: b.skin, w: 226, h: 74, text: b.text, style: 'calibri30', x, y: (list.length - 1) * 40 - 80 * i }, b.click);
        });
        side.setPosition(ScreenManager.gameWidthLogic / 2 + 350, 0, 0);
        tween(side).to(0.5, { position: new Vec3(0, 0, 0) }, { easing: 'backOut' }).start();

        MusicButton.create(this.root);
        UIKit.label(this.root, '1.1.0p', 'calibri16', P2C.x(3), P2C.y(470), 0, 0.5);
    }

    onExit(): void { input.off(Input.EventType.KEY_UP, this.keyHandler, this); }

    /** Có save -> popup CONTINUE / NEW Tournament (Space = NEW); không -> RandomState luôn. */
    protected onTournament(): void {
        if (this.popup || this.done) return;
        if (MatchData.matchState < 2) MatchData.clearScore();
        if (!Inventory.getTournament()) { this.startNew(); return; }
        const pop = this.popup = buildWarningPopup(this.root, 1, 128, () => this.closePopup());
        pop.setPosition(0, 0, 0);
        UIKit.label(pop, 'WARNING', 'calibri26', 0, 140);
        UIKit.label(pop, 'IF YOU CHOOSE', 'calibri20', 0, 105);
        UIKit.label(pop, 'NEW TOURNAMENT,', 'calibri20', 0, 80);
        UIKit.label(pop, 'YOU WILL LOST', 'calibri20', 0, 55);
        UIKit.label(pop, 'YOUR PROGRESS', 'calibri20', 0, 30);
        const cont = UIKit.button(pop, { skin: 'yellow', w: 226, h: 80, x: 0, y: -30 }, () => this.startOld());
        UIKit.label(cont, 'CONTINUE', 'calibri30', 0, 14);
        UIKit.label(cont, 'Tournament', 'calibri30', 0, -14);
        UIKit.button(pop, { skin: 'blue', w: 226, h: 80, text: 'NEW Tournament', style: 'calibri30', x: 0, y: -115 }, () => this.startNew());
        input.on(Input.EventType.KEY_UP, this.keyHandler, this);
    }

    private closePopup(): void {
        if (this.popup) { this.popup.destroy(); this.popup = null; }
        input.off(Input.EventType.KEY_UP, this.keyHandler, this);
    }

    protected startNew(): void {
        if (this.done) return;
        this.done = true;
        Inventory.gameMode = 0;
        Inventory.breakTournament();
        ScreenManager.go('RandomState');
    }

    private startOld(): void {
        if (this.done) return;
        this.done = true;
        Inventory.gameMode = 0;
        MatchData.matchState = 1;
        ScreenManager.go('Tournament');
    }
}


export class MenuScreen extends MenuBase {
    /** Thêm RANK / HISTORY (xanh lá, 2/3 nút PLAY) ngay dưới cột nút sidebar + 2 popup đè lên trên cùng. */
    build(): void {
        super.build();
        const side = this.root.getChildByName('sidebar')!;
        const n = this.buttons().length;
        const lastY = (n - 1) * 40 - 80 * (n - 1);
        const x = sidebarX();
        const rank = new RankPopup(this.root);
        const hist = new HistoryPopup(this.root);
        const add = (text: string, y: number, pop: ListPopup) => {
            UIKit.button(side, { skin: 'green', w: 150, h: 74, text, style: 'calibri30', x, y }, () => pop.open());
            pop.init();
        };
        add('RANK', lastY - 80, rank);
        add('HISTORY', lastY - 160, hist);
    }

    protected buttons() {
        const b: { text: string; skin: 'yellow' | 'blue'; click: () => void }[] = [
            { text: 'PLAYER', skin: 'yellow', click: () => this.chooseMode(0) },
        ];
        if (Features.twoPlayers) b.push({ text: '2 PLAYERS', skin: 'yellow', click: () => this.chooseMode(1) });
        if (Features.quickMatch) b.push({ text: 'QUICK MATCH', skin: 'blue', click: () => { Inventory.initQuickMatch(); ScreenManager.go('Gameplay'); } });
        return b;
    }
}

export class Menu2Screen extends MenuBase {
    protected buttons() {
        const b: { text: string; skin: 'yellow' | 'blue'; click: () => void }[] = [];
        if (Features.tournament) b.push({ text: 'TOURNAMENT', skin: 'yellow', click: () => this.onTournament() });
        if (Features.friendly) b.push({ text: 'FRIENDLY', skin: 'yellow', click: () => this.startFriendly() });
        b.push({ text: 'BACK', skin: 'blue', click: () => ScreenManager.go('Menu') });
        return b;
    }
}
