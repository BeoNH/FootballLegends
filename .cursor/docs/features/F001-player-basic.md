# F001 — Player cơ bản (move / jump / shoot)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `in-progress` |
| Module | gameplay |
| Ngày tạo | 2026-08-06 |

## Mô tả

Người chơi 1v1 đơn giản: di chuyển ngang, nhảy (có phát hiện chạm đất), sút bóng trong vùng. Node tree **rút gọn** so với mô hình đầy đủ — Head / Energy / Teleport / DragonBones đầy đủ để feature sau.

## Node tree F001 (đã lược)

Cocos: `RigidBody2D` là **component** trên root, không phải node cha.

```
Player                         # PlayerController + RigidBody2D (Dynamic)
 ├─ BodyCollider               # BoxCollider2D — group PlayerBody
 ├─ FootSensor                 # BoxCollider2D, sensor — group PlayerFloor
 ├─ Visual                     # Sprite tạm (sau → ArmatureDisplay)
 └─ Shadow                     # Sprite (tuỳ chọn)
```

| Giữ full model | F001 | Lý do |
|----------------|------|-------|
| HeadCollider | ❌ | Header / bounce — F00x sau |
| BodyCollider Polygon | → Box | Đủ prototype |
| FootSensor | ✅ | Jump cần grounded |
| ArmatureDisplay | → Sprite tạm | Animation sau |
| EnergyBarAnchor | ❌ | Super / energy sau |
| TeleportFxAnchor | ❌ | Super Teleport sau |

## Acceptance criteria

- [ ] AC1 — A/D (hoặc ←/→) đổi `linearVelocity.x` theo `PLAYER_MOVE`
- [ ] AC2 — W (hoặc ↑) nhảy khi grounded: `linearVelocity.y = PLAYER_JUMP_Y` (hướng lên theo Cocos)
- [ ] AC3 — FootSensor BEGIN/END contact cập nhật grounded đúng (không nhảy trên không)
- [ ] AC4 — X (hoặc B) sút nếu bóng trong `SHOOT_DISTANCE_*` và hết cooldown 0.5s — set velocity bóng theo `BALL_SHOT_*` × hướng mặt
- [ ] AC5 — `PlayerState`: Idle / Run / Jump phản ánh hành vi (chưa cần animation clip)
- [ ] AC6 — Thiếu `@property` bắt buộc → throw trong `onLoad`

## Phân công

### Agent (TypeScript)

**File tạo/sửa:**

| File | Thay đổi |
|------|----------|
| `assets/scripts/gameplay/PlayerController.ts` | Move / jump / shoot + input desktop; hằng số trong file |
| `assets/scripts/common/GameTypes.ts` | Thêm `PlayerState`, `Side` |

**`@property` cần Human wire:**

| Component | Property | Kiểu | Ghi chú |
|-----------|----------|------|---------|
| PlayerController | rigidBody | RigidBody2D | Cùng node Player |
| PlayerController | footSensor | Collider2D | Child FootSensor |
| PlayerController | ballBody | RigidBody2D | Ball prefab (Dynamic) |
| PlayerController | facingSign | number | `-1` trái / `1` phải (mặc định nhân) |

### Human (Editor)

- [ ] Prefab `assets/prefabs/Player.prefab` theo node tree F001
- [ ] Physics group: `PlayerBody`, `PlayerFloor`; FootSensor chỉ collide với Ground
- [ ] Scene test (hoặc Gameplay tạm): sàn có Collider2D static + Ball RigidBody2D
- [ ] Wire `@property` theo bảng trên
- [ ] Play mode theo checklist

## Plan

### Agent

- [x] T001 — `PlayerState` / `Side` + hằng số trong `PlayerController`
- [x] T002 — `PlayerController.ts` move / jump / shoot
- [x] T003 — Spec + sync docs

### Human / Play mode

- [ ] H001 — Tạo prefab Player + sàn + ball test
- [ ] H002 — Wire property + group collision
- [ ] H003 — Play mode checklist

## Play mode checklist

1. Player đứng trên sàn — không rơi xuyên; grounded = true
2. A/D di chuyển; thả phím → vx ≈ 0
3. W nhảy một lần khi chạm đất; trên không không nhảy thêm (F001 chưa double-jump)
4. Bóng trong vùng sút + X → bóng bay theo hướng facing
5. X ngoài vùng / trong cooldown → không sút
6. Console không throw thiếu reference

## Ghi chú / liên kết

- Kiến trúc: Component + State Machine (`PlayerState`)
- Tuning: hằng số trong `PlayerController` (tham chiếu giá trị gốc ở `SOURCE-REFERENCE.md`)
- Feature sau: HeadCollider, tackle, super, DragonBones, EnergyBar
