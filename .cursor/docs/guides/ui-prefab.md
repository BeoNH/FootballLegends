# Hướng dẫn — UI Prefab (Human / Editor)

Agent **không** tạo/sửa prefab. Checklist này dành cho Human sau khi Agent giao TS + spec.

## Trước khi tạo prefab

- [ ] Đọc spec Fxxx mục **Human (Editor)**
- [ ] Component TS đã có `@ccclass` và `@property` (tooltip rõ)
- [ ] Ghi prefab vào `.cursor/docs/02-SCENES.md`

## Tạo prefab

1. Dựng node tree trong scene tạm hoặc scene chính
2. Gắn component script từ `assets/scripts/`
3. **Save as Prefab** → `assets/prefabs/[Category]/Tên.prefab`
4. Đặt tên node theo convention project (PascalCase hoặc theo GDD)

## Wire Inspector

| Bước | Việc |
|------|------|
| 1 | Kéo Node/Component vào từng `@property` theo bảng spec |
| 2 | Kiểm tra `type` đúng (Node, Label, Sprite, enum…) |
| 3 | Save prefab + scene |

## UI checklist

- [ ] Anchor / Widget phù hợp resolution mục tiêu
- [ ] Không reference scene-only node trong prefab reusable
- [ ] Button có target graphic + transition (nếu cần)
- [ ] Play mode: không lỗi null `@property`

## Sau khi xong

- Tick checklist spec Fxxx (Human)
- Cập nhật `.cursor/docs/02-SCENES.md` bảng wire
- Play mode → `/checklist-done` khi OK
