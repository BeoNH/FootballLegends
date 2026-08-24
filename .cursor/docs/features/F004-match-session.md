# F004 — Phiên đấu (timer, bàn thắng, kickoff)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `in-progress` |
| Module | gameplay |
| Ngày tạo | 2026-08-17 |
| Cập nhật | 2026-08-17 — Build theo scene `Game.scene` |
| Phụ thuộc | F001, F002, F003 |

## Mô tả

`MatchController` trên node **Managers** điều khiển phiên: đồng hồ 00→90, GoalSensor ghi bàn, khóa input, bóng nặng rơi đứng im, nghỉ 1.5s rồi kickoff. Không popup end-game, không countdown 3-2-1, không AI (property comment).

## Acceptance criteria

- [ ] AC1 — TimeLabel tăng `00` → `90` khi `Playing`; GoalPause / FullTime không tăng
- [ ] AC2 — Bóng vào GoalSensor bên phải (x>0) → `T_1` +1; bên trái (x<0) → `T_2` +1
- [ ] AC3 — Sau bàn: khóa input Player, timer đứng, bóng rest-mode (nặng → rơi đứng im)
- [ ] AC4 — Sau **1.5s** GoalPause: reset vị trí Player + Ball về kickoff; mở input; timer tiếp
- [ ] AC5 — Hết 90s: FullTime — khóa input, bóng rest-mode, timer đứng; **không** popup
- [ ] AC6 — GoalPause khi đã ≥90s → hết nghỉ vào FullTime (không kickoff)
- [ ] AC7 — AI `@property` comment, không chạy

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `MatchController.ts` | **Tạo** — phase, timer, score, goal, kickoff |
| `PlayerController.ts` | `setInputEnabled`, `resetToKickoff` |
| `BallController.ts` | `enterRestMode`, `resetToKickoff`, GoalSensor callback |
| `GameTypes.ts` | `MatchPhase` |
| `GameEvents.ts` | `MATCH_GOAL`, `MATCH_END`, `MATCH_KICKOFF` |

**`@property` (Human wire):**

| Component | Property | Kiểu | Gán tới |
|-----------|----------|------|---------|
| MatchController | player | PlayerController | Actors/Player |
| MatchController | ball | BallController | Actors/Ball |
| MatchController | scoreLabelT1 | Label | ScoreBar/T_1 |
| MatchController | scoreLabelT2 | Label | ScoreBar/T_2 |
| MatchController | timeLabel | Label | UIRoot/TimeLabel |

### Human (Editor)

- [ ] H001 — Gắn `MatchController` lên node `Managers`
- [ ] H002 — Wire bảng `@property` trên
- [ ] H003 — GoalSensorLeft/Right: group `GoalSensor`, **sensor = true**; Ball↔GoalSensor bật
- [ ] H004 — Play + `/checklist-done F004`

## Plan

### Agent

- [x] T001 — `MatchPhase` + events
- [x] T002 — Player lock/reset; Ball rest/reset + goal contact
- [x] T003 — `MatchController` timer / goal / kickoff / FullTime
- [ ] T004 — Sync docs

### Human

- [ ] H001–H003 — Gắn + wire
- [ ] H004 — Play

## Play mode checklist (Human)

1. TimeLabel đếm 00, 01, … khi chơi
2. Sút vào GoalRight (x>0) → T_1 +1; khóa input ~1.5s; bóng rơi đứng im; rồi reset giữa sân
3. (Nếu có) bóng vào GoalLeft → T_2 +1, cùng flow
4. Trong GoalPause: TimeLabel không tăng
5. Chờ hết 90s → đứng im, không input, không reset; chưa có popup
6. Console warn nếu thiếu ref

## Quyết định

| Mục | Quyết định |
|-----|------------|
| Tên class | **`MatchController`** (docs) — gắn `Managers`, không singleton GameManager |
| Thời gian | **90s thực** 00→90; không 2 hiệp / OT ở F004 |
| GoalPause | **1.5s** (gốc Phaser) |
| Điểm | World X sensor: **x>0 → T_1 (human)**, **x<0 → T_2** — vì `GoalSensorLeft` scene đang ở **x=+325** (lệch tên vs GoalLeft art) |
| Bóng rest | `gravityScale` tăng + tắt nảy + vel=0 khi chạm sàn; **không** đổi density |
| AI | Comment `@property` |
| Popup / countdown / slow-mo | Ngoài F004 |

## Handoff → Human

- Compile script → H001 gắn `MatchController` → H002 wire → Play checklist → `/checklist-done F004`
hjgjhgjhgiuhh