import { Node } from 'cc';

/** Base class cho mọi màn hình (menu, gameplay...). root = node full-screen đặt giữa Canvas. */
export abstract class FLScreen {
    root: Node = null as any;
    abstract build(params?: any): void;
    onExit(): void {}
    update(dt: number): void {}
}
