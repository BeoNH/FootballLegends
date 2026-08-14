# F001 — Player cơ bản (move + double jump)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `done` |
| Module | gameplay |
| Ngày tạo | 2026-08-06 |
| Cập nhật | 2026-08-12 — gộp physics lên node Player; resolve theo group |

## Mô tả

Người chơi prototype: **di chuyển ngang** (A/D) và **nhảy tối đa 2 lần** trước khi chạm đất lại (W). Không sút bóng trong F001.

## Node tree — `assets/scene/Game.scene`

```
Game
└─ … / WorldRoot
   ├─ FieldPhysics          # GroundCollider, …
   ├─ Player                # PlayerController + RigidBody2D(group PlayerBody)
   │                        # + BoxCollider2D(group PlayerBody) + BoxCollider2D sensor(group PlayerFoot)
   │  └─ Visual
   └─ (Ball — có thể giữ trong scene nhưng F001 không dùng)
```

## Acceptance criteria

- [x] AC1 — A/D (hoặc ←/→) đổi `linearVelocity.x` theo `PLAYER_MOVE` (370); thả → dừng
- [x] AC2 — W (hoặc ↑) nhảy khi còn lượt: `linearVelocity.y = PLAYER_JUMP_Y` (600); tối đa **2 lần** rồi phải chạm đất mới nhảy tiếp
- [x] AC3 — FootSensor cập nhật grounded; chạm đất reset số lần nhảy về 2
- [x] AC4 — Giữ A+D rồi thả một phím → tiếp tục chạy theo phím còn giữ
- [x] AC5 — `PlayerState`: Idle / Run / Jump phản ánh hành vi
- [x] AC6 — Thiếu RigidBody2D / BoxCollider2D group `PlayerBody` / `PlayerFoot` → `console.warn` trong `onLoad`

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/gameplay/PlayerController.ts` | Move + double jump; resolve physics theo group trên cùng node Player |

**Resolve runtime (không `@property`):**

| Thành phần | Cách lấy | Group |
|------------|----------|-------|
| rigidBody | `getComponent(RigidBody2D)` | `PlayerBody` |
| bodyCollider | `getComponents(BoxCollider2D)` | `PlayerBody` |
| footSensor | `getComponents(BoxCollider2D)` sensor | `PlayerFoot` |

### Human (Editor)

- [x] H001 — Trên node `Player`: RigidBody2D group `PlayerBody`; 2 BoxCollider2D groups `PlayerBody` + `PlayerFoot` (sensor); bỏ child FootSensor nếu còn
- [x] H003 — Play mode checklist → `/checklist-done F001`

## Plan

### Agent

- [x] T001 — Rút `PlayerController`: bỏ shoot/ball; double jump `MAX_JUMPS = 2`
- [x] T002 — Sync docs F001 / modules / scenes / changelog

### Human

- [x] H001 — Physics groups trên cùng node Player
- [x] H003 — Play + `/checklist-done F001`

## Play mode checklist (Human)

1. Đứng trên sàn — không rơi xuyên; debug Foot (PlayerFoot) đi cùng Player
2. A/D chạy hai bên; thả → dừng; giữ A+D thả một phím → vẫn chạy hướng còn giữ
3. W nhảy lần 1 (từ đất hoặc không); W lần 2 trên không → nhảy thêm; lần 3 không nhảy đến khi chạm đất
4. Dí sát mặt dọc Polygon Ground + giữ hướng vào tường + W: không dính tường / không bị “trôi dọc tường”; nhảy không bị cắt thấp vì friction
5. Console warn (không crash) nếu thiếu RigidBody / collider group `PlayerBody` / `PlayerFoot`

## Ghi chú

- Sút bóng / Ball → feature sau (`BallController`)
- Intent: `setMoveIntent` / `requestJump` giữ cho AI sau
