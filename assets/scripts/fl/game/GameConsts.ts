/**
 * Hằng số gameplay của bản port Football Legends (SPEC §2, §3, §5).
 * Toạ độ "Phaser" = world 800x480, gốc trái-trên, y xuống, đơn vị px.
 * Toạ độ Cocos (node trong gameObjects) = (x-400, 240-y).
 */

// ---------------- Vòng lặp & vật lý ----------------
/** Bước logic cố định (40 Hz). */
export const STEP = 0.025;
/** Chặn dt khung hình tối đa (tránh spiral of death). */
export const MAX_FRAME_TIME = 0.1;
/** Mỗi tick logic chỉ step vật lý 0.9*t (SPEC §3.1) => mọi chuyển động chậm 0.9x. */
export const PHYS_TIME_COEF = 0.9;
/** Box2D: 1 m = 32 px. Vận tốc/gia tốc truyền thẳng m/s => px/32. */
export const PTM = 32;
/** Trọng lực world (px/s^2, hướng xuống). gravityScale: bóng 1.5, người 3. */
export const WORLD_GRAVITY_PX = 450;
export const LINEAR_DAMPING = 0.015;

export const WORLD_W = 800;
export const WORLD_H = 480;
export const HALF_W = 400;
export const HALF_H = 240;

// ---------------- ObjectsData (SPEC §3.4) ----------------
export const BALL_RADIUS = 16;
export const BALL_GRAVITY_SCALE = 1.5;
export const BALL_SHOT_X = 550;
export const BALL_SHOT_Y = -220; // Phaser (âm = lên)
export const BALL_BOUNCE_HEAD = 75;
export const BALL_BOUNCE_Y = -470;
/** Hệ số sút của super shot: vx = ±550*1.8 = ±990. */
export const SUPER_SHOT_KOEF = 1.8;
/** Bóng lửa: anim ball_fire (bản gốc generateFrameNames('ball_fire',0,3) = 4 frame, lặp 30fps), scale 1.5, lệch (-30,0) so với tâm bóng. */
export const BALL_FIRE_FRAMES = 4;
export const BALL_FIRE_FPS = 30;
export const BALL_FIRE_SCALE = 1.5;
export const BALL_FIRE_OFFSET_X = -30;
/** SuperBallSplashMC: 8 frame, scale 2.5 (BallSplashMC thường: 4 frame, scale 0.72). */
export const SUPER_SPLASH_FRAMES = 8;
export const SUPER_SPLASH_SCALE = 2.5;
export const BALL_RESTITUTION = 0.75; // nape: clamp((1.5+0)/2)

export const SHOOT_DISTANCE_X = 80;
export const SHOOT_DISTANCE_Y = 80;
export const PLAYER_JUMP_Y = 600;
export const PLAYER_MOVE = 370;
export const INDENT = 150;
export const TACKLE_X = 40;
export const TACKLE_Y = 50;

// ---------------- Người chơi (SPEC §3.5) ----------------
export const PLAYER_GRAVITY_SCALE = 3;
export const PLAYER_HEAD_R = 24;
/** Sau align(): đầu tại y=-5.84 (Phaser). */
export const PLAYER_HEAD_Y = -5.84;
/** body rect x±10, y -26.84..37.16 (Phaser). */
export const PLAYER_BODY_TOP = -26.84;
export const PLAYER_BODY_BOTTOM = 37.16;
/** floor (trapezoid) y 37.16..41.16 (Phaser). Đứng yên khi COM y = 377-41.16 = 335.84. */
export const PLAYER_FLOOR_TOP = 37.16;
export const PLAYER_FLOOR_BOTTOM = 41.16;
export const PLAYER_SPAWN_Y = 330;
/** Offset graphic armature so với COM (px, Phaser: y xuống) và scale. */
export const PLAYER_GFX_OFFSET_X = 4;
export const PLAYER_GFX_OFFSET_Y = 40;
export const PLAYER_GFX_SCALE = 0.4;
/** Ma sát nape hiệu dụng khi đứng yên: sqrt(4*1)=2; gia tốc hãm = mu * g_eff(1350). */
export const FRICTION_MU = 2;
export const PLAYER_G_EFF = 450 * PLAYER_GRAVITY_SCALE;

export const TIMER = 30;
export const T_KOEF = 1.5;
export const SUPER_SHOT_PTS = 12;
/**
 * Fallback (giây thật): anim 'superhit' có frame event 'shot' ở frame 4 (4/30/0.8 = 0.17s anim, khi timeScale=0 view chạy ~0.45x => ~0.37s thật).
 * Nếu view không bắn event 'shot' trong ngần này giây sau khi freeze thì PlayerObject tự bắn bóng lửa.
 */
export const SUPER_SHOT_FALLBACK = 0.6;
// ---- Teleport (SPEC §6) ----
export const TELEPORT_FRAMES = 30; // teleprte0000..0029 @30fps
/**
 * Mỗi pha tween scale (0->1 / 1->0) của teleport. Bản gốc khai báo 300ms nhưng Phaser tween cộng elapsedMS của khung hình
 * (16.7ms @60Hz) cho mỗi logic update 40Hz => thực tế 300*25/16.7 = 450ms (đo trên bản gốc: ~578ms ở màn 75Hz).
 */
export const TELEPORT_TWEEN = 0.45;
export const TELEPORT_DIST = 60; // đứng cách bóng 60px phía sau (theo hướng tấn công)
export const TELEPORT_X_MIN = 30;
export const TELEPORT_X_MAX = 770;
export const BOTS_FAST_THRESHOLD = 0.5;

// ---------------- Collision (Box2D category bits) ----------------
// Dùng bit cao để không đụng matrix cũ của project (index 1..7).
export const G_GROUND = 1 << 10;
export const G_BALL = 1 << 11;
export const G_PBODY = 1 << 12; // body + floor của cầu thủ
export const G_HEAD = 1 << 13; // sensor đầu
export const G_GOAL = 1 << 14; // sensor khung thành

/** tag collider để phân biệt trong callback contact. */
export const TAG = {
    GROUND: 1,
    FLOOR: 2,
    GOAL_L: 3,
    GOAL_R: 4,
    HEAD: 5,
    PFLOOR: 6,
    PBODY: 7,
    BALL: 8,
};

// ---------------- Hình học sân (SPEC §2.2, toạ độ Phaser) ----------------
export type Pt = [number, number];

/** Sàn cát (mặt sân y=377): tag FLOOR. */
export const FLOOR_POLYS: Pt[][] = [[[0, 377], [800, 377], [800, 482], [0, 482]]];

/** Trần + khối khung thành, đã tách thành các polygon lồi (đối xứng qua x=400). */
const LEFT_BLOCK: Pt[][] = [
    // dải tường trái (mặt trong x=5) cao từ -185 tới 380
    [[-10, -185], [5, -185], [5, 380], [-10, 380]],
    // xà ngang hình thang
    [[5, 165], [65, 175], [65, 180], [60, 185], [5, 185]],
    // tường trong hốc khung thành (mặt x=10)
    [[5, 185], [10, 185], [10, 290], [5, 290]],
    // mặt phẳng y=290 + khối nền tới 380
    [[5, 290], [90, 290], [95, 295], [95, 380], [5, 380]],
];
const mirror = (polys: Pt[][]): Pt[][] =>
    polys.map((p) => p.map((v) => [800 - v[0], v[1]] as Pt).reverse());

export const GROUND_POLYS: Pt[][] = [
    // trần ngoài màn hình
    [[5, -184], [795, -184], [795, -174], [5, -174]],
    ...LEFT_BLOCK,
    ...mirror(LEFT_BLOCK),
];

/** Sensor bàn thắng (x, y, w, h) đúng dữ liệu Play1.json (phải = x 785). id: -1 trái, +1 phải. */
export const GOAL_SENSORS: { id: number; x: number; y: number; w: number; h: number }[] = [
    { id: -1, x: 15, y: 185, w: 10, h: 104 },
    { id: 1, x: 785, y: 185, w: 10, h: 104 },
];

// ---------------- Tên CLB (PlayersData.CLUBS_NAMES) ----------------
export const CLUB_NAMES = ['Meringues', 'Barca', 'The Citizens', 'The Reds', 'Scousers', 'Gunners', 'Red Devils', 'Die Bayern',
    'Die Borussen', 'Parisians', 'Nerazzurri', 'Giallorossi', 'As Aguias', 'Blauw-Zwart', 'The Teddy Bears', 'De Godenzonen',
    'Trilos', 'Miners', 'Die Roten Bullen', 'Sarı Kanaryalar', 'The Herons', 'Knights of Najd', 'Urubu', 'Las Gallinas'];

/** PlayersData.hands (tông da tay theo skinIndex). */
export const HANDS = [2, 2, 2, 1, 1, 1, 2, 1, 1, 3, 1, 1, 1, 3, 1, 2, 3, 1, 2, 3, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 1, 2, 1, 3, 1, 1, 1, 2, 1, 1];

/** Frame emblem trong HUD gameplay: "Emblemsv200" + (team<=10 ? "0":"") + (team-1). team 1..24. */
export function emblemHud(team: number): string {
    return 'Emblemsv200' + (team <= 10 ? '0' : '') + (team - 1);
}
/** Frame emblem trong popup pause (atlas interface): "Emblems00" + (y<10 ? "0":"") + y, y = team-1. */
export function emblemPopup(team: number): string {
    const y = team - 1;
    return 'Emblems00' + (y < 10 ? '0' : '') + y;
}

// ---------------- Helper toạ độ ----------------
/** x Phaser -> x Cocos (trong gameObjects). */
export const cx = (px: number): number => px - HALF_W;
/** y Phaser -> y Cocos. */
export const cy = (py: number): number => HALF_H - py;
