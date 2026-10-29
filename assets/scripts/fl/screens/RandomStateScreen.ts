import { dragonBones, EventKeyboard, input, Input, KeyCode, Node, Sprite, SpriteFrame, Label } from 'cc';
import { Features, backToModeMenu, sanitizeMatchMode } from '../app/Features';
import { FLScreen } from '../app/Screen';
import { UIKit, Skin } from '../app/UIKit';
import { P2C } from '../app/Coords';
import { Res } from '../app/Res';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { MusicButton } from '../app/MusicButton';
import { PlayersData } from '../app/PlayersData';
import { ScreenManager } from '../app/ScreenManager';
import { buildPlaygroundBg } from './MenuScreen';

const TEAMS_COUNT = 24;
/** Cầu thủ + bóng đổ nằm giữa 2 vị trí cũ (-72 / 88). */
const SHADOW_X = 8;

/** Slice anchor trái-trên (như createNineSlice không set anchor): toạ độ Phaser (tlx,tly) -> tâm Cocos. */
function boxTL(parent: Node, skin: Skin, w: number, h: number, tlx: number, tly: number): Sprite {
    return UIKit.slice(parent, skin, w, h, tlx + w / 2, -(tly + h / 2));
}

/** Panel chọn CLB + cầu thủ (SelectPlayer gốc, 340x364). Toạ độ con theo Phaser (y xuống) -> local Cocos (-y). */
export class SelectPlayer {
    node: Node;
    emblem = 1;
    private arm: dragonBones.ArmatureDisplay | null = null;
    private shadow1: Node;
    private label1: Label;
    private fxIcon: Sprite;
    private fxName: Label;
    private emblemSp: Sprite;
    private clubName: Label;

    constructor(parent: Node, private id: number, x: number, y: number, showArrows: boolean, private onChanged: () => void, fixedEmblem = 0) {
        const n = this.node = UIKit.node(parent, 'SelectPlayer' + id, x, 240 - y);
        // bg anchor (.49,.21) -> tâm panel lệch (3.4, 105.56)
        UIKit.slice(n, 'dark_blue', 340, 364, 3.4, -105.56);
        const sh = (frame: string, sx: number): Node => {
            const s = UIKit.sprite(n, frame, sx, -220);
            s.node.setScale(1.5, 1.5, 1);
            return s.node;
        };
        sh('ShadowMC0000', SHADOW_X);
        this.shadow1 = sh('ShadowMC_or0000', SHADOW_X);
        if (showArrows) {
            UIKit.iconButton(n, 'btn_blue_arrow0000', -89, -14, -1, () => this.changeTeam(-1));
            UIKit.iconButton(n, 'btn_blue_arrow0000', 89, -14, 1, () => this.changeTeam(1));
        }
        // 1 ô hiệu ứng ở giữa, đổi theo cầu thủ random (showPlayer)
        boxTL(n, 'yellow', 160, 54, SHADOW_X - 80, 228);
        this.fxIcon = UIKit.sprite(n, 'icon_ball0000', SHADOW_X - 43, -253); this.fxIcon.node.setScale(0.6, 0.6, 1);
        this.fxName = UIKit.label(n, 'Fireball', 'calibri20_blue', SHADOW_X + 14, -252);

        // Team mặc định: P1 = team đã lưu + 1; P2 giữ team cũ nếu hợp lệ và khác P1
        const teams = Inventory.teams;
        if (fixedEmblem > 0) this.emblem = fixedEmblem;
        else if (id === 0) this.emblem = Inventory.getTeam() + 1;
        else this.emblem = (teams[1] > 0 && teams[1] !== teams[0]) ? teams[1] : (teams[0] === 1 ? 2 : 1);
        teams[id] = this.emblem;

        boxTL(n, 'navy', 160, 36, -80, -66);
        boxTL(n, 'blue', 128, 92, -64, -32);
        this.emblemSp = UIKit.sprite(n, PlayersData.emblemFrame(this.emblem - 1), 0, -10);
        this.clubName = UIKit.label(n, PlayersData.clubName(this.emblem - 1), 'calibri26_yellow', 0, 45);
        UIKit.fitLabel(this.clubName, 130, 60);
        this.label1 = UIKit.label(n, '', 'calibri16', SHADOW_X, -64);

        // 1 cầu thủ duy nhất ở giữa panel (random 1 trong 2 cầu thủ của CLB)
        this.arm = PlayersData.createPlayer(n, SHADOW_X, -217.5, 0.65);
        this.showPlayer();
    }

    /** t: 0 = 1 người (label "Player N"), 1 = 2 người cùng đội (chỉ còn 1 cầu thủ -> như 0), 2 = đội CPU (không label). */
    setUp(t = 0): void {
        this.label1.node.active = t !== 2;
        if (t !== 2) this.label1.string = 'Player ' + (t === 1 ? 1 : this.id + 1);
    }

    /** Random cầu thủ 1/2 của CLB hiện tại, ghi vào Inventory.players. */
    private showPlayer(): void {
        const p = Math.random() < 0.5 ? 1 : 2;
        Inventory.players[this.id] = p;
        PlayersData.switchPlayer(this.arm, 2 * this.emblem - 3 + p, this.id);
        // skin chẵn (p=1) = Fireball, lẻ (p=2) = Teleport (PlayerObject.superPower)
        this.fxIcon.spriteFrame = Res.frame(p === 1 ? 'icon_ball0000' : 'icon_ball0001') as SpriteFrame;
        this.fxName.string = p === 1 ? 'Fireball' : 'Teleport';
        const a = this.arm && this.arm.armature();
        if (a) a.animation.play('idle', -1);
    }

    /** Mũi tên đổi team: vòng 1..24, tránh trùng team bên kia (nhảy thêm 1 bước). */
    private changeTeam(dir: number): void {
        const step = () => {
            this.emblem += dir;
            if (this.emblem === 0) this.emblem = TEAMS_COUNT;
            else if (this.emblem > TEAMS_COUNT) this.emblem = 1;
        };
        step();
        if (this.emblem === Inventory.teams[(this.id + 1) % 2]) step();
        Inventory.teams[this.id] = this.emblem;
        this.emblemSp.spriteFrame = Res.frame(PlayersData.emblemFrame(this.emblem - 1)) as SpriteFrame;
        this.clubName.string = PlayersData.clubName(this.emblem - 1);
        this.showPlayer();
        this.onChanged();
    }
}

/** Panel chọn mode 1v1 / 2v2 / 1v2 (MatchModePanel gốc, 144x260). */
class MatchModePanel {
    node: Node;
    private sel: Node;
    private btnY = [-30, 30, 90];
    private cpu: Node | null = null;
    private cpu2: Node | null = null;

    constructor(parent: Node, x: number, y: number, private onChange: () => void) {
        const n = this.node = UIKit.node(parent, 'MatchModePanel', x, 240 - y);
        UIKit.slice(n, 'dark_blue', 144, 260, 0, 0);
        [-90, -30, 30, 90].forEach((by, k) => { if (k === 0 || Features.matchModes[k - 1]) UIKit.slice(n, 'navy', 128, 48, 0, -by); });
        UIKit.label(n, 'Mode', 'calibri30_yellow', 0, 86);
        this.sel = UIKit.slice(n, 'yellow_fill', 128, 56, 0, 0).node;

        const twoPl = Inventory.numPlayers !== 0;
        const icons: number[][][] = [
            [[-36, -5], [36, -5]],
            [[-45, -7], [-30, -3], [45, -7], [30, -3]],
            [[45, -7], [30, -3], ...(twoPl ? [[-45, -7], [-30, -3]] : [[-36, -5]])],
        ];
        this.btnY.forEach((by, i) => {
            if (!Features.matchModes[i]) return;
            const b = UIKit.node(n, 'mode' + i, 0, -by);
            UIKit.label(b, 'vs', 'calibri30', 0, 0);
            for (const [ix, iy] of icons[i]) UIKit.sprite(b, 'iconPl0000', ix, -iy);
            UIKit.zone(b, 128, 48, 0, 0, () => { Inventory.matchMode = i; this.setState(i); this.onChange(); });
            if (i === 2 && twoPl) {
                this.cpu = UIKit.label(b, 'CPU', 'calibri16_orange', 45, -12).node;
                this.cpu2 = UIKit.label(b, 'CPU', 'calibri16_blue', 45, -12).node;
            }
        });
        this.setState(Inventory.matchMode);
    }

    private setState(m: number): void {
        this.sel.setPosition(0, -this.btnY[m], 0);
        if (this.cpu && this.cpu2) { this.cpu.active = m !== 2; this.cpu2.active = m === 2; }
    }
}

/** Màn chọn team / cầu thủ / mode (SPEC §1.4 RandomState). Friendly (gameMode=1) hoặc Tournament (0). */
export class RandomStateScreen extends FLScreen {
    private sp1!: SelectPlayer;
    private sp2: SelectPlayer | null = null;
    private done = false;
    private keyHandler = (e: EventKeyboard) => { if (e.keyCode === KeyCode.SPACE) this.onPrimary(); };

    build(): void {
        const friendly = Inventory.gameMode === 1;
        Inventory.matchMode = sanitizeMatchMode(Inventory.matchMode);
        Inventory.isQuickMatch = false;
        MatchData.matchState = friendly ? 0 : 1;
        buildPlaygroundBg(this.root);
        const content = UIKit.node(this.root, 'content', 0, 0);

        const processMode = () => this.processMatchMode();
        this.sp1 = new SelectPlayer(content, 0, -228, 122, true, processMode);
        if (friendly) this.sp2 = new SelectPlayer(content, 1, 228, 122, true, processMode);

        if (!friendly) {
            if (Inventory.numPlayers === 0) { new MatchModePanel(content, 4, 178, processMode); this.createDifficulty(content); }
            this.sp1.setUp(Inventory.numPlayers);
        } else {
            new MatchModePanel(content, 4, 178, processMode);
            this.processMatchMode();
        }

        // Tiêu đề vẽ sau cùng (đè lên đỉnh panel): nút-label darkblue 500x60 tại (0,31)
        UIKit.slice(content, 'dark_blue', 500, 60, 0, P2C.y(35 - 4));
        UIKit.label(content, friendly ? 'Friendly Match' : 'Championship', 'calibri40_yellow', 0, P2C.y(35 - 4));

        MusicButton.create(this.root);

        const gw = ScreenManager.gameWidthLogic;
        UIKit.button(this.root, { skin: 'yellow', w: 192, h: 76, text: friendly ? 'PLAY' : 'NEXT', style: 'calibri40', x: P2C.x(gw - 96 - 10), y: P2C.y(446) }, () => this.onPrimary());
        UIKit.button(this.root, { skin: 'blue', w: 192, h: 76, text: 'BACK', style: 'calibri40', x: P2C.x(96 + 10), y: P2C.y(446) }, () => this.onBack());
        input.on(Input.EventType.KEY_UP, this.keyHandler, this);
    }

    onExit(): void { input.off(Input.EventType.KEY_UP, this.keyHandler, this); }

    /** Cập nhật label/shadow theo mode (chỉ friendly). Tournament: setUp(numPlayers) ở build. */
    private processMatchMode(): void {
        if (Inventory.gameMode !== 1 || !this.sp2) return;
        if (Inventory.numPlayers === 0) { this.sp1.setUp(); this.sp2.setUp(2); }
        else if (Inventory.matchMode === 2) { this.sp1.setUp(1); this.sp2.setUp(2); }
        else { this.sp1.setUp(); this.sp2.setUp(); }
    }

    /** Panel độ khó (chỉ tournament 1 người): panel 144x154 tại (3,380), Normal/Hard. */
    private createDifficulty(parent: Node): void {
        const n = UIKit.node(parent, 'Difficulty', 3, P2C.y(380));
        UIKit.slice(n, 'dark_blue', 144, 154, 0, 0);
        UIKit.slice(n, 'navy', 128, 48, 0, 30);
        UIKit.slice(n, 'navy', 128, 48, 0, -30);
        UIKit.label(n, 'Normal', 'calibri30', 0, 30);
        UIKit.label(n, 'Hard', 'calibri30', 0, -30);
        const mk = (text: string, y: number): Node => {
            const b = UIKit.node(n, text + 'Sel', 0, y);
            UIKit.slice(b, 'yellow_fill', 128, 56, 0, 0);
            UIKit.label(b, text, 'calibri30', 0, 0);
            return b;
        };
        const normal = mk('Normal', 30), hard = mk('Hard', -30);
        hard.active = false;
        Inventory.difficulty = 0;
        const set = (d: number) => { Inventory.difficulty = d; normal.active = d === 0; hard.active = d === 1; };
        UIKit.zone(n, 128, 48, 0, 30, () => set(0), true);
        UIKit.zone(n, 128, 48, 0, -30, () => set(1), true);
    }

    private onPrimary(): void {
        if (this.done) return;
        this.done = true;
        Inventory.team = this.sp1.emblem - 1;
        Inventory.save();
        if (Inventory.gameMode === 1) {
            Inventory.botSkill = 0.3;
            MatchData.matchState = 0;
            MatchData.clearScore();
            ScreenManager.go('Gameplay');
        } else {
            Inventory.createNewTournament();
            ScreenManager.go('Tournament');
        }
    }

    private onBack(): void {
        if (this.done) return;
        this.done = true;
        ScreenManager.go(backToModeMenu());
    }
}
