# F006 — Bot AI (port AIController2)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `planned` |
| Module | gameplay |
| Ngày tạo | 2026-10-23 |
| Phụ thuộc | F003, F005 |

## Mô tả

Bot đối thủ (side `-1`) điều khiển bằng `AiController` port từ `AIController2` (gốc `football_legends.min.js` L23139-23197), skill Friendly `BOT_SKILL=0.3`. Bot gọi API `PlayerController` (`moveAxis/requestJump/requestShoot`). Strategy theo tỉ số lúc kickoff: thua → tấn công; hòa/thắng → về base theo needBack 20/70/90%. Bot không tackle/super. Khoảng cách giữ nguyên px (so sánh world position).

## Acceptance criteria

- [ ] AC1 — Chỉ Player `isHuman=true` đăng ký keyboard; Bot không phản ứng phím
- [ ] AC2 — Bot đuổi bóng, nhảy, sút về goal trái (`side=-1`)
- [ ] AC3 — Strategy đổi theo tỉ số lúc kickoff (tấn công / về base)
- [ ] AC4 — Bot bị khóa input trong Countdown/GoalPause/HalfTime và reset về kickoff
- [ ] AC5 — Fix `groundContacts` không bị reset khi đang chạm đất; rơi khỏi mép tính là đã dùng 1 jump

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/gameplay/PlayerController.ts` | `@property isHuman`, `opponent`; fix `groundContacts` (`:189`) |
| `assets/scripts/gameplay/AiController.ts` (mới) | port AIController2 |
| `assets/scripts/gameplay/MatchController.ts` | `@property bot`, lock/reset cả 2 |

**Hằng số (gốc):**

| Const | Giá trị | Ghi chú |
|-------|---------|---------|
| `D_MOVE` | 60 | dMove |
| `D_SHOOT` | 78×90 | dShoot |
| `D_JUMP` | 100 / -100 | dJump |
| `D_MOVE_ATTACK` | 150 | dMoveAttack |
| `DELTA_BALL_CLOSE_TO_GOAL` | 150 | |
| `DELAY_FOR_MOVE` | 1.1s | |
| `DELAY_FOR_JUMP` | 0.8s | |
| `INACTIVE_TIME` | 6s | |
| `BOT_SKILL` | 0.3 | Friendly |
| `NEED_BACK` | 20/70/90% | về base |

**`@property` cần Human wire:**

| Component | Property | Kiểu | Ghi chú |
|-----------|----------|------|---------|
| `AiController` | `player`, `ball`, `opponent` | Node/PlayerController | player = self |
| `PlayerController` | `isHuman`, `side`, `opponent` | bool/int/ref | Bot: false, -1 |
| `MatchController` | `bot` | PlayerController | |

### Human (Editor)

- [ ] H001 — Duplicate Player → `Bot` (bên phải, x đối xứng), `isHuman=false`, `side=-1`
- [ ] H002 — Gắn `AiController`, wire `player`/`ball`/`opponent`; wire `bot` vào MatchController, `opponent` 2 chiều
- [ ] H003 — Play theo checklist bên dưới

## Plan

### Agent

- [ ] T001 — PlayerController: `isHuman`, `opponent`, fix groundContacts
- [ ] T002 — `AiController` port AIController2
- [ ] T003 — MatchController: `bot`, lock/reset

### Human

- [ ] H001 — Tạo node Bot
- [ ] H002 — Wire refs
- [ ] H003 — Play + `npm run review:done -- F006`

## Play mode checklist

1. Phím chỉ điều khiển Player, Bot tự chạy
2. Bot đuổi bóng và sút về goal trái
3. Thua kickoff → Bot tấn công; dẫn → lùi về base
4. Bot đứng yên khi Countdown/GoalPause

## Ghi chú / liên kết

- Nguồn gốc: `football_legends.min.js` L23139-23197
- Thuật ngữ: `.cursor/docs/CONTEXT.md`
