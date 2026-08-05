---
name: theone-cocos-standards
description: Áp dụng chuẩn phát triển Cocos Creator của TheOne Studio — pattern TypeScript, kiến trúc Component/EventDispatcher Cocos Creator 3.x, tối ưu playable ads. Dùng khi viết, sửa, review code TypeScript Cocos, triển khai playable, tối ưu performance/kích thước bundle, hoặc review thay đổi code.
---

# Chuẩn phát triển Cocos Creator — TheOne Studio

⚠️ **Cocos Creator 3.x (TypeScript 4.1+):** Mọi pattern và ví dụ tương thích phát triển playable ads trên Cocos Creator 3.x.

## Mục đích skill

Skill này áp dụng chuẩn phát triển Cocos Creator toàn diện của TheOne Studio với nguyên tắc **ƯU TIÊN CHẤT LƯỢNG CODE**:

**Ưu tiên 1: Chất lượng code & vệ sinh code** (QUAN TRỌNG NHẤT)
- TypeScript strict mode, cấu hình ESLint, access modifier (public/private/protected)
- Ném exception (không xử lý lỗi im lặng)
- `console.log` chỉ khi dev, xóa trước build production
- `readonly` cho field bất biến, `const` cho hằng số
- Không comment inline (dùng tên mô tả rõ)
- Xử lý lỗi đúng cách và type safety

**Ưu tiên 2: Pattern TypeScript hiện đại**
- Phương thức mảng (map/filter/reduce) thay vòng lặp thủ công
- Arrow function, destructuring, spread operator
- Optional chaining, nullish coalescing
- Type guard, utility type (Partial, Required, Readonly)
- Tính năng TypeScript hiện đại

**Ưu tiên 3: Kiến trúc Cocos Creator**
- Hệ Entity-Component (EC)
- Lifecycle: onLoad→start→onEnable→update→onDisable→onDestroy
- Pattern EventDispatcher cho custom event
- Hệ thống event Node (EventTouch, phím bàn phím)
- Quản lý tài nguyên và object pooling cho playable

**Ưu tiên 4: Performance playable ads**
- Gộp lệnh DrawCall (mục tiêu <10 DrawCall)
- Cấu hình Sprite atlas (bật auto-atlas)
- GPU skinning cho animation xương
- Không cấp phát bộ nhớ trong vòng `update()`
- Kích thước bundle <5MB (nén texture, minify code)

## Khi nào skill được kích hoạt

- Viết hoặc refactor code TypeScript Cocos Creator
- Triển khai tính năng playable ads
- Làm việc với lifecycle Component và event
- Tối ưu performance cho playable ads
- Review thay đổi code hoặc pull request
- Thiết lập kiến trúc dự án playable
- Giảm kích thước bundle hoặc số DrawCall

## Bảng tra cứu nhanh

### Bạn cần hỗ trợ gì?

| Ưu tiên | Nhiệm vụ | Tham chiếu |
|---------|----------|------------|
| **🔴 ƯU TIÊN 1: Chất lượng code (KIỂM TRA TRƯỚC)** | | |
| 1 | TypeScript strict mode, ESLint, access modifier | [Quality & Hygiene](references/language/quality-hygiene.md) ⭐ |
| 1 | Ném exception, xử lý lỗi đúng cách | [Quality & Hygiene](references/language/quality-hygiene.md) ⭐ |
| 1 | `console.log` (chỉ dev), xóa khi production | [Quality & Hygiene](references/language/quality-hygiene.md) ⭐ |
| 1 | readonly/const, không comment inline, tên mô tả | [Quality & Hygiene](references/language/quality-hygiene.md) ⭐ |
| **🟡 ƯU TIÊN 2: Pattern TypeScript hiện đại** | | |
| 2 | Phương thức mảng, arrow function, destructuring | [Modern TypeScript](references/language/modern-typescript.md) |
| 2 | Optional chaining, nullish coalescing | [Modern TypeScript](references/language/modern-typescript.md) |
| 2 | Type guard, utility type | [Modern TypeScript](references/language/modern-typescript.md) |
| **🟢 ƯU TIÊN 3: Kiến trúc Cocos** | | |
| 3 | Hệ Component, decorator `@property` | [Component System](references/framework/component-system.md) |
| 3 | Lifecycle (onLoad→start→update→onDestroy) | [Component System](references/framework/component-system.md) |
| 3 | EventDispatcher, event Node, cleanup | [Event Patterns](references/framework/event-patterns.md) |
| 3 | Load tài nguyên, pooling, quản lý bộ nhớ | [Playable Optimization](references/framework/playable-optimization.md) |
| **🔵 ƯU TIÊN 4: Performance & Review** | | |
| 4 | Gộp lệnh DrawCall, Sprite atlas, GPU skinning | [Playable Optimization](references/framework/playable-optimization.md) |
| 4 | Tối ưu vòng update, không cấp phát bộ nhớ | [Performance](references/language/performance.md) |
| 4 | Giảm kích thước bundle (mục tiêu <5MB) | [Size Optimization](references/framework/size-optimization.md) |
| 4 | Review kiến trúc (component, lifecycle, event) | [Architecture Review](references/review/architecture-review.md) |
| 4 | Review chất lượng TypeScript | [Quality Review](references/review/quality-review.md) |
| 4 | Review performance (DrawCall, cấp phát bộ nhớ) | [Performance Review](references/review/performance-review.md) |

## 🔴 QUAN TRỌNG: Quy tắc chất lượng code (KIỂM TRA TRƯỚC!)

### ⚠️ CHUẨN CHẤT LƯỢNG BẮT BUỘC

**LUÔN áp dụng các quy tắc sau TRƯỚC KHI viết bất kỳ code nào:**

1. **Bật TypeScript strict mode** — `"strict": true` trong `tsconfig.json`
2. **Dùng cấu hình ESLint** — bật rule `@typescript-eslint`
3. **Dùng access modifier** — public/private/protected trên mọi member
4. **Ném exception khi lỗi** — KHÔNG im lặng, KHÔNG trả `undefined` thay lỗi
5. **`console.log` chỉ khi dev** — Xóa mọi `console` trước build production
6. **Dùng `readonly` cho field bất biến** — Đánh dấu field không gán lại
7. **Dùng `const` cho hằng số** — Hằng số phải là `const`, không phải `let`
8. **Không comment inline** — Dùng tên mô tả; code tự giải thích
9. **Xử lý null/undefined đúng cách** — Dùng optional chaining và nullish coalescing
10. **Type safety** — Tránh type `any`, dùng type và interface phù hợp

**Ví dụ code:** xem file reference trong Bảng tra cứu nhanh (ví dụ chất lượng → `quality-hygiene.md`, lifecycle → `component-system.md`, event → `event-patterns.md`).

## ⚠️ Quy tắc kiến trúc Cocos Creator (SAU chất lượng code)

### Cơ bản hệ Component

**Hệ Entity-Component (EC):**
- Component kế thừa class `Component`
- Dùng decorator `@ccclass` và `@property`
- Lifecycle: onLoad → start → onEnable → update → lateUpdate → onDisable → onDestroy

**Thứ tự thực thi:**
1. **onLoad()** — Khởi tạo Component, setup một lần
2. **start()** — Sau khi mọi Component đã onLoad, có thể tham chiếu Component khác
3. **onEnable()** — Khi Component/node được bật (có thể gọi nhiều lần)
4. **update(dt)** — Mỗi frame (dùng tiết kiệm với playable)
5. **lateUpdate(dt)** — Sau tất cả lệnh gọi `update()`
6. **onDisable()** — Khi Component/node bị tắt
7. **onDestroy()** — Cleanup, gỡ listener, giải phóng tài nguyên

**Quy tắc chung:**
- ✅ Khởi tạo trong `onLoad()`, tham chiếu Component khác trong `start()`
- ✅ Đăng ký event trong `onEnable()`, hủy trong `onDisable()`
- ✅ Luôn cleanup listener trong `onDestroy()`
- ✅ Tránh logic nặng trong `update()` (quan trọng với performance playable)
- ✅ Dùng `readonly` cho field `@property` không gán lại
- ✅ Ném exception khi thiếu reference bắt buộc

## Checklist review code

### Kiểm tra nhanh (trước khi commit)

**🔴 Chất lượng code (KIỂM TRA TRƯỚC):**
- [ ] TypeScript strict mode bật trong `tsconfig.json`
- [ ] ESLint pass (không lỗi)
- [ ] Access modifier đúng (public/private/protected)
- [ ] Ném exception khi lỗi (không im lặng)
- [ ] `console.log` đã xóa hoặc bọc `CC_DEBUG`
- [ ] `readonly` dùng cho field không gán lại
- [ ] `const` dùng cho hằng số
- [ ] Không comment inline (code tự giải thích)
- [ ] Xử lý null/undefined đúng cách
- [ ] Không dùng type `any` (dùng type phù hợp)

**🟡 Pattern TypeScript hiện đại:**
- [ ] Dùng phương thức mảng thay vòng lặp thủ công
- [ ] Arrow function cho callback
- [ ] Optional chaining (`?.`) truy cập property an toàn
- [ ] Nullish coalescing (`??`) cho giá trị mặc định
- [ ] Destructuring cho code gọn hơn
- [ ] Type guard thu hẹp type

**🟢 Kiến trúc Cocos Creator:**
- [ ] Lifecycle Component đúng thứ tự
- [ ] `onLoad()` khởi tạo, `start()` tham chiếu
- [ ] Event listener đăng ký trong `onEnable()`
- [ ] Event listener hủy trong `onDisable()`
- [ ] Tài nguyên giải phóng trong `onDestroy()`
- [ ] Decorator `@property` dùng đúng
- [ ] Reference bắt buộc đã validate (throw nếu null)

**🔵 Performance playable:**
- [ ] Không cấp phát bộ nhớ trong vòng `update()`
- [ ] Sprite atlas dùng để gộp lệnh DrawCall
- [ ] GPU skinning bật cho animation xương
- [ ] Thao tác nặng được throttle (không chạy mỗi frame)
- [ ] Object pooling cho object tạo thường xuyên
- [ ] Nén texture đã bật
- [ ] Kích thước bundle mục tiêu <5MB
- [ ] Số DrawCall mục tiêu <10

## Lỗi thường gặp cần tránh

### ❌ KHÔNG NÊN:
1. **Bỏ qua TypeScript strict mode** → Bật `"strict": true`
2. **Xử lý lỗi im lặng** → Ném exception khi lỗi
3. **Để `console.log` trong production** → Xóa hoặc bọc `CC_DEBUG`
4. **Bỏ access modifier** → Dùng public/private/protected
5. **Dùng type `any`** → Định nghĩa type và interface phù hợp
6. **Thêm comment inline** → Dùng tên mô tả thay thế
7. **Bỏ cleanup event** → Luôn hủy trong `onDisable`/`onDestroy`
8. **Cấp phát trong `update()`** → Cấp phát trước và tái sử dụng object
9. **Quên Sprite atlas** → Dùng atlas để gộp lệnh DrawCall
10. **Logic nặng trong `update()`** → Throttle thao tác tốn kém
11. **Bỏ kiểm tra null** → Validate reference bắt buộc trong `onLoad`
12. **Field `@property` mutable** → Dùng `readonly` khi phù hợp
13. **Vòng lặp thủ công trên mảng** → Dùng map/filter/reduce
14. **Bỏ qua kích thước bundle** → Theo dõi và tối ưu (mục tiêu <5MB)

### ✅ NÊN:
1. **Bật TypeScript strict mode** (`"strict": true`)
2. **Ném exception khi lỗi** (không im lặng)
3. **Dùng `console.log` chỉ khi dev** (xóa khi production)
4. **Dùng access modifier** (public/private/protected)
5. **Định nghĩa type phù hợp** (tránh `any`)
6. **Dùng tên mô tả** (không comment inline)
7. **Luôn cleanup event** (`onDisable`/`onDestroy`)
8. **Cấp phát trước object** (tái sử dụng trong `update()`)
9. **Dùng Sprite atlas** (gộp lệnh DrawCall)
10. **Throttle thao tác nặng** (không chạy mỗi frame)
11. **Validate reference bắt buộc** (throw trong `onLoad` nếu null)
12. **Dùng `readonly` cho `@property`** (khi phù hợp)
13. **Dùng phương thức mảng** (map/filter/reduce)
14. **Theo dõi kích thước bundle** (mục tiêu <5MB cho playable)

## Mức độ nghiêm trọng khi review

### 🔴 Nghiêm trọng (Bắt buộc sửa)
- **TypeScript strict mode tắt** — Phải bật `"strict": true`
- **Xử lý lỗi im lặng** — Phải ném exception khi lỗi
- **`console.log` trong code production** — Xóa hoặc bọc `CC_DEBUG`
- **Thiếu access modifier** — Mọi member phải có modifier
- **Dùng type `any` không có lý do** — Định nghĩa type phù hợp
- **Comment inline thay tên mô tả** — Đổi tên và xóa comment
- **Event listener không cleanup** — Rò rỉ bộ nhớ, phải hủy đăng ký
- **Thiếu validate reference bắt buộc** — Phải throw trong `onLoad` nếu null
- **Cấp phát bộ nhớ trong vòng `update()`** — Quan trọng với performance, phải cấp phát trước
- **Không dùng Sprite atlas cho nhiều sprite** — DrawCall tăng vọt, phải dùng atlas
- **Kích thước bundle >5MB** — Vượt giới hạn playable, phải tối ưu

### 🟡 Quan trọng (Nên sửa)
- **Thiếu `readonly` trên field `@property`** — Nên dùng `readonly` khi không gán lại
- **Thiếu `const` cho hằng số** — Nên dùng `const` thay `let`
- **Vòng lặp thủ công thay phương thức mảng** — Nên dùng map/filter/reduce
- **Thiếu optional chaining** — Nên dùng `?.` truy cập an toàn
- **Thiếu nullish coalescing** — Nên dùng `??` cho giá trị mặc định
- **Logic nặng trong `update()`** — Nên throttle thao tác tốn kém
- **Không object pooling cho cấp phát thường xuyên** — Nên triển khai pooling
- **Chưa bật nén texture** — Nên bật để giảm bundle
- **Số DrawCall >10** — Nên tối ưu gộp lệnh

### 🟢 Gợi ý (Tùy chọn)
- Có thể dùng arrow function cho callback
- Có thể destructuring cho code gọn hơn
- Có thể dùng type guard cho type safety
- Có thể cải thiện tên cho rõ ràng hơn
- Có thể thêm interface cho typing tốt hơn
- Có thể tối ưu thuật toán cho performance tốt hơn

## Tham chiếu chi tiết

### Chuẩn ngôn ngữ TypeScript
- [Quality & Hygiene](references/language/quality-hygiene.md) — Strict mode, ESLint, access modifier, xử lý lỗi
- [Modern TypeScript](references/language/modern-typescript.md) — Phương thức mảng, optional chaining, type guard, utility type
- [Performance](references/language/performance.md) — Tối ưu vòng update, không cấp phát bộ nhớ, caching

### Framework Cocos Creator
- [Component System](references/framework/component-system.md) — Hệ EC, lifecycle, decorator `@property`
- [Event Patterns](references/framework/event-patterns.md) — EventDispatcher, event Node, cleanup subscription
- [Playable Optimization](references/framework/playable-optimization.md) — Gộp lệnh DrawCall, Sprite atlas, GPU skinning, object pooling
- [Size Optimization](references/framework/size-optimization.md) — Giảm kích thước bundle, nén texture, tối ưu build

### Review code
- [Architecture Review](references/review/architecture-review.md) — Vi phạm Component, lỗi lifecycle, rò rỉ event
- [Quality Review](references/review/quality-review.md) — Vấn đề chất lượng TypeScript, access modifier, xử lý lỗi
- [Performance Review](references/review/performance-review.md) — Vấn đề performance playable, DrawCall, cấp phát bộ nhớ

## Tóm tắt

Skill này cung cấp chuẩn phát triển Cocos Creator toàn diện cho team playable ads của TheOne Studio:
- **TypeScript xuất sắc**: Strict mode, pattern hiện đại, type safety
- **Kiến trúc Cocos**: Lifecycle Component, pattern event, quản lý tài nguyên
- **Performance playable**: Gộp lệnh DrawCall, GPU skinning, bundle <5MB
- **Chất lượng code**: Quy tắc chất lượng, vệ sinh code và performance được áp dụng nghiêm

Dùng Bảng tra cứu nhanh phía trên để điều hướng tới pattern cụ thể bạn cần.
