import { Director, PhysicsSystem2D, director, game } from 'cc';

/**
 * Slow-mo cho physics (static).
 *
 * Giả định đã đối chiếu engine 3.8.7 (physics-2d/framework/physics-system.ts, director.ts):
 * - `PhysicsSystem2D.postUpdate(dt)` nhận dt THÔ (không qua timeScale); chỉ cộng accumulator rồi
 *   step đúng `fixedTimeStep` (tối đa `maxSubSteps`). Nên chỉ đổi `fixedTimeStep` KHÔNG làm chậm
 *   (sim vẫn đuổi kịp thời gian thực) -> mỗi frame ta đặt fixedTimeStep = dt*scale và chỉnh
 *   accumulator để vừa đủ 1 step/frame => sim chạy đúng `scale` lần tốc độ thực, độc lập FPS.
 * - scale 0 => tắt `PhysicsSystem2D.enable`.
 * - `Component.update(dt)` và Tween cũng nhận dt thô; `Scheduler.setTimeScale` chỉ ảnh hưởng
 *   schedule/scheduleOnce. Cố ý KHÔNG đổi timeScale của scheduler để GOAL_PAUSE/HALFTIME... vẫn đếm thời gian thực.
 */
export class SlowMo {
    private static current = 1;
    private static baseStep = 0;
    private static realLeft = 0;
    private static hooked = false;

    public static get scale(): number {
        return SlowMo.current;
    }

    /** Đặt tốc độ physics 0..1 (0 = đứng hình). */
    public static set(scale: number): void {
        SlowMo.hook();
        const sys = PhysicsSystem2D.instance;
        if (sys == null) {
            return;
        }
        const s = Math.min(1, Math.max(0, scale));
        if (SlowMo.baseStep <= 0) {
            SlowMo.baseStep = sys.fixedTimeStep;
        }
        SlowMo.current = s;
        if (s >= 1) {
            sys.fixedTimeStep = SlowMo.baseStep;
            sys.resetAccumulator(0);
            sys.enable = true;
        } else if (s <= 0) {
            sys.enable = false;
        } else {
            sys.enable = true;
        }
    }

    public static reset(): void {
        SlowMo.realLeft = 0;
        if (SlowMo.current !== 1) {
            SlowMo.set(1);
        }
    }

    /** Slow-mo `scale` trong `duration` giây THỜI GIAN THỰC rồi về 1. */
    public static play(scale: number, duration: number): void {
        SlowMo.set(scale);
        SlowMo.realLeft = duration;
    }

    private static hook(): void {
        if (SlowMo.hooked) {
            return;
        }
        SlowMo.hooked = true;
        director.on(Director.EVENT_AFTER_UPDATE, SlowMo.onAfterUpdate);
    }

    /** Chạy sau mọi update, trước PhysicsSystem2D.postUpdate. */
    private static onAfterUpdate = (): void => {
        const dt = game.deltaTime;
        if (SlowMo.realLeft > 0) {
            SlowMo.realLeft -= dt;
            if (SlowMo.realLeft <= 0) {
                SlowMo.reset();
                return;
            }
        }
        if (SlowMo.current > 0 && SlowMo.current < 1) {
            const sys = PhysicsSystem2D.instance;
            const step = dt * SlowMo.current;
            sys.fixedTimeStep = step;
            // Sau khi postUpdate cộng dt: accumulator = step*1.0001 -> đúng 1 step, phần dư < step.
            sys.resetAccumulator(step * 1.0001 - dt);
        }
    };
}
