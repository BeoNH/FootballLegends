# Review Performance Playable Ads

Review này tập trung vào các vấn đề performance đặc thù cho playable ads, bao gồm tối ưu DrawCall, kích thước bundle, performance vòng lặp update và quản lý tài nguyên.

## DrawCall Explosion (Nghiêm trọng cho Playable)

**Mục tiêu: <10 DrawCall cho playable 60fps**

```typescript
// ❌ NGHIÊM TRỌNG: Texture riêng lẻ (nhiều DrawCall)
@ccclass('DrawCallBad')
export class DrawCallBad extends Component {
    @property(SpriteFrame)
    private sprite1: SpriteFrame | null = null; // DrawCall 1

    @property(SpriteFrame)
    private sprite2: SpriteFrame | null = null; // DrawCall 2

    @property(SpriteFrame)
    private sprite3: SpriteFrame | null = null; // DrawCall 3

    // 10 sprite = 10 DrawCall! (TỆ)
}

// ✅ ĐÚNG: Sprite atlas (một DrawCall)
@ccclass('DrawCallGood')
export class DrawCallGood extends Component {
    @property(SpriteAtlas)
    private readonly characterAtlas: SpriteAtlas | null = null; // 1 DrawCall cho tất cả
}

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Drop frame, performance kém
// Mục tiêu: <10 DrawCall tổng cộng
// Cách sửa: Dùng sprite atlas cho tất cả sprite
```

## Allocation trong vòng lặp Update

```typescript
// ❌ NGHIÊM TRỌNG: Allocation trong update
@ccclass('UpdateAllocationsBad')
export class UpdateAllocationsBad extends Component {
    protected update(dt: number): void {
        // Tạo Vec3 mới mỗi frame
        const pos = this.node.position.clone(); // 60 allocation/giây!
        pos.y += 10 * dt;
        this.node.setPosition(pos);

        // Tạo mảng mỗi frame
        const enemies = this.getAllEnemies().filter(e => e.active); // 60 mảng/giây!
    }
}

// ✅ ĐÚNG: Zero allocation
@ccclass('UpdateAllocationsGood')
export class UpdateAllocationsGood extends Component {
    private readonly tempVec3: Vec3 = new Vec3();
    private readonly activeEnemies: Enemy[] = [];
    private cacheRDirty: boolean = true;

    protected update(dt: number): void {
        // Tái sử dụng vector đã preallocate
        this.node.getPosition(this.tempVec3);
        this.tempVec3.y += 10 * dt;
        this.node.setPosition(this.tempVec3);

        // Dùng mảng đã cache
        const enemies = this.getActiveEnemies();
    }

    private getActiveEnemies(): Enemy[] {
        if (this.cacheDirty) {
            this.activeEnemies.length = 0;
            // Xây dựng lại cache
            this.cacheDirty = false;
        }
        return this.activeEnemies;
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Drop frame, GC pause
// Cách sửa: Preallocate object, tái sử dụng trong update
```

## Không dùng Object Pooling

```typescript
// ❌ QUAN TRỌNG: instantiate/destroy trong gameplay
@ccclass('NoPoolingBad')
export class NoPoolingBad extends Component {
    public shoot(): void {
        const bullet = instantiate(this.bulletPrefab!); // Allocation
        this.scheduleOnce(() => {
            bullet.destroy(); // Overhead GC
        }, 2.0);
    }
}

// ✅ ĐÚNG: Object pooling
@ccclass('NoPoolingGood')
export class NoPoolingGood extends Component {
    private readonly bulletPool: NodePool = new NodePool();

    protected onLoad(): void {
        // Prewarm pool
        for (let i = 0; i < 20; i++) {
            const bullet = instantiate(this.bulletPrefab!);
            this.bulletPool.put(bullet);
        }
    }

    public shoot(): void {
        const bullet = this.bulletPool.get() ?? instantiate(this.bulletPrefab!);
        this.scheduleOnce(() => {
            this.bulletPool.put(bullet);
        }, 2.0);
    }
}

// Mức độ: 🟡 Quan trọng
// Tác động: Allocation, GC pause
// Cách sửa: Triển khai object pooling cho spawn/despawn thường xuyên
```

## Thao tác tốn kém không throttle

```typescript
// ❌ QUAN TRỌNG: Thao tác tốn kém mỗi frame
@ccclass('UnthrottledBad')
export class UnthrottledBad extends Component {
    protected update(dt: number): void {
        this.recalculatePathfinding(); // A* mỗi frame (60 lần/giây)!
        this.updateComplexAI();        // Tốn kém mỗi frame!
    }
}

// ✅ ĐÚNG: Throttle thao tác tốn kém
@ccclass('UnthrottledGood')
export class UnthrottledGood extends Component {
    private frameCount: number = 0;

    protected update(dt: number): void {
        this.frameCount++;

        // Pathfinding một lần mỗi giây
        if (this.frameCount % 60 === 0) {
            this.recalculatePathfinding();
        }

        // AI 6 lần mỗi giây
        if (this.frameCount % 10 === 0) {
            this.updateComplexAI();
        }

        // Thao tác nhẹ mỗi frame
        this.moveTowardsTarget(dt);
    }
}

// Mức độ: 🟡 Quan trọng
// Tác động: Performance kém, drop frame
// Cách sửa: Throttle mỗi N frame (10-60)
```

## Bundle Size >5MB

```typescript
// ❌ NGHIÊM TRỌNG: Bundle vượt giới hạn playable
// Build output: 7.2MB (quá lớn cho hầu hết ad network!)

// Nguyên nhân phổ biến:
// 1. Texture không nén → Bật compression
// 2. Texture quá lớn → Giảm tối đa 512x512
// 3. Audio không nén → Dùng MP3/OGG ở 64-128kbps
// 4. Asset không dùng → Xóa khỏi project
// 5. Không minify code → Bật trong build settings

// ✅ ĐÚNG: Tối ưu xuống <5MB
// - Bật texture compression (Project Settings)
// - Dùng sprite atlas (gộp texture)
// - Nén audio (64-128kbps)
// - Xóa asset không dùng
// - Bật code minification (drop_console, dead_code)

// Mức độ: 🔴 Nghiêm trọng
// Tác động: Playable bị từ chối bởi ad network
// Mục tiêu: <5MB bundle tổng cộng
// Cách sửa: Áp dụng kỹ thuật tối ưu kích thước
```

## Load tài nguyên trong Gameplay

```typescript
// ❌ QUAN TRỌNG: Load trong gameplay
@ccclass('LoadingInGameplayBad')
export class LoadingInGameplayBad extends Component {
    protected update(dt: number): void {
        if (this.shouldSpawnEnemy()) {
            // Load gây drop frame!
            resources.load('sprites/enemy', SpriteFrame, (err, sprite) => {
                this.spawnEnemy(sprite);
            });
        }
    }
}

// ✅ ĐÚNG: Preload khi khởi động
@ccclass('LoadingInGameplayGood')
export class LoadingInGameplayGood extends Component {
    private enemySprite: SpriteFrame | null = null;

    protected start(): void {
        // Preload một lần
        resources.load('sprites/enemy', SpriteFrame, (err, sprite) => {
            if (!err) {
                this.enemySprite = sprite;
            }
        });
    }

    protected update(dt: number): void {
        if (this.shouldSpawnEnemy() && this.enemySprite) {
            this.spawnEnemy(this.enemySprite); // Tức thì, không load
        }
    }
}

// Mức độ: 🟡 Quan trọng
// Tác động: Drop frame khi load
// Cách sửa: Preload tất cả tài nguyên khi khởi động
```

## GPU Skinning bị tắt

```typescript
// ❌ QUAN TRỌNG: CPU skinning (chậm hơn)
@ccclass('CPUSkinningBad')
export class CPUSkinningBad extends Component {
    @property(SkeletalAnimation)
    private skeleton: SkeletalAnimation | null = null;

    protected onLoad(): void {
        // Dùng CPU skinning mặc định (chậm hơn)
    }
}

// ✅ ĐÚNG: Bật GPU skinning
@ccclass('GPUSkinningGood')
export class GPUSkinningGood extends Component {
    @property(SkeletalAnimation)
    private readonly skeleton: SkeletalAnimation | null = null;

    protected onLoad(): void {
        if (this.skeleton) {
            // GPU xử lý biến đổi xương (nhanh hơn)
            this.skeleton.useBakedAnimation = true;
        }
    }
}

// Mức độ: 🟢 Gợi ý
// Tác động: Performance tốt hơn cho skeletal animation
// Cách sửa: Bật useBakedAnimation cho GPU skinning
```

## Tóm tắt: Checklist Review Performance

**🔴 Nghiêm trọng (Bắt buộc sửa):**
- [ ] Số DrawCall <10 (dùng sprite atlas)
- [ ] Zero allocation trong vòng lặp update()
- [ ] Kích thước bundle <5MB tổng cộng
- [ ] Không load tài nguyên trong gameplay

**🟡 Quan trọng (Nên sửa):**
- [ ] Object pooling cho đạn, hiệu ứng, enemy
- [ ] Thao tác tốn kém được throttle (mỗi 10-60 frame)
- [ ] Tham chiếu component được cache (không getComponent trong update)
- [ ] Tham chiếu Node được cache (không find() trong update)

**🟢 Gợi ý:**
- [ ] GPU skinning được bật (useBakedAnimation = true)
- [ ] Kích thước texture được tối ưu (tối đa 512x512)
- [ ] Audio được nén (64-128kbps)
- [ ] WeakMap cho cache tự dọn dẹp

**Mục tiêu performance: 60fps, <10 DrawCall, <5MB bundle cho playable ads.**
