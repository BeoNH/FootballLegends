# Scenes & Prefabs — Sổ tay Editor (Human)

> v1: **1v1 Friendly**. Human sở hữu scene/prefab — Agent **không** sửa `.scene`/`.prefab`.

## Bảng scene

| Scene | Đường dẫn | Mô tả | Scripts gắn | Trạng thái |
|-------|-----------|-------|-------------|------------|
| **Game** | `assets/scene/Game.scene` | **Scene thật đang dùng** — sân + Player + Ball (F001) | `PlayerController` | in-progress (F001) |
| Boot | `assets/scenes/Boot.scene` | Preload asset, chuyển Menu | `AssetLoader` | planned |
| Menu | `assets/scenes/Menu.scene` | Nút Play Friendly | — | planned |
| TeamSelect | `assets/scenes/TeamSelect.scene` | Chọn đội + nhân vật + super | — (UI logic sau) | planned |
| Gameplay | `assets/scenes/Gameplay.scene` | Trận 1v1 đầy đủ — tách ra từ `Game.scene` khi làm `MatchController` | `MatchController`, player/ball prefabs | planned |

### `Game.scene` — node tree hiện tại (F001)

```
Game → Canvas → WorldRoot
  ├─ PlayGround     (BG, GoalLeft, GoalRight)
  ├─ FieldPhysics   (GroundCollider, SandCollider, GoalSensorLeft/Right)
  ├─ Player         (PlayerController + RigidBody2D + BoxCollider2D)  → FootSensor, Visual
  ├─ Ball           (RigidBody2D + BoxCollider2D)
  └─ Effects
```

F001 dựng Player/Ball **trực tiếp trong scene**, chưa tách prefab.

### Physics group (settings project)

| Index | Group | Va chạm với |
|-------|-------|-------------|
| 1 | `Ground` | PlayerBody, PlayerFoot, Ball |
| 2 | `Wall` | PlayerBody, PlayerFoot, Ball |
| 3 | `PlayerBody` | Ground, Wall, Ball, GoalSensor |
| 4 | `PlayerFoot` | Ground, Wall |
| 5 | `Ball` | Ground, Wall, PlayerBody, GoalSensor |
| 6 | `GoalSensor` | PlayerBody, Ball |

## Bảng prefab

| Prefab | Đường dẫn (đề xuất) | Dùng ở | Scripts | Trạng thái |
|--------|---------------------|--------|---------|------------|
| Player | `assets/prefabs/Player.prefab` | Gameplay | `PlayerController` (F001 rút gọn) | planned — F001 dùng node trong `Game.scene` |
| Ball | `assets/prefabs/Ball.prefab` | Gameplay | `BallController` | planned — F001 dùng node trong `Game.scene` |
| Playground | `assets/prefabs/Playground.prefab` | Gameplay | Collider sân (từ Play1.json) | planned |
| HudMatch | `assets/prefabs/HudMatch.prefab` | Gameplay | Timer, score, energy UI | planned |
| OverlayPause | `assets/prefabs/OverlayPause.prefab` | Gameplay | Half / Full / Result | planned |

## Wire `@property` (checklist)

### MatchController (Gameplay scene)

| Component | Property | Kiểu | Gán tới | [ ] Done |
|-----------|----------|------|---------|----------|
| MatchController | playerHuman | Node | Player prefab instance (side -1) | |
| MatchController | playerBot | Node | Player prefab instance (side 1) | |
| MatchController | ball | Node | Ball prefab instance | |
| MatchController | hudMatch | Node | HudMatch prefab | |
| MatchController | overlayPause | Node | OverlayPause prefab | |
| MatchController | playground | Node | Playground colliders | |

### PlayerController (F001 — node trong `Game.scene`)

| Component | Property | Kiểu | Gán tới | Đã wire |
|-----------|----------|------|---------|---------|
| PlayerController | rigidBody | RigidBody2D | Cùng node Player | ✅ |
| PlayerController | footSensor | Collider2D | Child `FootSensor` (sensor, group `PlayerFoot`) | ✅ |

Đã **gỡ** `ballBody` / `facingSign` — Human dọn Inspector nếu còn slot cũ. F001: move + double jump. Chi tiết: `features/F001-player-basic.md`.

### EnergyBar

| Component | Property | Kiểu | Gán tới | [ ] Done |
|-----------|----------|------|---------|----------|
| EnergyBar | fillSprite | Sprite | Arc / bar fill | |
| EnergyBar | hintLabel | Label | "Z" hoặc "K" | |
| EnergyBar | iconFireball | SpriteFrame | icon_ball0000 | |
| EnergyBar | iconTeleport | SpriteFrame | icon_ball0001 | |

### TeamSelect (Human UI)

| Mục | Mô tả | [ ] Done |
|-----|-------|----------|
| Panel human | Chọn đội (24 emblem), 2 nhân vật preview | |
| Label super slot 1 | Text **Fireball** + icon | |
| Label super slot 2 | Text **Teleport** + icon | |
| Panel bot | Hiển thị đội + nhân vật random + super tương ứng | |
| Nút Play | Truyền `MatchSetup` → load Gameplay | |

## Play mode checklist — v1 Friendly

- [ ] Boot load asset không lỗi console
- [ ] Menu → TeamSelect → Gameplay chuyển scene OK
- [ ] TeamSelect: chọn nhân vật 1 → Fireball hint; nhân vật 2 → Teleport hint
- [ ] Gameplay: human A/D/W/X/S/Z hoạt động (desktop)
- [ ] Energy bar nạp và kích hoạt super khi đủ 12
- [ ] Fireball: slow-mo + sút mạnh
- [ ] Teleport: dịch chuyển + sút
- [ ] Bot di chuyển / nhảy / sút (không dùng super)
- [ ] Bàn thắng → kickoff; hiệp 1 → Half Time; hiệp 2 hòa → OT
- [ ] `@property` bắt buộc đã wire (không throw onLoad)
- [ ] Event cleanup khi destroy scene

---

Hướng dẫn chi tiết Editor: `.cursor/docs/guides/`
