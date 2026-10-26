import { Color, Graphics, Node, Sprite, UITransform } from 'cc';
import { UIKit } from '../app/UIKit';
import { P2C } from '../app/Coords';
import { Res } from '../app/Res';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { PlayersData } from '../app/PlayersData';

/** Frame emblem nhỏ (atlas gameplay) theo team 1..24: Emblemsv200{00..23}. */
export function emblemV2Frame(team: number): string {
    const i = team - 1;
    return 'Emblemsv200' + (i < 10 ? '0' : '') + i;
}

/** Nền tối phủ toàn màn (backgroundFade: đen, alpha 0..255). Chặn input phía sau. */
export function dimmer(parent: Node, alpha: number): Node {
    const n = UIKit.node(parent, 'dimmer', 0, 0);
    n.getComponent(UITransform)!.setContentSize(2000, 1200);
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, alpha);
    g.rect(-1000, -600, 2000, 1200);
    g.fill();
    return n;
}

/** Một ô kết quả của bracket (MatchPanelResult gốc): nền 128x88 + chữ thập quad_blue + 2 emblem + 2 điểm. */
export class MatchPanelResult {
    node: Node;
    private team1: Sprite;
    private team2: Sprite;
    score1: ReturnType<typeof UIKit.label>;
    score2: ReturnType<typeof UIKit.label>;

    constructor(parent: Node, x: number, y: number) {
        const n = this.node = UIKit.node(parent, 'MatchPanel', x, y);
        this.score1 = UIKit.label(n, '-', 'calibri30', 30, 16);
        this.score2 = UIKit.label(n, '-', 'calibri30', 30, -18);
        this.team1 = UIKit.sprite(n, 'bg0000', -25, 18);
        this.team2 = UIKit.sprite(n, 'bg0000', -25, -16);
    }

    setEmblems(t1: number, t2: number): void {
        this.team1.spriteFrame = Res.frame(emblemV2Frame(t1));
        this.team2.spriteFrame = Res.frame(emblemV2Frame(t2));
        this.team1.node.setScale(0.45, 0.45, 1);
        this.team2.node.setScale(0.45, 0.45, 1);
    }

    /** 1 = xanh (đội khác), 2 = vàng (trận có đội người chơi), 3 = xanh lá (trận hiện tại). */
    setBG(kind: number): void {
        const bg = UIKit.slice(this.node, kind === 2 ? 'yellow' : kind === 3 ? 'green' : 'blue', 128, 88, 0, 0);
        bg.node.setSiblingIndex(0);
        const quad = (w: number, h: number) => {
            const s = UIKit.sprite(this.node, 'quad_blue0000', 0, 0);
            s.sizeMode = Sprite.SizeMode.CUSTOM;
            s.node.getComponent(UITransform)!.setContentSize(w, h);
        };
        quad(110, 4);
        quad(4, 48);
    }
}

/** Hiển thị mode hiện tại (MatchModePanel.showCurrentMode): ô vàng 128x56 + "vs" + icon người chơi, không bg/nút. */
export function buildCurrentMode(parent: Node, x: number, y: number): Node {
    const n = UIKit.node(parent, 'CurrentMode', x, y);
    UIKit.slice(n, 'yellow_fill', 128, 56, 0, 0);
    UIKit.label(n, 'vs', 'calibri30', 0, 0);
    const twoPl = Inventory.numPlayers !== 0;
    const icons: number[][][] = [
        [[-36, -5], [36, -5]],
        [[-45, -7], [-30, -3], [45, -7], [30, -3]],
        [[45, -7], [30, -3], ...(twoPl ? [[-45, -7], [-30, -3]] : [[-36, -5]])],
    ];
    for (const [ix, iy] of icons[Inventory.matchMode]) UIKit.sprite(n, 'iconPl0000', ix, -iy);
    if (Inventory.matchMode === 2 && twoPl) UIKit.label(n, 'CPU', 'calibri16_blue', 45, -12);
    return n;
}

/** Tên chặng hiện tại (PreMatchPanelResult.defineLeg). */
export function defineLeg(): string {
    const t = Inventory.state;
    return t === 0 ? 'Round of 16' : t === 1 ? 'Quarterfinal' : t === 2 ? 'Semifinal' : t === 3 ? (Inventory.isFinal() ? 'Final' : '3rd place match') : '';
}

/**
 * PreMatchPanelResult id 0 ("Match Preview") / 1 ("Half-Time"): panel 450x360 tại (x,y) kiểu Phaser.
 * Gồm tiêu đề chặng, title_state, tỉ số, 2 emblem + tên CLB, mode hiện tại.
 */
export function buildPreMatchPanel(parent: Node, id: number, x: number, y: number): Node {
    const n = UIKit.node(parent, 'PreMatchPanel' + id, x, 240 - y);
    // bg anchor (.5,.21) -> tâm lệch 104.4 xuống
    UIKit.slice(n, 'dark_blue', 450, 360, 0, -104.4);
    UIKit.slice(n, 'navy', 300, 64, 0, 24);
    UIKit.label(n, defineLeg(), 'calibri40_yellow', 0, 24);
    UIKit.label(n, id === 0 ? 'Match Preview' : 'Half-Time', 'calibri36_white', 0, -65);
    buildCurrentMode(n, 0, -220);
    const t1 = Inventory.teams[0] - 1, t2 = Inventory.teams[1] - 1;
    const score = id === 0 ? '0 : 0' : MatchData.score1 + ' : ' + MatchData.score2;
    UIKit.label(n, score, 'calibri80', 0, -140);
    for (const [t, sx] of [[t1, -150], [t2, 150]]) {
        UIKit.sprite(n, PlayersData.emblemFrame(t), sx, -140).node.setScale(0.8, 0.8, 1);
        UIKit.label(n, PlayersData.clubName(t), 'calibri20', sx, -220);
    }
    return n;
}

/**
 * Popup cảnh báo kiểu gốc: dimmer + panel dark_blue 312x356 (scale s) + các dòng text + nút.
 * Trả về node popup; destroy() để đóng. Bấm vào nền tối = đóng (onDismiss).
 */
export function buildWarningPopup(parent: Node, scale: number, dimAlpha: number, onDismiss: () => void): Node {
    const pop = UIKit.node(parent, 'popup', 0, 0);
    const dim = dimmer(pop, dimAlpha);
    dim.on(Node.EventType.TOUCH_END, onDismiss);
    const panel = UIKit.slice(pop, 'dark_blue', 312, 356, 0, 0);
    panel.node.setScale(scale, scale, 1);
    // chặn click xuyên qua panel
    panel.node.on(Node.EventType.TOUCH_END, () => { /* nuốt */ });
    return pop;
}
