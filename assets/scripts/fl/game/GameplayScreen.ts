import { KeyCode, Node } from 'cc';
import { backToModeMenu } from '../app/Features';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { ScreenManager } from '../app/ScreenManager';
import { FLScreen } from '../app/Screen';
import { UIKit } from '../app/UIKit';
import { Keys } from './Controllers';
import { FinishType, FootballGameCore } from './GameCore';
import { GameLayers } from './GameTypes';
import { PausePopup, TopRightButtons } from './Hud';

/** Chuyển màn có kiểm tra đã register (ScreenManager.go không báo lỗi sớm). Thiếu -> 'Menu'. */
function goSafe(name: string, params?: any): void {
    const reg = (ScreenManager as any).ctors || {};
    ScreenManager.go(reg[name] ? name : 'Menu', params);
}

/**
 * Màn chơi (port FootballGameView + Gameplay state, SPEC §1.4, §5).
 * Cấu trúc node: root / gameObjects(back, shadows, players, ball, effects, goals) / physics / gui(HUD).
 * `physics` KHÔNG scale để collider/vị trí Box2D đúng; `gameObjects` có thể scale khi màn hẹp (<800).
 */
export class GameplayScreen extends FLScreen {
    private core: FootballGameCore | null = null;
    private topRight: TopRightButtons | null = null;
    private popup: PausePopup | null = null;
    private gw = 800;
    private onKeyPress = (code: number) => this.handleKey(code);

    build(params?: any): void {
        this.gw = ScreenManager.gameWidthLogic;
        const root = this.root;
        const fit = Math.min(1, this.gw / 800);

        const gameObjects = UIKit.node(root, 'gameObjects');
        gameObjects.setScale(fit, fit, 1);
        const mk = (n: string) => UIKit.node(gameObjects, n);
        const back = mk('back'), shadows = mk('shadows'), players = mk('players'), ball = mk('ball'), effects = mk('effects'), goals = mk('goals');
        const physRoot = UIKit.node(root, 'physics');
        const gui = UIKit.node(root, 'gui');
        gui.setScale(fit, fit, 1);
        const layers: GameLayers = { gameObjects, back, shadows, players, ball, effects, goals, physRoot, gui };

        Keys.init();
        Keys.onPress(this.onKeyPress);

        const core = new FootballGameCore(layers);
        core.onFinish = (type) => this.onFinish(type);
        this.core = core;
        core.init();

        this.topRight = new TopRightButtons(gui, this.gw / fit, () => this.pause());
    }

    update(dt: number): void {
        const core = this.core;
        if (!core) return;
        const gw = ScreenManager.gameWidthLogic;
        if (gw !== this.gw) {
            this.gw = gw;
            const fit = Math.min(1, gw / 800);
            this.topRight?.layout(gw / fit);
        }
        core.frame(dt);
    }

    // ---------------- pause ----------------
    pause(): void {
        const core = this.core;
        if (!core || core.isPaused || core.finished) return;
        core.isPlaying = false;
        core.isPaused = true;
        this.topRight?.setPauseVisible(false);
        this.popup = new PausePopup(this.root.getChildByName('gui') as Node, Inventory.teams, MatchData.score1, MatchData.score2,
            () => this.back(), () => this.resume());
    }

    /** Resume không tiếp tục ngay mà chạy lại countdown 3-2-1-GO. */
    resume(): void {
        const core = this.core;
        if (!core || !this.popup) return;
        this.popup.destroy();
        this.popup = null;
        this.topRight?.setPauseVisible(true);
        core.resumeFromPause();
    }

    /** BACK trong pause -> Quick ? Menu : Menu2 (không confirm). */
    back(): void {
        const core = this.core;
        if (!core) return;
        core.finished = true;
        core.isPaused = true;
        if (this.popup) { this.popup.destroy(); this.popup = null; }
        goSafe(Inventory.isQuickMatch ? 'Menu' : backToModeMenu());
    }

    private handleKey(code: number): void {
        const core = this.core;
        if (!core || core.finished) return;
        if (code === KeyCode.KEY_P) {
            if (core.isPaused) this.resume(); else this.pause();
        } else if (code === KeyCode.SPACE) {
            if (core.isPaused) this.resume();
        }
    }

    // ---------------- kết thúc trận ----------------
    private onFinish(type: FinishType): void {
        if (type === 'HalfTime') {
            MatchData.matchState = 2;
            goSafe('PreMatch');
        } else {
            goSafe('PostMatch');
        }
    }

    onExit(): void {
        Keys.offPress(this.onKeyPress);
        if (this.core) {
            this.core.finished = true;
            this.core.release();
            this.core = null;
        }
        Keys.dispose();
    }
}
