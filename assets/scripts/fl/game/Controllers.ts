import { EventKeyboard, Input, input, KeyCode } from 'cc';
import { IController } from './GameTypes';
import type { PlayerObject } from './PlayerObject';

/** Trạng thái phím vật lý (GamePad của bản gốc, SPEC §4). */
export class Keys {
    private static down: { [code: number]: boolean } = {};
    private static refs = 0;
    private static pressHandlers: Array<(code: number) => void> = [];
    private static docHandler: ((e: KeyboardEvent) => void) | null = null;

    static init(): void {
        if (Keys.refs++ > 0) return;
        Keys.down = {};
        input.on(Input.EventType.KEY_DOWN, Keys.onDown, Keys);
        input.on(Input.EventType.KEY_UP, Keys.onUp, Keys);
        // chặn cuộn trang bằng mũi tên/space (addKeyCapture của Phaser)
        if (typeof document !== 'undefined') {
            Keys.docHandler = (e: KeyboardEvent) => {
                if (e.keyCode >= 37 && e.keyCode <= 40 || e.keyCode === 32) e.preventDefault();
            };
            document.addEventListener('keydown', Keys.docHandler);
        }
    }

    static dispose(): void {
        if (--Keys.refs > 0) return;
        Keys.refs = 0;
        input.off(Input.EventType.KEY_DOWN, Keys.onDown, Keys);
        input.off(Input.EventType.KEY_UP, Keys.onUp, Keys);
        if (typeof document !== 'undefined' && Keys.docHandler) document.removeEventListener('keydown', Keys.docHandler);
        Keys.docHandler = null;
        Keys.down = {};
        Keys.pressHandlers = [];
    }

    private static onDown(e: EventKeyboard): void {
        const was = Keys.down[e.keyCode];
        Keys.down[e.keyCode] = true;
        if (!was) for (const h of Keys.pressHandlers.slice()) h(e.keyCode);
    }

    private static onUp(e: EventKeyboard): void {
        Keys.down[e.keyCode] = false;
    }

    static isDown(code: number): boolean { return !!Keys.down[code]; }

    /** Đăng ký callback khi một phím vừa được nhấn (không lặp). */
    static onPress(h: (code: number) => void): void { Keys.pressHandlers.push(h); }
    static offPress(h: (code: number) => void): void {
        const i = Keys.pressHandlers.indexOf(h);
        if (i >= 0) Keys.pressHandlers.splice(i, 1);
    }
}

const K = KeyCode;

/** Controller nền: không làm gì (BaseController). */
export class BaseController implements IController {
    constructor(protected player: PlayerObject) {}
    getMove(): -1 | 0 | 1 { return 0; }
    getJump(): boolean { return false; }
    readyToJump(): boolean { return false; }
    getShoot(): boolean { return false; }
    getTackle(): boolean { return false; }
    getSuperShot(): boolean { return false; }
    clearJump(): void {}
    restart(): void {}
    dispose(): void { this.player = null as any; }
}

/** Dùng cho cả hai bộ phím khi 1 người chơi (SPEC §4): ←→/AD, ↑/W, X/L, ↓/S, Z/K. */
export class PlayerControllerGeneral extends BaseController {
    getMove(): -1 | 0 | 1 {
        let m = 0;
        if (Keys.isDown(K.ARROW_LEFT) || Keys.isDown(K.KEY_A)) m--;
        if (Keys.isDown(K.ARROW_RIGHT) || Keys.isDown(K.KEY_D)) m++;
        return m as -1 | 0 | 1;
    }
    getJump(): boolean { return Keys.isDown(K.ARROW_UP) || Keys.isDown(K.KEY_W); }
    readyToJump(): boolean { return !Keys.isDown(K.ARROW_UP) && !Keys.isDown(K.KEY_W); }
    getShoot(): boolean { return Keys.isDown(K.KEY_X) || Keys.isDown(K.KEY_L); }
    getTackle(): boolean { return Keys.isDown(K.ARROW_DOWN) || Keys.isDown(K.KEY_S); }
    getSuperShot(): boolean { return Keys.isDown(K.KEY_Z) || Keys.isDown(K.KEY_K); }
}

/** 2 người, bên trái: A/D, W, B, S, V. */
export class PlayerController extends BaseController {
    getMove(): -1 | 0 | 1 {
        let m = 0;
        if (Keys.isDown(K.KEY_A)) m--;
        if (Keys.isDown(K.KEY_D)) m++;
        return m as -1 | 0 | 1;
    }
    getJump(): boolean { return Keys.isDown(K.KEY_W); }
    readyToJump(): boolean { return !Keys.isDown(K.KEY_W); }
    getShoot(): boolean { return Keys.isDown(K.KEY_B); }
    getTackle(): boolean { return Keys.isDown(K.KEY_S); }
    getSuperShot(): boolean { return Keys.isDown(K.KEY_V); }
}

/** 2 người, bên phải: ←/→, ↑, L, ↓, K. */
export class PlayerController2 extends BaseController {
    getMove(): -1 | 0 | 1 {
        let m = 0;
        if (Keys.isDown(K.ARROW_LEFT)) m--;
        if (Keys.isDown(K.ARROW_RIGHT)) m++;
        return m as -1 | 0 | 1;
    }
    getJump(): boolean { return Keys.isDown(K.ARROW_UP); }
    readyToJump(): boolean { return !Keys.isDown(K.ARROW_UP); }
    getShoot(): boolean { return Keys.isDown(K.KEY_L); }
    getTackle(): boolean { return Keys.isDown(K.ARROW_DOWN); }
    getSuperShot(): boolean { return Keys.isDown(K.KEY_K); }
}
