import { _decorator, Component } from 'cc';
import { Res } from './Res';
import { ScreenManager } from './ScreenManager';
import { Sfx } from './Sfx';
import { Inventory } from './Inventory';
import { PreloaderScreen } from '../screens/PreloaderScreen';
import { MenuScreen, Menu2Screen } from '../screens/MenuScreen';
import { RandomStateScreen } from '../screens/RandomStateScreen';
import { PostMatchScreen } from '../screens/PostMatchScreen';
import { TournamentStateScreen } from '../screens/TournamentStateScreen';
import { PreMatchScreen } from '../screens/PreMatchScreen';
import { FinalTournamentScreen } from '../screens/FinalTournamentScreen';
import { GameplayScreen } from '../game/GameplayScreen';

const { ccclass } = _decorator;

/** Entry point của bản port: gắn vào node 'App' trong Main.scene. */
@ccclass('FLGameApp')
export class FLGameApp extends Component {
    protected onLoad(): void {
        ScreenManager.init(this.node);

        ScreenManager.register('Preloader', PreloaderScreen);
        ScreenManager.register('Menu', MenuScreen);
        ScreenManager.register('Menu2', Menu2Screen);
        ScreenManager.register('RandomState', RandomStateScreen);
        ScreenManager.register('PostMatch', PostMatchScreen);
        ScreenManager.register('Tournament', TournamentStateScreen);
        ScreenManager.register('PreMatch', PreMatchScreen);
        ScreenManager.register('FinalTournament', FinalTournamentScreen);
        ScreenManager.register('Gameplay', GameplayScreen);
    }

    protected start(): void {
        Sfx.init();
        Inventory.load();
        ScreenManager.go('Preloader');
        const pre = ScreenManager.currentScreen as PreloaderScreen;
        Res.load((p) => pre.setProgress(p)).then(() => {
            Sfx.startMusic();
            ScreenManager.go('Menu');
        });
    }

    protected update(dt: number): void {
        ScreenManager.update(Math.min(dt, 0.1));
    }
}
