# F005 — Match flow đầy đủ (Countdown, 2 hiệp, HalfTime, Overtime, Result)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `planned` |
| Module | gameplay |
| Ngày tạo | 2026-10-23 |
| Phụ thuộc | F001–F004 |

## Mô tả

Mở rộng `MatchController` thành flow đủ: Menu Play → Countdown 3-2-1-GO (~0.9s, khóa input) → hiệp 1 (30s thực, hiển thị 0-45) → HalfTime (giữ energy) → hiệp 2 → hòa thì Overtime golden goal (timer dừng, bàn tiếp theo thắng) → FullTime → Result → Rematch. State dùng chung lưu ở `MatchData` (static). Fix F004: xác định bên ghi bàn bằng `sensorX > fieldCenterX`.

## Acceptance criteria

- [ ] AC1 — Countdown 3-2-1-GO khóa input cả 2 bên, xong mới vào Playing
- [ ] AC2 — Mỗi hiệp 30s thực, `MATCH_TIME` hiển thị ×1.5 (0→45, 45→90)
- [ ] AC3 — Hết hiệp 1 → HalfTime, giữ energy/score, hiệp 2 kickoff lại
- [ ] AC4 — Hòa sau hiệp 2 → Overtime, timer dừng, bàn đầu tiên kết thúc trận
- [ ] AC5 — Bàn thắng đúng bên theo `sensorX > fieldCenterX`; `GOAL_PAUSE_TIME` 1.5s rồi kickoff
- [ ] AC6 — FullTime → `MATCH_RESULT{s1,s2}`; Rematch (`MATCH_START`) reset sạch `MatchData`

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/common/GameTypes.ts` | `MatchPhase` thêm `Countdown`, `HalfTime`, `Overtime` |
| `assets/scripts/common/GameEvents.ts` | `MATCH_COUNTDOWN{n}`, `MATCH_HALFTIME`, `MATCH_OVERTIME`, `MATCH_TIME{display}`, `MATCH_RESULT{s1,s2}`, `MATCH_START` |
| `assets/scripts/gameplay/MatchData.ts` (mới) | static score1/2, energy1/2, half, isOvertime; `reset()` |
| `assets/scripts/gameplay/MatchController.ts` | phase machine, fix `:89` bên ghi bàn |

**Hằng số:**

| Const | Giá trị | Ghi chú |
|-------|---------|---------|
| `HALF_DURATION` | 30s | thực; hiển thị 45 phút (×1.5) |
| `COUNTDOWN_TIME` | ~0.9s | tổng 3-2-1-GO |
| `GOAL_PAUSE_TIME` | 1.5s | gốc |

**`@property` cần Human wire:**

| Component | Property | Kiểu | Ghi chú |
|-----------|----------|------|---------|
| `MatchController` | `player`, `ball`, `scoreLabelT1/T2`, `timeLabel` | Node/Label | gốc F004 |

### Human (Editor)

- [ ] H001 — Gắn `MatchController` vào node Managers; wire `player`, `ball`, `scoreLabelT1/T2`, `timeLabel`
- [ ] H002 — GoalSensor group = GoalSensor
- [ ] H003 — Play theo checklist bên dưới

## Plan

### Agent

- [ ] T001 — `GameTypes`/`GameEvents`: phase + event mới
- [ ] T002 — `MatchData` static + reset
- [ ] T003 — `MatchController`: Countdown, 2 hiệp, HalfTime, Overtime, Result
- [ ] T004 — Fix xác định bên ghi bàn (`fieldCenterX`)

### Human

- [ ] H001 — Wire MatchController
- [ ] H002 — GoalSensor group
- [ ] H003 — Play + `npm run review:done -- F005`

## Play mode checklist

1. Countdown hiện 3-2-1-GO, input khóa tới khi xong
2. Ghi bàn bên phải → T_1 +1; bên trái → T_2 +1
3. 30s → HalfTime, hiệp 2 giữ tỉ số
4. Hòa → Overtime, bàn đầu kết thúc trận
5. Rematch → score/energy/half reset

## Ghi chú / liên kết

- Plan: `C:\Users\hoang\.claude\plans\c-users-hoang-downloads-footballlegends-greedy-sparrow.md`
- Thuật ngữ: `.cursor/docs/CONTEXT.md`
