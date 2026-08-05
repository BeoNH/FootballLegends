# Hệ thống Component Cocos Creator

## Tổng quan hệ thống Entity-Component (EC)

Cocos Creator dùng kiến trúc Entity-Component (EC), trong đó:
- **Node** = Entity (container đối tượng game)
- **Component** = Hành vi/chức năng gắn vào Node
- **Scene** = Tập hợp các cây phân cấp Node

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

// ✅ XUẤT SẮC: Cấu trúc Component đầy đủ
@ccclass('PlayerController')
export class PlayerController extends Component {
    // Decorator @property hiển thị field trên Inspector
    @property(Node)
    private readonly targetNode: Node | null = null;

    @property(Number)
    private readonly moveSpeed: number = 100;

    // Field private không hiển thị
    private currentHealth: number = 100;
    private static readonly MAX_HEALTH: number = 100;

    // Các phương thức lifecycle theo thứ tự thực thi:
    // 1. onLoad() - Khởi tạo Component
    // 2. start() - Sau khi tất cả Component đã load
    // 3. onEnable() - Khi được bật (có thể gọi nhiều lần)
    // 4. update(dt) - Mỗi frame
    // 5. lateUpdate(dt) - Sau tất cả lệnh gọi update()
    // 6. onDisable() - Khi bị tắt
    // 7. onDestroy() - Dọn dẹp
}
```

## Decorator @ccclass

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

// ✅ XUẤT SẮC: @ccclass với tên rõ ràng
@ccclass('GameManager')
export class GameManager extends Component {
    // Triển khai Component
}

// ✅ TỐT: @ccclass không có tên (dùng tên class)
@ccclass
export class PlayerController extends Component {
    // Triển khai Component
}

// ❌ SAI: Thiếu decorator @ccclass
export class GameManager extends Component {
    // Không hoạt động — Cocos không thể serialize Component này
}

// ❌ SAI: Không extends Component
@ccclass('GameManager')
export class GameManager {
    // Không hoạt động — phải extends Component
}
```

## Decorator @property

```typescript
import { _decorator, Component, Node, Sprite, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PropertyExamples')
export class PropertyExamples extends Component {
    // ✅ XUẤT SẮC: Tham chiếu Node
    @property(Node)
    private readonly playerNode: Node | null = null;

    // ✅ XUẤT SẮC: Tham chiếu Component
    @property(Sprite)
    private readonly spriteComponent: Sprite | null = null;

    // ✅ XUẤT SẮC: Kiểu nguyên thủy
    @property(Number)
    private readonly moveSpeed: number = 100;

    @property(String)
    private readonly playerName: string = 'Player';

    @property(Boolean)
    private readonly enableDebug: boolean = false;

    // ✅ XUẤT SẮC: Mảng Node
    @property([Node])
    private readonly enemyNodes: Node[] = [];

    // ✅ XUẤT SẮC: Mảng số
    @property([Number])
    private readonly levelScores: number[] = [];

    // ✅ XUẤT SẮC: Property kiểu Enum
    @property({ type: Enum(GameState) })
    private currentState: GameState = GameState.LOADING;

    // ✅ XUẤT SẮC: Property với tên hiển thị và tooltip tùy chỉnh
    @property({
        type: Number,
        displayName: 'Movement Speed',
        tooltip: 'Player movement speed in units per second',
        min: 0,
        max: 500,
        step: 10,
    })
    private readonly speed: number = 100;

    // ✅ XUẤT SẮC: readonly cho property không nên gán lại
    @property(Node)
    private readonly targetNode: Node | null = null; // Không thể gán lại sau khi khởi tạo

    // Field private (không hiển thị trên Inspector)
    private currentHealth: number = 100;
}

// ❌ SAI: Property không có kiểu
@property
private playerNode: Node | null = null; // Serialize không đúng

// ❌ SAI: Property mutable nên dùng readonly
@property(Node)
private targetNode: Node | null = null; // Nên dùng readonly nếu không gán lại
```

## Các phương thức lifecycle của Component

### 1. onLoad() - Khởi tạo

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Node)
    private readonly playerNode: Node | null = null;

    @property(Node)
    private readonly uiRoot: Node | null = null;

    // ✅ XUẤT SẮC: onLoad để khởi tạo và validate
    protected onLoad(): void {
        // Validate tham chiếu bắt buộc
        if (!this.playerNode) {
            throw new Error('GameManager: playerNode is required');
        }
        if (!this.uiRoot) {
            throw new Error('GameManager: uiRoot is required');
        }

        // Khởi tạo trạng thái Component
        this.initializeGameState();

        // Cache tham chiếu (CHƯA tham chiếu Component khác)
        this.cacheNodeReferences();
    }

    private initializeGameState(): void {
        // Thiết lập trạng thái ban đầu
    }

    private cacheNodeReferences(): void {
        // Cache Node con để truy cập nhanh hơn
    }
}

// ❌ SAI: Truy cập Component khác trong onLoad
protected onLoad(): void {
    // Không làm vậy — Component khác có thể chưa load
    const playerController = this.playerNode!.getComponent(PlayerController);
    playerController.initialize(); // Có thể undefined!
}

// ❌ SAI: Thao tác nặng trong onLoad
protected onLoad(): void {
    // Tránh thao tác tốn kém — onLoad phải nhanh
    this.loadAllLevelData(); // Nên async trong start()
    this.generateProceduralContent(); // Quá nặng cho onLoad
}
```

### 2. start() - Sau khởi tạo

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Node)
    private readonly enemyManagerNode: Node | null = null;

    private enemyManager!: EnemyManager;

    protected onLoad(): void {
        // Validate tham chiếu
        if (!this.enemyManagerNode) {
            throw new Error('PlayerController: enemyManagerNode is required');
        }
    }

    // ✅ XUẤT SẮC: start() để tham chiếu Component khác
    protected start(): void {
        // An toàn khi lấy Component từ Node khác
        const enemyManager = this.enemyManagerNode!.getComponent(EnemyManager);
        if (!enemyManager) {
            throw new Error('EnemyManager component not found');
        }
        this.enemyManager = enemyManager;

        // Khởi tạo dựa trên Component khác
        this.setupPlayerBasedOnEnemies();

        // Bắt đầu thao tác async
        this.loadPlayerDataAsync();
    }

    private setupPlayerBasedOnEnemies(): void {
        const enemyCount = this.enemyManager.getEnemyCount();
        this.adjustDifficultyBasedOnEnemies(enemyCount);
    }

    private async loadPlayerDataAsync(): Promise<void> {
        // Load async an toàn trong start()
    }
}

// ❌ SAI: Dùng start() thay vì onLoad để validate
protected start(): void {
    // Quá muộn — có thể bị dùng trước khi start() được gọi
    if (!this.playerNode) {
        throw new Error('playerNode is required');
    }
}
```

### 3. onEnable() - Kích hoạt

```typescript
import { _decorator, Component, Node, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InputHandler')
export class InputHandler extends Component {
    @property(Node)
    private readonly buttonNode: Node | null = null;

    // ✅ XUẤT SẮC: onEnable() để đăng ký listener
    protected onEnable(): void {
        // Đăng ký event listener
        if (this.buttonNode) {
            this.buttonNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.buttonNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }

        // Subscribe event toàn cục
        EventManager.on(GameEvent.LEVEL_COMPLETE, this.onLevelComplete, this);

        // Tiếp tục logic Component
        this.resumeGameLogic();
    }

    protected onDisable(): void {
        // ✅ QUAN TRỌNG: Luôn hủy đăng ký trong onDisable
        if (this.buttonNode) {
            this.buttonNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.buttonNode.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }

        EventManager.off(GameEvent.LEVEL_COMPLETE, this.onLevelComplete, this);

        // Tạm dừng logic Component
        this.pauseGameLogic();
    }

    private onTouchStart(event: EventTouch): void {
        // Xử lý chạm
    }

    private onTouchEnd(event: EventTouch): void {
        // Xử lý kết thúc chạm
    }

    private onLevelComplete(): void {
        // Xử lý hoàn thành level
    }
}

// ❌ SAI: Đăng ký listener trong onLoad
protected onLoad(): void {
    // Không đăng ký ở đây — sẽ không hủy đúng khi bị disable
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
}

// ❌ SAI: Không hủy đăng ký trong onDisable
protected onEnable(): void {
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
}

protected onDisable(): void {
    // Thiếu hủy đăng ký — rò rỉ bộ nhớ!
}
```

### 4. update(dt) - Logic theo frame

```typescript
import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerMovement')
export class PlayerMovement extends Component {
    @property(Number)
    private readonly moveSpeed: number = 100;

    private readonly tempVec3: Vec3 = new Vec3();
    private inputDirection: Vec3 = new Vec3(1, 0, 0);

    // ✅ XUẤT SẮC: Triển khai update hiệu quả
    protected update(dt: number): void {
        // Tái sử dụng vector đã cấp phát trước
        this.node.getPosition(this.tempVec3);

        // Tính di chuyển
        this.tempVec3.x += this.inputDirection.x * this.moveSpeed * dt;
        this.tempVec3.y += this.inputDirection.y * this.moveSpeed * dt;

        // Áp dụng vị trí mới
        this.node.setPosition(this.tempVec3);
    }
}

// Throttle thao tác tốn kém
@ccclass('AIController')
export class AIController extends Component {
    private frameCount: number = 0;
    private static readonly AI_UPDATE_INTERVAL: number = 10;

    // ✅ XUẤT SẮC: Throttle thao tác tốn kém
    protected update(dt: number): void {
        this.frameCount++;

        // Thao tác nhẹ mỗi frame
        this.moveTowardsTarget(dt);

        // Quyết định AI tốn kém mỗi 10 frame
        if (this.frameCount % AIController.AI_UPDATE_INTERVAL === 0) {
            this.updateAIDecision();
        }
    }

    private moveTowardsTarget(dt: number): void {
        // Tính di chuyển đơn giản
    }

    private updateAIDecision(): void {
        // Logic AI phức tạp
    }
}

// ❌ SAI: Cấp phát trong update
protected update(dt: number): void {
    const currentPos = this.node.position.clone(); // Cấp phát mỗi frame!
    currentPos.x += this.moveSpeed * dt;
    this.node.setPosition(currentPos);
}

// ❌ SAI: Thao tác tốn kém mỗi frame
protected update(dt: number): void {
    this.recalculatePathfinding(); // Thuật toán A* 60 lần/giây!
    this.updateComplexAI(); // Quá nặng cho mỗi frame
}

// ❌ SAI: Tra cứu Component trong update
protected update(dt: number): void {
    const sprite = this.node.getComponent(Sprite); // Cache trong onLoad!
    sprite?.doSomething();
}
```

### 5. lateUpdate(dt) - Logic sau update

```typescript
import { _decorator, Component, Node, Camera } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property(Node)
    private readonly target: Node | null = null;

    @property(Camera)
    private readonly camera: Camera | null = null;

    // ✅ XUẤT SẮC: lateUpdate cho camera follow
    // Chạy sau tất cả update(), đảm bảo target đã di chuyển
    protected lateUpdate(dt: number): void {
        if (!this.target || !this.camera) return;

        // Theo vị trí target sau khi target đã được update
        const targetPos = this.target.position;
        this.camera.node.setPosition(targetPos.x, targetPos.y, this.camera.node.position.z);
    }
}

// ✅ TỐT: lateUpdate cho UI phụ thuộc trạng thái game
@ccclass('HealthBarUpdater')
export class HealthBarUpdater extends Component {
    @property(Node)
    private readonly healthBar: Node | null = null;

    private playerHealth: number = 100;

    // Máu được cập nhật trong PlayerController.update()
    // UI được cập nhật trong lateUpdate() để phản ánh giá trị máu cuối
    protected lateUpdate(dt: number): void {
        if (!this.healthBar) return;

        const healthPercentage = this.playerHealth / 100;
        this.healthBar.scale = new Vec3(healthPercentage, 1, 1);
    }
}

// ❌ SAI: Dùng lateUpdate cho logic thông thường
protected lateUpdate(dt: number): void {
    // Nên đặt trong update(), không phải lateUpdate()
    this.movePlayer(dt);
}
```

### 6. onDestroy() - Dọn dẹp

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ResourceManager')
export class ResourceManager extends Component {
    private readonly loadedAssets: Map<string, Asset> = new Map();
    private readonly eventListeners: Set<Function> = new Set();
    private readonly scheduledCallbacks: Set<Function> = new Set();

    // ✅ XUẤT SẮC: Dọn dẹp đầy đủ trong onDestroy
    protected onDestroy(): void {
        // Hủy đăng ký tất cả event listener
        this.node.off(Node.EventType.TOUCH_START);
        EventManager.off(GameEvent.LEVEL_COMPLETE, this.onLevelComplete, this);

        // Xóa collection
        this.eventListeners.clear();
        this.scheduledCallbacks.clear();

        // Giải phóng asset đã load
        for (const [id, asset] of this.loadedAssets) {
            asset.decRef();
        }
        this.loadedAssets.clear();

        // Hủy lịch tất cả callback
        this.unscheduleAllCallbacks();

        // Xóa tham chiếu để tránh rò rỉ bộ nhớ
        this.clearReferences();
    }

    private clearReferences(): void {
        // Xóa tham chiếu đã cache
    }
}

// ❌ SAI: Thiếu dọn dẹp
protected onDestroy(): void {
    // Quên hủy đăng ký event — rò rỉ bộ nhớ!
    // Quên giải phóng asset — rò rỉ bộ nhớ!
    // Quên unschedule callback — có thể gây lỗi!
}

// ❌ SAI: Dọn dẹp không đầy đủ
protected onDestroy(): void {
    this.loadedAssets.clear(); // Xóa map nhưng không decRef asset!
}
```

## Thứ tự thực thi Component

```typescript
// Thứ tự thực thi khi scene load:
// 1. Tất cả Component: onLoad() (theo thứ tự hierarchy)
// 2. Tất cả Component: start() (theo thứ tự hierarchy)
// 3. Tất cả Component: onEnable() (nếu chưa được bật)
// 4. Bắt đầu vòng lặp frame:
//    - Tất cả Component: update(dt)
//    - Tất cả Component: lateUpdate(dt)
// 5. Khi Component bị disable:
//    - Component: onDisable()
// 6. Khi Component bị destroy:
//    - Component: onDestroy()

// ✅ XUẤT SẮC: Tổ chức phương thức lifecycle
@ccclass('CompleteLifecycle')
export class CompleteLifecycle extends Component {
    // 1. GIAI ĐOẠN KHỞI TẠO
    protected onLoad(): void {
        // Khởi tạo Component
        // Validate tham chiếu bắt buộc
        // Cache tham chiếu Node
        // CHƯA truy cập Component khác
    }

    protected start(): void {
        // Truy cập Component khác (an toàn lúc này)
        // Bắt đầu thao tác async
        // Khởi tạo dựa trên Component khác
    }

    // 2. GIAI ĐOẠN KÍCH HOẠT
    protected onEnable(): void {
        // Đăng ký event listener
        // Subscribe event toàn cục
        // Tiếp tục thao tác
    }

    // 3. GIAI ĐOẠN UPDATE
    protected update(dt: number): void {
        // Logic game theo frame
        // Di chuyển, input, AI
        // Giữ cấp phát bằng zero
    }

    protected lateUpdate(dt: number): void {
        // Logic phụ thuộc update()
        // Camera follow, cập nhật UI
    }

    // 4. GIAI ĐOẠN VÔ HIỆU HÓA
    protected onDisable(): void {
        // Hủy đăng ký event listener
        // Unsubscribe event
        // Tạm dừng thao tác
    }

    // 5. GIAI ĐOẠN DỌN DẸP
    protected onDestroy(): void {
        // Giải phóng tài nguyên
        // Xóa collection
        // Unschedule callback
        // Dọn dẹp cuối cùng
    }
}
```

## Validate tham chiếu bắt buộc

```typescript
import { _decorator, Component, Node, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RequiredReferences')
export class RequiredReferences extends Component {
    @property(Node)
    private readonly targetNode: Node | null = null;

    @property(Sprite)
    private readonly spriteComponent: Sprite | null = null;

    @property([Node])
    private readonly enemyNodes: Node[] = [];

    // ✅ XUẤT SẮC: Validate tất cả tham chiếu bắt buộc trong onLoad
    protected onLoad(): void {
        if (!this.targetNode) {
            throw new Error('RequiredReferences: targetNode is required');
        }

        if (!this.spriteComponent) {
            throw new Error('RequiredReferences: spriteComponent is required');
        }

        if (this.enemyNodes.length === 0) {
            throw new Error('RequiredReferences: at least one enemy node is required');
        }

        // Tất cả tham chiếu đã validate — an toàn khi dùng
        this.initialize();
    }

    private initialize(): void {
        // Có thể dùng an toàn tất cả tham chiếu ở đây
        this.targetNode!.setPosition(0, 0, 0);
        this.spriteComponent!.sizeMode = Sprite.SizeMode.CUSTOM;
    }
}

// ❌ SAI: Không validate
protected onLoad(): void {
    // Giả định tham chiếu tồn tại — có thể crash lúc runtime
    this.targetNode!.setPosition(0, 0, 0);
}

// ❌ SAI: Validate im lặng
protected onLoad(): void {
    if (!this.targetNode) {
        console.error('targetNode is missing'); // Không chỉ log
        return; // Lỗi im lặng
    }
}
```

## Tóm tắt: Checklist hệ thống Component

**Cấu trúc Component:**
- [ ] Decorator @ccclass trên class
- [ ] Extends class Component cơ sở
- [ ] Decorator @property cho field hiển thị trên Inspector
- [ ] readonly cho property không gán lại
- [ ] Access modifier (public/private/protected)

**Triển khai lifecycle:**
- [ ] onLoad() — Validate tham chiếu bắt buộc, khởi tạo trạng thái
- [ ] start() — Truy cập Component khác, bắt đầu thao tác async
- [ ] onEnable() — Đăng ký event listener
- [ ] update(dt) — Logic theo frame (zero allocation)
- [ ] lateUpdate(dt) — Logic sau update (camera, UI)
- [ ] onDisable() — Hủy đăng ký event listener
- [ ] onDestroy() — Giải phóng tài nguyên, xóa tham chiếu

**Thực hành tốt:**
- [ ] Validate tham chiếu @property bắt buộc trong onLoad()
- [ ] Throw exception khi thiếu tham chiếu bắt buộc
- [ ] Cache tham chiếu Component (không lookup trong update)
- [ ] Zero allocation trong update/lateUpdate
- [ ] Luôn hủy đăng ký listener trong onDisable/onDestroy
- [ ] Dùng readonly cho field @property khi phù hợp

**Lifecycle của Component là nền tảng kiến trúc Cocos Creator.**
