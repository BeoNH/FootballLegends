---
name: cocos-feature-planning
description: Chia plan chi tiết cho feature lớn Cocos — task Agent vs Human, dùng trước khi implement multi-session. Phase Plan trong pipeline Claude → Composer → Codex.
---

# Plan feature lớn (Cocos)

Dùng khi feature **>1 session agent** hoặc chạm nhiều module/scene.

**Model:** Claude (phase Plan). Sau khi chốt plan → handoff Composer theo skill `game-dev-pipeline`. Mỗi task Agent ghi verify **Human Play**. Không implement hàng loạt tại đây.

Không thay `docs-workflow.mdc` — bổ sung bước plan trước implement.

## Khi nào kích hoạt

- Hệ thống mới (save, network, inventory, matchmaking…)
- Nhiều component + prefab mới
- User gọi `/new-feature` và mô tả phạm vi lớn

## Output

Bổ sung vào `.cursor/docs/features/Fxxx-*.md`:

### Plan Agent (TypeScript)

Task nhỏ, có thể hoàn thành trong một lượt chat:

```markdown
- [ ] T001 — Mô tả · file: `assets/scripts/...` · verify: ...
- [ ] T002 — ...
```

Mỗi task:

- Đường dẫn file cụ thể
- Phụ thuộc task trước (nếu có)
- Cách verify (Play mode bước nào / util test nếu logic thuần)

### Plan Human (Editor)

```markdown
- [ ] H001 — Scene/Prefab: ... · wire: `@property` ...
- [ ] H002 — Play mode: ...
```

### Thứ tự đề xuất

1. Util / types / events (logic thuần, không scene)
2. Component TS + `@property` khai báo
3. Human wire scene/prefab
4. Play mode tích hợp
5. `/checklist-done`

## Nguyên tắc

- **YAGNI** — không task phòng hờ
- **Một task = một mục tiêu verify được**
- Tách rõ task Agent vs Human — Agent không gộp bước Editor
- Logic thuần trong `utils/` có thể ghi verify bằng script/test; Component verify Play mode

## TDD (có chọn lọc)

- `assets/scripts/utils/**` logic thuần: có thể red-green nếu project có test runner
- `@ccclass` component: verify Play mode, không ép unit test component

Chi tiết: `.cursor/docs/WORKFLOW.md`.
