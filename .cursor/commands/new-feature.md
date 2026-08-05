---
name: new-feature
description: Tạo spec feature Fxxx — hỏi làm rõ trước khi code (grill + brainstorming)
---

Tạo hoặc làm rõ spec feature mới. **Không viết code** trong bước này trừ khi user yêu cầu.

## Input

User cung cấp (hoặc hỏi nếu thiếu):

- Mã feature: `Fxxx` (vd. F001)
- Mô tả ngắn tính năng
- (Tuỳ chọn) Phạm vi: logic thuần / component / UI / hệ thống lớn

## Quy trình

### 1. Grill — làm rõ yêu cầu

Hỏi đến khi không còn `[TBD]` quan trọng:

- Mục tiêu người chơi / hành vi hệ thống?
- Input/output (event, state, API)?
- Edge case (null ref, pause, scene chuyển)?
- Phần nào **Agent (TS)** vs **Human (Editor)**?

Feature lớn (>1 session): đọc skill `cocos-feature-planning` trước khi chốt spec.

### 2. Domain language

Thuật ngữ mới → thêm vào `.cursor/docs/CONTEXT.md` (bảng glossary).
Quyết định kiến trúc quan trọng → tạo ADR trong `.cursor/docs/adr/` từ `.cursor/docs/adr/_template.md`.

### 3. Tạo spec

1. Copy `.cursor/docs/features/_template.md` → `.cursor/docs/features/Fxxx-<slug>.md`
2. Điền: acceptance criteria, phân công Agent/Human, plan, `@property` cần wire
3. Trạng thái: `draft` hoặc `in-progress` (chỉ `in-progress` khi sẵn sàng implement)

### 4. Sync docs liên quan (nếu cần)

- `.cursor/docs/01-MODULES.md` — module mới hoặc ghi chú planned
- `.cursor/docs/03-ARCHITECTURE.md` — pattern/event mới (nếu có)

### 5. Kết thúc

Báo user:

- Đường dẫn spec
- Checklist Human (Editor) nếu có
- Bước tiếp: Agent implement khi user xác nhận spec OK
