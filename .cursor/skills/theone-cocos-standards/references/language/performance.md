# Tối ưu hiệu năng TypeScript

## Không cấp phát bộ nhớ trong update()

**Quy tắc quan trọng**: Không bao giờ cấp phát object trong `update()`, `lateUpdate()`, hoặc bất kỳ phương thức nào được gọi mỗi frame.

```typescript
import { _decorator, Component, Node, Vec3, Quat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('OptimizedController')
export class OptimizedController extends Component {
    @property(Node)
    private readonly targetNode: Node | null = null;

    // ✅ XUẤT SẮC: Object tái sử dụng được cấp phát trước
    private readonly tempVec3: Vec3 = new Vec3();
    private readonly tempQuat: Quat = new Quat();
    private readonly tempVec3Array: Vec3[] = [];

    // ✅ XUẤT SẮC: Không cấp phát trong update
    protected update(dt: number): void {
        if (!this.targetNode) return;

        // Tái sử dụng vector đã cấp phát trước
        this.targetNode.getPosition(this.tempVec3);
        this.tempVec3.y += 10 * dt;
        this.targetNode.setPosition(this.tempVec3);

        // Tái sử dụng quaternion đã cấp phát trước
        this.targetNode.getRotation(this.tempQuat);
        Quat.rotateY(this.tempQuat, this.tempQuat, dt);
        this.targetNode.setRotation(this.tempQuat);
    }

    // ✅ XUẤT SẮC: Tái sử dụng mảng thay vì tạo mới
    public updateMultipleNodes(nodes: Node[]): void {
        this.tempVec3Array.length = 0; // Xóa mà không cấp phát

        for (const node of nodes) {
            node.getPosition(this.tempVec3);
            this.tempVec3Array.push(this.tempVec3.clone());
        }
    }
}

// ❌ SAI: Cấp phát trong update
protected update(dt: number): void {
    if (!this.targetNode) return;

    // Tạo Vec3 mới mỗi frame (60 lần cấp phát/giây)
    const currentPos = this.targetNode.position.clone();
    currentPos.y += 10 * dt;
    this.targetNode.setPosition(currentPos);

    // Tạo mảng mới mỗi frame
    const positions = this.nodes.map(n => n.position.clone());
}

// ❌ SAI: Nối chuỗi trong update
protected update(dt: number): void {
    // Tạo chuỗi mới mỗi frame
    const debugInfo = `Position: ${this.node.position.x}, ${this.node.position.y}`;
    console.log(debugInfo);
}
```

## Pattern object pooling

```typescript
import { _decorator, Component, Node, Prefab, instantiate, NodePool } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BulletPool')
export class BulletPool extends Component {
    @property(Prefab)
    private readonly bulletPrefab: Prefab | null = null;

    private readonly pool: NodePool = new NodePool();
    private static readonly INITIAL_POOL_SIZE: number = 20;

    // ✅ XUẤT SẮC: Làm nóng pool khi khởi tạo
    protected onLoad(): void {
        if (!this.bulletPrefab) {
            throw new Error('BulletPool: bulletPrefab is required');
        }

        for (let i = 0; i < BulletPool.INITIAL_POOL_SIZE; i++) {
            const bullet = instantiate(this.bulletPrefab);
            this.pool.put(bullet);
        }
    }

    // ✅ XUẤT SẮC: Lấy từ pool (không cấp phát nếu còn)
    public getBullet(): Node {
        let bullet: Node;

        if (this.pool.size() > 0) {
            bullet = this.pool.get()!;
        } else {
            // Chỉ cấp phát khi pool rỗng
            if (!this.bulletPrefab) {
                throw new Error('BulletPool: bulletPrefab is required');
            }
            bullet = instantiate(this.bulletPrefab);
        }

        bullet.active = true;
        return bullet;
    }

    // ✅ XUẤT SẮC: Trả về pool (không giải phóng)
    public returnBullet(bullet: Node): void {
        bullet.active = false;
        this.pool.put(bullet);
    }

    // ✅ XUẤT SẮC: Xóa pool khi dọn dẹp
    protected onDestroy(): void {
        this.pool.clear();
    }
}

// Cách dùng trong game
@ccclass('Gun')
export class Gun extends Component {
    private readonly bulletPool!: BulletPool;

    public shoot(): void {
        // ✅ TỐT: Lấy từ pool thay vì instantiate
        const bullet = this.bulletPool.getBullet();
        bullet.setPosition(this.node.position);

        // Thiết lập đạn với timeout để trả về pool
        this.scheduleOnce(() => {
            this.bulletPool.returnBullet(bullet);
        }, 3.0);
    }
}

// ❌ SAI: Tạo instance mới mỗi lần
public shoot(): void {
    // Cấp phát và giải phóng liên tục
    const bullet = instantiate(this.bulletPrefab!);
    bullet.setPosition(this.node.position);

    this.scheduleOnce(() => {
        bullet.destroy(); // Kích hoạt garbage collection
    }, 3.0);
}
```

## Cache các thao tác tốn kém

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {
    @property([Node])
    private readonly enemyNodes: Node[] = [];

    // ✅ XUẤT SẮC: Cache tham chiếu component
    private readonly enemyControllers: EnemyController[] = [];
    private cachedActiveEnemies: EnemyController[] = [];
    private activeEnemiesDirty: boolean = true;

    protected onLoad(): void {
        // Cache tham chiếu component khi khởi tạo
        for (const node of this.enemyNodes) {
            const controller = node.getComponent(EnemyController);
            if (controller) {
                this.enemyControllers.push(controller);
            }
        }
    }

    // ✅ XUẤT SẮC: Đánh dấu cache dirty thay vì tính lại
    public onEnemyStateChanged(): void {
        this.activeEnemiesDirty = true;
    }

    // ✅ XUẤT SẮC: Tính lại lazy chỉ khi cần
    public getActiveEnemies(): EnemyController[] {
        if (this.activeEnemiesDirty) {
            this.cachedActiveEnemies = this.enemyControllers.filter(e => e.isActive);
            this.activeEnemiesDirty = false;
        }
        return this.cachedActiveEnemies;
    }

    protected update(dt: number): void {
        // ✅ TỐT: Dùng enemy đang hoạt động đã cache
        const activeEnemies = this.getActiveEnemies();

        for (const enemy of activeEnemies) {
            enemy.update(dt);
        }
    }
}

// ❌ SAI: Tìm component mỗi frame
protected update(dt: number): void {
    for (const node of this.enemyNodes) {
        const controller = node.getComponent(EnemyController); // Tra cứu tốn kém!
        if (controller?.isActive) {
            controller.update(dt);
        }
    }
}

// ❌ SAI: Filter mỗi frame
protected update(dt: number): void {
    const activeEnemies = this.enemyControllers.filter(e => e.isActive); // Cấp phát mảng mỗi frame!
    for (const enemy of activeEnemies) {
        enemy.update(dt);
    }
}
```

## Giới hạn tần suất thao tác tốn kém

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('AIController')
export class AIController extends Component {
    private frameCount: number = 0;
    private static readonly AI_UPDATE_INTERVAL: number = 10; // Mỗi 10 frame
    private static readonly PATHFINDING_INTERVAL: number = 60; // Mỗi 60 frame (1 giây ở 60fps)

    // ✅ XUẤT SẮC: Cập nhật AI mỗi N frame, không phải mỗi frame
    protected update(dt: number): void {
        this.frameCount++;

        // Chạy logic AI tốn kém mỗi 10 frame thay vì mỗi frame
        if (this.frameCount % AIController.AI_UPDATE_INTERVAL === 0) {
            this.updateAIDecision();
        }

        // Chạy pathfinding rất tốn kém mỗi 60 frame (1 giây)
        if (this.frameCount % AIController.PATHFINDING_INTERVAL === 0) {
            this.recalculatePath();
        }

        // Thao tác rẻ có thể chạy mỗi frame
        this.moveTowardsTarget(dt);
    }

    private updateAIDecision(): void {
        // Tốn kém: Kiểm tra mọi enemy, đánh giá mối đe dọa, v.v.
    }

    private recalculatePath(): void {
        // Rất tốn kém: Pathfinding A*
    }

    private moveTowardsTarget(dt: number): void {
        // Rẻ: Di chuyển đơn giản
    }
}

// ❌ SAI: Thao tác tốn kém mỗi frame
protected update(dt: number): void {
    this.recalculatePath(); // Pathfinding A* 60 lần/giây!
    this.updateAIDecision(); // Logic AI phức tạp 60 lần/giây!
    this.moveTowardsTarget(dt);
}
```

## Giới hạn tần suất theo thời gian

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('PerformanceMonitor')
export class PerformanceMonitor extends Component {
    private lastUpdateTime: number = 0;
    private static readonly UPDATE_INTERVAL: number = 1.0; // 1 giây

    // ✅ XUẤT SẮC: Giới hạn tần suất theo thời gian
    protected update(dt: number): void {
        const currentTime = Date.now() / 1000;

        if (currentTime - this.lastUpdateTime >= PerformanceMonitor.UPDATE_INTERVAL) {
            this.performExpensiveOperation();
            this.lastUpdateTime = currentTime;
        }
    }

    private performExpensiveOperation(): void {
        // Thao tác tốn kém chạy một lần mỗi giây
    }
}

// Cách khác dùng scheduleOnce
@ccclass('TimerBased')
export class TimerBased extends Component {
    private static readonly CHECK_INTERVAL: number = 2.0; // 2 giây

    protected start(): void {
        this.scheduleCheckRecurring();
    }

    private scheduleCheckRecurring(): void {
        this.performCheck();
        this.scheduleOnce(this.scheduleCheckRecurring, TimerBased.CHECK_INTERVAL);
    }

    private performCheck(): void {
        // Thao tác kiểm tra tốn kém
    }
}
```

## Tránh tra cứu tốn kém

```typescript
import { _decorator, Component, Node, find } from 'cc';
const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    // ✅ XUẤT SẮC: Cache tham chiếu trong onLoad
    private uiRootNode!: Node;
    private playerNode!: Node;
    private enemyNodes: Node[] = [];

    protected onLoad(): void {
        // Cache tham chiếu node một lần
        const uiRoot = find('Canvas/UI');
        if (!uiRoot) {
            throw new Error('GameManager: UI root not found');
        }
        this.uiRootNode = uiRoot;

        const player = find('Canvas/Player');
        if (!player) {
            throw new Error('GameManager: Player not found');
        }
        this.playerNode = player;

        // Cache mảng node enemy
        const enemyParent = find('Canvas/Enemies');
        if (enemyParent) {
            this.enemyNodes = enemyParent.children.slice();
        }
    }

    protected update(dt: number): void {
        // ✅ TỐT: Dùng tham chiếu đã cache
        this.updatePlayer(this.playerNode, dt);
        this.updateEnemies(this.enemyNodes, dt);
    }
}

// ❌ SAI: Tìm node mỗi frame
protected update(dt: number): void {
    const player = find('Canvas/Player'); // Tìm kiếm tốn kém mỗi frame!
    const enemies = find('Canvas/Enemies')?.children; // Tìm kiếm tốn kém mỗi frame!

    if (player) {
        this.updatePlayer(player, dt);
    }
    if (enemies) {
        this.updateEnemies(enemies, dt);
    }
}

// ❌ SAI: getComponent mỗi frame
protected update(dt: number): void {
    const playerController = this.playerNode.getComponent(PlayerController); // Tra cứu tốn kém!
    playerController?.update(dt);
}

// ✅ TỐT HƠN: Cache tham chiếu component
private playerController!: PlayerController;

protected onLoad(): void {
    const controller = this.playerNode.getComponent(PlayerController);
    if (!controller) {
        throw new Error('PlayerController not found');
    }
    this.playerController = controller;
}

protected update(dt: number): void {
    this.playerController.update(dt);
}
```

## Hiệu năng nối chuỗi

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('DebugDisplay')
export class DebugDisplay extends Component {
    // ✅ XUẤT SẮC: Dùng template literal cho dễ đọc
    public getDebugInfo(player: Player): string {
        return `Player: ${player.name}, HP: ${player.health}/${player.maxHealth}, Level: ${player.level}`;
    }

    // ✅ XUẤT SẮC: Tạo chuỗi hiệu quả bằng array join (cho chuỗi lớn)
    public generateReport(players: Player[]): string {
        const lines: string[] = [];
        lines.push('=== Player Report ===');

        for (const player of players) {
            lines.push(`${player.name}: Level ${player.level}, HP ${player.health}`);
        }

        lines.push('=== End Report ===');
        return lines.join('\n');
    }

    // ✅ XUẤT SẮC: Tránh thao tác chuỗi trong vòng update
    private debugText: string = '';
    private frameCount: number = 0;

    protected update(dt: number): void {
        this.frameCount++;

        // Chỉ cập nhật text debug mỗi 30 frame
        if (this.frameCount % 30 === 0) {
            this.debugText = this.generateDebugText();
        }
    }
}

// ❌ SAI: Nối chuỗi trong vòng lặp
public generateReport(players: Player[]): string {
    let report = '=== Player Report ===\n';

    for (const player of players) {
        report += `${player.name}: Level ${player.level}\n`; // Cấp phát chuỗi mới mỗi lần lặp
    }

    report += '=== End Report ===';
    return report;
}

// ❌ SAI: Tạo chuỗi trong update
protected update(dt: number): void {
    this.debugText = `FPS: ${1/dt}, Position: ${this.node.position}`; // Cấp phát mỗi frame
}
```

## Hiệu năng phép toán số

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('MathOptimizations')
export class MathOptimizations extends Component {
    // ✅ XUẤT SẮC: Dùng phép nhân thay vì chia
    private static readonly INV_FRAME_RATE: number = 1 / 60;

    public calculateTimedValue(value: number): number {
        return value * MathOptimizations.INV_FRAME_RATE; // Nhanh hơn value / 60
    }

    // ✅ XUẤT SẮC: Dùng phép toán bitwise cho số nguyên
    public fastFloor(value: number): number {
        return value | 0; // Nhanh hơn Math.floor với số dương
    }

    public isPowerOfTwo(value: number): boolean {
        return (value & (value - 1)) === 0; // Nhanh hơn kiểm tra logarit
    }

    // ✅ XUẤT SẮC: Cache phép toán toán học tốn kém
    private readonly sinCache: Map<number, number> = new Map();

    public getCachedSin(angle: number): number {
        if (!this.sinCache.has(angle)) {
            this.sinCache.set(angle, Math.sin(angle));
        }
        return this.sinCache.get(angle)!;
    }

    // ✅ XUẤT SẮC: Dùng khoảng cách bình phương để tránh sqrt
    public isWithinRange(pos1: Vec3, pos2: Vec3, range: number): boolean {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        const distSquared = dx * dx + dy * dy + dz * dz;
        const rangeSquared = range * range;
        return distSquared <= rangeSquared; // Không cần sqrt
    }
}

// ❌ SAI: Dùng phép toán tốn kém
public isWithinRange(pos1: Vec3, pos2: Vec3, range: number): boolean {
    const distance = Vec3.distance(pos1, pos2); // Dùng sqrt bên trong
    return distance <= range;
}

// ❌ SAI: Phép chia trong hot path
protected update(dt: number): void {
    const value = this.baseValue / 60; // Chia chậm hơn nhân
}
```

## Thực hành tốt quản lý bộ nhớ

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('ResourceManager')
export class ResourceManager extends Component {
    private readonly loadedAssets: Map<string, Asset> = new Map();
    private readonly nodeReferences: Set<Node> = new Set();

    // ✅ XUẤT SẮC: Xóa tham chiếu khi dọn dẹp
    protected onDestroy(): void {
        // Xóa map và set
        this.loadedAssets.clear();
        this.nodeReferences.clear();

        // Gỡ event listener
        this.node.off(Node.EventType.TOUCH_START);
    }

    // ✅ XUẤT SẮC: Gỡ asset không dùng
    public unloadAsset(assetId: string): void {
        const asset = this.loadedAssets.get(assetId);
        if (asset) {
            asset.decRef(); // Giải phóng tham chiếu
            this.loadedAssets.delete(assetId);
        }
    }

    // ✅ XUẤT SẮC: Weak reference cho cache
    private readonly weakNodeCache: WeakMap<Node, CachedData> = new WeakMap();

    public getCachedData(node: Node): CachedData | undefined {
        return this.weakNodeCache.get(node);
    }

    public setCachedData(node: Node, data: CachedData): void {
        this.weakNodeCache.set(node, data);
        // Node được garbage collect → mục cache tự động bị xóa
    }
}

// ❌ SAI: Rò rỉ bộ nhớ
protected onDestroy(): void {
    // Quên xóa tham chiếu — rò rỉ bộ nhớ!
    // this.loadedAssets.clear();
    // this.nodeReferences.clear();
}

// ❌ SAI: Tham chiếu mạnh ngăn garbage collection
private readonly nodeCache: Map<Node, CachedData> = new Map();
// Node không bao giờ được garbage collect dù đã destroy
```

## Tóm tắt: Checklist hiệu năng

**Quan trọng cho playable ads (<5MB, <10 DrawCall):**

- [ ] Không cấp phát bộ nhớ trong update() (cấp phát trước và tái sử dụng)
- [ ] Object pooling cho object tạo/hủy thường xuyên
- [ ] Cache tham chiếu component và node (không getComponent trong update)
- [ ] Giới hạn tần suất thao tác tốn kém (mỗi N frame, không phải mỗi frame)
- [ ] Tránh thao tác chuỗi trong hot path
- [ ] Dùng phép nhân thay vì chia
- [ ] Dùng khoảng cách bình phương thay vì khoảng cách (tránh sqrt)
- [ ] Xóa tham chiếu trong onDestroy() để tránh rò rỉ bộ nhớ
- [ ] Dùng WeakMap cho cache cần được garbage collect
- [ ] Array.length = 0 để xóa mảng (không tạo mảng mới)

**Hiệu năng rất quan trọng để playable ads chạy mượt 60fps.**
