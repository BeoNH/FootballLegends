# Workflow — Template Cocos Creator

Luồng chuẩn khi phát triển tính năng trên template này.

## Tổng quan

```
/new-feature → Plan(Claude) → Build(Composer) → Review(Codex)
                      → Human (Editor + Play) → /checklist-done
                      → (nếu bug) Debug(Codex) → Human Play lại
```

| Vai trò | Trách nhiệm |
|---------|-------------|
| **Claude (Plan)** | Spec, grill, chia task, ADR, điều hướng |
| **Composer (Build)** | TypeScript + sync docs theo plan |
| **Codex (Review / Debug)** | Review diff; debug **chỉ khi Human báo bug** |
| **Human** | Wire Editor; Play mode test; `/checklist-done` |

Chi tiết: `.cursor/rules/multi-model-pipeline.mdc` · skill `game-dev-pipeline`.  
Ranh giới Editor: `.cursor/rules/agent-boundary.mdc`.

---

## 1. Khởi tạo feature — Plan (Claude)

1. Chạy `/new-feature` (hoặc copy `.cursor/docs/features/_template.md` thủ công).
2. Làm rõ acceptance — **không** `[TBD]` trước khi code.
3. Feature lớn: skill `cocos-feature-planning`.
4. Mỗi task Agent ghi cách **Human** verify (Play mode).
5. Handoff Build — chưa implement trừ user yêu cầu.

## 2. Implement — Build (Composer)

1. Đọc handoff + spec + architecture/modules/CONTEXT.
2. Chỉ sửa `assets/scripts/**/*.ts`; `theone-cocos-standards`.
3. `@property` + tooltip; validate `onLoad()`.
4. Sync `01-MODULES`, `02-SCENES`, `04-CHANGELOG`; spec giữ `in-progress`.
5. Handoff Review code + checklist Play cho Human.

## 3. Review code (Codex)

1. Đối chiếu plan vs diff.
2. Không bắt buộc chạy Play/gameplay qua MCP.
3. Critical → Build; còn lại → handoff Human.

## 4. Editor + Play (Human)

- Wire scene/prefab theo spec / `guides/`
- Play mode theo checklist acceptance
- Bug → báo Codex Debug; OK → `/checklist-done Fxxx`

## 5. Verify — phân lớp

| Lớp | Ai | Công cụ |
|-----|-----|---------|
| Review code / diagnostics tĩnh | Agent (Codex) | Diff, (tuỳ chọn) MCP diagnostics |
| Play / gameplay acceptance | Human | Play mode Editor |
| Debug theo bug report | Agent (Codex) | Code + mô tả Human |
| Logic thuần `utils/` | Agent (tuỳ test runner) | Unit test nếu có |

## 6. `/checklist-done`

Khi Human đã Play OK:

```
/checklist-done F001
```

Script `npm run review:done` cập nhật spec → `done`, `02-SCENES`, changelog review.

---

## Debug

Chỉ khi Human báo. Rule `cocos-debugging.mdc`: reproduce theo mô tả Human → một giả thuyết → một thay đổi. Fix lớn → Composer.

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
