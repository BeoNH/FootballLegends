import { Node } from 'cc';
import type { BallObject } from './BallObject';
import type { PlayerObject } from './PlayerObject';
import type { FLPhysics } from './Physics';

/** Các layer vẽ trong gameObjects (dưới -> trên), SPEC §2.1. */
export interface GameLayers {
    gameObjects: Node;
    back: Node;
    shadows: Node;
    players: Node;
    ball: Node;
    effects: Node;
    goals: Node;
    /** Gốc vật lý (không scale). */
    physRoot: Node;
    /** HUD. */
    gui: Node;
}

/** Giao diện FootballGameCore mà Ball/Player/Controller cần (tránh import vòng). */
export interface IGameContext {
    layers: GameLayers;
    physics: FLPhysics;
    ball: BallObject;
    /** hệ số thời gian (slow-mo): 1 thường, 0.05/0.4, 0 = đóng băng (SPEC §3.1). */
    timeScale: number;
    /** skill bot 0..1 (SPEC §5.1). */
    botsSkill: number;
    /** đã có bàn thắng trong lần restart này (NapePhysics.isGoal). */
    goalLatched: boolean;
    slow(n: number): void;
    tackle(x: number, y: number, direction: number, facing: number): void;
    getNearestOpponentDirection(x: number, direction: number): number;
    /** Sensor khung thành báo bàn thắng (xử lý trễ sau step). */
    reportGoal(id: number): void;
    players: PlayerObject[];
}

/** Điều khiển 1 cầu thủ (SPEC §4). */
export interface IController {
    getMove(): -1 | 0 | 1;
    getJump(): boolean;
    readyToJump(): boolean;
    getShoot(): boolean;
    getTackle(): boolean;
    getSuperShot(): boolean;
    clearJump(): void;
    /** Bot: suy nghĩ mỗi tick logic (t = giây game). */
    think?(t: number): void;
    restart(): void;
    dispose(): void;
}

/** View cầu thủ (placeholder hoặc DragonBones). */
export interface IPlayerView {
    node: Node;
    /** loop/timeScale để undefined = theo bảng animation mặc định. */
    play(anim: string, loop?: boolean, timeScale?: number): void;
    /** Pose tĩnh (fly1..5, super, sad1). */
    stopAt(anim: string): void;
    setFacing(scaleX: number): void;
    onComplete?: (anim: string) => void;
    onFrameEvent?: (name: string) => void;
    /** Tiến animation theo thời gian thực (dt giây khung, ts = timeScale của game). */
    tick?(dt: number, ts: number): void;
    destroy?(): void;
}
