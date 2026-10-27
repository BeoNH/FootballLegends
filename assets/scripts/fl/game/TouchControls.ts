import { KeyCode, Node, UIOpacity, UITransform } from 'cc';
import { UIKit } from '../app/UIKit';
import type { FootballGameCore } from './GameCore';
import { Keys } from './Controllers';

const hy = (y: number) => 240 - y;

/** Toạ độ Phaser (gốc trái-trên) của hàng nút dưới và nút SUPER. */
const ROW_Y = 438;
const SUPER_Y = 352;
const BTN_SIZE = 76;     // kích thước hiển thị của nút (px)
const TOUCH_SIZE = 96;   // vùng chạm lớn hơn hiển thị
const BG_RAW = 62;       // kích thước gốc btn_bg0000 (interface atlas)
const SUPER_SCALE = 1.2; // EnergyBar gốc (~47px) phóng nhẹ, tránh che khung thành
const BTN_OPACITY = 200;
/** Góc xoay icon arrow_icon0000 (giả định mũi tên hướng lên); chỉnh nếu icon sai hướng. */
// arrow_icon0000 gốc hướng sang phải
const ARROW_ROT_LEFT = 180;
const ARROW_ROT_RIGHT = 0;
const ARROW_ROT_UP = 90;

interface Btn { node: Node; key: number; edge: -1 | 1; off: number; held: boolean; }

/**
 * Nút điều khiển cảm ứng (chỉ mobile). Mỗi nút bơm phím ảo qua Keys.setVirtual;
 * mỗi node nhận touch riêng nên multi-touch hoạt động (giữ RIGHT + chạm SHOOT).
 */
export class TouchControls {
    private root: Node;
    private btns: Btn[] = [];
    private superNode: Node | null = null;
    private superHeld = false;
    private superHandlers: Array<[string, () => void]> = [];

    constructor(parent: Node, core: FootballGameCore, gw: number) {
        this.root = UIKit.node(parent, 'TouchControls');
        // trái (neo mép trái)
        this.add('LEFT', KeyCode.ARROW_LEFT, -1, 70, { icon: 'arrow_icon0000', rot: ARROW_ROT_LEFT });
        this.add('RIGHT', KeyCode.ARROW_RIGHT, -1, 170, { icon: 'arrow_icon0000', rot: ARROW_ROT_RIGHT });
        // phải (neo mép phải)
        this.add('SHOOT', KeyCode.KEY_X, 1, 70, { icon: 'shoot_icon0000' });
        this.add('JUMP', KeyCode.ARROW_UP, 1, 170, { icon: 'arrow_icon0000', rot: ARROW_ROT_UP });
        this.add('SLIDE', KeyCode.ARROW_DOWN, 1, 270, { text: 'SLIDE' });

        // SUPER: tái dùng EnergyBar của người chơi human (energyID 1)
        const human = core.players.find(p => p.energyBar && p.energyID === 1);
        if (human && human.energyBar) {
            const n = human.energyBar.node;
            this.superNode = n;
            n.getComponent(UITransform)!.setContentSize(TOUCH_SIZE, TOUCH_SIZE);
            n.setScale(SUPER_SCALE, SUPER_SCALE, 1);
            this.hook(n, KeyCode.KEY_Z, v => { this.superHeld = v; });
        }
        this.layout(gw);
    }

    private add(name: string, key: number, edge: -1 | 1, off: number, look: { icon?: string; rot?: number; text?: string }): void {
        const n = UIKit.node(this.root, name);
        n.getComponent(UITransform)!.setContentSize(TOUCH_SIZE, TOUCH_SIZE);
        const bg = UIKit.sprite(n, 'btn_bg0000');
        bg.node.setScale(BTN_SIZE / BG_RAW, BTN_SIZE / BG_RAW, 1);
        bg.node.addComponent(UIOpacity).opacity = BTN_OPACITY;
        if (look.icon) {
            const ic = UIKit.sprite(n, look.icon);
            if (look.rot) ic.node.angle = look.rot;
        }
        if (look.text) UIKit.label(n, look.text, 'calibri20');
        const b: Btn = { node: n, key, edge, off, held: false };
        this.btns.push(b);
        this.hook(n, key, v => { b.held = v; });
    }

    /** Gắn TOUCH_START/END/CANCEL cho node: phím ảo + scale feedback. */
    private hook(n: Node, key: number, set: (v: boolean) => void): void {
        const base = n.scale.x;
        const press = (v: boolean) => {
            set(v);
            Keys.setVirtual(key, v);
            n.setScale(base * (v ? 0.9 : 1), base * (v ? 0.9 : 1), 1);
        };
        const start = () => press(true), end = () => press(false);
        n.on(Node.EventType.TOUCH_START, start);
        n.on(Node.EventType.TOUCH_END, end);
        n.on(Node.EventType.TOUCH_CANCEL, end);
        if (n === this.superNode) {
            this.superHandlers = [[Node.EventType.TOUCH_START, start], [Node.EventType.TOUCH_END, end], [Node.EventType.TOUCH_CANCEL, end]];
        }
    }

    /** gw: chiều rộng logic của gui (đã chia fit). */
    layout(gw: number): void {
        const half = gw / 2;
        for (const b of this.btns) b.node.setPosition(b.edge * half - b.edge * b.off, hy(ROW_Y), 0);
        if (this.superNode && this.superNode.isValid) this.superNode.setPosition(half - 70, hy(SUPER_Y), 0);
    }

    /** Ẩn khi pause (popup có blocker), đồng thời nhả mọi phím ảo. */
    setVisible(v: boolean): void {
        if (!v) this.releaseAll();
        this.root.active = v;
        if (this.superNode && this.superNode.isValid) this.superNode.active = v;
    }

    private releaseAll(): void {
        for (const b of this.btns) {
            if (b.held) { b.held = false; b.node.setScale(1, 1, 1); }
            Keys.setVirtual(b.key, false);
        }
        if (this.superHeld && this.superNode && this.superNode.isValid) {
            this.superHeld = false;
            this.superNode.setScale(SUPER_SCALE, SUPER_SCALE, 1);
        }
        Keys.setVirtual(KeyCode.KEY_Z, false);
    }

    destroy(): void {
        this.releaseAll();
        if (this.superNode && this.superNode.isValid) {
            for (const [ev, h] of this.superHandlers) this.superNode.off(ev, h);
        }
        this.superNode = null;
        if (this.root && this.root.isValid) this.root.destroy();
    }
}
