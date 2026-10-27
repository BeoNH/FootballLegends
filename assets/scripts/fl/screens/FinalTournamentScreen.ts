import { dragonBones, Node } from 'cc';
import { backToModeMenu } from '../app/Features';
import { FLScreen } from '../app/Screen';
import { UIKit } from '../app/UIKit';
import { P2C } from '../app/Coords';
import { Inventory } from '../app/Inventory';
import { MusicButton } from '../app/MusicButton';
import { PlayersData } from '../app/PlayersData';
import { ScreenManager } from '../app/ScreenManager';
import { buildPlaygroundBg } from './MenuScreen';
import { dimmer, emblemV2Frame } from './TournamentUI';

/** Màn bục nhận giải (SPEC §1.4 FinalTournament). */
export class FinalTournamentScreen extends FLScreen {
    private done = false;

    build(): void {
        buildPlaygroundBg(this.root);
        dimmer(this.root, 204);
        const t = Inventory.rounds;
        const me = Inventory.teams[0], mine = Inventory.players[0];
        const out = Inventory.outInfo;

        // centeredContent (x giữa, y Phaser xuống) + playersGroup scale .7 tại y=80
        const content = UIKit.node(this.root, 'content', 0, 0);
        const group = UIKit.node(content, 'playersGroup', 0, P2C.y(80));
        group.setScale(0.7, 0.7, 1);

        // Tribune: sprite (0,443) anchor (.5,1) -> Cocos y = -443; con của tribune tính từ vị trí sprite
        const tribune = UIKit.sprite(group, 'TribuneFinal0000', 0, -443, 0.5, 0).node;
        const tribune4 = UIKit.node(group, 'tribune4', 280, -360);

        let thePlayer: dragonBones.ArmatureDisplay | null = null;
        let frame = '';
        let title = '';
        const makePlayer = (parentNode: Node, x: number, y: number, sx: number, teamNo: number, isMe: boolean, anim: string): dragonBones.ArmatureDisplay | null => {
            const g = UIKit.node(parentNode, 'player', x, y);
            g.setScale(sx * 0.8, 0.8, 1);
            UIKit.sprite(g, 'ShadowMC0000', 0, 0).node.setScale(1.8 / 0.8, 1.8 / 0.8, 1);
            const d = PlayersData.createPlayer(g, 0, 0, 1);
            if (isMe) PlayersData.switchPlayer(d, 2 * (me - 1) + (mine - 1), 0);
            else PlayersData.switchPlayer(d, 2 * (teamNo - 1), 1);
            const a = d && d.armature();
            if (a) a.animation.play(anim);
            return d;
        };
        // hạng 1 (-6,-93), hạng 2 (-97,-77), hạng 3 (97,-70) trong tribune; tribune có gốc tại (0,-443) trong group
        const spots: { team: number; x: number; y: number; frame: string; label: string }[] = [
            { team: t[32], x: -6, y: -93, frame: 'frame1', label: '1st PLACE!!!' },
            { team: t[34], x: -97, y: -77, frame: 'frame2', label: '2nd PLACE!!!' },
            { team: t[33], x: 97, y: -70, frame: 'frame3', label: '3d PLACE!!!' },
        ];
        for (const s of spots) {
            const isMe = s.team === me;
            const d = makePlayer(tribune, s.x, -s.y, 1, s.team, isMe, isMe ? 'happy' : 'idle');
            if (isMe) { thePlayer = d; frame = s.frame; title = s.label; }
        }

        if (out !== '') title = out === '4' ? '4th PLACE' : 'YOU LOST';
        UIKit.label(this.root, title, 'calibri48', 0, P2C.y(35));

        // emblem + tên đội hạng 1/2/3 (centeredContent)
        const places: [number, number][] = [[t[32], 0], [t[34], -106], [t[33], 106]];
        for (const [team, x] of places) {
            UIKit.sprite(content, emblemV2Frame(team), x, P2C.y(110));
            UIKit.label(content, PlayersData.clubName(team - 1), 'calibri20', x, P2C.y(150));
        }

        if (out === '') {
            this.showCup(thePlayer, frame);
        } else {
            // hạng ngoài top 3: panel phụ bên phải với cầu thủ buồn
            UIKit.sprite(content, emblemV2Frame(me), 216, P2C.y(160));
            UIKit.label(content, PlayersData.clubName(me - 1), 'calibri20', 216, P2C.y(200));
            UIKit.label(content, out, 'calibri20', 180, P2C.y(380));
            const p4 = makePlayer(tribune4, -10, -52, -1, me, true, 'sad');
            void p4;
        }

        MusicButton.create(this.root);
        const gw = ScreenManager.gameWidthLogic;
        UIKit.button(this.root, { skin: 'yellow', w: 192, h: 76, text: 'NEXT', style: 'calibri40', x: P2C.x(gw - 96 - 10), y: P2C.y(440) }, () => this.onPlay());
    }

    /** Hiện cúp trên cầu thủ của người chơi (bone/slot 'cup' -> frame1/2/3). */
    private showCup(d: dragonBones.ArmatureDisplay | null, frame: string): void {
        const a = d && d.armature();
        const slot = a && a.getSlot('cup');
        const child = slot && slot.childArmature;
        if (child && frame) child.animation.gotoAndStopByTime(frame, 0.1);
    }

    private onPlay(): void {
        if (this.done) return;
        this.done = true;
        Inventory.clearTournamentData();
        ScreenManager.go(backToModeMenu());
    }
}
