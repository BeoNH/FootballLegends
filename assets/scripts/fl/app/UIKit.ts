import { Color, HorizontalTextAlignment, Label, Node, Sprite, SpriteFrame, UITransform, Vec2, Vec3, VerticalTextAlignment, UIOpacity } from 'cc';
import { Res } from './Res';
import { Sfx } from './Sfx';

export type TextStyle = 'calibri80'|'calibri48'|'calibri40'|'calibri40_yellow'|'calibri36_white'|'calibri30'|'calibri30_yellow'|'calibri26'|'calibri26_yellow'|'calibri20'|'calibri20_blue'|'calibri18'|'calibri16'|'calibri16_black'|'calibri16_orange'|'calibri16_blue';
export type Skin = 'yellow'|'blue'|'green'|'dark_blue'|'navy'|'yellow_fill';

const WHITE = '#FFFFFF', BLUE = '#005887', YELLOW = '#FFD400', BLACK = '#000000', ORANGE = '#FF9900';
/** [size, color] theo SPEC §1.1 */
const STYLES: { [k: string]: [number, string] } = {
    calibri80: [80, WHITE], calibri48: [48, WHITE], calibri40: [40, BLUE], calibri40_yellow: [40, YELLOW],
    calibri36_white: [36, WHITE], calibri30: [32, BLUE], calibri30_yellow: [32, YELLOW], calibri26: [26, WHITE], calibri26_yellow: [26, YELLOW],
    calibri20: [20, WHITE], calibri20_blue: [20, BLUE], calibri18: [18, WHITE], calibri16: [16, WHITE],
    calibri16_black: [16, BLACK], calibri16_orange: [16, ORANGE], calibri16_blue: [16, BLUE],
};
/** frame, [top, bottom, left, right] theo SPEC §1.2 */
const SLICES: { [k: string]: [string, number[]] } = {
    yellow: ['tex_yellow0000', [28, 32, 28, 28]], blue: ['tex_blue0000', [28, 32, 28, 28]],
    green: ['tex_green0000', [28, 32, 28, 28]], dark_blue: ['tex_dark_blue0000', [28, 32, 28, 28]],
    navy: ['tex_navy0000', [16, 16, 16, 16]], yellow_fill: ['tex_yellow_fill0000', [20, 22, 20, 20]],
};

export class UIKit {
    static node(parent: Node, name: string, x = 0, y = 0): Node {
        const n = new Node(name);
        n.layer = parent.layer;
        n.addComponent(UITransform);
        n.setPosition(x, y, 0);
        parent.addChild(n);
        return n;
    }

    static sprite(parent: Node, frame: string, x = 0, y = 0, anchorX = 0.5, anchorY = 0.5): Sprite {
        const n = UIKit.node(parent, frame, x, y);
        const sp = n.addComponent(Sprite);
        // trim=false: kích thước = sourceSize, anchor tính trên source như Phaser (frame trim giữ đúng offset)
        sp.trim = false;
        sp.sizeMode = Sprite.SizeMode.RAW;
        sp.spriteFrame = Res.frame(frame);
        if (!sp.spriteFrame) console.warn('[UIKit] thiếu frame', frame);
        n.getComponent(UITransform)!.setAnchorPoint(anchorX, anchorY);
        return sp;
    }

    static slice(parent: Node, skin: Skin, w: number, h: number, x = 0, y = 0): Sprite {
        const [name, ins] = SLICES[skin];
        const n = UIKit.node(parent, name, x, y);
        const sp = n.addComponent(Sprite);
        const sf = Res.frame(name) as SpriteFrame;
        if (sf) {
            sf.insetTop = ins[0]; sf.insetBottom = ins[1]; sf.insetLeft = ins[2]; sf.insetRight = ins[3];
        }
        sp.type = Sprite.Type.SLICED;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = sf;
        n.getComponent(UITransform)!.setContentSize(w, h);
        return sp;
    }

    static label(parent: Node, text: string, style: TextStyle, x = 0, y = 0, anchorX = 0.5, anchorY = 0.5): Label {
        const [size, color] = STYLES[style];
        const n = UIKit.node(parent, 'label', x, y);
        const lb = n.addComponent(Label);
        if (Res.font) { lb.font = Res.font; lb.useSystemFont = false; }
        lb.fontSize = size;
        lb.lineHeight = Math.round(size * 1.2);
        lb.color = new Color().fromHEX(color);
        lb.overflow = Label.Overflow.NONE;
        lb.horizontalAlign = anchorX <= 0 ? HorizontalTextAlignment.LEFT : anchorX >= 1 ? HorizontalTextAlignment.RIGHT : HorizontalTextAlignment.CENTER;
        lb.verticalAlign = VerticalTextAlignment.CENTER;
        lb.string = text;
        n.getComponent(UITransform)!.setAnchorPoint(anchorX, anchorY);
        return lb;
    }

    static button(parent: Node, opts: { skin: Skin; w: number; h: number; text?: string; style?: TextStyle; x?: number; y?: number }, onClick: () => void): Node {
        const btn = UIKit.node(parent, 'button', opts.x || 0, opts.y || 0);
        btn.getComponent(UITransform)!.setContentSize(opts.w, opts.h);
        UIKit.slice(btn, opts.skin, opts.w, opts.h);
        if (opts.text) UIKit.label(btn, opts.text, opts.style || 'calibri30', 0, 0);
        let over = false, down = false;
        const apply = () => { const s = down ? 0.95 : over ? 1.05 : 1; btn.setScale(s, s, 1); };
        btn.on(Node.EventType.MOUSE_ENTER, () => { over = true; apply(); });
        btn.on(Node.EventType.MOUSE_LEAVE, () => { over = false; down = false; apply(); });
        btn.on(Node.EventType.TOUCH_START, () => { down = true; apply(); });
        btn.on(Node.EventType.TOUCH_CANCEL, () => { down = false; apply(); });
        btn.on(Node.EventType.TOUCH_END, () => {
            down = false; apply();
            Sfx.play('button');
            onClick();
        });
        return btn;
    }

    /** Vùng bấm trong suốt (w x h, tâm tại x,y). Phát sfx 'button' trừ khi silent. */
    static zone(parent: Node, w: number, h: number, x: number, y: number, onClick: () => void, silent = false): Node {
        const n = UIKit.node(parent, 'zone', x, y);
        n.getComponent(UITransform)!.setContentSize(w, h);
        n.on(Node.EventType.TOUCH_END, () => { if (!silent) Sfx.play('button'); onClick(); });
        return n;
    }

    /** Nút sprite (vd mũi tên); flip = -1 để lật ngang. Hover/press scale như UIKit.button. */
    static iconButton(parent: Node, frame: string, x: number, y: number, flip: number, onClick: () => void): Node {
        const sp = UIKit.sprite(parent, frame, x, y);
        const n = sp.node;
        let over = false, down = false;
        const apply = () => { const s = down ? 0.95 : over ? 1.05 : 1; n.setScale(s * flip, s, 1); };
        apply();
        n.on(Node.EventType.MOUSE_ENTER, () => { over = true; apply(); });
        n.on(Node.EventType.MOUSE_LEAVE, () => { over = false; down = false; apply(); });
        n.on(Node.EventType.TOUCH_START, () => { down = true; apply(); });
        n.on(Node.EventType.TOUCH_CANCEL, () => { down = false; apply(); });
        n.on(Node.EventType.TOUCH_END, () => { down = false; apply(); Sfx.play('button'); onClick(); });
        return n;
    }

    /** Label tự co chữ vừa khung w x h (1 dòng) — tương đương setMaxSize của Phaser. */
    static fitLabel(lb: Label, w: number, h: number): void {
        lb.overflow = Label.Overflow.SHRINK;
        lb.enableWrapText = false;
        lb.node.getComponent(UITransform)!.setContentSize(w, h);
    }

    /** Fill màu đặc full-rect bằng sprite splash (dùng frame 1x1 trắng không có -> dùng Graphics ở nơi cần). */
    static fade(node: Node, a: number): void {
        let o = node.getComponent(UIOpacity);
        if (!o) o = node.addComponent(UIOpacity);
        o.opacity = Math.round(a * 255);
    }
}
