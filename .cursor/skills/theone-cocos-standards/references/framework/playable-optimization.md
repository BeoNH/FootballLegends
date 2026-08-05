# Tối ưu hiệu năng Playable Ads

## Gộp lệnh DrawCall (Quan trọng cho Playable)

**Mục tiêu: <10 DrawCall để playable chạy mượt 60fps**

```typescript
import { _decorator, Component, Sprite, SpriteAtlas, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SpriteAtlasManager')
export class SpriteAtlasManager extends Component {
    // ✅ XUẤT SẮC: Dùng sprite atlas để gộp lệnh DrawCall
    @property(SpriteAtlas)
    private readonly characterAtlas: SpriteAtlas | null = null;

    @property(SpriteAtlas)
    private readonly uiAtlas: SpriteAtlas | null = null;

    private readonly spriteFrameCache: Map<string, SpriteFrame> = new Map();

    protected onLoad(): void {
        if (!this.characterAtlas || !this.uiAtlas) {
            throw new Error('SpriteAtlasManager: atlases are required');
        }

        // ✅ XUẤT SẮC: Prewarm sprite frame từ atlas
        this.prewarmAtlas(this.characterAtlas, 'character');
        this.prewarmAtlas(this.uiAtlas, 'ui');
    }

    private prewarmAtlas(atlas: SpriteAtlas, prefix: string): void {
        const spriteFrames = atlas.getSpriteFrames();
        for (const frame of spriteFrames) {
            const key = `${prefix}_${frame.name}`;
            this.spriteFrameCache.set(key, frame);
        }
    }

    // ✅ XUẤT SẮC: Lấy sprite frame từ cache (gộp cùng DrawCall)
    public getSpriteFrame(atlasName: string, frameName: string): SpriteFrame | null {
        const key = `${atlasName}_${frameName}`;
        return this.spriteFrameCache.get(key) ?? null;
    }
}

// Cách dùng: Tất cả sprite cùng atlas = một DrawCall
@ccclass('CharacterSprite')
export class CharacterSprite extends Component {
    @property(Sprite)
    private readonly sprite: Sprite | null = null;

    private atlasManager!: SpriteAtlasManager;

    protected start(): void {
        const manager = this.node.parent?.getComponent(SpriteAtlasManager);
        if (!manager) throw new Error('SpriteAtlasManager not found');
        this.atlasManager = manager;

        // ✅ TỐT: Gán sprite frame từ atlas (được gộp batch)
        const frame = this.atlasManager.getSpriteFrame('character', 'idle_01');
        if (frame && this.sprite) {
            this.sprite.spriteFrame = frame;
        }
    }
}

// ❌ SAI: Texture riêng lẻ (nhiều DrawCall)
@property(SpriteFrame)
private characterIdleFrame: SpriteFrame | null = null; // DrawCall 1

@property(SpriteFrame)
private characterWalkFrame: SpriteFrame | null = null; // DrawCall 2

@property(SpriteFrame)
private characterJumpFrame: SpriteFrame | null = null; // DrawCall 3
// Kết quả: 3 DrawCall cho 3 sprite!

// ✅ TỐT HƠN: Một atlas duy nhất
@property(SpriteAtlas)
private characterAtlas: SpriteAtlas | null = null; // DrawCall 1 cho tất cả frame
```

## GPU Skinning (Animation khung xương)

```typescript
import { _decorator, Component, SkeletalAnimation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AnimationController')
export class AnimationController extends Component {
    @property(SkeletalAnimation)
    private readonly skeleton: SkeletalAnimation | null = null;

    protected onLoad(): void {
        if (!this.skeleton) {
            throw new Error('AnimationController: skeleton is required');
        }

        // ✅ XUẤT SẮC: Bật GPU skinning để hiệu năng tốt hơn
        // GPU xử lý biến đổi xương thay vì CPU
        this.skeleton.useBakedAnimation = true; // Dữ liệu animation đã bake
    }

    public playAnimation(animName: string, loop: boolean = false): void {
        if (!this.skeleton) return;

        const state = this.skeleton.getState(animName);
        if (state) {
            state.wrapMode = loop ? SkeletalAnimation.WrapMode.Loop : SkeletalAnimation.WrapMode.Normal;
            this.skeleton.play(animName);
        }
    }
}

// ❌ SAI: CPU skinning (mặc định, chậm hơn)
// Không đặt useBakedAnimation = false cho playable
```

## Object Pooling cho Playable

```typescript
import { _decorator, Component, Node, Prefab, instantiate, NodePool } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayableObjectPool')
export class PlayableObjectPool extends Component {
    @property(Prefab)
    private readonly bulletPrefab: Prefab | null = null;

    @property(Prefab)
    private readonly effectPrefab: Prefab | null = null;

    private readonly bulletPool: NodePool = new NodePool();
    private readonly effectPool: NodePool = new NodePool();
    private static readonly PREWARM_COUNT: number = 20;

    // ✅ XUẤT SẮC: Prewarm pool để tránh cấp phát trong gameplay
    protected onLoad(): void {
        if (!this.bulletPrefab || !this.effectPrefab) {
            throw new Error('PlayableObjectPool: prefabs are required');
        }

        // Prewarm pool đạn
        for (let i = 0; i < PlayableObjectPool.PREWARM_COUNT; i++) {
            const bullet = instantiate(this.bulletPrefab);
            this.bulletPool.put(bullet);
        }

        // Prewarm pool hiệu ứng
        for (let i = 0; i < PlayableObjectPool.PREWARM_COUNT; i++) {
            const effect = instantiate(this.effectPrefab);
            this.effectPool.put(effect);
        }
    }

    // ✅ XUẤT SẮC: Lấy từ pool (zero allocation trong gameplay)
    public getBullet(): Node {
        if (this.bulletPool.size() > 0) {
            const bullet = this.bulletPool.get()!;
            bullet.active = true;
            return bullet;
        }

        // Fallback: tạo mới (hiếm nếu prewarm đúng)
        if (!this.bulletPrefab) {
            throw new Error('bulletPrefab is null');
        }
        return instantiate(this.bulletPrefab);
    }

    public returnBullet(bullet: Node): void {
        bullet.active = false;
        this.bulletPool.put(bullet);
    }

    protected onDestroy(): void {
        this.bulletPool.clear();
        this.effectPool.clear();
    }
}

// ❌ SAI: Tạo/hủy đối tượng trong gameplay
public shoot(): void {
    const bullet = instantiate(this.bulletPrefab!); // Cấp phát mỗi lần
    this.scheduleOnce(() => {
        bullet.destroy(); // Kích hoạt GC
    }, 2.0);
}
```

## Tối ưu vòng lặp update cho Playable

```typescript
import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('OptimizedUpdate')
export class OptimizedUpdate extends Component {
    @property([Node])
    private readonly enemies: Node[] = [];

    // ✅ XUẤT SẮC: Cấp phát trước để tránh allocation trong update
    private readonly tempVec3: Vec3 = new Vec3();
    private readonly activeEnemies: Node[] = [];
    private activeEnemiesDirty: boolean = true;
    private frameCount: number = 0;

    // ✅ XUẤT SẮC: Cập nhật thao tác tốn kém mỗi N frame
    protected update(dt: number): void {
        this.frameCount++;

        // Thao tác nhẹ: mỗi frame
        this.updateMovement(dt);

        // Thao tác tốn kém: mỗi 10 frame (6 lần/giây ở 60fps)
        if (this.frameCount % 10 === 0) {
            this.updateAI();
        }

        // Rất tốn kém: mỗi 60 frame (một lần/giây ở 60fps)
        if (this.frameCount % 60 === 0) {
            this.updatePathfinding();
        }
    }

    private updateMovement(dt: number): void {
        // Dùng danh sách enemy đang active đã cache
        const activeEnemies = this.getActiveEnemies();

        for (const enemy of activeEnemies) {
            // Tái sử dụng vector đã cấp phát trước
            enemy.getPosition(this.tempVec3);
            this.tempVec3.y += 10 * dt;
            enemy.setPosition(this.tempVec3);
        }
    }

    private getActiveEnemies(): Node[] {
        if (this.activeEnemiesDirty) {
            this.activeEnemies.length = 0;
            for (const enemy of this.enemies) {
                if (enemy.active) {
                    this.activeEnemies.push(enemy);
                }
            }
            this.activeEnemiesDirty = false;
        }
        return this.activeEnemies;
    }

    private updateAI(): void {
        // Logic AI tốn kém
    }

    private updatePathfinding(): void {
        // Pathfinding rất tốn kém
    }
}

// ❌ SAI: Toàn bộ logic trong update, allocation khắp nơi
protected update(dt: number): void {
    // Cấp phát mảng mỗi frame
    const activeEnemies = this.enemies.filter(e => e.active);

    for (const enemy of activeEnemies) {
        // Cấp phát vector mỗi frame
        const pos = enemy.position.clone();
        pos.y += 10 * dt;
        enemy.setPosition(pos);
    }

    // Thao tác tốn kém mỗi frame
    this.updatePathfinding(); // 60 lần/giây!
    this.updateAI(); // 60 lần/giây!
}
```

## Load và Preload tài nguyên

```typescript
import { _decorator, Component, resources, SpriteFrame, AudioClip } from 'cc';
const { ccclass } = _decorator;

@ccclass('ResourcePreloader')
export class ResourcePreloader extends Component {
    private readonly loadedResources: Map<string, Asset> = new Map();

    // ✅ XUẤT SẮC: Preload tất cả tài nguyên khi bắt đầu game
    protected async start(): Promise<void> {
        await this.preloadAllResources();
    }

    private async preloadAllResources(): Promise<void> {
        const resourcePaths = [
            'sprites/character',
            'sprites/enemies',
            'audio/bgm',
            'audio/sfx',
        ];

        const promises = resourcePaths.map(path => this.preloadResource(path));
        await Promise.all(promises);

        console.log('All resources preloaded');
    }

    private async preloadResource(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            resources.load(path, (err, asset) => {
                if (err) {
                    console.error(`Failed to load ${path}:`, err);
                    reject(err);
                    return;
                }

                this.loadedResources.set(path, asset);
                resolve();
            });
        });
    }

    public getResource<T extends Asset>(path: string): T | null {
        return (this.loadedResources.get(path) as T) ?? null;
    }

    protected onDestroy(): void {
        // ✅ XUẤT SẮC: Giải phóng tất cả tài nguyên đã load
        for (const [path, asset] of this.loadedResources) {
            asset.decRef();
        }
        this.loadedResources.clear();
    }
}

// ❌ SAI: Load tài nguyên trong gameplay
protected update(dt: number): void {
    if (this.shouldSpawnEnemy()) {
        // Load trong gameplay gây drop frame!
        resources.load('sprites/enemy', SpriteFrame, (err, sprite) => {
            this.spawnEnemy(sprite);
        });
    }
}

// ✅ TỐT HƠN: Preload và tái sử dụng
protected start(): void {
    resources.load('sprites/enemy', SpriteFrame, (err, sprite) => {
        this.enemySprite = sprite;
    });
}

protected update(dt: number): void {
    if (this.shouldSpawnEnemy() && this.enemySprite) {
        this.spawnEnemy(this.enemySprite); // Tức thì, không load
    }
}
```

## Quản lý bộ nhớ cho Playable

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('MemoryOptimized')
export class MemoryOptimized extends Component {
    // ✅ XUẤT SẮC: Dùng typed array cho dataset lớn
    private positions: Float32Array = new Float32Array(300); // 100 Vec3
    private velocities: Float32Array = new Float32Array(300);

    // ✅ XUẤT SẮC: Tái sử dụng mảng thay vì tạo mới
    private readonly tempArray: number[] = [];

    protected update(dt: number): void {
        // Tái sử dụng mảng, không cấp phát
        this.tempArray.length = 0;

        for (let i = 0; i < 100; i++) {
            this.tempArray.push(i * dt);
        }
    }

    // ✅ XUẤT SẮC: WeakMap cho cache (tự dọn dẹp)
    private readonly nodeCache: WeakMap<Node, CachedData> = new WeakMap();

    public getCachedData(node: Node): CachedData | undefined {
        return this.nodeCache.get(node);
    }

    protected onDestroy(): void {
        // ✅ XUẤT SẮC: Xóa tham chiếu
        this.tempArray.length = 0;
        // Entry WeakMap tự xóa khi Node bị destroy
    }
}
```

## Tóm tắt: Checklist tối ưu Playable

**Gộp lệnh DrawCall (mục tiêu <10):**
- [ ] Dùng sprite atlas cho tất cả sprite (không dùng texture riêng lẻ)
- [ ] Prewarm cache sprite frame trong onLoad()
- [ ] Gộp phần tử UI vào một atlas
- [ ] Dùng cùng material cho đối tượng tương tự

**Hiệu năng Animation:**
- [ ] Bật GPU skinning (useBakedAnimation = true)
- [ ] Bake animation khung xương
- [ ] Giới hạn số animation chạy đồng thời

**Object Pooling:**
- [ ] Pool đạn, hiệu ứng, enemy (mọi thứ spawn thường xuyên)
- [ ] Prewarm pool trong onLoad() (ít nhất 20 đối tượng)
- [ ] Không instantiate/destroy trong gameplay

**Vòng lặp update:**
- [ ] Zero allocation trong update()
- [ ] Throttle thao tác tốn kém (mỗi 10–60 frame)
- [ ] Cache danh sách đối tượng đang active
- [ ] Tái sử dụng vector/mảng đã cấp phát trước

**Quản lý tài nguyên:**
- [ ] Preload tất cả tài nguyên khi bắt đầu game
- [ ] Không load tài nguyên trong gameplay
- [ ] Giải phóng tài nguyên trong onDestroy()
- [ ] Dùng WeakMap cho cache tự dọn dẹp

**Mục tiêu: 60fps với <10 DrawCall và kích thước bundle <5MB cho playable ads.**
