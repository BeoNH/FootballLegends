import { _decorator, Canvas, Component, director, Node, tween, UIOpacity, Vec3, warn } from 'cc';

const { ccclass, property } = _decorator;

/** Popup cơ sở — tween bg + container; gắn trên prefab, spawn runtime qua PopupRoot. */
@ccclass('UiPopup')
export class UiPopup extends Component {
    @property({ type: Node, tooltip: 'Nền tối phía sau popup' })
    protected bg: Node | null = null;

    @property({ type: Node, tooltip: 'Khung nội dung popup' })
    protected container: Node | null = null;

    @property({ tooltip: 'Click vào bg để đóng popup' })
    protected closeOnBgTap = false;

    @property({ tooltip: 'Thời gian tween show/hide' })
    protected tweenDuration = 0.2;

    @property({ tooltip: 'Scale bắt đầu' })
    protected startScale = 0.15;

    @property({ tooltip: 'Scale khi hiện xong' })
    protected endScale = 1;

    @property({ tooltip: 'Độ mờ của bg (0–255)' })
    protected bgOpacity = 100;

    private isVisible = false;
    private isAnimating = false;
    private bgOpacityComp: UIOpacity | null = null;
    private cachedPopupRoot: Node | null = null;
    private hideComplete: (() => void) | null = null;

    protected onLoad(): void {
        this.bgOpacityComp = this.bg?.getComponent(UIOpacity) ?? this.bg?.addComponent(UIOpacity) ?? null;

        if (this.bg && this.closeOnBgTap) {
            this.bg.on(Node.EventType.TOUCH_END, this.onBgTap, this);
        }

        this.node.active = false;
        this.resetVisualState();
    }

    protected onDestroy(): void {
        if (this.bg && this.closeOnBgTap) {
            this.bg.off(Node.EventType.TOUCH_END, this.onBgTap, this);
        }
    }

    public show(): void {
        if (this.isVisible || this.isAnimating) {
            return;
        }

        this.attachToPopupRoot();
        this.node.active = true;
        this.isVisible = true;
        this.isAnimating = true;

        this.onBeforeShow();
        this.resetVisualState();

        if (this.bg) {
            this.bg.active = true;
        }

        if (this.bgOpacityComp) {
            tween(this.bgOpacityComp).stop();
            this.bgOpacityComp.opacity = 0;
            tween(this.bgOpacityComp)
                .to(this.tweenDuration, { opacity: this.bgOpacity })
                .start();
        }

        if (this.container) {
            tween(this.container).stop();
            this.container.setScale(this.startScale, this.startScale, this.startScale);
            tween(this.container)
                .to(
                    this.tweenDuration,
                    { scale: new Vec3(this.endScale, this.endScale, this.endScale) },
                    { easing: 'backOut' },
                )
                .call(() => {
                    this.isAnimating = false;
                    this.onAfterShow();
                })
                .start();
        } else {
            this.isAnimating = false;
            this.onAfterShow();
        }
    }

    public hide(onComplete?: () => void): void {
        if (!this.isVisible || this.isAnimating) {
            onComplete?.();
            return;
        }

        this.isAnimating = true;
        this.hideComplete = onComplete ?? null;
        this.onBeforeHide();

        if (this.bgOpacityComp) {
            tween(this.bgOpacityComp).stop();
            tween(this.bgOpacityComp)
                .to(this.tweenDuration, { opacity: 0 })
                .start();
        }

        if (this.container) {
            tween(this.container).stop();
            tween(this.container)
                .to(
                    this.tweenDuration,
                    { scale: new Vec3(this.startScale, this.startScale, this.startScale) },
                    { easing: 'backIn' },
                )
                .call(() => {
                    this.finishHide();
                })
                .start();
        } else {
            this.finishHide();
        }
    }

    public get visible(): boolean {
        return this.isVisible;
    }

    protected onBeforeShow(): void { }

    protected onAfterShow(): void { }

    protected onBeforeHide(): void { }

    protected onAfterHide(): void { }

    protected onBgTap(): void {
        if (this.closeOnBgTap) {
            this.hide();
        }
    }

    protected getPopupRoot(): Node | null {
        if (this.cachedPopupRoot) {
            return this.cachedPopupRoot;
        }

        const scene = director.getScene();

        if (!scene) {
            return null;
        }

        const canvas = scene.getComponentInChildren(Canvas);

        if (!canvas) {
            return null;
        }

        this.cachedPopupRoot = canvas.node.getChildByName('PopupRoot') ?? canvas.node;

        return this.cachedPopupRoot;
    }

    private attachToPopupRoot(): void {
        const popupRoot = this.getPopupRoot();

        if (!popupRoot) {
            warn('[UiPopup] PopupRoot not found');
            return;
        }

        if (this.node.parent !== popupRoot) {
            this.node.setParent(popupRoot);
        }

        this.node.setSiblingIndex(popupRoot.children.length - 1);
    }

    private resetVisualState(): void {
        if (this.container) {
            this.container.setScale(this.startScale, this.startScale, this.startScale);
        }

        if (this.bgOpacityComp) {
            this.bgOpacityComp.opacity = 0;
        }
    }

    private finishHide(): void {
        this.isVisible = false;
        this.isAnimating = false;
        this.node.active = false;
        this.onAfterHide();

        const complete = this.hideComplete;
        this.hideComplete = null;
        complete?.();
        this.node.destroy();
    }
}
