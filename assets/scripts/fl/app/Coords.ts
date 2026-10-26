import { view } from 'cc';

/** Helper đổi toạ độ Phaser logical (gốc trái-trên, y xuống) sang Cocos local (gốc giữa, y lên). */
export const P2C = {
    /** Bề rộng logical (>= 800) theo cửa sổ hiện tại. */
    get gw(): number { return view.getVisibleSize().width; },
    x(x: number): number { return x - P2C.gw / 2; },
    y(y: number): number { return 240 - y; },
    /** Toạ độ theo world 800x480 cố định (gameObjects đặt ở tâm). */
    wx(x: number): number { return x - 400; },
};
