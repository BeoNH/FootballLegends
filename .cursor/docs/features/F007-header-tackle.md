# F007 — Header + Tackle/Stun

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `planned` |
| Module | gameplay |
| Ngày tạo | 2026-10-23 |
| Phụ thuộc | F003, F006 |

## Mô tả

Header: bóng chạm đầu được lift thêm `vx = HEAD_PUSH_X * -dir` (đẩy ra xa) thay vì 0. Tackle (S/↓): state Tackle ~0.4s trượt; đối thủ trong hộp 40×50 phía trước → 80% Stun 1s (bị đẩy `STUN_PUSH`), 20% đối thủ nhảy né. Khi Tackle/Stun không ghi đè `linearVelocity.x` từ input (bug review #10).

## Acceptance criteria

- [ ] AC1 — Header đẩy bóng lên (`BODY_LIFT` 15) và ra xa (`vx ≈ 2.3`)
- [ ] AC2 — S/↓ vào state Tackle ~0.4s, trượt về phía trước
- [ ] AC3 — Đối thủ trong hộp 40×50: 80% Stun 1s + bị đẩy, 20% nhảy né
- [ ] AC4 — Khi Tackle/Stun, input không ghi đè `linearVelocity.x`
- [ ] AC5 — Stun hết thời gian thì player điều khiển lại bình thường

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/gameplay/PlayerController.ts` | state Tackle/Stun, `requestTackle`, hộp tackle, không ghi đè vx |
| `assets/scripts/gameplay/BallController.ts` | header lift thêm `vx` |
| `assets/scripts/common/GameTypes.ts` | `PlayerState` thêm Tackle, Stun (nếu chưa có) |

**Hằng số (gốc → Cocos):**

| Const | Giá trị | Ghi chú |
|-------|---------|---------|
| `BODY_LIFT` | 15 | gốc BALL_BOUNCE_Y 470 |
| `HEAD_PUSH_X` | 75/32 ≈ 2.3 | đẩy ra xa |
| `TACKLE_X/Y` | 40×50 | hộp phía trước |
| `TACKLE_TIME` | ~0.4s | |
| `STUN_CHANCE` | 0.8 | gốc 0.8 |
| `STUN_TIME` | 1s | gốc 1s |
| `STUN_PUSH` | 15.6 | gốc 500 ÷ 32 |

### Human (Editor)

- [ ] H001 — Kiểm tra BodySensor/Head của Bot đúng group
- [ ] H002 — Play theo checklist bên dưới

## Plan

### Agent

- [ ] T001 — BallController: header `vx`
- [ ] T002 — PlayerController: Tackle state + hộp kiểm tra
- [ ] T003 — Stun + push + né 20%
- [ ] T004 — Fix không ghi đè `linearVelocity.x`

### Human

- [ ] H001 — Check group collider Bot
- [ ] H002 — Play + `npm run review:done -- F007`

## Play mode checklist

1. Header: bóng bật lên và văng ra xa người
2. S sát đối thủ: ~80% đối thủ ngã 1s, bị đẩy
3. Đối thủ xa hơn hộp → không stun
4. Đang Tackle/Stun nhấn A/D → không đổi vận tốc

## Ghi chú / liên kết

- Thuật ngữ: `.cursor/docs/CONTEXT.md`
