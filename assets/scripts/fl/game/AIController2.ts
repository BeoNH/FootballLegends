import { MatchData } from '../app/MatchData';
import { STEP } from './GameConsts';
import { BaseController } from './Controllers';
import type { PlayerObject } from './PlayerObject';
import type { FootballGameCore } from './GameCore';

/** PlayersData.POINTS: điểm đứng cơ bản [trái id0,id1,id2, phải id0,id1,id2] (Phaser x). */
const POINTS = [200, 280, 120, 600, 520, 680];
const WIDTH2 = 400;

/**
 * Bot AI (port AIController2, SPEC §7). Mọi toạ độ ở đây là toạ độ Phaser (x phải, y XUỐNG, 0..800 x 0..480):
 * PhysBody.px/py/vx/vy của port đã ở hệ này nên giữ nguyên logic gốc, chỉ giữ nguyên hằng số.
 * Các hàm getMove/getJump/getShoot được PlayerObject.update gọi đúng 1 lần mỗi tick logic (0.025s);
 * xác suất `allow*` được roll mỗi lần gọi, bộ đếm trễ dùng `step` cố định như bản gốc.
 */
export class AIController2 extends BaseController {
    private readonly deltaBasePoint = 35;
    private readonly deltaBallCloseToGoal = 150;
    private currentMove = -1;
    private readonly delayNeedBack = 0.3;
    private readonly inactiveTime = 6;
    private readonly step = STEP;
    private readonly dir: number;
    private readonly id: number;
    private readonly basePoint: number;
    private readonly dJumpY = -100;
    private readonly dShootX = 78;
    private readonly dShootY = 90;
    private readonly dMove = 60;
    private readonly dMoveAttack: number;
    private readonly dJumpX: number;
    private readonly limitForBall: number;
    private readonly delayForMove = 1.1;
    private readonly delayForJump = 0.8;
    private readonly chance: number;

    private strategy = 0;
    private needBack = false;
    private deltaNeedBack = 0;
    private deltaInactiveMove = 0;
    private deltaForMove = 0;
    private deltaForJump = 0;
    private jumpOnly = false;
    private player1: PlayerObject | null = null;

    constructor(player: PlayerObject, private core: FootballGameCore, skill: number) {
        super(player);
        this.dir = player.direction;
        this.id = player.playerID;
        this.basePoint = POINTS[this.dir === -1 ? this.id : 3 + this.id];
        this.dMoveAttack = this.id < 2 ? 150 : 200;
        let addBallDistance = 0;
        if (this.id === 0) this.dJumpX = 100;
        else if (this.id === 1) { this.dJumpX = 100; addBallDistance = 270; }
        else this.dJumpX = 170;
        this.limitForBall = WIDTH2 - this.dir * addBallDistance;
        this.chance = skill;
        this.restart();
    }

    // ---------------- tiện ích ----------------
    private get ball() { return this.player.ball; }
    private deltaX(): number { return this.ball.getX() - this.player.getX(); }
    private deltaY(): number { return this.ball.getY() - (this.player.getY() + 6); }
    private allowMove(): number { return Math.random() <= this.chance ? 1 : 0; }
    private allowJump(): boolean { return Math.random() <= this.chance; }
    private allowShoot(): boolean { return Math.random() <= this.chance; }

    private atBasePoint(): boolean { return Math.abs(this.player.getX() - this.basePoint) < this.deltaBasePoint; }
    private moveToBasePoint(): number { return this.atBasePoint() ? 0 : this.player.getX() < this.basePoint ? 1 : -1; }
    private moveToBall(): number {
        const d = this.deltaX();
        return d <= -this.dMove ? -this.allowMove() : d >= this.dMove ? this.allowMove() : 0;
    }
    private ballOnThisSide(): boolean { return (this.ball.getX() - WIDTH2) * this.dir >= 0; }
    private ballInZone(): boolean { return this.dir * (this.ball.getX() - this.limitForBall) >= 0; }
    private ballInAttackZone(): boolean { return Math.abs(this.deltaX()) < this.dMoveAttack; }
    private ballCloseToGoal(): boolean {
        return (this.ball.getX() - this.player.getX()) * this.dir >= this.deltaBallCloseToGoal;
    }

    /** Đồng đội id1 cùng đội (getFirstPlayer), tìm lười vì id2 được tạo sau id1. */
    private getPlayer1(): PlayerObject | null {
        if (this.player1) return this.player1;
        const list = this.dir === -1 ? this.core.players0 : this.core.players1;
        if (list.length === 0) return null;
        let p = list[0];
        for (let i = 1; i < list.length; i++) if (list[i].playerID === 1) p = list[i];
        this.player1 = p;
        return p;
    }

    private isPlayer1JumpingUp(): boolean {
        const p = this.getPlayer1();
        return !!p && (p.state === 'jump' || p.state === 'fly1');
    }

    // ---------------- IController ----------------
    getMove(): -1 | 0 | 1 {
        if (this.deltaForMove >= 0) {
            this.deltaForMove += this.step;
            if (this.deltaForMove >= this.delayForMove) this.deltaForMove = -1;
            return 0;
        }
        if (this.id < 2) {
            if (this.needBack) {
                this.currentMove = this.dir;
                this.deltaNeedBack += this.step;
                if (this.deltaNeedBack >= this.delayNeedBack) this.needBack = false;
            } else if (this.ballCloseToGoal()) {
                this.currentMove = this.dir;
            } else if (this.strategy === -1) {
                this.currentMove = this.moveToBall();
            } else if (this.strategy < 1) {
                this.currentMove = (this.ballInZone() || this.ballInAttackZone()) ? this.moveToBall() : this.moveToBasePoint();
            } else if (this.strategy === 1) {
                this.currentMove = this.ballOnThisSide() ? this.moveToBall() : this.moveToBasePoint();
            }
        } else if (this.id === 2) {
            if (this.ballCloseToGoal()) {
                this.currentMove = this.dir;
            } else if (this.jumpOnly) {
                this.currentMove = 0;
            } else if (this.strategy === -1) {
                const p1 = this.getPlayer1();
                this.currentMove = (p1 && (p1.getX() - WIDTH2) * this.dir < 0) ? this.moveToBasePoint()
                    : this.ballInAttackZone() ? this.moveToBall() : this.moveToBasePoint();
            } else if (this.strategy === 0) {
                this.currentMove = this.ballInZone() ? this.moveToBall() : this.moveToBasePoint();
            } else if (this.strategy === 1) {
                this.currentMove = (this.ballInZone() && this.ballInAttackZone()) ? this.moveToBall() : this.moveToBasePoint();
            }
        }
        if (this.currentMove === 0 && this.id < 2) {
            this.deltaInactiveMove += this.step;
            if (this.deltaInactiveMove >= this.inactiveTime) { this.strategy = -1; this.deltaInactiveMove = 0; }
        } else {
            this.deltaInactiveMove = 0;
        }
        return (this.currentMove || 0) as -1 | 0 | 1;
    }

    getJump(): boolean {
        let jump = false;
        const shooting = () => this.ball.isShooting() === this.dir;
        if (this.id === 0) {
            if (this.deltaForJump >= 0) {
                this.deltaForJump += this.step;
                if (this.deltaForJump >= this.delayForJump) this.deltaForJump = -1;
                if (shooting()) { jump = true; this.deltaForJump = -1; }
            } else {
                jump = Math.abs(this.deltaX()) <= this.dJumpX && this.deltaY() <= this.dJumpY && this.allowJump();
            }
        } else if (this.id === 1) {
            jump = Math.abs(this.deltaX()) <= this.dJumpX && this.deltaY() <= this.dJumpY && this.allowJump();
        } else if (this.id === 2) {
            if (this.deltaForJump >= 0) {
                jump = false;
                this.deltaForJump += this.step;
                if (this.deltaForJump >= this.delayForJump) {
                    this.deltaForJump = -1;
                    if (shooting()) jump = true;
                }
            } else if (this.allowJump()) {
                if (shooting()) {
                    if (Math.abs(this.deltaX()) <= this.dJumpX && this.deltaY() <= this.dJumpY) {
                        if (this.atBasePoint()) { this.currentMove = 0; this.jumpOnly = true; jump = true; }
                        else jump = !this.isPlayer1JumpingUp();
                    } else jump = false;
                } else {
                    jump = Math.abs(this.deltaX()) <= 3 * this.dJumpX / 4 && this.deltaY() <= this.dJumpY && !this.isPlayer1JumpingUp();
                }
            } else jump = false;
        }
        return jump;
    }

    getShoot(): boolean {
        return Math.abs(this.deltaX()) <= this.dShootX && Math.abs(this.deltaY()) <= this.dShootY && this.allowShoot();
    }

    /** Bot không dùng readyToJump (luôn false), không slide, không super. */
    readyToJump(): boolean { return false; }
    getTackle(): boolean { return false; }
    getSuperShot(): boolean { return false; }

    /** Gọi khi chạm đất (PlayerObject.onFloorGround) -> xoá jumpOnly. */
    clearJump(): void { this.jumpOnly = false; }

    /** Mỗi kickoff: chọn chiến thuật theo tỉ số (MatchData.getScore(dir) = (s1-s2) * -dir). */
    restart(): void {
        const t = (MatchData.score1 - MatchData.score2) * -this.dir;
        this.deltaInactiveMove = 0;
        this.deltaForShoot = -1;
        this.deltaForMove = this.id - 2;
        this.deltaForJump = 0;
        this.needBack = false;
        this.deltaNeedBack = 0;
        if (t < 0) { this.strategy = -1; this.needBack = Math.random() < 0.2; }
        else if (t === 0) { this.strategy = 0; this.needBack = Math.random() < 0.7; }
        else { this.strategy = 1; this.needBack = Math.random() < 0.9; }
        this.clearJump();
    }

    /** Không dùng (giữ cho đủ field gốc). */
    private deltaForShoot = -1;

    makeAggressive(): void { this.strategy = -1; }

    dispose(): void {
        this.player1 = null;
        this.core = null as any;
        super.dispose();
    }
}
