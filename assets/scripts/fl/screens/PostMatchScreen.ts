import { Color, EventKeyboard, Graphics, input, Input, KeyCode, Node, tween, UITransform, Vec3 } from 'cc';
import { FLScreen } from '../app/Screen';
import { UIKit } from '../app/UIKit';
import { P2C } from '../app/Coords';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { NetworkManager } from '../app/NetworkManager';
import { MusicButton } from '../app/MusicButton';
import { PlayersData } from '../app/PlayersData';
import { ScreenManager } from '../app/ScreenManager';
import { buildPlaygroundBg } from './MenuScreen';

/** Khoá NEXT/BACK sau khi thắng (botButtonsDelay = 3000 ms). */
const WIN_LOCK = 3;

/** Màn kết quả trận (SPEC §1.4 PostMatch). */
export class PostMatchScreen extends FLScreen {
    private nextState = 'Menu';
    private lock = 0;
    private done = false;
    private keyHandler = (e: EventKeyboard) => { if (e.keyCode === KeyCode.SPACE) this.onNext(); };

    build(): void {
        const s1 = MatchData.score1, s2 = MatchData.score2;
        // Gửi điểm khi kết thúc trận: score = số bàn của người chơi (đội trái, T_1)
        NetworkManager.instance.httpPost("/saveScore", {
            "username": Inventory.userName,
            "score": s1,
            "time": MatchData.sessionTimeSeconds
        });
        const t1 = Inventory.teams[0] - 1, t2 = Inventory.teams[1] - 1;
        const tournament = Inventory.gameMode === 0 && !Inventory.isQuickMatch;
        buildPlaygroundBg(this.root);

        // Nền tối phủ toàn màn (backgroundFade: đen alpha .8)
        const fade = UIKit.node(this.root, 'fade');
        const g = fade.addComponent(Graphics);
        g.fillColor = new Color(0, 0, 0, 204);
        g.rect(-1000, -600, 2000, 1200);
        g.fill();

        // Panel id 2 tại y=100: bg 450x360 anchor (.5,.21) -> tâm lệch 104.4 xuống
        const panel = UIKit.node(this.root, 'panel', 0, P2C.y(100));
        UIKit.slice(panel, 'dark_blue', 450, 360, 0, -104.4);
        const title = s1 > s2 ? 'YOU WON!!!' : s1 < s2 ? 'YOU LOST' : 'DRAW';
        UIKit.label(panel, title, 'calibri48', 0, 40);
        UIKit.label(panel, s1 + ' : ' + s2, 'calibri80', 0, -15);
        const e1 = UIKit.sprite(panel, PlayersData.emblemFrame(t1), -140, -15);
        const e2 = UIKit.sprite(panel, PlayersData.emblemFrame(t2), 140, -15);
        const nameY = -(15 + 0.5 * (24 + e1.node.getComponent(UITransform)!.height));
        UIKit.label(panel, PlayersData.clubName(t1), 'calibri20', -140, nameY);
        UIKit.label(panel, PlayersData.clubName(t2), 'calibri20', 140, nameY);
        void e2;
        // Tournament + thua -> nút Rematch miễn phí (bản gốc: xem quảng cáo) khôi phục backup trước trận
        if (tournament && s1 < s2) {
            const rb = UIKit.button(panel, { skin: 'yellow', w: 192, h: 76, text: 'Rematch', style: 'calibri30', x: 0, y: -230 }, () => this.onRematch());
            void rb;
        }

        // 2 cầu thủ trên shadow 2.5 tại (±125,350), scale .8 (P2 lật ngang)
        const anim = s1 > s2 ? ['happy', 'sad'] : s1 < s2 ? ['sad', 'happy'] : ['idle', 'idle'];
        [-1, 1].forEach((side, i) => {
            const grp = UIKit.node(this.root, 'player' + i, side * 125, P2C.y(350));
            grp.setScale(side * 0.8, 0.8, 1);
            UIKit.sprite(grp, 'ShadowMC0000', 0, 0).node.setScale(2.5, 2.5, 1);
            const d = PlayersData.createPlayer(grp, 0, 0, 1);
            const idx = 2 * (Inventory.teams[i] - 1) + (Inventory.players[i] - 1);
            PlayersData.switchPlayer(d, idx, i);
            const a = d && d.armature();
            if (a) a.animation.play(anim[i], -1);
        });

        // Next state
        if (Inventory.isQuickMatch) this.nextState = 'Menu';
        else if (Inventory.gameMode === 0) this.nextState = Inventory.nextLeg(s1, s2) ? 'Tournament' : 'FinalTournament';
        else this.nextState = 'RandomState';

        MusicButton.create(this.root);
        this.lock = s1 > s2 ? WIN_LOCK : 0;
        const gw = ScreenManager.gameWidthLogic;
        const btns: Node[] = [];
        btns.push(UIKit.button(this.root, { skin: 'yellow', w: 192, h: 76, text: 'NEXT', style: 'calibri40', x: P2C.x(gw - 96 - 10), y: P2C.y(440) }, () => this.onNext()));
        const back = UIKit.button(this.root, { skin: 'blue', w: 192, h: 76, text: 'BACK', style: 'calibri40', x: P2C.x(96 + 10), y: P2C.y(440) }, () => this.onBack());
        back.active = !tournament;
        btns.push(back);
        // Khi thắng: nút nằm ngoài màn 3s rồi trượt vào (Back.Out)
        if (this.lock > 0) {
            for (const b of btns) {
                const y = b.position.y;
                b.setPosition(b.position.x, P2C.y(520), 0);
                tween(b).delay(WIN_LOCK).to(0.325, { position: new Vec3(b.position.x, y, 0) }, { easing: 'backOut' }).start();
            }
        }
        input.on(Input.EventType.KEY_UP, this.keyHandler, this);
    }

    update(dt: number): void { if (this.lock > 0) this.lock = Math.max(0, this.lock - dt); }

    onExit(): void { input.off(Input.EventType.KEY_UP, this.keyHandler, this); }

    private onNext(): void {
        if (this.lock > 0 || this.done) return;
        this.done = true;
        ScreenManager.go(this.nextState);
    }

    private onRematch(): void {
        if (this.done) return;
        this.done = true;
        Inventory.restoreTournamentFromBackup();
        ScreenManager.go('Tournament');
    }

    /** BACK = đấu lại ngay (chỉ friendly/quick). */
    private onBack(): void {
        if (this.lock > 0 || this.done) return;
        this.done = true;
        MatchData.clearScore();
        ScreenManager.go('Gameplay');
    }
}
