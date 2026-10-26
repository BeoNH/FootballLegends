import { Sfx } from '../app/Sfx';
import { Inventory } from '../app/Inventory';
import { MatchData } from '../app/MatchData';
import { BallObject } from './BallObject';
import { buildGame } from './GameBuilder';
import { MAX_FRAME_TIME, STEP, TACKLE_X, TACKLE_Y } from './GameConsts';
import { GameLayers, IGameContext } from './GameTypes';
import { CountDownObject, InfoPanel, MessageInfo, TimerObject } from './Hud';
import { FLPhysics } from './Physics';
import type { PlayerObject } from './PlayerObject';

export type FinishType = 'HalfTime' | 'PostMatch';

/**
 * Điều phối trận (port FootballGameCore, SPEC §3.1, §5): fixed-step, slow-mo, bàn thắng,
 * hết giờ/overtime (golden goal), countdown, kickoff.
 */
export class FootballGameCore implements IGameContext {
    layers: GameLayers;
    physics!: FLPhysics;
    ball!: BallObject;
    players: PlayerObject[] = [];
    players0: PlayerObject[] = [];
    players1: PlayerObject[] = [];
    playersAll: PlayerObject[][] = [this.players0, this.players1];

    timeScale = 1;
    botsSkill = 0.2;
    goalLatched = false;

    isPlaying = false;
    isPaused = false;
    isCountDown = true;
    isGoal = false;
    isEnd = false;
    isOvertime = false;
    /** đã finishMatch hoặc đang rời màn: dừng toàn bộ update. */
    finished = false;
    private timeDelay = 1.5;
    private deltaDelay = -1;
    private deltaMatchTime = 0;
    private pendingGoal = 0;
    private stadiumVol = -1;
    private acc = 0;
    private firstUpdate = true;

    countDown!: CountDownObject;
    messageInfo!: MessageInfo;
    timer!: TimerObject;
    infoPanel!: InfoPanel;

    /** Callback kết thúc (Gameplay chuyển màn). */
    onFinish: (type: FinishType) => void = () => {};

    constructor(layers: GameLayers) {
        this.layers = layers;
    }

    /** Dựng toàn bộ object (sân, bóng, cầu thủ, HUD) rồi bắt đầu trận. */
    init(): void {
        // Năng lượng super: giữ qua hiệp 2 (matchState 2), các trường hợp khác reset TRƯỚC khi cầu thủ đọc MatchData.energies.
        if (MatchData.matchState !== 2) MatchData.clearScore();
        this.physics = new FLPhysics(this.layers.physRoot);
        buildGame(this);
        this.infoPanel = new InfoPanel(this.layers.gui);
        this.timer = new TimerObject(this.layers.gui, () => this.matchEnd());
        this.startMatch();
    }

    addPlayer(p: PlayerObject): void {
        this.players.push(p);
        (p.direction < 0 ? this.players0 : this.players1).push(p);
    }

    // ---------------- vòng lặp ----------------
    /** Gọi mỗi khung hình với dt thực: chạy N tick cố định 0.025s rồi cập nhật đồ hoạ. */
    frame(dt: number): void {
        if (this.finished) return;
        if (this.firstUpdate) { this.firstUpdate = false; this.acc = 0; return; }
        this.acc += Math.min(dt, MAX_FRAME_TIME);
        while (this.acc >= STEP) {
            this.update(STEP);
            this.acc -= STEP;
            if (this.finished) break;
        }
        this.updateGraphics(dt);
    }

    private updateGraphics(dt: number): void {
        this.ball.updateGraphics(dt);
        for (const p of this.players) p.updateGraphics(dt, this.timeScale);
    }

    private setStadiumVolume(v: number): void {
        if (v === this.stadiumVol) return;
        this.stadiumVol = v;
        Sfx.setVolume('stadium', v);
    }

    /** Một tick logic. dt = STEP (chưa nhân timeScale). */
    update(dt: number): void {
        if (this.isPaused) { this.setStadiumVolume(0); return; }
        this.setStadiumVolume(1);
        if (this.isPlaying) {
            const e = dt * this.timeScale;
            if (e !== 0) {
                this.physics.update(e);
                this.flushPhysicsEvents();
                for (const p of this.players) p.applyFriction(e); // mô phỏng ma sát nape sau step
                this.ball.update(e);
                for (const p of this.players) p.update(e);
            }
            if (this.deltaDelay >= 0) {
                this.deltaDelay += dt;
                if (this.deltaDelay >= this.timeDelay) {
                    this.deltaDelay = -1;
                    if (this.isEnd) this.finishMatch();
                    else if (this.isGoal) {
                        if (this.isOvertime) this.finishMatch(); else this.restart();
                    }
                }
            } else {
                this.deltaMatchTime += dt;
                this.timer.process(this.deltaMatchTime);
            }
        } else if (this.isCountDown && this.countDown.process(dt)) {
            this.isCountDown = false;
            this.isPlaying = true;
            Sfx.play('whistle');
        }
    }

    // ---------------- IGameContext ----------------
    slow(n: number): void {
        this.timeScale = n === 1 ? 0.05 : n === 2 ? 0.4 : n === 3 ? 0 : 1;
    }

    reportGoal(id: number): void {
        if (this.goalLatched) return;
        this.goalLatched = true;
        this.pendingGoal = id;
    }

    /** Xử lý sự kiện phát sinh trong lúc Box2D step (bàn thắng) ngay sau step. */
    private flushPhysicsEvents(): void {
        if (this.pendingGoal !== 0) {
            const id = this.pendingGoal;
            this.pendingGoal = 0;
            this.onGoal(id);
        }
    }

    /**
     * Tackle: với mỗi đối thủ o: r = dir*(o.x - t.x); 0<=r<=40 && o.y >= t.y-50 -> stun.
     * GIỮ ĐÚNG bản gốc (dir = direction, hit-test nằm sau lưng người tackle theo hướng tấn công).
     */
    tackle(x: number, y: number, direction: number, facing: number): void {
        const opp = direction === 1 ? this.playersAll[0] : this.playersAll[1];
        for (const o of opp) {
            const r = direction * (o.getX() - x);
            if (r >= 0 && r <= TACKLE_X && o.getY() >= y - TACKLE_Y) o.getStun(facing);
        }
    }

    getNearestOpponentDirection(x: number, direction: number): number {
        const opp = direction === 1 ? this.playersAll[0] : this.playersAll[1];
        let s = opp[0].getX() - x;
        for (let i = 1; i < opp.length; i++) {
            const o = opp[i].getX() - x;
            if (Math.abs(o) < Math.abs(s)) s = o;
        }
        return s >= 0 ? 1 : -1;
    }

    unActive(t: number): void {
        for (const p of this.players) p.unActive(t);
    }

    // ---------------- luồng trận ----------------
    private setupVars(): void {
        this.isCountDown = true;
        this.isPaused = false;
        this.isPlaying = false;
        this.isGoal = false;
        this.deltaDelay = -1;
        this.timeScale = 1;
    }

    /** Kickoff mới: reset object, countdown, vận tốc về 0 (sau bàn thắng/đầu trận/resume). */
    restart(): void {
        this.timeScale = 1;
        this.ball.restart();
        for (const p of this.players) p.restart();
        this.setupVars();
        this.countDown.activate();
        this.goalLatched = false;
        this.pendingGoal = 0;
        this.ball.stopVelocity();
        for (const p of this.players) p.stopVelocity();
    }

    startMatch(): void {
        this.restart();
        let t: number, e: number;
        const ms = MatchData.matchState;
        if (ms === 0) { MatchData.clearScore(); t = 0; e = 2; }
        else if (ms === 1) { MatchData.clearScore(); t = 0; e = 1; }
        else { t = 1; e = 2; }
        this.infoPanel.start(Inventory.teams, MatchData.score1, MatchData.score2);
        this.timer.start(t, e);
        this.deltaMatchTime = 0;
        this.isOvertime = false;
        this.isEnd = false;
        Sfx.play('stadium', 1, true);
    }

    finishMatch(): void {
        Sfx.stop('stadium');
        this.isPaused = true;
        this.finished = true;
        this.onFinish(MatchData.matchState === 1 ? 'HalfTime' : 'PostMatch');
    }

    private onGoal(id: number): void {
        if (this.deltaDelay >= 0) return;
        this.slow(0);
        if (this.isOvertime) Sfx.play('FinalWhistle');
        if (id > 0) {
            MatchData.score1++;
            Sfx.play('goal1');
        } else {
            MatchData.score2++;
            if (Inventory.numPlayers === 1 && Inventory.matchMode < 2) Sfx.play('goal1'); else Sfx.play('goal2');
        }
        this.infoPanel.updateScore(MatchData.score1, MatchData.score2);
        this.unActive(id);
        this.messageInfo.show('GOAL!!!');
        this.isGoal = true;
        this.deltaDelay = 0;
    }

    /** Hết giờ (timer báo). Tournament hiệp 2 hoà -> OVERTIME golden goal; còn lại FULL/HALF TIME. */
    private matchEnd(): void {
        const ms = MatchData.matchState;
        let text: string;
        if (ms === 2 && MatchData.score1 === MatchData.score2) {
            text = 'OVERTIME!';
            this.isOvertime = true;
            Sfx.play('beepOvertime');
        } else {
            Sfx.play('FinalWhistle');
            this.slow(0);
            text = ms === 1 ? 'HALF TIME!' : 'FULL TIME!';
            const r = MatchData.score1 === MatchData.score2 ? 0 : MatchData.score1 > MatchData.score2 ? 1 : -1;
            this.unActive(r);
            this.isEnd = true;
            this.deltaDelay = 0;
        }
        this.messageInfo.show(text);
    }

    /** Resume sau pause: chạy lại countdown 3-2-1-GO (SPEC §1.4). */
    resumeFromPause(): void {
        this.isPaused = false;
        this.isCountDown = true;
        this.countDown.activate();
    }

    release(): void {
        Sfx.stop('stadium');
        this.timeScale = 1;
        for (const p of this.players) p.release();
        this.ball.release();
        this.physics.release();
    }
}
