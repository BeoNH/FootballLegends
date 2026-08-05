# TypeScript Chất lượng & Vệ sinh mã

## Bật strict mode TypeScript

```typescript
// ✅ TỐT: Bật strict mode trong tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true,
        "noImplicitThis": true,
        "alwaysStrict": true
    }
}

// Khai báo nullable một cách rõ ràng
public playerName: string | null = null; // Có thể null
public requiredName: string = ''; // Không bao giờ null

// ❌ TỆ: Bỏ qua nullability
public playerName: string; // Chưa khởi tạo, có thể undefined
```

## Dùng access modifier (public/private/protected)

```typescript
// ✅ TỐT: Access modifier rõ ràng
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameService')
export class GameService extends Component {
    // Chi tiết triển khai private
    private readonly playerNodes: Node[] = [];
    private currentLevel: number = 1;

    // Protected để subclass truy cập
    protected readonly maxHealth: number = 100;

    // Public API chỉ khi thực sự cần
    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    // Phương thức helper private
    private loadGameData(): void {
        // Triển khai
    }
}

// ❌ TỆ: Không có access modifier (mặc định public)
@ccclass('GameService')
export class GameService extends Component {
    playerNodes: Node[] = []; // Mặc định public
    currentLevel: number = 1; // Mặc định public
}
```

## Bật ESLint với hỗ trợ TypeScript

```json
// ✅ TỐT: Cấu hình .eslintrc.json
{
    "parser": "@typescript-eslint/parser",
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "plugins": ["@typescript-eslint"],
    "rules": {
        "@typescript-eslint/explicit-function-return-type": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/explicit-member-accessibility": "error"
    }
}
```

## Ném exception khi gặp lỗi

**Quy tắc quan trọng**: Ném exception thay vì im lặng thất bại hoặc trả về undefined.

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerService')
export class PlayerService extends Component {
    @property(Node)
    private readonly playerNode: Node | null = null;

    // ✅ XUẤT SẮC: Ném exception khi gặp lỗi
    protected onLoad(): void {
        if (!this.playerNode) {
            throw new Error('PlayerService: playerNode is required');
        }
    }

    public getPlayer(id: string): Player {
        const player = this.players.get(id);
        if (!player) {
            // Ném exception, không trả về undefined
            throw new Error(`Player not found: ${id}`);
        }
        return player;
    }

    public loadLevel(levelId: number): void {
        if (levelId < 1 || levelId > 100) {
            throw new RangeError(`Invalid level ID: ${levelId}. Must be 1-100.`);
        }

        const levelData = this.loadLevelData(levelId);
        if (!levelData) {
            throw new Error(`Failed to load level data for level ${levelId}`);
        }

        this.initializeLevel(levelData);
    }
}

// ❌ SAI: Thất bại im lặng
public getPlayer(id: string): Player | undefined {
    const player = this.players.get(id);
    // Trả về undefined — caller không biết vì sao thất bại
    return player;
}

// ❌ SAI: Chỉ log lỗi thay vì ném exception
public loadLevel(levelId: number): void {
    if (levelId < 1) {
        console.error('Invalid level ID'); // Không chỉ log
        return; // Thất bại im lặng
    }
}
```

## Logging: console.log chỉ dùng khi phát triển

**Hướng dẫn logging:**
- **console.log**: Chỉ dùng để debug khi phát triển
- **Xóa khi production**: Bọc trong `CC_DEBUG` hoặc xóa hẳn
- **Ảnh hưởng hiệu năng**: console.log có thể làm chậm playable ads
- **Kích thước bundle**: Chuỗi log làm tăng kích thước bundle

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    private currentScore: number = 0;

    // ✅ XUẤT SẮC: Log có điều kiện khi phát triển
    protected onLoad(): void {
        if (CC_DEBUG) {
            console.log('GameManager initialized');
        }
    }

    public addScore(points: number): void {
        this.currentScore += points;

        // ✅ TỐT: Debug log chỉ khi phát triển
        if (CC_DEBUG) {
            console.log(`Score updated: ${this.currentScore}`);
        }
    }

    private loadGameData(): void {
        try {
            const data = this.fetchData();
            this.processData(data);
        } catch (error) {
            // ✅ TỐT: Log lỗi khi phát triển
            if (CC_DEBUG) {
                console.error('Failed to load game data:', error);
            }
            // Luôn ném để caller xử lý
            throw error;
        }
    }
}

// ❌ SAI: console.log không điều kiện trong production
public addScore(points: number): void {
    console.log(`Adding ${points} points`); // Sẽ có trong bản build production
    this.currentScore += points;
}

// ❌ SAI: Log dài dòng khắp nơi
public update(dt: number): void {
    console.log('Update called'); // Gọi mỗi frame!
    console.log(`Delta time: ${dt}`); // Ảnh hưởng hiệu năng
}

// ✅ TỐT HƠN: Xóa log khi production hoặc loại bỏ lúc build
// Cấu hình quy trình build để strip console.log trong bản production
```

**Cấu hình build production:**

```javascript
// Cấu hình build để xóa console.log khi production
// rollup.config.js hoặc webpack.config.js
export default {
    plugins: [
        // Xóa lệnh console khi production
        terser({
            compress: {
                drop_console: true, // Xóa mọi lệnh console.*
                pure_funcs: ['console.log', 'console.debug'], // Xóa các lệnh cụ thể
            }
        })
    ]
};
```

## Dùng readonly cho trường bất biến

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    // ✅ TỐT: readonly cho trường @property không gán lại
    @property(Node)
    private readonly targetNode: Node | null = null;

    @property(Number)
    private readonly moveSpeed: number = 100;

    // ✅ TỐT: readonly cho dependency được inject
    private readonly eventManager: EventManager;

    // Trường mutable thông thường
    private currentHealth: number = 100;

    constructor(eventManager: EventManager) {
        super();
        this.eventManager = eventManager;
    }

    // ❌ SAI: Không thể gán lại trường readonly
    public setTarget(node: Node): void {
        // this.targetNode = node; // Error: Cannot assign to 'targetNode' because it is a read-only property
    }
}

// ❌ TỆ: Mutable khi không nên
@ccclass('GameConfig')
export class GameConfig extends Component {
    @property(Number)
    private maxHealth: number = 100; // Nên là readonly
}
```

## Dùng const cho hằng số

```typescript
// ✅ TỐT: const cho hằng số
const MAX_PLAYERS = 4;
const DEFAULT_PLAYER_NAME = 'Player';
const GAME_VERSION = '1.0.0';

// ✅ TỐT: static readonly cho hằng số của class
@ccclass('GameRules')
export class GameRules extends Component {
    private static readonly MAX_HEALTH: number = 100;
    private static readonly MIN_LEVEL: number = 1;
    private static readonly MAX_LEVEL: number = 50;

    public static isValidLevel(level: number): boolean {
        return level >= GameRules.MIN_LEVEL && level <= GameRules.MAX_LEVEL;
    }
}

// ✅ TỐT: Enum cho các hằng số liên quan
export enum GameState {
    LOADING = 'loading',
    PLAYING = 'playing',
    PAUSED = 'paused',
    GAME_OVER = 'game_over',
}

// ❌ TỆ: let cho hằng số
let maxPlayers = 4; // Nên là const
let defaultPlayerName = 'Player'; // Nên là const

// ❌ TỆ: Magic number không có hằng số
public checkHealth(): boolean {
    return this.health > 0 && this.health <= 100; // 100 là gì?
}

// ✅ TỐT HƠN: Hằng số có tên
private static readonly MAX_HEALTH: number = 100;

public checkHealth(): boolean {
    return this.health > 0 && this.health <= GameRules.MAX_HEALTH;
}
```

## Không dùng comment inline (dùng tên mô tả)

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

// ✅ XUẤT SẮC: Mã tự giải thích, không comment inline
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Node)
    private readonly healthBarNode: Node | null = null;

    private currentHealth: number = 100;
    private static readonly MAX_HEALTH: number = 100;
    private static readonly CRITICAL_HEALTH_THRESHOLD: number = 20;

    public takeDamage(amount: number): void {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.updateHealthBar();

        if (this.isHealthCritical()) {
            this.triggerLowHealthWarning();
        }

        if (this.isDead()) {
            this.handlePlayerDeath();
        }
    }

    private isHealthCritical(): boolean {
        return this.currentHealth <= PlayerController.CRITICAL_HEALTH_THRESHOLD;
    }

    private isDead(): boolean {
        return this.currentHealth === 0;
    }

    private triggerLowHealthWarning(): void {
        // Triển khai
    }

    private handlePlayerDeath(): void {
        // Triển khai
    }

    private updateHealthBar(): void {
        if (!this.healthBarNode) return;

        const healthPercentage = this.currentHealth / PlayerController.MAX_HEALTH;
        this.healthBarNode.scale = new Vec3(healthPercentage, 1, 1);
    }
}

// ❌ TỆ: Comment inline giải thích mã không rõ
@ccclass('PlayerController')
export class PlayerController extends Component {
    private h: number = 100; // health

    public td(a: number): void { // take damage
        this.h = Math.max(0, this.h - a); // trừ damage nhưng không xuống dưới 0
        this.uh(); // cập nhật thanh máu

        if (this.h <= 20) { // nếu máu ở mức nguy hiểm
            this.tlhw(); // kích hoạt cảnh báo máu thấp
        }

        if (this.h === 0) { // nếu chết
            this.hpd(); // xử lý khi player chết
        }
    }
}

// ❌ TỆ: Comment giải thích mã làm gì (lẽ ra phải hiển nhiên)
public addScore(points: number): void {
    // Cộng điểm vào điểm hiện tại
    this.currentScore += points;

    // Kiểm tra điểm vượt tối đa
    if (this.currentScore > MAX_SCORE) {
        // Gán điểm bằng tối đa
        this.currentScore = MAX_SCORE;
    }
}

// ✅ TỐT HƠN: Tên mô tả khiến comment không cần thiết
public addScore(points: number): void {
    this.currentScore += points;
    this.clampScoreToMaximum();
}

private clampScoreToMaximum(): void {
    this.currentScore = Math.min(this.currentScore, MAX_SCORE);
}
```

**Khi nào comment là phù hợp:**

```typescript
// ✅ TỐT: Ghi lại VÌ SAO, không phải LÀM GÌ
/**
 * Tính damage bằng công thức bậc hai để tạo đường cong damage mượt.
 * Damage tuyến tính cảm giác quá gắt với người chơi mới khi playtest.
 */
private calculateDamage(baseAmount: number, level: number): number {
    return baseAmount * Math.pow(level, 0.8);
}

// ✅ TỐT: Ghi lại thuật toán phức tạp
/**
 * Triển khai thuật toán tìm đường A*.
 * Dùng heuristic khoảng cách Manhattan cho di chuyển trên lưới.
 * @see https://en.wikipedia.org/wiki/A*_search_algorithm
 */
private findPath(start: Vec2, end: Vec2): Vec2[] {
    // Triển khai
}

// ✅ TỐT: Ghi lại workaround
/**
 * WORKAROUND: Cocos Creator 3.8.x có bug sprite atlas
 * frame không load đúng lần truy cập đầu. Truy cập một lần
 * trong onLoad() để đảm bảo được cache cho lần sau.
 * @see https://github.com/cocos/cocos-engine/issues/12345
 */
protected onLoad(): void {
    this.atlas?.getSpriteFrame('dummy');
}
```

## Xử lý null/undefined đúng cách

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerManager')
export class PlayerManager extends Component {
    @property(Node)
    private readonly playerNode: Node | null = null;

    // ✅ XUẤT SẮC: Kiểm tra và xử lý lỗi rõ ràng
    protected onLoad(): void {
        if (!this.playerNode) {
            throw new Error('PlayerManager: playerNode is required');
        }
    }

    // ✅ TỐT: Optional chaining để truy cập an toàn
    public getPlayerName(): string {
        return this.playerNode?.name ?? 'Unknown';
    }

    // ✅ TỐT: Nullish coalescing cho giá trị mặc định
    public getPlayerHealth(): number {
        return this.playerNode?.getComponent(PlayerController)?.health ?? 0;
    }

    // ✅ TỐT: Type guard để an toàn kiểu
    private isValidPlayer(node: Node | null): node is Node {
        return node !== null && node.getComponent(PlayerController) !== null;
    }

    public updatePlayer(): void {
        if (this.isValidPlayer(this.playerNode)) {
            // TypeScript biết playerNode là Node (không null)
            const controller = this.playerNode.getComponent(PlayerController)!;
            controller.update();
        }
    }
}

// ❌ TỆ: Không kiểm tra null
public updatePlayer(): void {
    this.playerNode.position = new Vec3(0, 0, 0); // Có thể crash nếu null
}

// ❌ TỆ: Ép kiểu không an toàn
public getController(): PlayerController {
    return this.playerNode!.getComponent(PlayerController)!; // Không an toàn!
}
```

## Tránh kiểu `any`

```typescript
// ✅ TỐT: Kiểu và interface đúng
interface PlayerData {
    id: string;
    name: string;
    level: number;
    health: number;
}

@ccclass('PlayerService')
export class PlayerService extends Component {
    private readonly players: Map<string, PlayerData> = new Map();

    public addPlayer(data: PlayerData): void {
        this.players.set(data.id, data);
    }

    public getPlayer(id: string): PlayerData | undefined {
        return this.players.get(id);
    }
}

// ❌ TỆ: Dùng kiểu any
@ccclass('PlayerService')
export class PlayerService extends Component {
    private players: any = {}; // Mất an toàn kiểu

    public addPlayer(data: any): void { // Không kiểm tra kiểu
        this.players[data.id] = data;
    }

    public getPlayer(id: string): any { // Caller không biết cấu trúc
        return this.players[id];
    }
}

// ✅ TỐT: Dùng generic thay vì any
class DataStore<T> {
    private data: Map<string, T> = new Map();

    public set(key: string, value: T): void {
        this.data.set(key, value);
    }

    public get(key: string): T | undefined {
        return this.data.get(key);
    }
}

// ✅ TỐT: Dùng unknown cho kiểu thực sự không biết (an toàn hơn any)
function parseJSON(json: string): unknown {
    return JSON.parse(json);
}

// Sau đó validate và thu hẹp kiểu
const result = parseJSON('{"name": "Player"}');
if (isPlayerData(result)) {
    // result giờ được gõ kiểu là PlayerData
    console.log(result.name);
}

function isPlayerData(obj: unknown): obj is PlayerData {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'level' in obj &&
        'health' in obj
    );
}
```

## Tóm tắt: Checklist chất lượng

**Trước khi commit, kiểm tra:**

- [ ] strict mode TypeScript đã bật trong tsconfig.json
- [ ] Cấu hình ESLint đang hoạt động và pass
- [ ] Mọi thành viên class có access modifier (public/private/protected)
- [ ] Ném exception khi gặp lỗi (không thất bại im lặng)
- [ ] console.log đã xóa hoặc bọc trong CC_DEBUG
- [ ] readonly dùng cho trường không gán lại
- [ ] const dùng cho hằng số (không dùng let)
- [ ] Không comment inline (mã tự giải thích)
- [ ] Optional chaining (?.) để truy cập thuộc tính an toàn
- [ ] Nullish coalescing (??) cho giá trị mặc định
- [ ] Không dùng kiểu `any` nếu không có lý do chính đáng
- [ ] Tham chiếu bắt buộc được validate trong onLoad()

**Chất lượng là nền tảng của mọi pattern khác. Làm đúng phần này trước.**
