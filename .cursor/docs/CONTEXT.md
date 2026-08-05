# CONTEXT — Shared domain language

Ngôn ngữ chung giữa team và Agent. Dùng thuật ngữ trong spec, tên biến/class, và chat — **tránh mô tả dài**.

> Điền khi khởi tạo project. Thêm mục mới khi `/new-feature` hoặc ADR giới thiệu khái niệm mới.

## Glossary

| Thuật ngữ | Định nghĩa ngắn | Ghi chú |
|-----------|-----------------|---------|
| *Ví dụ: session* | Một lượt chơi từ start đến end | Không nhầm với HTTP session |
| *Ví dụ: entity* | Node gameplay có component logic | Không nhầm với Cocos Entity (nếu dùng) |
| | | |

## Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| Component | PascalCase, mô tả vai trò | `InventoryController` |
| Event (custom) | UPPER_SNAKE trong `*Events.ts` | `ITEM_ADDED` |
| State enum | PascalCase + suffix rõ nghĩa | `PlayState.Playing` |

## Module aliases (tuỳ chọn)

| Tên ngắn | Module / thư mục |
|----------|------------------|
| | |

## Không dùng / tránh nhầm

| Tránh | Dùng thay |
|-------|-----------|
| Tên chung `Manager`, `Handler` không context | Tên theo domain (`AudioDirector`, `SaveCoordinator`) |
| | |

---

*Cập nhật lần cuối: [ngày] · Project: [tên project]*
