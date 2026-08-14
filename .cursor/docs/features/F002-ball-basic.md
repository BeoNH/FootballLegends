# F002 — Ball cơ bản (nảy Ground + BodySensor)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `done` |
| Module | gameplay |
| Ngày tạo | 2026-08-12 |
| Cập nhật | 2026-08-12 — grill chốt; Build `BallController` |
| Phụ thuộc | F001 (Player + FootSensor); group `BodySensor` |

## Mô tả

Bóng arcade 2D: **nảy khi chạm `Ground`** theo **pháp tuyến điểm chạm** (mặt ngang / mặt dọc Polygon). Khi giao **`BodySensor`** → **đỡ bóng**: `vx = 0`, bắn thẳng lên (tạm; sút sau này thay thế). **Wall** (mặt sau/trên goal) ngoài F002. Chưa sút / goal / trail / super.

## Acceptance criteria

- [x] AC1 — Chạm mặt ngang `Ground`: bóng nảy lên; vận tốc phản xạ theo normal
- [x] AC2 — Chạm mặt dọc `Ground` (cùng Polygon): bóng nảy ngang theo normal tương ứng
- [x] AC3 — Giao `BodySensor`: xuyên player; `vx = 0`, `vy > 0` (bắn thẳng lên)
- [x] AC4 — `BallController` trên node Ball; resolve `RigidBody2D` + collider group `Ball` trong `onLoad` (warn nếu thiếu)
- [x] AC5 — Restitution collider Ball = 0 — nảy do code gán `linearVelocity`
- [x] AC6 — Một lần nâng mỗi lần overlap BodySensor (đếm contact, không spam)

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/gameplay/BallController.ts` | **Tạo** — Ground reflect + BodySensor lift |

**Không** `@property` physics — resolve trên cùng node Ball.

| Thành phần | Cách lấy | Group |
|------------|----------|-------|
| rigidBody | `getComponent(RigidBody2D)` | `Ball` |
| ballCollider | `getComponents(Collider2D)` | `Ball` |

### Human (Editor)

- [x] H001 — Node `Ball`: `RigidBody2D` **group = `Ball`**, Dynamic, `enabledContactListener` (script cũng bật), gravityScale phù hợp
- [x] H002 — `BoxCollider2D` group `Ball`, **sensor = false**, **restitution = 0**
- [x] H003 — Player `BodySensor` (sensor, group `BodySensor`); matrix Ball↔BodySensor bật, Ball↔PlayerBody tắt
- [x] H004 — Gắn component `BallController` lên node `Ball` (script mới — Editor compile xong mới thấy)
- [x] H005 — Ground restitution 0; Play checklist → `/checklist-done F002`

## Plan

### Agent

- [x] T001 — `BallController`: onLoad resolve + warn; bind BEGIN/END_CONTACT
- [x] T002 — Bounce Ground: world normal, reflect, `BOUNCE_RESTITUTION = 0.85`, `disabledOnce`
- [x] T003 — BodySensor: `vx = 0`, `vy = max(\|v\|·0.85, MIN_BOUNCE_UP)`; một lần / overlap
- [x] T004 — Sync docs

### Human

- [x] H001–H004 — Group / restitution / gắn `BallController`
- [x] H005 — Play + `/checklist-done F002`

## Play mode checklist (Human)

1. Thả bóng rơi sàn ngang → nảy lên, giảm dần
2. Đẩy bóng vào mặt dọc Polygon Ground → nảy ngang (không xuyên)
3. Player đỡ bóng (BodySensor) → bóng **dừng ngang, bắn thẳng lên**, không kẹt trong người
4. Giữ overlap BodySensor → không spam nảy; ra rồi vào lại → nâng một lần nữa
5. Console warn nếu thiếu RigidBody/Collider; không crash

## Quyết định kỹ thuật (đã chốt)

| Mục | Quyết định |
|-----|------------|
| Ai listen contact | `BallController` trên Ball |
| Ground bounce | Reflect theo world normal × `0.85`; `disabledOnce` tránh solver nuốt `vy` |
| BodySensor | `vx = 0`, bắn thẳng lên — dạng đỡ bóng; sút sau này thay thế |
| `BOUNCE_RESTITUTION` | `0.85` |
| `MIN_BOUNCE_UP` | `8` |
| Wall | Ngoài F002 — mặt sau/trên goal, feature sau |
| Sút / Goal / trail | Ngoài scope |

## Ghi chú / liên kết

- Thuật ngữ: `BodySensor` → `CONTEXT.md`
- Gốc Phaser: `onBallFloor` / `onBallPlayerHead` — F002 chưa tách head

## Handoff → Review (Codex)

- File: `assets/scripts/gameplay/BallController.ts`
- Rủi ro: hướng normal A/B; `disabledOnce` trên Ground; BodySensor spam
- Play: checklist Human H001–H005
- Xong → `/checklist-done F002`
