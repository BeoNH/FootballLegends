# Workflow — Template Cocos Creator

Luồng chuẩn khi phát triển tính năng trên template này.

## Tổng quan

```
/new-feature Fxxx  →  spec Fxxx  →  Agent: TS + docs  →  Human: Editor + Play  →  /checklist-done
```

| Vai trò | Trách nhiệm |
|---------|-------------|
| **Agent** | TypeScript, cập nhật docs (spec, module, architecture, changelog) |
| **Human** | Scene, prefab, wire Inspector, Play mode test |

Ranh giới chi tiết: `.cursor/rules/agent-boundary.mdc`.

---

## 1. Khởi tạo feature

1. Chạy `/new-feature` (hoặc copy `.cursor/docs/features/_template.md` thủ công).
2. Làm rõ acceptance criteria — **không** `[TBD]` trước khi code.
3. Feature lớn: dùng skill `cocos-feature-planning` để chia task Agent/Human.
4. Thuật ngữ mới → `.cursor/docs/CONTEXT.md`; quyết định kiến trúc → `.cursor/docs/adr/`.

## 2. Implement (Agent)

1. Đọc spec Fxxx, `.cursor/docs/03-ARCHITECTURE.md`, `.cursor/docs/01-MODULES.md`, `.cursor/docs/CONTEXT.md`.
2. Chỉ sửa `assets/scripts/**/*.ts` (rule `agent-boundary`).
3. Khai báo `@property` + tooltip; validate `onLoad()`.
4. Cập nhật docs:
   - `.cursor/docs/01-MODULES.md`
   - `.cursor/docs/02-SCENES.md` (checklist Human)
   - `.cursor/docs/04-CHANGELOG.md`
   - Spec — tick plan Agent, **giữ** trạng thái `in-progress`.

## 3. Editor (Human)

Theo spec mục **Human (Editor)** và `.cursor/docs/guides/`:

- Tạo/sửa scene, prefab, node
- Wire `@property` trong Inspector
- Collider, sprite, animation clip

## 4. Verify

### Play mode (Component / gameplay)

- Human chạy Play mode theo checklist trong spec.
- Agent **không** kết luận "xong" trước bước này.

### Logic thuần (`utils/`)

- Có thể dùng unit test nếu project đã setup test runner.
- Không bắt buộc cho mọi feature template.

## 5. Lệnh xác nhận review — `/checklist-done`

Khi Human đã Play mode OK:

```
/checklist-done F001
```

Script `npm run review:done`:

- Spec → `done`, tick acceptance + plan Human
- `.cursor/docs/02-SCENES.md` — tick checklist liên quan
- `.cursor/docs/04-CHANGELOG.md` — dòng review

---

## Debug

Áp dụng rule `cocos-debugging.mdc`: reproduce Play mode → một giả thuyết → một thay đổi.

---

## File docs tham chiếu

| File | Mục đích |
|------|----------|
| `00-GDD.md` | Game design document |
| `01-MODULES.md` | Bản đồ module / script |
| `02-SCENES.md` | Scene, prefab, wire script |
| `03-ARCHITECTURE.md` | Event, state, pattern |
| `04-CHANGELOG.md` | Lịch sử thay đổi |
| `CONTEXT.md` | Glossary thuật ngữ domain |
| `adr/` | Architecture Decision Records |
| `features/` | Spec từng tính năng |
| `guides/` | Hướng dẫn Human (Editor) |

---

## Khởi tạo project mới từ template

1. Clone template
2. Điền `.cursor/docs/00-GDD.md`, `.cursor/docs/CONTEXT.md`
3. Tạo scene chính trong Editor; ghi vào `.cursor/docs/02-SCENES.md`
4. Bắt đầu feature đầu tiên với `/new-feature F001`
