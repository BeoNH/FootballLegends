import { _decorator, Component, instantiate, Node, Prefab, resources } from 'cc';
import BroadcastReceiver from '../../common/BroadcastReceiver';
import { GAME_EVENTS } from '../../common/GameEvents';
import { IMatchResultPayload } from '../../common/GameTypes';
import { MatchData } from '../../gameplay/MatchData';
import { UiPopup } from './UiPopup';

const { ccclass } = _decorator;

export const POPUP_MENU = 'MenuPopup';
export const POPUP_HALFTIME = 'HalfTimePopup';
export const POPUP_RESULT = 'ResultPopup';
/** Thư mục prefab popup trong resources. */
const POPUP_DIR = 'prefabs/popup/';

/** Mở popup động: load prefab (cache), instantiate dưới node PopupRoot (node chứa component này), tái dùng instance đã ẩn. */
@ccclass('PopupManager')
export class PopupManager extends Component {
    public static instance: PopupManager | null = null;

    private readonly prefabs = new Map<string, Prefab>();
    private readonly instances = new Map<string, UiPopup>();

    protected onLoad(): void {
        PopupManager.instance = this;
        BroadcastReceiver.register(GAME_EVENTS.MATCH_HALFTIME, this.onHalfTime, this);
        BroadcastReceiver.register(GAME_EVENTS.MATCH_RESULT, this.onResult, this);
    }

    protected start(): void {
        void this.show(POPUP_MENU);
    }

    protected onDestroy(): void {
        BroadcastReceiver.unRegisterByTarget(this);
        if (PopupManager.instance === this) {
            PopupManager.instance = null;
        }
    }

    public async show(name: string, data?: any): Promise<UiPopup | null> {
        let popup = this.instances.get(name) ?? null;
        if (popup == null || !popup.isValid) {
            const prefab = await this.loadPrefab(name);
            if (prefab == null || !this.isValid) {
                return null;
            }
            const node: Node = instantiate(prefab);
            node.setParent(this.node);
            popup = node.getComponent(UiPopup);
            if (popup == null) {
                console.warn(`[PopupManager] ${name} thiếu component UiPopup`);
                node.destroy();
                return null;
            }
            this.instances.set(name, popup);
        }
        popup.show(data);
        return popup;
    }

    private loadPrefab(name: string): Promise<Prefab | null> {
        const cached = this.prefabs.get(name);
        if (cached != null) {
            return Promise.resolve(cached);
        }
        return new Promise((resolve) => {
            resources.load(`${POPUP_DIR}${name}`, Prefab, (err, prefab) => {
                if (err != null || prefab == null) {
                    console.warn(`[PopupManager] không load được ${POPUP_DIR}${name}`, err);
                    resolve(null);
                    return;
                }
                this.prefabs.set(name, prefab);
                resolve(prefab);
            });
        });
    }

    private onHalfTime(): void {
        void this.show(POPUP_HALFTIME, { score1: MatchData.score1, score2: MatchData.score2 });
    }

    private onResult(data: IMatchResultPayload): void {
        void this.show(POPUP_RESULT, data);
    }
}
