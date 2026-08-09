---
name: game-dev-pipeline
description: >-
  Quy trình phát triển game khép kín đa model — Claude plan, Composer build,
  Codex review code; debug chỉ khi Human báo bug. Dùng khi bắt đầu feature,
  chuyển phase, handoff, hoặc user nhắc pipeline / multi-model / Claude
  Composer Codex.
---

# Game dev pipeline (Claude → Composer → Codex → Human)

Bổ sung `docs-workflow` và rule `multi-model-pipeline`.

**Thứ tự:** Plan → Build → Review code → Human Play. Agent **không** tự chạy thử gameplay.

## Phase gate

| Phase | Đủ điều kiện vào | Output trước khi ra |
|-------|------------------|---------------------|
| **Plan** | User mô tả / `/new-feature` | Spec sạch `[TBD]`; task `T00x`/`H00x`; acceptance |
| **Build** | Spec `in-progress` + plan chốt | Diff TS + docs; checklist Play **cho Human** |
| **Review** | Có diff | Findings code (Critical → Build); handoff Human |
| **Human** | Review xong (hoặc Build xong nếu user bỏ Review) | Editor + Play; `/checklist-done` |
| **Debug** | Human báo bug + bước reproduce (hoặc mô tả rõ) | Fix tối thiểu / trả Build; không tự Play thay Human |
| **Done** | User `/checklist-done` | Script `review:done` |

## 1. Plan — Claude

1. Đọc `00-GDD`, `CONTEXT`, `03-ARCHITECTURE`, spec Fxxx.
2. Grill `/new-feature`; lớn → `cocos-feature-planning`.
3. Mỗi `T00x`: verify bằng **Human Play** (hoặc review code). Không ghi assert “Agent Play MCP”.
4. Handoff Build:

```markdown
## Handoff → Build (Composer)
- Spec: `.cursor/docs/features/Fxxx-*.md`
- Task Agent: T001 → …
- Cấm: sửa .scene/.prefab
- Xong: sync docs + checklist Play cho Human
```

## 2. Build — Composer

1. `theone-cocos-standards` khi viết TS.
2. Diff nhỏ theo plan; `@property` + `onLoad` validate.
3. Sync docs (`docs-workflow`).
4. Handoff Review (code) — liệt kê Play mode **Human** cần test.

```markdown
## Handoff → Review (Codex)
- Task đã làm / file đổi: …
- Rủi ro cần soi trên diff: …
- Play mode chờ Human: …
```

## 3. Review — Codex (code only)

- Đối chiếu plan vs diff; lifecycle/event; boundary; chuẩn TS.
- Tuỳ chọn: `run_script_diagnostics` / đọc log tĩnh — **không** chạy Play/assert gameplay.
- Critical → trả Build. Suggestion → ghi chú hoặc fix tối thiểu nếu user đồng ý.
- Xong → handoff Human.

```markdown
## Handoff → Human
- Review: tóm tắt findings
- Việc Editor: H00x …
- Play mode (acceptance): …
- Xong → /checklist-done Fxxx
- Bug khi chơi → báo lại để Codex Debug
```

## 4. Debug — Codex (chỉ khi Human báo)

1. Thu thập bước reproduce từ Human (`cocos-debugging.mdc`).
2. Soi code / diff / diagnostics; fix nguồn gốc tối thiểu.
3. Human Play lại xác nhận — Agent không tự kết luận PASS gameplay.

## Điều hướng model

- Plan/spec → **Claude**
- Implement → **Composer**
- Review code / debug theo bug report → **Codex**

## Anti-pattern

- Tự bật Preview/Play MCP để “chạy thử game” trước Human
- Đòi Agent Play PASS mới cho Human test
- Tự `/checklist-done` / đánh spec `done`
- Sửa `.scene`/`.prefab` trừ user cho phép
