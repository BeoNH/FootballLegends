# Pattern TypeScript hiện đại

## Phương thức mảng thay cho vòng lặp

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

interface Enemy {
    node: Node;
    isActive: boolean;
    health: number;
    damage: number;
}

@ccclass('EnemyManager')
export class EnemyManager extends Component {
    private readonly enemies: Enemy[] = [];

    // ✅ XUẤT SẮC: Phương thức mảng để lọc
    public getActiveEnemies(): Enemy[] {
        return this.enemies.filter(enemy => enemy.isActive);
    }

    // ✅ XUẤT SẮC: Phương thức mảng để map
    public getEnemyPositions(): Vec3[] {
        return this.enemies.map(enemy => enemy.node.position.clone());
    }

    // ✅ XUẤT SẮC: Phương thức mảng để reduce
    public getTotalDamage(): number {
        return this.enemies.reduce((total, enemy) => total + enemy.damage, 0);
    }

    // ✅ XUẤT SẮC: Chuỗi phương thức mảng
    public getActiveEnemyDamage(): number {
        return this.enemies
            .filter(enemy => enemy.isActive)
            .reduce((total, enemy) => total + enemy.damage, 0);
    }

    // ✅ XUẤT SẮC: find thay vì vòng lặp thủ công
    public findEnemyById(id: string): Enemy | undefined {
        return this.enemies.find(enemy => enemy.node.uuid === id);
    }

    // ✅ XUẤT SẮC: some/every để kiểm tra tồn tại
    public hasActiveEnemies(): boolean {
        return this.enemies.some(enemy => enemy.isActive);
    }

    public areAllEnemiesDead(): boolean {
        return this.enemies.every(enemy => enemy.health <= 0);
    }
}

// ❌ TỆ: Vòng lặp thủ công
public getActiveEnemies(): Enemy[] {
    const active: Enemy[] = [];
    for (let i = 0; i < this.enemies.length; i++) {
        if (this.enemies[i].isActive) {
            active.push(this.enemies[i]);
        }
    }
    return active;
}

// ❌ TỆ: Cộng dồn thủ công
public getTotalDamage(): number {
    let total = 0;
    for (const enemy of this.enemies) {
        total += enemy.damage;
    }
    return total;
}
```

## Arrow function và callback

```typescript
import { _decorator, Component, Node, EventTouch } from 'cc';
const { ccclass } = _decorator;

@ccclass('InputHandler')
export class InputHandler extends Component {
    private readonly buttons: Node[] = [];

    // ✅ XUẤT SẮC: Arrow function cho callback
    protected onEnable(): void {
        this.buttons.forEach(button => {
            button.on(Node.EventType.TOUCH_START, this.onButtonClick, this);
        });
    }

    protected onDisable(): void {
        this.buttons.forEach(button => {
            button.off(Node.EventType.TOUCH_START, this.onButtonClick, this);
        });
    }

    // ✅ TỐT: Arrow function giữ ngữ cảnh this
    private readonly onButtonClick = (event: EventTouch): void => {
        const button = event.target as Node;
        this.handleButtonClick(button);
    };

    // ✅ TỐT: Arrow function xử lý sự kiện
    private setupAsyncOperation(): void {
        setTimeout(() => {
            this.processData();
        }, 1000);
    }

    // ✅ TỐT: Arrow function trong chuỗi Promise
    private async loadData(): Promise<void> {
        fetch('data.json')
            .then(response => response.json())
            .then(data => this.processData(data))
            .catch(error => this.handleError(error));
    }
}

// ❌ TỆ: Function expression mất ngữ cảnh this
protected onEnable(): void {
    this.buttons.forEach(function(button) {
        // 'this' là undefined hoặc ngữ cảnh sai
        button.on(Node.EventType.TOUCH_START, this.onButtonClick, this);
    });
}

// ❌ TỆ: Cú pháp function dài dòng
private setupAsyncOperation(): void {
    const self = this;
    setTimeout(function() {
        self.processData();
    }, 1000);
}
```

## Destructuring

```typescript
import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

interface PlayerData {
    id: string;
    name: string;
    level: number;
    health: number;
    position: { x: number; y: number; z: number };
}

@ccclass('PlayerController')
export class PlayerController extends Component {
    // ✅ XUẤT SẮC: Destructuring trong tham số
    public updatePlayer({ id, name, level, health, position }: PlayerData): void {
        console.log(`Updating ${name} (${id}) at level ${level}`);

        // ✅ XUẤT SẮC: Destructuring lồng nhau
        const { x, y, z } = position;
        this.node.setPosition(x, y, z);
    }

    // ✅ XUẤT SẮC: Destructuring với giá trị mặc định
    public loadConfig({ speed = 100, jumpHeight = 50, maxHealth = 100 } = {}): void {
        this.speed = speed;
        this.jumpHeight = jumpHeight;
        this.maxHealth = maxHealth;
    }

    // ✅ XUẤT SẮC: Destructuring mảng
    public getPlayerPosition(): Vec3 {
        const [x, y, z] = [this.node.position.x, this.node.position.y, this.node.position.z];
        return new Vec3(x, y, z);
    }

    // ✅ XUẤT SẮC: Toán tử rest kết hợp destructuring
    public handleInput({ type, ...eventData }: InputEvent): void {
        switch (type) {
            case 'touch':
                this.handleTouch(eventData);
                break;
            case 'key':
                this.handleKey(eventData);
                break;
        }
    }
}

// ❌ TỆ: Không destructuring
public updatePlayer(playerData: PlayerData): void {
    console.log(`Updating ${playerData.name} (${playerData.id}) at level ${playerData.level}`);
    this.node.setPosition(playerData.position.x, playerData.position.y, playerData.position.z);
}

// ❌ TỆ: Truy cập thuộc tính dài dòng
public loadConfig(config: Config): void {
    this.speed = config.speed !== undefined ? config.speed : 100;
    this.jumpHeight = config.jumpHeight !== undefined ? config.jumpHeight : 50;
    this.maxHealth = config.maxHealth !== undefined ? config.maxHealth : 100;
}
```

## Toán tử spread

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

interface GameConfig {
    playerName: string;
    difficulty: string;
    soundEnabled: boolean;
}

@ccclass('GameManager')
export class GameManager extends Component {
    private readonly defaultConfig: GameConfig = {
        playerName: 'Player',
        difficulty: 'normal',
        soundEnabled: true,
    };

    // ✅ XUẤT SẮC: Spread để gộp object
    public createConfig(overrides: Partial<GameConfig>): GameConfig {
        return { ...this.defaultConfig, ...overrides };
    }

    // ✅ XUẤT SẮC: Spread để nối mảng
    private readonly baseEnemies: string[] = ['goblin', 'orc'];
    private readonly bossEnemies: string[] = ['dragon', 'demon'];

    public getAllEnemies(): string[] {
        return [...this.baseEnemies, ...this.bossEnemies];
    }

    // ✅ XUẤT SẮC: Spread để clone mảng
    public cloneEnemyList(): string[] {
        return [...this.baseEnemies];
    }

    // ✅ XUẤT SẮC: Spread khi gọi hàm
    public calculateMaxValue(...values: number[]): number {
        return Math.max(...values);
    }

    // ✅ XUẤT SẮC: Spread để cập nhật bất biến
    public addEnemy(enemy: string): void {
        this.baseEnemies = [...this.baseEnemies, enemy];
    }
}

// ❌ TỆ: Gộp thủ công
public createConfig(overrides: Partial<GameConfig>): GameConfig {
    const config: GameConfig = {
        playerName: overrides.playerName ?? this.defaultConfig.playerName,
        difficulty: overrides.difficulty ?? this.defaultConfig.difficulty,
        soundEnabled: overrides.soundEnabled ?? this.defaultConfig.soundEnabled,
    };
    return config;
}

// ❌ TỆ: Nối mảng thủ công
public getAllEnemies(): string[] {
    const enemies: string[] = [];
    for (const enemy of this.baseEnemies) {
        enemies.push(enemy);
    }
    for (const enemy of this.bossEnemies) {
        enemies.push(enemy);
    }
    return enemies;
}
```

## Optional chaining (?.)

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

interface Player {
    name: string;
    stats?: {
        health?: number;
        level?: number;
    };
    inventory?: {
        items?: Item[];
    };
}

@ccclass('PlayerManager')
export class PlayerManager extends Component {
    @property(Node)
    private readonly playerNode: Node | null = null;

    // ✅ XUẤT SẮC: Optional chaining để truy cập an toàn
    public getPlayerName(): string | undefined {
        return this.playerNode?.name;
    }

    // ✅ XUẤT SẮC: Optional chaining sâu
    public getPlayerHealth(player: Player): number | undefined {
        return player?.stats?.health;
    }

    // ✅ XUẤT SẮC: Optional chaining với mảng
    public getFirstItem(player: Player): Item | undefined {
        return player?.inventory?.items?.[0];
    }

    // ✅ XUẤT SẮC: Optional chaining với phương thức
    public getComponentName(): string | undefined {
        return this.playerNode?.getComponent(PlayerController)?.getName?.();
    }

    // ✅ XUẤT SẮC: Kết hợp với nullish coalescing
    public getDisplayName(): string {
        return this.playerNode?.name ?? 'Unknown Player';
    }
}

// ❌ TỆ: Kiểm tra null thủ công
public getPlayerName(): string | undefined {
    if (this.playerNode !== null && this.playerNode !== undefined) {
        return this.playerNode.name;
    }
    return undefined;
}

// ❌ TỆ: Kiểm tra null lồng nhau
public getPlayerHealth(player: Player): number | undefined {
    if (player) {
        if (player.stats) {
            if (player.stats.health !== undefined) {
                return player.stats.health;
            }
        }
    }
    return undefined;
}
```

## Nullish coalescing (??)

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

interface GameConfig {
    playerName?: string;
    maxHealth?: number;
    soundVolume?: number;
    enableTutorial?: boolean;
}

@ccclass('ConfigManager')
export class ConfigManager extends Component {
    // ✅ XUẤT SẮC: Nullish coalescing cho giá trị mặc định
    public loadConfig(config: GameConfig): void {
        const playerName = config.playerName ?? 'Player';
        const maxHealth = config.maxHealth ?? 100;
        const soundVolume = config.soundVolume ?? 0.5;
        const enableTutorial = config.enableTutorial ?? true;

        console.log({ playerName, maxHealth, soundVolume, enableTutorial });
    }

    // ✅ XUẤT SẮC: Nullish coalescing giữ giá trị falsy
    public getVolume(volume?: number): number {
        // Trả về 0 nếu volume là 0 (không dùng || vì sẽ trả về 1)
        return volume ?? 1;
    }

    // ✅ XUẤT SẮC: Chuỗi nullish coalescing
    public getPlayerName(primaryName?: string, secondaryName?: string): string {
        return primaryName ?? secondaryName ?? 'Unknown';
    }

    // ✅ XUẤT SẮC: Nullish coalescing với optional chaining
    public getHealthDisplay(player?: Player): string {
        const health = player?.stats?.health ?? 0;
        return `Health: ${health}`;
    }
}

// ❌ TỆ: Dùng toán tử || (coi 0, '', false như null)
public getVolume(volume?: number): number {
    return volume || 1; // Trả về 1 dù volume là 0
}

// ❌ TỆ: Kiểm tra null/undefined thủ công
public loadConfig(config: GameConfig): void {
    const playerName = config.playerName !== null && config.playerName !== undefined
        ? config.playerName
        : 'Player';
}

// ❌ TỆ: Ternary dài dòng
public getPlayerName(name?: string): string {
    return name !== undefined && name !== null ? name : 'Unknown';
}
```

## Type guard

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

// ✅ XUẤT SẮC: Type guard cho interface
interface Player {
    type: 'player';
    health: number;
    level: number;
}

interface Enemy {
    type: 'enemy';
    health: number;
    damage: number;
}

type Entity = Player | Enemy;

function isPlayer(entity: Entity): entity is Player {
    return entity.type === 'player';
}

function isEnemy(entity: Entity): entity is Enemy {
    return entity.type === 'enemy';
}

@ccclass('CombatManager')
export class CombatManager extends Component {
    public handleEntity(entity: Entity): void {
        if (isPlayer(entity)) {
            // TypeScript biết entity là Player
            console.log(`Player level: ${entity.level}`);
        } else if (isEnemy(entity)) {
            // TypeScript biết entity là Enemy
            console.log(`Enemy damage: ${entity.damage}`);
        }
    }

    // ✅ XUẤT SẮC: Type guard cho null/undefined
    private isValidNode(node: Node | null | undefined): node is Node {
        return node !== null && node !== undefined;
    }

    public processNode(node: Node | null): void {
        if (this.isValidNode(node)) {
            // TypeScript biết node là Node (không null)
            node.setPosition(0, 0, 0);
        }
    }

    // ✅ XUẤT SẮC: Type guard cho component
    private hasPlayerController(node: Node): node is Node & { getComponent(PlayerController): PlayerController } {
        return node.getComponent(PlayerController) !== null;
    }

    public updatePlayer(node: Node): void {
        if (this.hasPlayerController(node)) {
            // TypeScript biết component tồn tại
            const controller = node.getComponent(PlayerController)!;
            controller.update();
        }
    }
}

// ❌ TỆ: Không type guard, ép kiểu khắp nơi
public handleEntity(entity: Entity): void {
    if (entity.type === 'player') {
        console.log(`Player level: ${(entity as Player).level}`); // Ép kiểu
    } else {
        console.log(`Enemy damage: ${(entity as Enemy).damage}`); // Ép kiểu
    }
}
```

## Utility type

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

interface GameConfig {
    playerName: string;
    maxHealth: number;
    difficulty: string;
    soundEnabled: boolean;
}

@ccclass('ConfigManager')
export class ConfigManager extends Component {
    // ✅ XUẤT SẮC: Partial cho thuộc tính tùy chọn
    public updateConfig(updates: Partial<GameConfig>): void {
        // Mọi thuộc tính đều tùy chọn
    }

    // ✅ XUẤT SẮC: Required cho thuộc tính bắt buộc
    public validateConfig(config: Required<GameConfig>): void {
        // Mọi thuộc tính đều bắt buộc
    }

    // ✅ XUẤT SẮC: Readonly cho object bất biến
    private readonly defaultConfig: Readonly<GameConfig> = {
        playerName: 'Player',
        maxHealth: 100,
        difficulty: 'normal',
        soundEnabled: true,
    };

    // ✅ XUẤT SẮC: Pick để chọn thuộc tính
    public getDisplayInfo(config: GameConfig): Pick<GameConfig, 'playerName' | 'difficulty'> {
        return {
            playerName: config.playerName,
            difficulty: config.difficulty,
        };
    }

    // ✅ XUẤT SẮC: Omit để loại trừ thuộc tính
    public getPublicConfig(config: GameConfig): Omit<GameConfig, 'soundEnabled'> {
        const { soundEnabled, ...publicConfig } = config;
        return publicConfig;
    }

    // ✅ XUẤT SẮC: Record cho ánh xạ key-value
    private readonly difficultyMultipliers: Record<string, number> = {
        easy: 0.5,
        normal: 1.0,
        hard: 1.5,
        expert: 2.0,
    };

    // ✅ XUẤT SẮC: ReturnType cho kiểu trả về của hàm
    private createPlayer(): { name: string; level: number } {
        return { name: 'Player', level: 1 };
    }

    type PlayerType = ReturnType<typeof this.createPlayer>;
}
```

## Pattern async/await

```typescript
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('DataManager')
export class DataManager extends Component {
    // ✅ XUẤT SẮC: Async/await cho thao tác tuần tự
    public async loadGameData(): Promise<void> {
        try {
            const playerData = await this.fetchPlayerData();
            const levelData = await this.fetchLevelData(playerData.currentLevel);
            await this.initializeGame(playerData, levelData);
        } catch (error) {
            console.error('Failed to load game data:', error);
            throw error;
        }
    }

    // ✅ XUẤT SẮC: Promise.all cho thao tác song song
    public async loadAllData(): Promise<void> {
        try {
            const [playerData, configData, assetsData] = await Promise.all([
                this.fetchPlayerData(),
                this.fetchConfigData(),
                this.fetchAssetsData(),
            ]);

            this.initializeWithData(playerData, configData, assetsData);
        } catch (error) {
            console.error('Failed to load data:', error);
            throw error;
        }
    }

    // ✅ XUẤT SẮC: Promise.allSettled cho thất bại một phần
    public async loadDataWithFallback(): Promise<void> {
        const results = await Promise.allSettled([
            this.fetchPlayerData(),
            this.fetchConfigData(),
            this.fetchAssetsData(),
        ]);

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`Data ${index} loaded:`, result.value);
            } else {
                console.error(`Data ${index} failed:`, result.reason);
            }
        });
    }

    // ✅ XUẤT SẮC: Xử lý lỗi với async/await
    public async savePlayerData(data: PlayerData): Promise<boolean> {
        try {
            await this.validateData(data);
            await this.uploadData(data);
            return true;
        } catch (error) {
            if (error instanceof ValidationError) {
                console.error('Invalid data:', error.message);
            } else if (error instanceof NetworkError) {
                console.error('Network error:', error.message);
            } else {
                console.error('Unknown error:', error);
            }
            return false;
        }
    }

    private async fetchPlayerData(): Promise<PlayerData> {
        // Triển khai
    }

    private async fetchLevelData(level: number): Promise<LevelData> {
        // Triển khai
    }
}

// ❌ TỆ: Chuỗi Promise (callback hell)
public loadGameData(): void {
    this.fetchPlayerData()
        .then(playerData => {
            return this.fetchLevelData(playerData.currentLevel);
        })
        .then(levelData => {
            return this.initializeGame(playerData, levelData); // playerData không còn trong scope!
        })
        .catch(error => {
            console.error('Failed:', error);
        });
}
```

## Tóm tắt: Checklist TypeScript hiện đại

**Dùng các pattern này để mã gọn, dễ bảo trì hơn:**

- [ ] Phương thức mảng (map/filter/reduce) thay vì vòng lặp thủ công
- [ ] Arrow function cho callback và event handler
- [ ] Destructuring để xử lý tham số gọn hơn
- [ ] Toán tử spread cho thao tác object/mảng
- [ ] Optional chaining (?.) để truy cập thuộc tính an toàn
- [ ] Nullish coalescing (??) cho giá trị mặc định
- [ ] Type guard để thu hẹp kiểu an toàn
- [ ] Utility type (Partial, Required, Readonly, Pick, Omit, Record)
- [ ] Async/await cho thao tác bất đồng bộ
- [ ] Promise.all/allSettled cho thao tác song song

**TypeScript hiện đại giúp mã ngắn gọn, dễ đọc và an toàn kiểu hơn.**
