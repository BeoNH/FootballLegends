import { Color, Graphics, Label, UITransform } from 'cc';
import { FLScreen } from '../app/Screen';
import { UIKit } from '../app/UIKit';
import { P2C } from '../app/Coords';

/** Màn loading: nền 0x247AF9, "LOADING..." + %. Chạy trước khi Res load xong nên dùng font hệ thống. */
export class PreloaderScreen extends FLScreen {
    private pct: Label | null = null;

    build(): void {
        const bg = UIKit.node(this.root, 'bg');
        const g = bg.addComponent(Graphics);
        g.fillColor = new Color(0x24, 0x7A, 0xF9, 255);
        g.rect(-1000, -600, 2000, 1200);
        g.fill();
        const mk = (text: string, size: number, y: number) => {
            const n = UIKit.node(this.root, 'txt', 0, y);
            const lb = n.addComponent(Label);
            lb.string = text; lb.fontSize = size; lb.lineHeight = size + 8;
            lb.color = Color.WHITE; lb.isBold = true;
            return lb;
        };
        mk('LOADING...', 48, P2C.y(0.75 * 480));
        this.pct = mk('0%', 48, P2C.y(0.75 * 480) - 56);
        mk('MADPUFFERS 2019©', 16, P2C.y(460));
    }

    setProgress(p: number): void {
        if (this.pct) this.pct.string = Math.floor(p * 100) + '%';
    }
}
