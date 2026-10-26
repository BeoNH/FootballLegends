import { Node, UIOpacity, view, Layers } from 'cc';
import { FLScreen } from './Screen';

const FADE = 0.325;

/** Quản lý màn hình hiện tại + chuyển cảnh fade 325 ms (SPEC §1.1). */
export class ScreenManager {
    private static container: Node;
    private static ctors: { [name: string]: new () => FLScreen } = {};
    private static current: FLScreen | null = null;
    private static opacity: UIOpacity;
    /** 0 idle, 1 fade out, 2 fade in */
    private static phase = 0;
    private static t = 0;
    private static pending: { name: string; params: any } | null = null;

    static get gameWidthLogic(): number { return view.getVisibleSize().width; }

    static init(container: Node): void {
        ScreenManager.container = container;
        ScreenManager.opacity = container.getComponent(UIOpacity) || container.addComponent(UIOpacity);
    }

    static register(name: string, ctor: new () => FLScreen): void { ScreenManager.ctors[name] = ctor; }

    static get currentScreen(): FLScreen | null { return ScreenManager.current; }

    /** Chuyển màn: fade out màn cũ -> build màn mới -> fade in. Lần đầu (chưa có màn) vào ngay. */
    static go(name: string, params?: any): void {
        if (ScreenManager.phase === 1) { ScreenManager.pending = { name, params }; return; }
        ScreenManager.pending = { name, params };
        if (!ScreenManager.current) { ScreenManager.swap(); return; }
        ScreenManager.phase = 1;
        ScreenManager.t = 0;
    }

    private static swap(): void {
        const p = ScreenManager.pending!;
        ScreenManager.pending = null;
        const old = ScreenManager.current;
        if (old) {
            old.onExit();
            old.root.destroy();
        }
        const Ctor = ScreenManager.ctors[p.name];
        if (!Ctor) { console.error('[ScreenManager] chưa register', p.name); return; }
        const s = new Ctor();
        const root = new Node(p.name);
        root.layer = Layers.Enum.UI_2D;
        ScreenManager.container.addChild(root);
        s.root = root;
        ScreenManager.current = s;
        s.build(p.params);
        ScreenManager.phase = 2;
        ScreenManager.t = 0;
        ScreenManager.opacity.opacity = 0;
    }

    static update(dt: number): void {
        const S = ScreenManager;
        if (S.phase === 1) {
            S.t += dt;
            S.opacity.opacity = Math.round(255 * Math.max(0, 1 - S.t / FADE));
            if (S.t >= FADE) S.swap();
        } else if (S.phase === 2) {
            S.t += dt;
            S.opacity.opacity = Math.round(255 * Math.min(1, S.t / FADE));
            if (S.t >= FADE) { S.opacity.opacity = 255; S.phase = 0; }
        }
        if (S.current) S.current.update(dt);
    }
}
