import { KEY_SAVE, Storage } from './Storage';
import { sanitizeMatchMode } from './Features';
import { MatchData } from './MatchData';

const TEAMS_COUNT = 24;

/** Dữ liệu save tournament (shape theo SPEC §10). */
export interface TournamentSave {
    state: number; team: number; rounds: number[]; results: number[]; player: number;
    teamNo: number; opponentNo: number; mode: number; score: number; clearWin: number;
    difficulty: number; goals: number;
}

/** Trạng thái người chơi/lựa chọn xuyên màn + save + logic giải đấu (SPEC §5.6). */
export class Inventory {
    /** 0 = 1 người, 1 = 2 người */
    static numPlayers = 0;
    /** 0 = tournament, 1 = friendly */
    static gameMode = 0;
    /** 0 = 1v1, 1 = 2v2, 2 = 1v2 */
    static matchMode = 0;
    /** 0 = Normal, 1 = Hard */
    static difficulty = 0;
    /** Index team (1..24) của 2 bên */
    static teams: number[] = [1, 2];
    /** Cầu thủ chọn (1|2) của mỗi bên */
    static players: number[] = [1, 1];
    static isQuickMatch = false;
    /** (cũ) Skill bot quick/friendly — gameplay nên dùng Inventory.botsSkill */
    static botSkill = 0.2;
    /** Index CLB gần nhất (0-based) */
    static team = 0;
    /** Tên user lấy từ API /login (không lưu vào save). */
    static userName = '';
    static tsave:TournamentSave | null = null;
    static tsave2: TournamentSave | null = null;
    static stats: any = { t0: 0, t1: 0, t2: 0, goals: 0 };

    // ---- Tournament state (port Inventory gốc) ----
    /** Chặng: 0 = vòng 16, 1 = tứ kết, 2 = bán kết, 3 = chung kết/hạng 3, 4 = xong, -1 = chưa có giải */
    static state = -1;
    /** Team (1..24) của người chơi trong giải (khác Inventory.team = CLB lưu 0-based) */
    static tTeam = 0;
    /** [0..15] vòng 16; [16..23] tứ kết; [24..27] bán kết; [28..31] CK/hạng 3; [32] vô địch [33] hạng 3 [34] á quân [35] hạng 4 */
    static rounds: number[] = [];
    /** results[i] = số bàn của rounds[i] ở chặng của nó */
    static results: number[] = [];
    static teamNo = 0;
    static opponentNo = 0;
    static currentScore = 0;
    static clearWin = 0;
    static tournamentGoals = 0;
    /** "" | "9-16" | "5-8" | "4" (hạng 4) */
    static outInfo = '';
    private static startTeam = 0;
    private static teamsLeg = 0;
    private static endTeam = 0;
    private static finalLegs = false;
    private static backup: TournamentSave | null = null;

    /** Skill bot theo SPEC §5.1: quick 0.2; friendly 0.3; tournament theo chặng + độ khó. */
    static get botsSkill(): number {
        if (Inventory.isQuickMatch) return 0.2;
        if (Inventory.gameMode === 0) {
            const s = Inventory.state;
            const base = s === 0 ? 0.1 : s === 1 ? 0.2 : s === 2 ? 0.4 : 0.5;
            return base + (Inventory.difficulty === 1 ? 0.5 : 0);
        }
        return 0.3;
    }

    static load(): void {
        const d = Storage.read<any>(KEY_SAVE);
        const s = d && d.invsav;
        if (!s) return;
        Inventory.team = s.team | 0;
        Inventory.tsave = s.tsave || null;
        Inventory.tsave2 = s.tsave2 || null;
        Inventory.stats = s.stats || Inventory.stats;
    }

    static save(): void {
        Storage.write(KEY_SAVE, {
            invsav: {
                team: Inventory.team, tsave: Inventory.tsave, tsave2: Inventory.tsave2,
                stats: Inventory.stats, achievs: {},
            },
        });
    }

    static getTeam(): number { return Inventory.team; }

    /** Quick Match (SPEC §5.7). */
    static initQuickMatch(): void {
        Inventory.isQuickMatch = true;
        Inventory.numPlayers = 0;
        Inventory.gameMode = 1;
        Inventory.matchMode = 0;
        Inventory.botSkill = 0.2;
        const t1 = 1 + Math.floor(Math.random() * 24);
        let t = t1 + 1 + Math.floor(Math.random() * 15);
        if (t > 16) t -= 16;
        Inventory.teams = [t1, t];
        Inventory.players = [1 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2)];
        MatchData.matchState = 0;
        MatchData.clearScore();
    }

    // ================= Tournament =================

    private static saveKey(): 'tsave' | 'tsave2' { return Inventory.numPlayers === 0 ? 'tsave' : 'tsave2'; }

    private static snapshot(): TournamentSave {
        return {
            state: Inventory.state, team: Inventory.tTeam,
            rounds: Inventory.rounds.slice(), results: Inventory.results.slice(),
            player: Inventory.players[0], teamNo: Inventory.teamNo, opponentNo: Inventory.opponentNo,
            mode: Inventory.matchMode, score: Inventory.currentScore, clearWin: Inventory.clearWin,
            difficulty: Inventory.difficulty, goals: Inventory.tournamentGoals,
        };
    }

    static saveTournament(): void {
        Inventory[Inventory.saveKey()] = Inventory.snapshot();
        Inventory.save();
    }

    /** Có save giải đấu (theo numPlayers) chưa kết thúc không — không đổi state. */
    static hasSave(): boolean {
        const t = Inventory[Inventory.saveKey()];
        return !!t && t.state !== 4;
    }

    /** Nạp save vào state hiện tại; true nếu hợp lệ (state==4 -> xoá save, false). */
    static getTournament(): boolean {
        return Inventory.loadFromObj(Inventory[Inventory.saveKey()]);
    }

    private static loadFromObj(t: TournamentSave | null): boolean {
        if (!t) return false;
        Inventory.state = t.state;
        if (t.state === 4) { Inventory.state = -1; Inventory.clearTournamentSave(); return false; }
        Inventory.tTeam = t.team;
        Inventory.rounds = t.rounds.slice();
        Inventory.results = t.results.slice();
        Inventory.players[0] = t.player;
        Inventory.players[1] = 1;
        Inventory.teamNo = t.teamNo;
        Inventory.opponentNo = t.opponentNo;
        Inventory.matchMode = sanitizeMatchMode(t.mode);
        Inventory.currentScore = t.score;
        Inventory.clearWin = t.clearWin;
        Inventory.difficulty = t.difficulty ? t.difficulty : 0;
        Inventory.tournamentGoals = t.goals ? t.goals : 0;
        Inventory.teams[0] = Inventory.tTeam;
        Inventory.teams[1] = Inventory.rounds[Inventory.opponentNo];
        return true;
    }

    /** Huỷ giải: xoá state + xoá save. */
    static breakTournament(): void { Inventory.clearTournamentData(); Inventory.clearTournamentSave(); }

    static clearTournamentData(): void {
        Inventory.state = -1; Inventory.tTeam = 0; Inventory.rounds = []; Inventory.results = [];
        Inventory.teamNo = 0; Inventory.opponentNo = 0; Inventory.outInfo = '';
        Inventory.currentScore = 0; Inventory.clearWin = 0; Inventory.difficulty = 0; Inventory.tournamentGoals = 0;
    }

    static clearTournamentSave(): void {
        Inventory[Inventory.saveKey()] = null;
        Inventory.save();
    }

    /** Người chơi đang ở chung kết (rounds[28|29]) hay trận hạng 3. */
    static isFinal(): boolean { return Inventory.tTeam === Inventory.rounds[28] || Inventory.tTeam === Inventory.rounds[29]; }

    /** Bốc thăm 16 đội: người chơi = rounds[0], 15 đội còn lại ngẫu nhiên không lặp từ 24 đội. */
    static createNewTournament(): void {
        Inventory.tTeam = Inventory.teams[0];
        const rounds: number[] = [Inventory.tTeam];
        const pool: number[] = [];
        for (let s = 0; s < TEAMS_COUNT; s++) if (Inventory.tTeam !== s + 1) pool.push(s + 1);
        for (let s = 1; s < 16; s++) {
            const n = Math.floor(Math.random() * pool.length);
            rounds[s] = pool[n];
            pool.splice(n, 1);
        }
        Inventory.rounds = rounds;
        Inventory.results = [];
        Inventory.state = 0;
        Inventory.tournamentGoals = 0;
        Inventory.outInfo = '';
        Inventory.currentScore = 0;
        Inventory.clearWin = 0;
        Inventory.teamNo = 0;
        Inventory.defineOpponent();
        Inventory.saveTournament();
    }

    /** Đối thủ = ô kề trong cặp (chẵn +1, lẻ -1). */
    static defineOpponent(): void {
        Inventory.opponentNo = Inventory.teamNo + (Inventory.teamNo % 2 === 0 ? 1 : -1);
        Inventory.teams[1] = Inventory.rounds[Inventory.opponentNo];
        Inventory.players[1] = Math.random() <= 0.5 ? 1 : 2;
    }

    /** Điểm trận AI: 0:10% 1:20% 2:35% 3:20% 4:10% 5:5%. */
    static generateScore(): number {
        const e = Math.random();
        return e <= 0.1 ? 0 : e <= 0.3 ? 1 : e <= 0.65 ? 2 : e <= 0.85 ? 3 : e <= 0.95 ? 4 : 5;
    }

    private static calcVars(): void {
        const I = Inventory;
        I.finalLegs = false;
        if (I.state === 0) { I.startTeam = 0; I.teamsLeg = 16; }
        else if (I.state === 1) { I.startTeam = 16; I.teamsLeg = 8; }
        else if (I.state === 2) { I.startTeam = 24; I.teamsLeg = 4; I.finalLegs = true; }
        else if (I.state === 3) { I.startTeam = 28; I.teamsLeg = 4; I.finalLegs = true; }
        I.endTeam = I.startTeam + I.teamsLeg;
    }

    /** Sinh điểm cho các trận AI của chặng; trận người chơi dùng (s1, s2). */
    private static generateResults(s1 = 0, s2 = 0): void {
        const I = Inventory;
        for (let i = I.startTeam; i < I.endTeam; i++) I.results[i] = I.generateScore();
        if (I.teamNo >= I.startTeam) { I.results[I.teamNo] = s1; I.results[I.opponentNo] = s2; }
    }

    private static setNextTeam(n: number, win: number, lose: number): void {
        Inventory.rounds[n] = Inventory.rounds[win];
        if (Inventory.finalLegs) Inventory.rounds[n + 2] = Inventory.rounds[lose];
    }

    /** Xác định đội thắng từng cặp (hoà -> tung đồng xu +1 bàn). Trả true nếu người chơi còn trận kế. */
    private static defineWinners(): boolean {
        const I = Inventory;
        let alive = false;
        for (let e = 0; e < I.teamsLeg / 2; e++) {
            const i = I.startTeam + 2 * e, s = i + 1, n = I.endTeam + e;
            const a = I.results[i], b = I.results[s];
            if (a > b) I.setNextTeam(n, i, s);
            else if (a < b) I.setNextTeam(n, s, i);
            else if (Math.random() <= 0.5) { I.results[i]++; I.setNextTeam(n, i, s); }
            else { I.results[s]++; I.setNextTeam(n, s, i); }
            if (I.rounds[n] === I.tTeam) { alive = true; I.teamNo = n; }
            if (I.finalLegs && I.rounds[n + 2] === I.tTeam) { alive = true; I.teamNo = I.endTeam + 2 + e; }
        }
        return alive;
    }

    private static calcScore(): void {
        const I = Inventory;
        const t = MatchData.score1 - MatchData.score2;
        let base = t > 0 ? 1000 : 500;
        if (I.state === 3 && base === 500 && I.isFinal()) base = 1000;
        I.currentScore += (100 * MatchData.score1 + 10 * Math.max(t, 0) + base * (I.state + 1)) * (I.matchMode + 1);
        const k = 't' + I.matchMode;
        if (I.currentScore > (I.stats[k] || 0)) I.stats[k] = I.currentScore;
    }

    private static summarizeMatch(): void {
        if (Inventory.numPlayers !== 0) return;
        const g = MatchData.score1;
        Inventory.tournamentGoals += g;
        Inventory.stats.goals = (Inventory.stats.goals || 0) + g;
        if (MatchData.score2 === 0) Inventory.clearWin++;
    }

    private static summarizeTournament(): void {
        if (Inventory.numPlayers !== 0) return;
        const k = 't' + Inventory.matchMode;
        if (!Inventory.stats[k] || Inventory.currentScore > Inventory.stats[k]) Inventory.stats[k] = Inventory.currentScore;
    }

    /**
     * Kết thúc trận của người chơi (dùng MatchData.score1/2 cho calcScore/summarizeMatch).
     * true = còn thi đấu (-> Tournament); false = giải kết thúc/bị loại (-> FinalTournament).
     * Bị loại: mô phỏng nốt các chặng còn lại, xoá save (backup giữ lại cho Rematch).
     */
    static nextLeg(s1: number, s2: number): boolean {
        const I = Inventory;
        const cur = I[I.saveKey()];
        I.backup = cur ? JSON.parse(JSON.stringify(cur)) : I.snapshot();
        I.calcVars(); I.calcScore(); I.summarizeMatch(); I.generateResults(s1, s2);
        const alive = I.defineWinners();
        if (++I.state === 4) {
            if (I.rounds[35] === I.tTeam) I.outInfo = '4';
            I.summarizeTournament();
            I.clearTournamentSave();
            return false;
        }
        if (alive) { I.defineOpponent(); I.saveTournament(); return true; }
        I.summarizeTournament();
        if (I.state === 1) I.outInfo = '9-16'; else if (I.state === 2) I.outInfo = '5-8';
        for (let s = I.state; s < 4; s++) { I.calcVars(); I.generateResults(); I.defineWinners(); I.state++; }
        I.clearTournamentSave();
        return false;
    }

    /** Rematch: khôi phục state trước trận vừa thua và ghi lại save. */
    static restoreTournamentFromBackup(): void {
        if (!Inventory.backup) return;
        Inventory.outInfo = '';
        Inventory.loadFromObj(Inventory.backup);
        Inventory.saveTournament();
    }
}
