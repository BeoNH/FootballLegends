import { BlockInputEvents, Color, Label, Node, Sprite, tween, Tween, UITransform, Vec2, Vec3 } from 'cc';
import { isMobileUI } from '../app/Features';
import { MusicButton } from '../app/MusicButton';
import { Res } from '../app/Res';
import { Sfx } from '../app/Sfx';
import { UIKit } from '../app/UIKit';
import { CLUB_NAMES, emblemHud, emblemPopup, SUPER_SHOT_PTS, T_KOEF, TIMER } from './GameConsts';

/**
 * HUD gameplay (SPEC §1.4). Toạ độ spec là Phaser logical 800x480 (gốc trái-trên);
 * node HUD đặt ở tâm màn nên đổi: x_c = x - 400, y_c = 240 - y.
 */
const hx = (x: number) => x - 400;
const hy = (y: number) => 240 - y;

/** Mobile: InfoPanel ở giữa-trên (chỗ ảnh help cũ), timer ngay dưới (toạ độ Phaser, tinh chỉnh tại đây). */
export const MOBILE_INFO_Y = 38;
export const MOBILE_TIMER_Y = 92;

function setFrame(sp: Sprite, name: string): void {
    const f = Res.frame(name);
    if (f) sp.spriteFrame = f;
}

/** InfoPanel (400,458): khung điểm + 2 emblem + 2 số. */
export class InfoPanel {
    readonly node: Node;
    private emblem1: Sprite;
    private emblem2: Sprite;
    private score1: Label;
    private score2: Label;

    constructor(parent: Node) {
        this.node = UIKit.node(parent, 'InfoPanel', hx(400), hy(isMobileUI() ? MOBILE_INFO_Y : 458));
        UIKit.sprite(this.node, 'infoPanel0000', -2, 10);
        this.score1 = UIKit.label(this.node, '', 'calibri48', -9, 8, 1, 0.5);
        this.score2 = UIKit.label(this.node, '', 'calibri48', 5, 8, 0, 0.5);
        for (const l of [this.score1, this.score2]) { l.fontSize = 40; l.lineHeight = 48; }
        this.emblem1 = UIKit.sprite(this.node, 'Emblemsv20000', -109, 9);
        this.emblem2 = UIKit.sprite(this.node, 'Emblemsv20000', 109, 9);
        this.emblem1.node.setScale(0.75, 0.75, 1);
        this.emblem2.node.setScale(0.75, 0.75, 1);
    }

    start(teams: number[], s1: number, s2: number): void {
        setFrame(this.emblem1, emblemHud(teams[0]));
        setFrame(this.emblem2, emblemHud(teams[1]));
        this.updateScore(s1, s2);
    }

    updateScore(s1: number, s2: number): void {
        this.score1.string = s1.toString();
        this.score2.string = s2.toString();
    }
}

/**
 * Đồng hồ (400,50). Thời gian nội bộ giây `TIMER=30`/đơn vị; hiển thị round(x*1.5) 2 chữ số.
 * Port TimerObject.process: beep5sec mỗi giây trong 5 giây cuối, gọi onEnd 1 lần khi tới fullTime.
 */
export class TimerObject {
    private label: Label;
    private startTime = 0;
    private fullTime = 0;
    private noticeTime = 0;
    private wasEnd = false;

    constructor(parent: Node, private onEnd: () => void) {
        this.label = UIKit.label(parent, '', 'calibri48', hx(400), hy(isMobileUI() ? MOBILE_TIMER_Y : 50));
    }

    start(t: number, e: number): void {
        this.wasEnd = false;
        this.startTime = t * TIMER;
        this.fullTime = e * TIMER;
        this.noticeTime = this.fullTime - 5;
        this.label.string = this.startTime === 0 ? '00' : String(Math.floor(this.startTime * T_KOEF));
    }

    /** elapsed: giây đã chơi trong hiệp/trận (deltaMatchTime). */
    process(elapsed: number): void {
        const e = this.startTime + elapsed;
        if (e >= this.fullTime && !this.wasEnd) {
            this.wasEnd = true;
            this.onEnd();
            this.label.string = String(Math.round(this.fullTime * T_KOEF));
        } else {
            let i = Math.floor(e);
            if (this.noticeTime > 0 && i >= this.noticeTime) {
                Sfx.play('beep5sec');
                if (++this.noticeTime === this.fullTime) this.noticeTime = 0;
            }
            i = Math.round(e * T_KOEF);
            this.label.string = i < 10 ? '0' + i : String(i);
        }
    }
}

/** 3-2-1-GO đếm lùi ở (400,170) trong layer bóng của world (SPEC §5.3). */
export class CountDownObject {
    readonly node: Node;
    private label: Label;
    private timer = 0;
    private current = 1;

    constructor(parent: Node) {
        this.node = UIKit.node(parent, 'CountDown', 0, 70);
        this.label = UIKit.label(this.node, 'GO!!!', 'calibri80');
        this.hide();
    }

    activate(): void {
        this.node.active = true;
        this.label.string = '';
        this.timer = 0;
        this.current = 1;
    }

    private pop(n: number): void {
        this.label.string = n >= 3 ? ' GO!!!' : String(3 - n);
        this.current = n;
        this.node.active = true;
        Tween.stopAllByTarget(this.node);
        this.node.setScale(0.2, 0.2, 1);
        tween(this.node).to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    hide(): void {
        Tween.stopAllByTarget(this.node);
        this.node.active = false;
    }

    /** true khi đếm xong (mỗi mốc 1/4.5 s: timer += 1.5*dt, e = floor(3*timer)). */
    process(dt: number): boolean {
        this.timer += 1.5 * dt;
        const e = Math.floor(3 * this.timer);
        if (e === 4) { this.hide(); return true; }
        if (e !== this.current) this.pop(e);
        return false;
    }
}

/** Message "GOAL!!!" / "HALF TIME!" / ... (400,170). Scale tween from .2 270ms Back.Out -> .9 450ms Back.Out -> ẩn. */
export class MessageInfo {
    readonly node: Node;
    private label: Label;

    constructor(parent: Node) {
        this.node = UIKit.node(parent, 'Message', 0, 70);
        this.label = UIKit.label(this.node, '111111', 'calibri80');
        this.hide();
    }

    hide(): void {
        Tween.stopAllByTarget(this.node);
        this.node.active = false;
    }

    show(text: string): void {
        Tween.stopAllByTarget(this.node);
        this.label.string = ' ' + text + ' ';
        this.node.active = true;
        this.node.setScale(0.2, 0.2, 1);
        tween(this.node)
            .to(0.27, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .to(0.45, { scale: new Vec3(0.9, 0.9, 1) }, { easing: 'backOut' })
            .call(() => this.hide())
            .start();
    }
}

/**
 * Thanh năng lượng super (SPEC §1.4): nền btn_bg0000 .75, icon màu + bản xám phủ phần chưa nạp.
 * Nạp đầy khi energy = 12 (36 nấc, nấc = floor(3*energy)). Id1/2: x=45; id3: x=754; y=435.
 * Mask arc gốc thay bằng Sprite FILLED radial (cần kiểm tra chiều/điểm bắt đầu trên editor).
 */
export class EnergyBar {
    readonly node: Node;
    private gray: Sprite;
    private energy = 0;

    constructor(parent: Node, id: number, superPower: number) {
        const x = id === 3 ? 754 : 45;
        this.node = UIKit.node(parent, 'EnergyBar' + id, hx(x), hy(435));
        UIKit.sprite(this.node, 'btn_bg0000', 0, -1).node.setScale(0.75, 0.75, 1);
        UIKit.sprite(this.node, 'icon_ball000' + superPower);
        this.gray = UIKit.sprite(this.node, 'icon_ball2000' + superPower, 1, -1);
        this.gray.color = new Color(0x55, 0x55, 0x55, 255);
        this.gray.type = Sprite.Type.FILLED;
        this.gray.fillType = Sprite.FillType.RADIAL;
        this.gray.fillCenter = new Vec2(0.5, 0.5);
        if (!isMobileUI()) {
            const hint = UIKit.sprite(this.node, 'key_hint0000', -30, -30);
            UIKit.label(hint.node, id === 1 ? 'Z' : id === 2 ? 'V' : 'K', 'calibri16_black');
        }
        this.setEnergy(0);
    }

    /**
     * Port EnergyBar.update: curFrame = floor(3*energy); phần ĐÃ nạp là hình quạt θ = 10*(curFrame-1) độ
     * mọc NGƯỢC chiều kim đồng hồ từ đỉnh (12h) (mask arc anticlockwise + rotation -90-θ); phần còn lại (360-θ) là icon xám.
     * curFrame >= 37 (energy >= 12.33) -> ẩn icon xám (icon màu đầy đủ). curFrame <= 1 -> xám kín (θ=0).
     */
    setEnergy(e: number): void {
        this.energy = e;
        const frame = Math.floor(3 * e);
        if (frame >= 37) { this.gray.node.active = false; return; }
        this.gray.node.active = true;
        const theta = frame <= 1 ? 0 : 10 * (frame - 1);
        const grey = 1 - theta / 360; // phần xám còn lại, bắt đầu ở đỉnh, quay thuận chiều kim đồng hồ
        this.gray.fillStart = 0.25; // đỉnh (Cocos radial: 0 = 3h, tăng ngược chiều kim đồng hồ)
        this.gray.fillRange = -grey;
    }

    get isFull(): boolean { return this.energy >= SUPER_SHOT_PTS; }

    reset(): void {
        this.setEnergy(0);
    }

    destroy(): void {
        if (this.node && this.node.isValid) this.node.destroy();
    }
}

/** Nút Pause (btn_bg + InGamePauseButton0000) và Music ở góc phải trên (x = gw-90 / gw-30, y=40). */
export class TopRightButtons {
    readonly pauseNode: Node;
    readonly musicNode: Node;

    constructor(parent: Node, gw: number, onPause: () => void) {
        const half = gw / 2;
        this.pauseNode = UIKit.node(parent, 'PauseButton', half - 90, hy(40));
        this.pauseNode.getComponent(UITransform)!.setContentSize(62, 62);
        UIKit.sprite(this.pauseNode, 'btn_bg0000');
        UIKit.sprite(this.pauseNode, 'InGamePauseButton0000');
        this.pauseNode.on(Node.EventType.TOUCH_END, () => { Sfx.play('button'); onPause(); });
        this.pauseNode.on(Node.EventType.MOUSE_ENTER, () => this.pauseNode.setScale(1.05, 1.05, 1));
        this.pauseNode.on(Node.EventType.MOUSE_LEAVE, () => this.pauseNode.setScale(1, 1, 1));
        this.musicNode = MusicButton.create(parent, half - 30, hy(40));
    }

    layout(gw: number): void {
        this.pauseNode.setPosition(gw / 2 - 90, hy(40), 0);
        this.musicNode.setPosition(gw / 2 - 30, hy(40), 0);
    }

    setPauseVisible(v: boolean): void {
        this.pauseNode.active = v;
    }
}

/** Popup tạm dừng (SPEC §1.4 Pause popup): nền chặn input, panel 450x356, BACK/RESUME. */
export class PausePopup {
    readonly node: Node;

    constructor(parent: Node, teams: number[], s1: number, s2: number, onBack: () => void, onResume: () => void) {
        this.node = UIKit.node(parent, 'PausePopup');
        // nền chặn input toàn màn hình (trong suốt như bản gốc)
        const blocker = UIKit.node(this.node, 'blocker');
        blocker.getComponent(UITransform)!.setContentSize(4000, 3000);
        blocker.addComponent(BlockInputEvents);

        UIKit.slice(this.node, 'dark_blue', 450, 356);
        UIKit.slice(this.node, 'navy', 280, 50, 0, 142);
        UIKit.label(this.node, 'GAME PAUSED', 'calibri40_yellow', 0, 140);
        UIKit.label(this.node, s1 + ' : ' + s2, 'calibri80', 0, 40);
        UIKit.label(this.node, CLUB_NAMES[teams[0] - 1] || '', 'calibri20', -140, 10);
        UIKit.label(this.node, CLUB_NAMES[teams[1] - 1] || '', 'calibri20', 140, 10);
        UIKit.sprite(this.node, emblemPopup(teams[0]), -140, 60);
        UIKit.sprite(this.node, emblemPopup(teams[1]), 140, 60);
        UIKit.button(this.node, { skin: 'blue', w: 192, h: 76, text: 'HOME', style: 'calibri30', x: -100, y: -120 }, onBack);
        UIKit.button(this.node, { skin: 'yellow', w: 192, h: 76, text: 'RESUME', style: 'calibri30', x: 100, y: -120 }, onResume);
    }

    destroy(): void {
        if (this.node && this.node.isValid) this.node.destroy();
    }
}
