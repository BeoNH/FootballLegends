/** Dữ liệu trận hiện tại, dùng chung giữa Gameplay/PreMatch/PostMatch. */
export class MatchData {
    /** 0 = friendly/quick, 1 = tournament, 2 = ... (SPEC §1.3) */
    static matchState = 0;
    static score1 = 0;
    static score2 = 0;
    /** energies[0..2]: năng lượng 3 slot super (0..1) */
    static energies: number[] = [0, 0, 0];
    /** Thời điểm bắt đầu phiên trận (ms), set khi clearScore. */
    static startTime = Date.now();

    static clearScore(): void {
        MatchData.score1 = 0;
        MatchData.score2 = 0;
        MatchData.energies = [0, 0, 0];
        MatchData.startTime = Date.now();
    }

    /** Số giây từ lúc bắt đầu trận (gửi lên /saveScore). */
    static get sessionTimeSeconds(): number {
        return Math.round((Date.now() - MatchData.startTime) / 1000);
    }
}
