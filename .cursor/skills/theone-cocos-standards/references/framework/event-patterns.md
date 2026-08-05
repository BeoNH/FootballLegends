# Pattern Event Cocos Creator

## Pattern EventDispatcher (Custom Event)

```typescript
import { _decorator, Component, EventTarget } from 'cc';
const { ccclass } = _decorator;

// ✅ XUẤT SẮC: Hệ thống event tập trung
export enum GameEvent {
    SCORE_CHANGED = 'score_changed',
    LEVEL_COMPLETE = 'level_complete',
    PLAYER_DIED = 'player_died',
    ENEMY_SPAWNED = 'enemy_spawned',
}

export interface ScoreChangedEvent {
    oldScore: number;
    newScore: number;
    combo: number;
}

export interface LevelCompleteEvent {
    level: number;
    stars: number;
    time: number;
}

@ccclass('EventManager')
export class EventManager extends Component {
    private static instance: EventManager | null = null;
    private readonly eventTarget: EventTarget = new EventTarget();

    protected onLoad(): void {
        if (EventManager.instance) {
            throw new Error('EventManager: instance already exists');
        }
        EventManager.instance = this;
    }

    protected onDestroy(): void {
        this.eventTarget.clear();
        EventManager.instance = null;
    }

    // ✅ XUẤT SẮC: Emit type-safe
    public static emit<T>(event: GameEvent, data?: T): void {
        if (!EventManager.instance) {
            throw new Error('EventManager: instance not initialized');
        }
        EventManager.instance.eventTarget.emit(event, data);
    }

    // ✅ XUẤT SẮC: Subscribe type-safe
    public static on<T>(event: GameEvent, callback: (data: T) => void, target?: any): void {
        if (!EventManager.instance) {
            throw new Error('EventManager: instance not initialized');
        }
        EventManager.instance.eventTarget.on(event, callback, target);
    }

    // ✅ XUẤT SẮC: Unsubscribe type-safe
    public static off<T>(event: GameEvent, callback: (data: T) => void, target?: any): void {
        if (!EventManager.instance) {
            throw new Error('EventManager: instance not initialized');
        }
        EventManager.instance.eventTarget.off(event, callback, target);
    }

    // ✅ XUẤT SẮC: Once (tự hủy subscribe sau lần gọi đầu)
    public static once<T>(event: GameEvent, callback: (data: T) => void, target?: any): void {
        if (!EventManager.instance) {
            throw new Error('EventManager: instance not initialized');
        }
        EventManager.instance.eventTarget.once(event, callback, target);
    }
}

// Cách dùng trong Component
@ccclass('ScoreManager')
export class ScoreManager extends Component {
    private currentScore: number = 0;

    public addScore(points: number): void {
        const oldScore = this.currentScore;
        this.currentScore += points;

        // ✅ XUẤT SẮC: Emit event có kiểu
        EventManager.emit<ScoreChangedEvent>(GameEvent.SCORE_CHANGED, {
            oldScore,
            newScore: this.currentScore,
            combo: 1,
        });
    }
}

// Component subscriber
@ccclass('ScoreDisplay')
export class ScoreDisplay extends Component {
    protected onEnable(): void {
        // ✅ XUẤT SẮC: Subscribe trong onEnable
        EventManager.on<ScoreChangedEvent>(GameEvent.SCORE_CHANGED, this.onScoreChanged, this);
    }

    protected onDisable(): void {
        // ✅ QUAN TRỌNG: Luôn unsubscribe trong onDisable
        EventManager.off<ScoreChangedEvent>(GameEvent.SCORE_CHANGED, this.onScoreChanged, this);
    }

    private onScoreChanged(data: ScoreChangedEvent): void {
        console.log(`Score: ${data.oldScore} → ${data.newScore}`);
        this.updateDisplay(data.newScore);
    }

    private updateDisplay(score: number): void {
        // Cập nhật UI
    }
}

// ❌ SAI: Không unsubscribe (rò rỉ bộ nhớ)
protected onEnable(): void {
    EventManager.on<ScoreChangedEvent>(GameEvent.SCORE_CHANGED, this.onScoreChanged, this);
}

// Thiếu onDisable — rò rỉ bộ nhớ!

// ❌ SAI: Event dạng string (không type-safe)
EventManager.emit('score_changed', { score: 100 }); // Dễ gõ sai
```

## Hệ thống Event Node (Event tích hợp sẵn)

```typescript
import { _decorator, Component, Node, EventTouch, EventKeyboard } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TouchHandler')
export class TouchHandler extends Component {
    @property(Node)
    private readonly buttonNode: Node | null = null;

    // ✅ XUẤT SẮC: Xử lý event chạm
    protected onEnable(): void {
        if (!this.buttonNode) return;

        this.buttonNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.buttonNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.buttonNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.buttonNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    protected onDisable(): void {
        if (!this.buttonNode) return;

        this.buttonNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.buttonNode.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.buttonNode.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.buttonNode.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    private onTouchStart(event: EventTouch): void {
        const location = event.getUILocation();
        console.log(`Touch start at: ${location.x}, ${location.y}`);
    }

    private onTouchMove(event: EventTouch): void {
        const delta = event.getUIDelta();
        console.log(`Touch delta: ${delta.x}, ${delta.y}`);
    }

    private onTouchEnd(event: EventTouch): void {
        console.log('Touch ended');
    }

    private onTouchCancel(event: EventTouch): void {
        console.log('Touch cancelled');
    }
}

// ✅ XUẤT SẮC: Xử lý event bàn phím
@ccclass('KeyboardHandler')
export class KeyboardHandler extends Component {
    protected onEnable(): void {
        this.node.on(Node.EventType.KEY_DOWN, this.onKeyDown, this);
        this.node.on(Node.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.KEY_DOWN, this.onKeyDown, this);
        this.node.off(Node.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(event: EventKeyboard): void {
        switch (event.keyCode) {
            case macro.KEY.w:
            case macro.KEY.up:
                this.moveUp();
                break;
            case macro.KEY.s:
            case macro.KEY.down:
                this.moveDown();
                break;
        }
    }

    private onKeyUp(event: EventKeyboard): void {
        this.stopMovement();
    }
}
```

## Pattern dọn dẹp Event

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

// ✅ XUẤT SẮC: Pattern dọn dẹp toàn diện
@ccclass('CompleteEventCleanup')
export class CompleteEventCleanup extends Component {
    @property(Node)
    private readonly targetNode: Node | null = null;

    // Theo dõi listener đã đăng ký để dọn dẹp đầy đủ
    private readonly registeredListeners: Array<{
        node: Node;
        eventType: string;
        callback: Function;
    }> = [];

    protected onEnable(): void {
        if (!this.targetNode) return;

        // Đăng ký và theo dõi listener
        this.registerListener(
            this.targetNode,
            Node.EventType.TOUCH_START,
            this.onTouchStart
        );
        this.registerListener(
            this.node,
            Node.EventType.CHILD_ADDED,
            this.onChildAdded
        );

        // Subscribe event toàn cục
        EventManager.on(GameEvent.LEVEL_COMPLETE, this.onLevelComplete, this);
    }

    protected onDisable(): void {
        // Hủy đăng ký tất cả listener đã theo dõi
        for (const { node, eventType, callback } of this.registeredListeners) {
            node.off(eventType, callback, this);
        }
        this.registeredListeners.length = 0;

        // Unsubscribe event toàn cục
        EventManager.off(GameEvent.LEVEL_COMPLETE, this.onLevelComplete, this);
    }

    private registerListener(node: Node, eventType: string, callback: Function): void {
        node.on(eventType, callback, this);
        this.registeredListeners.push({ node, eventType, callback });
    }

    private onTouchStart(event: EventTouch): void {
        // Xử lý chạm
    }

    private onChildAdded(child: Node): void {
        // Xử lý khi thêm Node con
    }

    private onLevelComplete(): void {
        // Xử lý hoàn thành level
    }
}

// ✅ XUẤT SẮC: Dọn dẹp tự động với pattern disposable
interface IDisposable {
    dispose(): void;
}

class EventSubscription implements IDisposable {
    constructor(
        private readonly eventManager: EventManager,
        private readonly event: GameEvent,
        private readonly callback: Function,
        private readonly target: any
    ) {}

    public dispose(): void {
        EventManager.off(this.event, this.callback as any, this.target);
    }
}

@ccclass('DisposablePattern')
export class DisposablePattern extends Component {
    private readonly subscriptions: IDisposable[] = [];

    protected onEnable(): void {
        // ✅ XUẤT SẮC: Theo dõi subscription để tự dọn dẹp
        this.subscriptions.push(
            new EventSubscription(
                EventManager.instance!,
                GameEvent.SCORE_CHANGED,
                this.onScoreChanged,
                this
            )
        );
    }

    protected onDisable(): void {
        // ✅ XUẤT SẮC: Dispose tất cả subscription
        for (const subscription of this.subscriptions) {
            subscription.dispose();
        }
        this.subscriptions.length = 0;
    }

    private onScoreChanged(data: ScoreChangedEvent): void {
        // Xử lý thay đổi điểm
    }
}
```

## Thực hành tốt về hiệu năng Event

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('PerformanceOptimizedEvents')
export class PerformanceOptimizedEvents extends Component {
    // ✅ XUẤT SẮC: Throttle event xảy ra thường xuyên
    private lastEmitTime: number = 0;
    private static readonly EMIT_THROTTLE_MS: number = 100; // Tối đa 10 event/giây

    public emitThrottled(event: GameEvent, data: any): void {
        const now = Date.now();
        if (now - this.lastEmitTime >= PerformanceOptimizedEvents.EMIT_THROTTLE_MS) {
            EventManager.emit(event, data);
            this.lastEmitTime = now;
        }
    }

    // ✅ XUẤT SẮC: Gộp batch event để giảm overhead
    private readonly pendingEvents: Array<{ event: GameEvent; data: any }> = [];
    private batchEmitScheduled: boolean = false;

    public emitBatched(event: GameEvent, data: any): void {
        this.pendingEvents.push({ event, data });

        if (!this.batchEmitScheduled) {
            this.batchEmitScheduled = true;
            this.scheduleOnce(() => {
                this.flushBatchedEvents();
            }, 0);
        }
    }

    private flushBatchedEvents(): void {
        for (const { event, data } of this.pendingEvents) {
            EventManager.emit(event, data);
        }
        this.pendingEvents.length = 0;
        this.batchEmitScheduled = false;
    }

    // ✅ XUẤT SẮC: Debounce event (chỉ emit sau khoảng im lặng)
    private debounceTimer: number | null = null;
    private static readonly DEBOUNCE_MS: number = 300;

    public emitDebounced(event: GameEvent, data: any): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            EventManager.emit(event, data);
            this.debounceTimer = null;
        }, PerformanceOptimizedEvents.DEBOUNCE_MS) as any;
    }
}

// ❌ SAI: Emit event trong vòng lặp update
protected update(dt: number): void {
    // Emit 60 event/giây!
    EventManager.emit(GameEvent.PLAYER_MOVED, this.node.position);
}

// ✅ TỐT HƠN: Throttle hoặc chỉ emit khi thay đổi đáng kể
private lastPosition: Vec3 = new Vec3();
private static readonly MOVE_THRESHOLD: number = 1.0;

protected update(dt: number): void {
    const distance = Vec3.distance(this.node.position, this.lastPosition);

    if (distance >= PerformanceOptimizedEvents.MOVE_THRESHOLD) {
        EventManager.emit(GameEvent.PLAYER_MOVED, this.node.position.clone());
        this.lastPosition.set(this.node.position);
    }
}
```

## Tóm tắt: Checklist pattern Event

**EventDispatcher (Custom Event):**
- [ ] Dùng EventManager tập trung với EventTarget
- [ ] Định nghĩa tên event dạng enum (không dùng string)
- [ ] Dùng interface dữ liệu event có kiểu
- [ ] Subscribe trong onEnable(), unsubscribe trong onDisable()
- [ ] Luôn truyền `this` làm tham số target để dọn dẹp đúng

**Event Node (Tích hợp sẵn):**
- [ ] Dùng hằng số Node.EventType (TOUCH_START, KEY_DOWN, v.v.)
- [ ] Đăng ký listener trong onEnable()
- [ ] Hủy đăng ký listener trong onDisable() với cùng tham số
- [ ] Xử lý EventTouch và EventKeyboard đúng cách

**Dọn dẹp Event:**
- [ ] Theo dõi tất cả listener đã đăng ký để dọn dẹp đầy đủ
- [ ] Hủy đăng ký trong cả onDisable() và onDestroy()
- [ ] Dùng pattern disposable để dọn dẹp tự động
- [ ] Xóa collection event trong onDestroy()

**Hiệu năng:**
- [ ] Throttle event xảy ra thường xuyên (tối đa 10/giây)
- [ ] Gộp batch event để giảm overhead
- [ ] Debounce event cho input người dùng
- [ ] Không emit event trong update() nếu không throttle

**Luôn unsubscribe event để tránh rò rỉ bộ nhớ.**
