# Review Kiến trúc Cocos Creator

Review này tập trung vào các vấn đề kiến trúc đặc thù của Cocos Creator, bao gồm vi phạm component lifecycle, vấn đề quản lý event và các vấn đề performance đặc thù cho playable ads.

## Vi phạm Component Lifecycle

### Truy cập Component trong onLoad

```typescript
// ❌ NGHIÊM TRỌNG: Truy cập component khác trong onLoad
@ccclass('BadLifecycle')
export class BadLifecycle extends Component {
    @property(Node)
    private playerNode: Node | null = null;

    protected onLoad(): void {
        // SAI: Component khác có thể chưa được load
        const controller = this.playerNode!.getComponent(PlayerController);
        controller.initialize(); // Có thể undefined!
    }
}

// ✅ ĐÚNG: Truy cập component trong start()
@ccclass('GoodLifecycle')
export class GoodLifecycle extends Component {
    @property(Node)
    private readonly playerNode: Node | null = null;

    private playerController!: PlayerController;

    protected onLoad(): void {
        if (!this.playerNode) {
            throw new Error('GoodLifecycle: playerNode is required');
        }
    }

    protected start(): void {
        const controller = this.playerNode!.getComponent(PlayerController);
        if (!controller) {
            throw new Error('PlayerController not found');
        }
        this.playerController = controller;
        this.playerController.initialize();
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Hành vi không xác định, crash
// Cách sửa: Chuyển truy cập component từ onLoad() sang start()
```

### Rò rỉ bộ nhớ Event Listener

```typescript
// ❌ NGHIÊM TRỌNG: Không hủy đăng ký event listener
@ccclass('EventLeakBad')
export class EventLeakBad extends Component {
    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        EventManager.on(GameEvent.SCORE_CHANGED, this.onScoreChanged, this);
    }

    // THIẾU: onDisable() - rò rỉ bộ nhớ!
}

// ✅ ĐÚNG: Luôn hủy đăng ký trong onDisable
@ccclass('EventLeakGood')
export class EventLeakGood extends Component {
    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        EventManager.on(GameEvent.SCORE_CHANGED, this.onScoreChanged, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        EventManager.off(GameEvent.SCORE_CHANGED, this.onScoreChanged, this);
    }

    private onTouchStart(event: EventTouch): void {}
    private onScoreChanged(data: ScoreChangedEvent): void {}
}

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Rò rỉ bộ nhớ, suy giảm performance
// Cách sửa: Luôn triển khai onDisable() để hủy đăng ký listener
```

### Thiếu validation tham chiếu bắt buộc

```typescript
// ❌ NGHIÊM TRỌNG: Không validation tham chiếu bắt buộc
@ccclass('NoValidation')
export class NoValidation extends Component {
    @property(Node)
    private targetNode: Node | null = null;

    protected onLoad(): void {
        this.targetNode!.setPosition(0, 0, 0); // Sẽ crash nếu null
    }
}

// ✅ ĐÚNG: Validate trong onLoad
@ccclass('WithValidation')
export class WithValidation extends Component {
    @property(Node)
    private readonly targetNode: Node | null = null;

    protected onLoad(): void {
        if (!this.targetNode) {
            throw new Error('WithValidation: targetNode is required');
        }
        this.targetNode.setPosition(0, 0, 0);
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Crash runtime với lỗi không hữu ích
// Cách sửa: Validate tất cả tham chiếu @property bắt buộc trong onLoad()
```

### Vi phạm dọn dẹp tài nguyên

```typescript
// ❌ NGHIÊM TRỌNG: Không giải phóng tài nguyên
@ccclass('ResourceLeakBad')
export class ResourceLeakBad extends Component {
    private readonly loadedAssets: Map<string, Asset> = new Map();

    protected onDestroy(): void {
        // THIẾU: decRef() và clear()
    }
}

// ✅ ĐÚNG: Dọn dẹp đầy đủ
@ccclass('ResourceLeakGood')
export class ResourceLeakGood extends Component {
    private readonly loadedAssets: Map<string, Asset> = new Map();

    protected onDestroy(): void {
        for (const [id, asset] of this.loadedAssets) {
            asset.decRef();
        }
        this.loadedAssets.clear();
        this.unscheduleAllCallbacks();
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Rò rỉ bộ nhớ
// Cách sửa: Giải phóng tài nguyên và xóa collection trong onDestroy()
```

## Vi phạm Performance (Đặc thù Playable)

### Allocation trong vòng lặp Update

```typescript
// ❌ NGHIÊM TRỌNG: Allocation mỗi frame
@ccclass('UpdateAllocationsBad')
export class UpdateAllocationsBad extends Component {
    protected update(dt: number): void {
        const pos = this.node.position.clone(); // 60 allocation/giây
        pos.y += 10 * dt;
        this.node.setPosition(pos);
    }
}

// ✅ ĐÚNG: Preallocate và tái sử dụng
@ccclass('UpdateAllocationsGood')
export class UpdateAllocationsGood extends Component {
    private readonly tempVec3: Vec3 = new Vec3();

    protected update(dt: number): void {
        this.node.getPosition(this.tempVec3);
        this.tempVec3.y += 10 * dt;
        this.node.setPosition(this.tempVec3);
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Drop frame, GC pause
// Cách sửa: Preallocate object, tái sử dụng trong update
```

### Tra cứu Component trong Update

```typescript
// ❌ QUAN TRỌNG: getComponent trong update
@ccclass('ComponentLookupBad')
export class ComponentLookupBad extends Component {
    @property(Node)
    private playerNode: Node | null = null;

    protected update(dt: number): void {
        const controller = this.playerNode!.getComponent(PlayerController); // Tốn kém!
        controller?.update(dt);
    }
}

// ✅ ĐÚNG: Cache tham chiếu component
@ccclass('ComponentLookupGood')
export class ComponentLookupGood extends Component {
    @property(Node)
    private readonly playerNode: Node | null = null;

    private playerController!: PlayerController;

    protected start(): void {
        if (!this.playerNode) {
            throw new Error('playerNode is required');
        }
        const controller = this.playerNode.getComponent(PlayerController);
        if (!controller) {
            throw new Error('PlayerController not found');
        }
        this.playerController = controller;
    }

    protected update(dt: number): void {
        this.playerController.update(dt);
    }
}

// Mức độ: 🟡 Quan trọng
// Tác động: Overhead performance đáng kể
// Cách sửa: Cache tham chiếu component trong start()
```

## Tóm tắt: Checklist Review Kiến trúc

**🔴 Nghiêm trọng (Bắt buộc sửa):**
- [ ] Không truy cập component trong onLoad() (dùng start())
- [ ] Tất cả event listener được hủy đăng ký trong onDisable()
- [ ] Tham chiếu @property bắt buộc được validate trong onLoad()
- [ ] Tài nguyên được giải phóng trong onDestroy()
- [ ] Zero allocation trong vòng lặp update()
- [ ] readonly được dùng cho field @property không gán lại

**🟡 Quan trọng (Nên sửa):**
- [ ] Tham chiếu component được cache (không getComponent trong update)
- [ ] Thao tác tốn kém được throttle (mỗi N frame)
- [ ] Tham chiếu Node được cache (không find() trong update)
- [ ] Mảng được xóa bằng .length = 0 (không tạo mảng mới)

**🟢 Gợi ý:**
- [ ] Object pooling cho spawn/despawn thường xuyên
- [ ] WeakMap cho cache tự dọn dẹp
- [ ] Disposable pattern cho quản lý subscription

**Luôn sửa các vấn đề lifecycle và dọn dẹp event — chúng gây crash và rò rỉ bộ nhớ.**
