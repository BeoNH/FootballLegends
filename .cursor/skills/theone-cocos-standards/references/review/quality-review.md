# Review Chất lượng TypeScript

Review này tập trung vào các vấn đề chất lượng code TypeScript, bao gồm access modifier, tuân thủ strict mode, xử lý lỗi và code hygiene.

## Vi phạm TypeScript Strict Mode

```typescript
// ❌ NGHIÊM TRỌNG: Strict mode bị tắt
// tsconfig.json
{
    "compilerOptions": {
        "strict": false // Tệ!
    }
}

// ✅ ĐÚNG: Bật strict mode
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Cách sửa: Bật strict mode trong tsconfig.json
```

## Vi phạm Access Modifier

```typescript
// ❌ NGHIÊM TRỌNG: Thiếu access modifier
@ccclass('NoModifiers')
export class NoModifiers extends Component {
    playerNode: Node | null = null; // Ngầm public!
    currentHealth: number = 100;    // Ngầm public!

    updateHealth(value: number) {   // Ngầm public!
        this.currentHealth = value;
    }
}

// ✅ ĐÚNG: Modifier rõ ràng
@ccclass('WithModifiers')
export class WithModifiers extends Component {
    @property(Node)
    private readonly playerNode: Node | null = null;

    private currentHealth: number = 100;

    public updateHealth(value: number): void {
        this.currentHealth = value;
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Cách sửa: Thêm access modifier (public/private/protected) cho tất cả member
```

## Xử lý lỗi im lặng

```typescript
// ❌ NGHIÊM TRỌNG: Lỗi im lặng
@ccclass('SilentErrors')
export class SilentErrors extends Component {
    public getPlayer(id: string): Player | undefined {
        const player = this.players.get(id);
        return player; // Caller không biết vì sao thất bại
    }
}

// ✅ ĐÚNG: Throw exception
@ccclass('ThrowExceptions')
export class ThrowExceptions extends Component {
    public getPlayer(id: string): Player {
        const player = this.players.get(id);
        if (!player) {
            throw new Error(`Player not found: ${id}`);
        }
        return player;
    }
}

// Mức độ: 🔴 Nghiêm trọng
// Cách sửa: Throw exception khi lỗi, không im lặng thất bại
```

## console.log trong Production

```typescript
// ❌ NGHIÊM TRỌNG: console.log không điều kiện
@ccclass('ConsoleLogBad')
export class ConsoleLogBad extends Component {
    protected update(dt: number): void {
        console.log('Update'); // Trong production build!
    }
}

// ✅ ĐÚNG: Có điều kiện hoặc đã xóa
@ccclass('ConsoleLogGood')
export class ConsoleLogGood extends Component {
    protected update(dt: number): void {
        if (CC_DEBUG) {
            console.log('Update');
        }
    }
}

// Mức độ: 🔴 Nghiêm trọng (cho playable)
// Tác động: Tăng kích thước bundle, performance
// Cách sửa: Bọc trong CC_DEBUG hoặc xóa hoàn toàn
```

## Comment inline thay vì tên mô tả

```typescript
// ❌ QUAN TRỌNG: Comment giải thích code không rõ
@ccclass('InlineCommentsBad')
export class InlineCommentsBad extends Component {
    private h: number = 100; // health

    public td(a: number): void { // take damage
        this.h = this.h - a; // subtract
        if (this.h <= 0) { // dead
            this.hd(); // handle death
        }
    }
}

// ✅ ĐÚNG: Tên tự giải thích
@ccclass('InlineCommentsGood')
export class InlineCommentsGood extends Component {
    private currentHealth: number = 100;

    public takeDamage(amount: number): void {
        this.currentHealth -= amount;
        if (this.isDead()) {
            this.handleDeath();
        }
    }

    private isDead(): boolean {
        return this.currentHealth <= 0;
    }

    private handleDeath(): void {
        // Triển khai
    }
}

// Mức độ: 🟡 Quan trọng
// Cách sửa: Dùng tên mô tả, xóa comment inline
```

## Thiếu readonly/const

```typescript
// ❌ QUAN TRỌNG: Mutable khi nên immutable
@ccclass('MissingReadonly')
export class MissingReadonly extends Component {
    @property(Node)
    private targetNode: Node | null = null; // Nên là readonly

    private maxHealth: number = 100; // Nên là static readonly
}

// ✅ ĐÚNG: Dùng readonly/const
@ccclass('WithReadonly')
export class WithReadonly extends Component {
    @property(Node)
    private readonly targetNode: Node | null = null;

    private static readonly MAX_HEALTH: number = 100;
}

// Mức độ: 🟡 Quan trọng
// Cách sửa: Thêm readonly cho field không gán lại, dùng static readonly cho hằng số
```

## Dùng kiểu `any`

```typescript
// ❌ QUAN TRỌNG: Dùng any không có lý do
@ccclass('UsingAny')
export class UsingAny extends Component {
    private data: any = {}; // Mất type safety

    public processData(input: any): any {
        return input; // Không kiểm tra kiểu
    }
}

// ✅ ĐÚNG: Dùng kiểu đúng
interface PlayerData {
    id: string;
    name: string;
    level: number;
}

@ccclass('WithTypes')
export class WithTypes extends Component {
    private data: Map<string, PlayerData> = new Map();

    public processData(input: PlayerData): PlayerData {
        return input;
    }
}

// Mức độ: 🟡 Quan trọng
// Cách sửa: Định nghĩa kiểu và interface đúng, tránh `any`
```

## Tóm tắt: Checklist Review Chất lượng

**🔴 Nghiêm trọng (Bắt buộc sửa):**
- [ ] TypeScript strict mode được bật trong tsconfig.json
- [ ] Tất cả member có access modifier (public/private/protected)
- [ ] Exception được throw khi lỗi (không im lặng thất bại)
- [ ] console.log đã xóa hoặc bọc trong CC_DEBUG
- [ ] Không có cảnh báo nullable (xử lý null đúng cách)

**🟡 Quan trọng (Nên sửa):**
- [ ] readonly được dùng cho field không gán lại
- [ ] const được dùng cho hằng số (không dùng let)
- [ ] Không có comment inline (code tự giải thích)
- [ ] Optional chaining (?.) cho truy cập an toàn
- [ ] Nullish coalescing (??) cho giá trị mặc định
- [ ] Không dùng kiểu `any` không có lý do

**🟢 Gợi ý:**
- [ ] Arrow function cho callback
- [ ] Destructuring cho code gọn hơn
- [ ] Type guard cho type safety
- [ ] Utility types (Partial, Required, v.v.)

**Chất lượng code là nền tảng — sửa các vấn đề này trước khi tối ưu performance.**

---

## Review spec & phản hồi (trước khi merge / `/checklist-done`)

Gộp checklist từ quy trình code-review — áp dụng khi review diff hoặc nhận feedback.

### Trục Standards (code)

- [ ] Khớp `cocos-typescript.mdc` và quality checklist phía trên
- [ ] Khớp `agent-boundary` — không sửa scene/prefab/asset Editor
- [ ] `@property` có tooltip; validate `onLoad()` cho ref bắt buộc
- [ ] Event đăng ký/hủy đúng lifecycle

### Trục Spec (feature Fxxx)

- [ ] Diff implement đúng acceptance criteria trong spec
- [ ] Không scope creep (YAGNI)
- [ ] Docs sync: `01-MODULES`, `02-SCENES`, `04-CHANGELOG`, spec plan Agent

### Nhận phản hồi review

1. Đọc hết feedback trước khi sửa
2. Sửa theo mức độ (blocker → should → nit)
3. Hỏi lại nếu feedback mâu thuẫn spec Fxxx
4. Human Play mode lại trước `/checklist-done`
