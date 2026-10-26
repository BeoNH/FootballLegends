import { Color, Graphics, Label, Node, dragonBones } from 'cc';
import { PlayersData } from '../app/PlayersData';
import { Res } from '../app/Res';
import { UIKit } from '../app/UIKit';
import {
    PLAYER_BODY_BOTTOM, PLAYER_BODY_TOP, PLAYER_GFX_OFFSET_X, PLAYER_GFX_OFFSET_Y, PLAYER_GFX_SCALE, PLAYER_HEAD_R, PLAYER_HEAD_Y,
} from './GameConsts';
import { IPlayerView } from './GameTypes';

/** Cấu hình chọn view cầu thủ. P2 chuyển useDragonBones = true khi DB view đã kiểm tra trên editor. */
export const PlayerViewConfig = {
    /** true: dùng DragonBones nếu Res.dbAsset/dbAtlas có (lỗi sẽ tự rơi về placeholder). */
    useDragonBones: true,
    /** Placeholder hiển thị tên animation hiện tại phía trên đầu (debug state machine). */
    showAnimLabel: true,
};

/** Bảng animation của armature 'player' (SPEC §8.2): số frame @30fps, loop, timeScale mặc định. */
interface AnimInfo { frames: number; loop?: boolean; ts?: number; events?: { [frame: number]: string } }
const ANIMS: { [name: string]: AnimInfo } = {
    idle: { frames: 23, loop: true },
    run: { frames: 19, loop: true },
    stop: { frames: 10 },
    hit: { frames: 19, ts: 0.8 },
    jump: { frames: 6 },
    landing: { frames: 7 },
    'tackle start': { frames: 5 },
    'tackle anim': { frames: 9 },
    'tackle end': { frames: 7 },
    stun: { frames: 33, ts: 1.8 },
    superStart: { frames: 4 },
    superEnd: { frames: 4 },
    sad: { frames: 14 },
    happy: { frames: 19, loop: true },
    superhit: { frames: 19, ts: 0.8, events: { 4: 'shot', 12: 'norm' } },
    hulk_hit: { frames: 17 },
};
const FPS = 30;

/** timeScale game -> hệ số tiến animation. ts = 0 (freeze): đo bản gốc freeze fireball ~185ms -> 0.9 (SPEC §3.1 ước 0.45 nhưng thực đo nhanh hơn). */
export function viewTimeScale(ts: number): number {
    return ts === 0 ? 0.9 : ts;
}

function hsv(h: number, s: number, v: number): Color {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return new Color(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), 255);
}

/**
 * View tạm: đầu tròn r=24 + thân 20x64 vẽ đúng hitbox (toạ độ quanh COM), kit màu theo CLB.
 * Giả lập sự kiện COMPLETE theo bảng frame để state machine PlayerObject chạy giống DragonBones.
 */
export class PlaceholderPlayerView implements IPlayerView {
    node: Node;
    onComplete?: (anim: string) => void;
    onFrameEvent?: (name: string) => void;

    private gfxNode: Node;
    private label: Label | null = null;
    private cur = '';
    private t = 0;
    private completed = false;
    private still = false;
    private loopOverride: boolean | undefined;
    private tsOverride: number | undefined;
    private firedFrame = -1;

    constructor(parent: Node, skinIndex: number, side: number) {
        this.node = UIKit.node(parent, 'PlayerView');
        this.gfxNode = UIKit.node(this.node, 'gfx');
        const g = this.gfxNode.addComponent(Graphics);
        const team = Math.floor(skinIndex / 2);
        const kit = hsv((team * 47 + side * 20) % 360, 0.75, side === 0 ? 0.9 : 0.6);
        const skin = new Color(235, 190, 150, 255);
        const hy = -PLAYER_HEAD_Y; // Cocos y lên
        // thân (jersey) + chân
        g.fillColor = kit;
        g.rect(-10, -PLAYER_BODY_BOTTOM + 22, 20, -PLAYER_BODY_TOP + PLAYER_BODY_BOTTOM - 22);
        g.fill();
        g.fillColor = new Color(30, 30, 30, 255);
        g.rect(-8, -PLAYER_BODY_BOTTOM, 16, 22);
        g.fill();
        // đầu
        g.fillColor = skin;
        g.circle(0, hy, PLAYER_HEAD_R);
        g.fill();
        // mắt/mũi bên phải để thấy hướng
        g.fillColor = new Color(20, 20, 20, 255);
        g.circle(11, hy + 4, 3.5);
        g.fill();
        g.fillColor = new Color(255, 255, 255, 255);
        g.circle(18, hy - 2, 3);
        g.fill();
        if (PlayerViewConfig.showAnimLabel) {
            const lb = UIKit.label(this.node, '', 'calibri16', 0, 52);
            lb.fontSize = 14;
            this.label = lb;
        }
    }

    play(anim: string, loop?: boolean, timeScale?: number): void {
        const info = ANIMS[anim];
        const isLoop = loop !== undefined ? loop : !!(info && info.loop);
        // đang chạy cùng anim và chưa xong (hoặc loop) -> giữ nguyên (giống DragonBones.play)
        if (this.cur === anim && !this.still && (isLoop || !this.completed)) return;
        this.cur = anim;
        this.t = 0;
        this.completed = false;
        this.still = false;
        this.firedFrame = -1;
        this.loopOverride = loop;
        this.tsOverride = timeScale;
        this.applyPose();
    }

    stopAt(anim: string): void {
        this.cur = anim;
        this.still = true;
        this.completed = true;
        this.applyPose();
    }

    setFacing(scaleX: number): void {
        this.node.setScale(scaleX, 1, 1);
        // label không bị lật ngược
        if (this.label) this.label.node.setScale(scaleX < 0 ? -1 : 1, 1, 1);
    }

    private applyPose(): void {
        const a = this.cur;
        let rot = 0;
        if (a.indexOf('tackle') === 0) rot = 75;
        else if (a === 'stun') rot = 60;
        else if (a === 'sad' || a === 'sad1') rot = 12;
        this.gfxNode.angle = -rot; // quay về phía trước (mặt +x của view)
        if (this.label) this.label.string = a;
    }

    tick(dt: number, ts: number): void {
        if (this.still || !this.cur) return;
        const info = ANIMS[this.cur];
        if (!info) return;
        const speed = (this.tsOverride !== undefined ? this.tsOverride : (info.ts || 1)) * viewTimeScale(ts);
        this.t += dt * speed;
        const frame = this.t * FPS;
        if (info.events) {
            const f = Math.floor(frame);
            for (let i = this.firedFrame + 1; i <= f; i++) {
                const ev = info.events[i];
                if (ev && this.onFrameEvent) this.onFrameEvent(ev);
            }
            this.firedFrame = f;
        }
        const isLoop = this.loopOverride !== undefined ? this.loopOverride : !!info.loop;
        if (frame >= info.frames) {
            if (isLoop) {
                this.t -= info.frames / FPS;
                this.firedFrame = -1;
            } else if (!this.completed) {
                this.completed = true;
                if (this.onComplete) this.onComplete(this.cur);
            }
        }
    }

    destroy(): void {
        if (this.node && this.node.isValid) this.node.destroy();
    }
}

/**
 * View DragonBones thật (armature 'player', SPEC §8.2): offset (4,40) Phaser -> (4,-40) Cocos, scale 0.4.
 * Skin dùng lại PlayersData.switchPlayer (child armature head/body/hand/leg).
 */
export class DragonBonesPlayerView implements IPlayerView {
    node: Node;
    onComplete?: (anim: string) => void;
    onFrameEvent?: (name: string) => void;

    private holder: Node;
    private display: dragonBones.ArmatureDisplay;
    private cur = '';
    private still = false;

    constructor(parent: Node, skinIndex: number, side: number) {
        this.node = UIKit.node(parent, 'PlayerView');
        const d = PlayersData.createPlayer(this.node, PLAYER_GFX_OFFSET_X, -PLAYER_GFX_OFFSET_Y, PLAYER_GFX_SCALE);
        if (!d) throw new Error('DragonBones asset chưa load');
        this.display = d;
        this.holder = d.node;
        d.addEventListener(dragonBones.EventObject.COMPLETE, (e: any) => {
            if (this.onComplete) this.onComplete(e.animationState.name);
        }, this);
        d.addEventListener(dragonBones.EventObject.FRAME_EVENT, (e: any) => {
            if (this.onFrameEvent) this.onFrameEvent(e.name);
        }, this);
        PlayersData.switchPlayer(d, skinIndex, side);
        this.cur = 'idle';
    }

    play(anim: string, loop?: boolean, timeScale?: number): void {
        const info = ANIMS[anim];
        const arm = this.display.armature();
        const st = arm && arm.animation.getState(anim);
        // đang chạy cùng anim (loop hoặc chưa xong) -> giữ nguyên
        if (this.cur === anim && !this.still && st && st.isPlaying && !st.isCompleted) return;
        this.cur = anim;
        this.still = false;
        const isLoop = loop !== undefined ? loop : !!(info && info.loop);
        const s = this.display.playAnimation(anim, isLoop ? 0 : 1);
        const ts = timeScale !== undefined ? timeScale : (info && info.ts) || 1;
        if (s) s.timeScale = ts;
    }

    stopAt(anim: string): void {
        this.cur = anim;
        this.still = true;
        const arm = this.display.armature();
        if (arm) arm.animation.gotoAndStopByTime(anim, 0);
    }

    setFacing(scaleX: number): void {
        this.node.setScale(scaleX, 1, 1);
    }

    /** Slow-mo của game (GameCore.slow): ts = 0 -> 0.3*STEP/khung (~0.45x), ngược lại nhân trực tiếp. */
    setGameTimeScale(ts: number): void {
        this.display.timeScale = viewTimeScale(ts);
    }

    tick(dt: number, ts: number): void {
        this.setGameTimeScale(ts);
    }

    destroy(): void {
        if (this.node && this.node.isValid) this.node.destroy();
    }
}

/** Tạo view theo cấu hình; DB lỗi/thiếu asset -> placeholder. side: 0 = đội trái (home), 1 = phải (away). */
export function createPlayerView(parent: Node, skinIndex: number, side: number): IPlayerView {
    if (PlayerViewConfig.useDragonBones && Res.dbAsset && Res.dbAtlas) {
        try {
            return new DragonBonesPlayerView(parent, skinIndex, side);
        } catch (e) {
            console.warn('[PlayerView] DragonBones lỗi, dùng placeholder', e);
        }
    }
    return new PlaceholderPlayerView(parent, skinIndex, side);
}
