import { Inventory } from '../app/Inventory';
import { UIKit } from '../app/UIKit';
import { AIController2 } from './AIController2';
import { BallObject } from './BallObject';
import { cx, cy } from './GameConsts';
import type { FootballGameCore } from './GameCore';
import { CountDownObject, MessageInfo } from './Hud';
import { PlayerObject } from './PlayerObject';

/** Skill bot theo chế độ (SPEC §5.1). */
export function computeBotsSkill(): number {
    const inv: any = Inventory;
    if (inv.isQuickMatch) return 0.2;
    if (inv.gameMode === 0) {
        const s = (inv.state | 0);
        const base = s === 0 ? 0.1 : s === 1 ? 0.2 : s === 2 ? 0.4 : 0.5;
        return base + (inv.difficulty === 1 ? 0.5 : 0);
    }
    return 0.3;
}

/** Cặp chuỗi đội hình [trái, phải] ('P' người, 'B' bot) theo SPEC §5.1. */
export function teamModes(): [string, string] {
    const inv: any = Inventory;
    const np: number = inv.numPlayers, mm: number = inv.matchMode;
    if (inv.isQuickMatch) return ['P', 'B'];
    if (inv.gameMode === 0) {
        if (np === 0) return mm === 0 ? ['P', 'B'] : mm === 1 ? ['PB', 'BB'] : ['P', 'BB'];
        return ['PP', 'BB'];
    }
    if (np === 0) return mm === 0 ? ['P', 'B'] : mm === 1 ? ['PB', 'BB'] : ['P', 'BB'];
    return mm === 0 ? ['P', 'P'] : mm === 1 ? ['PB', 'PB'] : ['PP', 'BB'];
}

/**
 * Dựng sân + object (port GameBuilder.start / PlayGroundObject.init / Stands).
 * Thứ tự tạo giữ như bản gốc: sân, stands, countdown, message, bóng, cầu thủ trái, cầu thủ phải.
 */
export function buildGame(core: FootballGameCore): void {
    const L = core.layers;
    core.botsSkill = computeBotsSkill();

    // ---- sân: nền 1400x480 tại Phaser x=-300; 2 khung thành Goals0000 (112x145), phủ lên cầu thủ ----
    UIKit.sprite(L.back, '0bg_00000', cx(-300), cy(0), 0, 1);
    UIKit.sprite(L.goals, 'Goals0000', cx(-23), cy(172), 0, 1);
    const g2 = UIKit.sprite(L.goals, 'Goals0000', cx(825), cy(172), 0, 1);
    g2.node.setScale(-1, 1, 1);

    // ---- Stands: ảnh phím hint tại world (200,0), (600,0), anchor (.5,0) ----
    const np = Inventory.numPlayers;
    UIKit.sprite(L.back, 'help000' + 2 * np, cx(200), cy(0), 0.5, 1);
    UIKit.sprite(L.back, 'help000' + (2 * np + 1), cx(600), cy(0), 0.5, 1);

    core.countDown = new CountDownObject(L.ball);
    core.messageInfo = new MessageInfo(L.ball);
    core.ball = new BallObject(core);

    // ---- cầu thủ ----
    const inv = Inventory;
    const teams = [inv.teams[0] - 1, inv.teams[1] - 1];
    const pl: number[] = [];
    pl[0] = inv.players[0] - 1;
    pl[1] = (pl[0] + 1) % 2;
    pl[2] = inv.players[1] - 1;
    pl[3] = (pl[2] + 1) % 2;
    const [leftMode, rightMode] = teamModes();
    let shadowColor = 0;
    const create = (dir: number, mode: string) => {
        const n = dir < 0 ? 0 : 1;
        const len = mode.length;
        for (let h = 0; h < len; h++) {
            const kind = mode.substr(h, 1);
            let color = 0;
            if (len > 1 && kind === 'P') color = ++shadowColor; // P đầu: cam, P sau: hồng
            const skin = 2 * teams[n] + pl[2 * n + h];
            core.addPlayer(new PlayerObject(core, dir, skin, (len - 1) + h, kind, color, (po) => new AIController2(po, core, core.botsSkill)));
        }
    };
    create(-1, leftMode);
    create(1, rightMode);
}
