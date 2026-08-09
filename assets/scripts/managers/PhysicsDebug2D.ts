import { _decorator, Component, EPhysics2DDrawFlags, PhysicsSystem2D } from 'cc';
import { PREVIEW } from 'cc/env';

const { ccclass, property } = _decorator;

/** Bật vẽ debug Collider2D khi Preview / Play trong Editor. */
@ccclass('PhysicsDebug2D')
export class PhysicsDebug2D extends Component {
    @property({ tooltip: 'Vẽ contour Collider2D' })
    private showShape = true;

    protected onLoad(): void {
        if (!PREVIEW || !this.showShape) {
            return;
        }
        PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Shape;
    }

    protected onDestroy(): void {
        if (!PREVIEW) {
            return;
        }
        PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.None;
    }
}
