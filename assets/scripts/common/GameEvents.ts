/** Tên event gameplay — payload types xem `common/GameTypes.ts`. */
export const GAME_EVENTS = {
    PADDLE_HIT: 'paddle-hit',
    MATCH_GOAL: 'MATCH_GOAL',
    MATCH_END: 'MATCH_END',
    MATCH_KICKOFF: 'MATCH_KICKOFF',
    /** Bắt đầu trận (Menu/Rematch/autoStart). */
    MATCH_START: 'MATCH_START',
    /** Đếm ngược 3-2-1-GO — payload IMatchCountdownPayload. */
    MATCH_COUNTDOWN: 'MATCH_COUNTDOWN',
    /** Đồng hồ hiển thị 0-90 — payload IMatchTimePayload. */
    MATCH_TIME: 'MATCH_TIME',
    MATCH_HALFTIME: 'MATCH_HALFTIME',
    /** HalfTime popup gửi để bắt đầu hiệp 2. */
    MATCH_START_HALF2: 'MATCH_START_HALF2',
    MATCH_OVERTIME: 'MATCH_OVERTIME',
    /** Kết quả cuối trận — payload IMatchResultPayload. */
    MATCH_RESULT: 'MATCH_RESULT',
    /** Cầu thủ bắt đầu tackle — payload IPlayerSidePayload (side người tackle). */
    PLAYER_TACKLE: 'PLAYER_TACKLE',
    /** Cầu thủ bị stun — payload IPlayerSidePayload (side người bị stun). */
    PLAYER_STUN: 'PLAYER_STUN',
    /** Energy đổi (số nguyên hoặc đầy) — payload IEnergyPayload. */
    ENERGY_CHANGED: 'ENERGY_CHANGED',
    /** Dùng Super — payload ISuperUsedPayload. */
    SUPER_USED: 'SUPER_USED',
    /** Bóng bị sút — payload IBallShotPayload. */
    BALL_SHOT: 'BALL_SHOT',
    /** Bóng nảy chạm sàn (đã throttle) — không payload. */
    BALL_BOUNCE: 'BALL_BOUNCE',
} as const;
