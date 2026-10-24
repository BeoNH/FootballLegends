/** Energy tăng mỗi giây khi đang đá (gốc 1.5/s). */
export const ENERGY_RATE = 1.5;
/** Energy cần để dùng Super = max thanh energy (gốc 12). */
export const SUPER_COST = 12;

/** Dữ liệu phiên đấu dùng chung (static) — reset khi Rematch. */
export class MatchData {
    public static score1 = 0;
    public static score2 = 0;
    public static energy1 = 0;
    public static energy2 = 0;
    /** Hiệp hiện tại: 1 hoặc 2. */
    public static half: 1 | 2 = 1;
    public static isOvertime = false;
    /** Super đã chọn ở Menu: 0 = Fireball, 1 = Teleport. KHÔNG reset để giữ lựa chọn giữa các trận. */
    public static superSlot = 0;

    public static reset(): void {
        MatchData.score1 = 0;
        MatchData.score2 = 0;
        MatchData.energy1 = 0;
        MatchData.energy2 = 0;
        MatchData.half = 1;
        MatchData.isOvertime = false;
    }
}
