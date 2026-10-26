import { Node, Sprite } from 'cc';
import { Res } from '../app/Res';
import { UIKit } from '../app/UIKit';

/** Sprite chạy animation theo frame name "prefix0000.."; tick() gọi mỗi khung hình. */
export class FrameAnim {
    readonly node: Node;
    private sp: Sprite;
    private prefix = '';
    private count = 0;
    private fps = 30;
    private t = 0;
    private loop = false;
    private playing = false;
    onComplete: (() => void) | null = null;

    constructor(parent: Node, scale = 1) {
        this.node = UIKit.node(parent, 'FrameAnim');
        this.sp = this.node.addComponent(Sprite);
        this.sp.trim = false;
        this.sp.sizeMode = Sprite.SizeMode.RAW;
        this.node.setScale(scale, scale, 1);
        this.node.active = false;
    }

    play(prefix: string, count: number, fps = 30, loop = false, x?: number, y?: number): void {
        this.prefix = prefix; this.count = count; this.fps = fps; this.loop = loop;
        this.t = 0; this.playing = true;
        if (x !== undefined && y !== undefined) this.node.setPosition(x, y, 0);
        this.node.active = true;
        this.apply();
    }

    stop(): void {
        this.playing = false;
        this.node.active = false;
    }

    private apply(): void {
        let i = Math.floor(this.t * this.fps);
        if (i >= this.count) i = this.count - 1;
        const name = this.prefix + ('0000' + i).slice(-4);
        const sf = Res.frame(name);
        if (sf) this.sp.spriteFrame = sf;
    }

    tick(dt: number): void {
        if (!this.playing) return;
        this.t += dt;
        if (this.t * this.fps >= this.count) {
            if (this.loop) { this.t = 0; } else {
                this.apply();
                this.stop();
                const cb = this.onComplete;
                this.onComplete = null;
                if (cb) cb();
                return;
            }
        }
        this.apply();
    }
}
