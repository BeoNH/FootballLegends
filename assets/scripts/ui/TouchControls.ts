import { _decorator, Component, Node, sys } from 'cc';
import { PlayerController } from '../gameplay/PlayerController';
import { SuperAbility } from '../gameplay/SuperAbility';

const { ccclass, property } = _decorator;

/** Nút cảm ứng điều khiển human; ẩn trên desktop trừ khi forceShow. */
@ccclass('TouchControls')
export class TouchControls extends Component {
    @property({ type: PlayerController, tooltip: 'Cầu thủ human' })
    private readonly player: PlayerController | null = null;

    @property({ type: SuperAbility, tooltip: 'SuperAbility của human' })
    private readonly superAbility: SuperAbility | null = null;

    @property({ type: Node, tooltip: 'Nút ← (giữ)' })
    private readonly btnLeft: Node | null = null;

    @property({ type: Node, tooltip: 'Nút → (giữ)' })
    private readonly btnRight: Node | null = null;

    @property({ type: Node, tooltip: 'Nút nhảy (chạm)' })
    private readonly btnJump: Node | null = null;

    @property({ type: Node, tooltip: 'Nút sút (chạm)' })
    private readonly btnShoot: Node | null = null;

    @property({ type: Node, tooltip: 'Nút tackle (chạm)' })
    private readonly btnTackle: Node | null = null;

    @property({ type: Node, tooltip: 'Nút Super (chạm)' })
    private readonly btnSuper: Node | null = null;

    @property({ tooltip: 'Hiện cả trên desktop (để test)' })
    private readonly forceShow = false;

    private leftDown = false;
    private rightDown = false;

    protected onLoad(): void {
        if (!sys.isMobile && !this.forceShow) {
            this.node.active = false;
            return;
        }
        this.bindHold(this.btnLeft, true);
        this.bindHold(this.btnRight, false);
        this.bindTap(this.btnJump, () => this.player?.requestJump());
        this.bindTap(this.btnShoot, () => this.player?.requestShoot());
        this.bindTap(this.btnTackle, () => this.player?.requestTackle());
        this.bindTap(this.btnSuper, () => this.superAbility?.requestSuper());
    }

    protected onDestroy(): void {
        for (const n of [this.btnLeft, this.btnRight, this.btnJump, this.btnShoot, this.btnTackle, this.btnSuper]) {
            n?.targetOff(this);
        }
    }

    private bindHold(node: Node | null, isLeft: boolean): void {
        if (node == null) {
            return;
        }
        const set = (down: boolean): void => {
            if (isLeft) {
                this.leftDown = down;
            } else {
                this.rightDown = down;
            }
            this.applyAxis();
        };
        node.on(Node.EventType.TOUCH_START, () => set(true), this);
        node.on(Node.EventType.TOUCH_END, () => set(false), this);
        node.on(Node.EventType.TOUCH_CANCEL, () => set(false), this);
    }

    private bindTap(node: Node | null, fn: () => void): void {
        node?.on(Node.EventType.TOUCH_START, fn, this);
    }

    /** Cả hai cùng giữ → đứng yên (giống bàn phím). */
    private applyAxis(): void {
        if (this.player == null) {
            return;
        }
        this.player.moveAxis = this.leftDown === this.rightDown ? 0 : this.leftDown ? -1 : 1;
    }
}
