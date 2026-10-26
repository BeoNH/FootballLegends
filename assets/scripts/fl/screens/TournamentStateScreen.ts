import { EventKeyboard, input, Input, KeyCode, Node } from 'cc';
import { backToModeMenu } from '../app/Features';
import { FLScreen } from '../app/Screen';
import { UIKit } from '../app/UIKit';
import { P2C } from '../app/Coords';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { ScreenManager } from '../app/ScreenManager';
import { buildPlaygroundBg } from './MenuScreen';
import { dimmer, MatchPanelResult } from './TournamentUI';

/** Toạ độ 16 ô (Players.json match1..16, hệ Phaser 800x480). */
const POS: number[][] = [
    [70, 62], [70, 164], [70, 266], [70, 368], [730, 62], [730, 164], [730, 266], [730, 368],
    [200, 113], [200, 317], [600, 113], [600, 317], [270, 215], [530, 215], [400, 140], [400, 340],
];

/** Sơ đồ giải đấu (SPEC §1.4 TournamentState). */
export class TournamentStateScreen extends FLScreen {
    private table: MatchPanelResult[] = [];
    private done = false;
    private keyHandler = (e: EventKeyboard) => { if (e.keyCode === KeyCode.SPACE) this.onPlay(); };

    build(): void {
        buildPlaygroundBg(this.root);
        dimmer(this.root, 204);
        // centeredContent.y = -10 (Phaser) -> +10 Cocos
        const content = UIKit.node(this.root, 'content', 0, 10);

        // 16 ô + nhãn chặng
        const labels: { [i: number]: [string, any] } = {
            9: ['Quarterfinal', 'calibri18'], 11: ['Quarterfinal', 'calibri18'],
            13: ['Semifinal', 'calibri18'], 14: ['Semifinal', 'calibri18'],
            16: ['3rd place match', 'calibri18'], 15: ['Final', 'calibri20'],
        };
        // Gốc: nhãn Quarterfinal/Semifinal dùng style18, Final style20 (SPEC ghi 20 cho cả nhóm; theo code gốc là 18)
        for (let i = 1; i <= 16; i++) {
            const [x, y] = POS[i - 1];
            this.table.push(new MatchPanelResult(content, x - 400, P2C.y(y)));
            const l = labels[i];
            if (l) UIKit.label(content, l[0], l[1], x - 400, P2C.y(y - 50));
        }
        this.fill();

        MatchData.clearScore();
        MatchData.matchState = 1;

        // logo (0,35): nút darkblue 310x68 lệch +8, "Tournament Grid"
        UIKit.slice(content, 'dark_blue', 310, 68, 0, P2C.y(35 + 8));
        UIKit.label(content, 'Tournament Grid', 'calibri40_yellow', 0, P2C.y(35 + 8));

        const gw = ScreenManager.gameWidthLogic;
        UIKit.button(this.root, { skin: 'yellow', w: 192, h: 80, text: 'NEXT', style: 'calibri40', x: P2C.x(gw - 96 - 10), y: P2C.y(440) }, () => this.onPlay());
        UIKit.button(this.root, { skin: 'blue', w: 192, h: 80, text: 'BACK', style: 'calibri40', x: P2C.x(96 + 10), y: P2C.y(440) }, () => this.onBack());
        input.on(Input.EventType.KEY_UP, this.keyHandler, this);
    }

    onExit(): void { input.off(Input.EventType.KEY_UP, this.keyHandler, this); }

    /** setUp/fill gốc: n = số ô có đội, done = số ô đã có kết quả. */
    private fill(): void {
        const st = Inventory.state;
        const [n, done] = st === 0 ? [8, 0] : st === 1 ? [12, 8] : st === 2 ? [14, 12] : st === 3 ? [16, 14] : [16, 16];
        const rounds = Inventory.rounds, results = Inventory.results, team = Inventory.tTeam;
        const cur = Math.floor((Inventory.teamNo + 2) / 2);
        this.table.forEach((p, o) => {
            const h = o + 1;
            if (h <= n) {
                const a = rounds[2 * h - 2], b = rounds[2 * h - 1];
                p.setEmblems(a, b);
                p.setBG(h === cur ? 3 : (team === a || team === b) ? 2 : 1);
                if (h <= done) {
                    p.score1.string = '' + results[2 * h - 2];
                    p.score2.string = '' + results[2 * h - 1];
                }
            } else p.setBG(1);
        });
    }

    private onPlay(): void {
        if (this.done) return;
        this.done = true;
        ScreenManager.go('PreMatch');
    }

    private onBack(): void {
        if (this.done) return;
        this.done = true;
        ScreenManager.go(backToModeMenu());
    }
}
