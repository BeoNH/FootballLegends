# F001 — Player cơ bản (move + double jump)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `in-progress` |
| Module | gameplay |
| Ngày tạo | 2026-08-06 |
| Cập nhật | 2026-08-07 — scope rút: chỉ move 2 bên + nhảy tối đa 2 lần |

## Mô tả

Người chơi prototype: **di chuyển ngang** (A/D) và **nhảy tối đa 2 lần** trước khi chạm đất lại (W). Không sút bóng trong F001.

## Node tree — `assets/scene/Game.scene`

```
Game
└─ … / WorldRoot
   ├─ FieldPhysics          # GroundCollider, …
   ├─ Player                # PlayerController + RigidBody2D + BoxCollider2D
   │  ├─ FootSensor         # sensor, group PlayerFoot
   │  └─ Visual
   └─ (Ball — có thể giữ trong scene nhưng F001 không dùng)
```

## Acceptance criteria

- [ ] AC1 — A/D (hoặc ←/→) đổi `linearVelocity.x` theo `PLAYER_MOVE` (370); thả → dừng
- [ ] AC2 — W (hoặc ↑) nhảy khi còn lượt: `linearVelocity.y = PLAYER_JUMP_Y` (600); tối đa **2 lần** rồi phải chạm đất mới nhảy tiếp
- [ ] AC3 — FootSensor cập nhật grounded; chạm đất reset số lần nhảy về 2
- [ ] AC4 — Giữ A+D rồi thả một phím → tiếp tục chạy theo phím còn giữ
- [ ] AC5 — `PlayerState`: Idle / Run / Jump phản ánh hành vi
- [ ] AC6 — Thiếu `rigidBody` / `footSensor` → throw trong `onLoad`

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/gameplay/PlayerController.ts` | Move + double jump; bỏ shoot / `ballBody` |

**`@property` Human wire:**

| Property | Kiểu | Trạng thái |
|----------|------|------------|
| rigidBody | RigidBody2D | ✅ đã wire |
| footSensor | Collider2D | ✅ đã wire |

> Đã **gỡ** `ballBody` / `facingSign` khỏi Inspector — Human bỏ ref thừa trên component nếu Editor còn hiển thị missing.

### Human (Editor)

- [ ] H001 — Giữ Player + FootSensor + sàn trong `Game.scene`
- [ ] H002 — Xóa slot `ballBody` (nếu còn) trên `PlayerController` sau khi script reload
- [ ] H003 — Play mode checklist → `/checklist-done F001`

## Plan

### Agent

- [x] T001 — Rút `PlayerController`: bỏ shoot/ball; double jump `MAX_JUMPS = 2`
- [x] T002 — Sync docs F001 / modules / scenes / changelog

### Human

- [ ] H002 — Dọn Inspector (bỏ ballBody cũ)
- [ ] H003 — Play + `/checklist-done F001`

## Play mode checklist (Human)

1. Đứng trên sàn — không rơi xuyên
2. A/D chạy hai bên; thả → dừng; giữ A+D thả một phím → vẫn chạy hướng còn giữ
3. W nhảy lần 1 (từ đất hoặc không); W lần 2 trên không → nhảy thêm; lần 3 không nhảy đến khi chạm đất
4. Console không throw thiếu `rigidBody` / `footSensor`

## Ghi chú

- Sút bóng / Ball → feature sau (`BallController`)
- Intent: `setMoveIntent` / `requestJump` giữ cho AI sau
