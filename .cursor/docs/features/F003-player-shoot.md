# F003 — Player sút bóng (X) + hướng mặt về bóng

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `done` |
| Module | gameplay |
| Ngày tạo | 2026-08-13 |
| Cập nhật | 2026-08-14 — hằng số tune; `/checklist-done` |
| Phụ thuộc | F001, F002 |

## Mô tả

Nhấn **X** khi bóng trong vùng sút **phía trước mặt** (`SHOOT_DISTANCE` 60×60) → sút cung về goal đối phương (`shoot(side)`). Không X + overlap BodySensor → đỡ bóng F002. Sau sút khóa tâng **0.5s**. Player luôn quay mặt về bóng. Cooldown **0.5s**.

## Acceptance criteria

- [x] AC1 — Nhấn **X** + bóng trong vùng sút phía trước → sút cung; không tâng chen trong 0.5s sau sút
- [x] AC2 — X khi bóng ngoài vùng / phía sau → không sút
- [x] AC3 — Không X + overlap BodySensor → đỡ bóng F002 (`vx=0`, `vy=BODY_LIFT_SPEED`)
- [x] AC4 — Sau sút → skip BodySensor lift **0.5s**
- [x] AC5 — Visual luôn hướng về bóng
- [x] AC6 — Human `side = 1` → `vx = +BALL_SHOT_X`

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `PlayerController.ts` | X, face ball, `requestShoot`, cooldown, vùng sút phía trước |
| `BallController.ts` | `shoot(shootSign)`, skip lift 0.5s, baseline `|vy|` |

**Hằng số (đã tune Play):**

| Const | Giá trị | Ghi chú |
|-------|---------|---------|
| `BALL_SHOT_X` | 18 | scale gốc 550 |
| `BALL_SHOT_Y` | 12 | scale gốc 220, +Y Cocos |
| `SHOOT_DISTANCE_X/Y` | **60** | vùng phía trước mặt (tune từ 80) |
| `SHOOT_COOLDOWN` | 0.5s | `delayShot` |
| `SHOOT_BODY_SKIP_TIME` | 0.5s | khóa tâng sau sút |
| `Side.Human` | `1` | sút GoalRight |

### Human (Editor)

- [x] H001 — `PlayerController`: wire `ballNode` → Ball, `visualNode` → Visual
- [x] H002 — Play + `/checklist-done F003`

## Plan

### Agent

- [x] T001 — Player: KEY_X, distance phía trước, face ball, cooldown
- [x] T002 — Ball: `shoot`, skip BodySensor lift 0.5s
- [x] T003 — Hằng số tune Play (`SHOOT_DISTANCE` 60)
- [x] T004 — Sync docs

### Human

- [x] H001 — Wire refs
- [x] H002 — Play + `/checklist-done F003`

## Play mode checklist (Human)

1. Bóng trong ~60px phía trước, nhấn X → cung về GoalRight; spam X bị chặn 0.5s
2. X khi bóng xa / phía sau → không sút
3. Không X, bóng chạm người → vẫn tâng F002
4. Sút rồi → không tâng thẳng trong 0.5s
5. A/D quanh bóng → Visual quay mặt về bóng
6. Console warn nếu thiếu `ballNode` / `visualNode`

## Quyết định (đã chốt)

| Mục | Quyết định |
|-----|------------|
| Input | **Nhấn X** — bóng trong vùng phía trước lúc nhấn mới sút |
| Vùng sút | **60×60**, chỉ phía `facingSign` |
| Arc | **Cố định** `BALL_SHOT_X` / `BALL_SHOT_Y` |
| Goal | `side` → Human `1` sút +X |
| Cooldown | **0.5s** |
| Skip lift | **0.5s** sau sút |

## Handoff → Human

- Wire H001 → Play checklist → `/checklist-done F003`
