import { _decorator, Component } from 'cc';
import { Res } from './fl/app/Res';
import { ScreenManager } from './fl/app/ScreenManager';
import { Sfx } from './fl/app/Sfx';
import { Inventory } from './fl/app/Inventory';
import { NetworkManager, urlParam } from './fl/app/NetworkManager';
import { PreloaderScreen } from './fl/screens/PreloaderScreen';
import { MenuScreen, Menu2Screen } from './fl/screens/MenuScreen';
import { RandomStateScreen } from './fl/screens/RandomStateScreen';
import { PostMatchScreen } from './fl/screens/PostMatchScreen';
import { TournamentStateScreen } from './fl/screens/TournamentStateScreen';
import { PreMatchScreen } from './fl/screens/PreMatchScreen';
import { FinalTournamentScreen } from './fl/screens/FinalTournamentScreen';
import { GameplayScreen } from './fl/game/GameplayScreen';

const { ccclass } = _decorator;

/** Entry point của bản port: gắn vào node 'App' trong Main.scene. */
@ccclass('FLGameApp')
export class FLGameApp extends Component {
    protected onLoad(): void {
        ScreenManager.init(this.node);
        ScreenManager.registerAll({
            Preloader: PreloaderScreen,
            Menu: MenuScreen,
            Menu2: Menu2Screen,
            RandomState: RandomStateScreen,
            PostMatch: PostMatchScreen,
            Tournament: TournamentStateScreen,
            PreMatch: PreMatchScreen,
            FinalTournament: FinalTournamentScreen,
            Gameplay: GameplayScreen,
        });
    }

    protected async start(): Promise<void> {
        Sfx.init();
        Inventory.load();
        ScreenManager.go('Preloader');
        const pre = ScreenManager.currentScreen as PreloaderScreen;
        Res.load((p) => pre.setProgress(p)).then(() => {
            Sfx.startMusic();
            ScreenManager.go('Menu');
        });
        // Đăng nhập bằng token trên URL (không chặn luồng load)
        const login = await NetworkManager.instance.httpPost("/login", { token: urlParam("token") });
        if (login) {
            Inventory.userName = login?.username;
        }
    }

    protected update(dt: number): void {
        ScreenManager.update(Math.min(dt, 0.1));
    }
}
