# SOURCE-REFERENCE — Football Legends (Phaser gốc)

> Reverse-engineer từ build Phaser gốc (MADPUFFERS 2019). File minified đã gỡ khỏi repo — **doc này là nguồn tham chiếu**.  
> **Phạm vi:** nhánh **1v1 Friendly** (`gameMode=1`, `matchMode=0`, `numPlayers=0`) — human `"P"` vs bot `"B"`.

---

## Engine & stack gốc

| Thành phần | Công nghệ |
|------------|-----------|
| Engine | Phaser 2 |
| Physics | Nape (nape.space) |
| Animation | DragonBones (`player` armature) |
| State | Phaser.State (`Boot`, `Menu`, `Gameplay`, …) |
| Save | PhaserSuperStorage (tournament — **ngoài v1**) |

---

## Hằng số toàn cục

| Hằng số | Giá trị | Ghi chú |
|---------|---------|---------|
| `GAME_W` / `GAME_H` | 1066 / 640 | Kích thước logic |
| `GAME_W2` | 400 | Giữa sân (kickoff X) |
| `TIMER` | 30 | Đơn vị thời gian nội bộ / hiệp |
| `T_KOEF` | 1.5 (= 45/30) | Hệ số hiển thị UI → 45 phút/hiệp |
| `STEP` | 0.025 | Fixed timestep logic |
| `desiredFps` | 40 | Gameplay state |

### ObjectsData (physics tuning — tham chiếu gốc)

> Port Cocos: **không** tạo file `ObjectsData.ts` — nhúng hằng số vào component (`PlayerController`, `BallController`, …).

| Hằng số | Giá trị |
|---------|---------|
| `PLAYER_MOVE` | 370 |
| `PLAYER_JUMP_Y` | 600 |
| `BALL_SHOT_X` / `BALL_SHOT_Y` | 550 / -220 |
| `BALL_BOUNCE_HEAD` / `BALL_BOUNCE_Y` | 75 / -470 |
| `SHOOT_DISTANCE_X` / `SHOOT_DISTANCE_Y` | 80 / 80 |
| `TACKLE_X` / `TACKLE_Y` | 40 / 50 |
| `INDENT` | 150 | Khoảng cách spawn từ giữa sân |

---

## Class map (1v1 Friendly)

| Class gốc | Vai trò | Port Cocos (dự kiến) |
|-----------|---------|----------------------|
| `FootballGameCore` | Orchestrator trận: timer, goal, OT, pause | `MatchController` |
| `MatchData` | `score1`, `score2`, `energies[]` | `MatchData` |
| `GameBuilder` | Spawn sân, bóng, 2 player | Scene prefab + `MatchController` |
| `PlayerObject` | Human/bot entity, super, tackle | `PlayerController` + `SuperAbility` |
| `BallObject` | Bóng, shoot, bounce, superHit | `BallController` |
| `NapePhysics` | Collision, goal sensor | Cocos physics layer |
| `PlayerControllerGeneral` | Input human (desktop + mobile) | `PlayerInput` |
| `AIController2` | Bot 1v1 | `AiController` |
| `EnergyBar` | UI nạp super | `EnergyBar` |
| `Teleport` | VFX + logic dịch chuyển | `SuperAbility` (Teleport) |
| `SelectPlayer` | Chọn đội + nhân vật + super hint | `TeamSelect` UI |
| `TimerObject` | Đồng hồ trận | UI component |
| `CountDownObject` | 3-2-1 kickoff | UI component |

**Loại khỏi v1:** `Inventory` (tournament), `MatchModePanel`, `TournamentState`, bracket logic.

---

## Luồng trận (FootballGameCore)

### Khởi tạo Friendly (`matchState = 0`)

```
startMatch() → restart() → countDown.activate()
timer.start(0, 2)   // 0 → 60s nội bộ = 2 hiệp liên tục
infoPanel.start(teams, score1, score2)
```

### Vòng update

```
isCountDown → countDown.process → whistle → isPlaying=true
isPlaying:
  deltaMatchTime += dt → timer.process
  timer hết → matchEndSignal
  goal → onGoal → deltaDelay 1.5s → restart kickoff
  matchEnd:
    matchState=2 && hòa → OVERTIME (isOvertime=true)
    else → isEnd → finishMatch → menuPauseSignal(HalfTime|PostMatch)
```

### Sau bàn thắng (`onGoal`)

1. `slow(0)` — slow-mo
2. Cộng tỉ số (`score1` hoặc `score2`)
3. `unActive(scoringSide)` — đội ghi bàn idle
4. `messageInfo.show("GOAL!!!")`
5. Delay `timeDelay = 1.5s` → `restart()` (trừ OT goal → `finishMatch`)

---

## Spawn 1v1 Friendly

`GameBuilder.createPlayObjects` (friendly, `matchMode=0`, `numPlayers=0`):

```text
MatchData.botsSkill = 0.3
createPlayers(-1, "P", [armatureLeft])   // human, direction -1
createPlayers(1,  "B", [armatureRight])  // bot, direction 1
```

- Mỗi chuỗi `"P"` / `"B"`: **1** `PlayerObject`, `playerID = 0`.
- Human: `PlayerControllerGeneral`, `energyID = 1`, có `EnergyBar`.
- Bot: `AIController2`, không `EnergyBar`, không `getSuperShot`.

---

## Nhân vật & Super ability

### Skin index

Mỗi đội `emblem` (1–24) có 2 skin:

| Slot | skinIndex | superPower (= index % 2) | Super |
|------|-----------|---------------------------|-------|
| Nhân vật 1 | `2×emblem - 2` | 0 | **Fireball** |
| Nhân vật 2 | `2×emblem - 1` | 1 | **Teleport** |

`SelectPlayer.setSuperHint()` luôn hiển thị `"Fireball"` / `"Teleport"` trên 2 slot.

Human chọn slot → `Inventory.players[0] = 1 | 2`.  
Bot friendly: `players[1] = random(1, 2)`.

### Nạp energy

- `superShotCount += dt * superKoef` (superKoef = T_KOEF = 1.5)
- Ngưỡng: `superShotPts = 12`
- UI: `EnergyBar` — 36 frame arc, đầy khi `curFrame >= 37`
- Persist: `MatchData.energies[energyID - 1]` lưu khi release player, restore khi spawn

### Fireball (`superPower = 0`)

Kích hoạt: `getSuperShot() && superShotCount >= 12`

1. `superHit()` → `shoot(true, true)` animation
2. `continueSuperHit()` → `slowSignal.dispatch(3)`, reset energy
3. `ball.shoot()` với `superHit=true`, velocity × **1.8**
4. Slow-mo 3s; bóng state `"shoot"`, trail ON

### Teleport (`superPower = 1`)

Kích hoạt: `isSuperActive = true`, reset energy, `superDefence()`

1. `playState("fly1")`, `teleport.startPlay(x, y)`
2. `slowSignal.dispatch(1)`
3. Tween scale → 0 (300ms) → `continueDefence()`
4. Dịch `body.position` tới `ball.x + 60*direction` (clamp 30–770)
5. Tween scale → 1 → `finishDefence()` → `ball.shoot()` thường
6. `slowSignal.dispatch(0)`

### Input super (human)

| Platform | Phím |
|----------|------|
| Desktop general | Z hoặc K |
| energyID=2 (P1 WASD) | V |
| energyID=3 (P2 arrows) | K |

---

## Hành động cơ bản (PlayerObject)

| Hành động | Điều kiện | Hiệu ứng |
|-----------|-----------|----------|
| Move | `canAct`, không stun/tackle | `velocity.x = dir * PLAYER_MOVE` |
| Jump | `canJump`, on ground hoặc double jump | `velocity.y = -PLAYER_JUMP_Y` |
| Shoot | trong `SHOOT_DISTANCE`, `deltaShoot` cooldown 0.5s | `ball.shoot(-direction)` |
| Tackle | on ground, animation tackle | `gamecore.tackle()` — stun đối thủ trong `TACKLE_X/Y` |
| Stun | bị tackle | `delayStunned = 1s`, 80% chance |

Bot AI (`AIController2`): `botsSkill=0.3` điều chỉnh xác suất move/jump/shoot; strategy -1/0/1 theo tỉ số lúc restart.

---

## Physics callbacks (NapePhysics)

| Callback | Trigger | Hành vi |
|----------|---------|---------|
| `onBallGoals` | Sensor `cbGoals` | `goalSignal.dispatch(goalId)` |
| `onBallPlayerHead` | Sensor head-ball | `bounceHead()` |
| `onBallFloor` | Ball-floor | `onFloorCollision()` |
| `onPlayerFloorGround` | Player chạm sân | `onFloorGround()`, reset jump |

Goal sensor: shape class `ToggleE` trong `Play1.json` → `CbTypes.cbGoals`.

---

## Data files

| File | Nội dung |
|------|----------|
| `assets/data/Play1.json` | Tilemap layers: ground, sand, goal sensors, spawn points |
| `assets/data/Players.json` | 48 player skin configs |
| `assets/data/sk.json` + `texture.json` | DragonBones skeleton |
| `assets/atlases/Gameplay.png` | Sprites gameplay + energy icons |
| `assets/atlases/Interface.png` | UI, emblems |

### Teams (24)

`PlayersData.CLUBS_NAMES`: Meringues, Barca, The Citizens, The Reds, Scousers, Gunners, Red Devils, Die Bayern, Die Borussen, Parisians, Nerazzurri, Giallorossi, As Aguias, Blauw-Zwart, The Teddy Bears, De Godenzonen, Trilos, Miners, Die Roten Bullen, Sarı Kanaryalar, The Herons, Knights of Najd, Urubu, Las Gallinas.

---

## Signals / events gốc

| Signal | Khi | Port → `GameEvents` |
|--------|-----|---------------------|
| `goalSignal` | Bóng vào khung thành | `MATCH_GOAL` |
| `matchEndSignal` | Hết giờ | `MATCH_END` |
| `slowSignal` | Super / goal slow-mo | `MATCH_SLOW_MO` |
| `menuPauseSignal` | HalfTime / PostMatch / Pause | `MATCH_PAUSE` |

---

## Phần ngoài phạm vi v1 (tham khảo nhanh)

| Feature gốc | Class / flag | Ghi chú |
|---------------|--------------|---------|
| Tournament | `Inventory`, `TournamentState` | Bracket 16, save `tsave` |
| Quick Match | `initQuickMatch()` | Random teams |
| 2v2 | `matchMode` 1, 2 | PB, BB, PP formations |
| 2P local | `numPlayers=1` | 2 controller |
| Bot super | AI không override `getSuperShot` | v1: chỉ human kích hoạt |

---

*Cập nhật: 2026-08-05 · Phạm vi: v1 1v1 Friendly*
