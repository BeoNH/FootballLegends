import { Node, UITransform } from 'cc';
import { P2C } from './Coords';
import { Res } from './Res';
import { Sfx } from './Sfx';
import { UIKit } from './UIKit';

/** Nút nhạc góc trái-trên (40,40): btn_bg0000 + icon InGameMusicButton000{0,1,2}. */
export class MusicButton {
    static create(parent: Node, x = P2C.x(40), y = P2C.y(40)): Node {
        const n = UIKit.node(parent, 'MusicButton', x, y);
        n.getComponent(UITransform)!.setContentSize(62, 62);
        UIKit.sprite(n, 'btn_bg0000');
        const icon = UIKit.sprite(n, 'InGameMusicButton000' + Sfx.state);
        n.on(Node.EventType.TOUCH_END, () => {
            Sfx.toggleCycle();
            icon.spriteFrame = Res.frame('InGameMusicButton000' + Sfx.state);
            Sfx.play('button');
        });
        n.on(Node.EventType.MOUSE_ENTER, () => n.setScale(1.05, 1.05, 1));
        n.on(Node.EventType.MOUSE_LEAVE, () => n.setScale(1, 1, 1));
        return n;
    }
}
