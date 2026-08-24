# CONTEXT — Shared domain language

Ngôn ngữ chung giữa team và Agent. Dùng thuật ngữ trong spec, tên biến/class, và chat — **tránh mô tả dài**.

> Project: **Football Legends** · v1: 1v1 Friendly

## Glossary

| Thuật ngữ | Định nghĩa ngắn | Ghi chú |
|-----------|-----------------|---------|
| `FriendlyMatch` | Trận giao hữu 1v1 human vs bot, không bracket | Duy nhất mode v1 |
| `MatchPhase` | Giai đoạn trận F004: Playing → GoalPause → Playing; hết giờ → FullTime | Countdown / Half / OT sau |
| `MatchData` | State runtime trận: `score1`, `score2`, `energies[]` | Model runtime — sở hữu bởi `MatchController` |
| `MatchSetup` | Cấu hình trước trận: teamId, characterSlot, super type | Từ TeamSelect |
| `side` | `1` = human (sút GoalRight), `-1` = bot (sút GoalLeft) | Hướng sút về goal đối phương — không dùng làm tọa độ spawn |
| `PlayerState` | idle / run / jump / tackle / stun | SM cầu thủ — F001 dùng Idle/Run/Jump |
| `facingSign` | `-1` mặt trái, `1` mặt phải | F003: luôn hướng về bóng |
| `intent` | Ý định điều khiển: `setMoveIntent` / `requestJump` / `requestShoot` | F003 thêm sút (X) |
| `Kickoff` | Countdown 3-2-1 → còi → `Playing` | Sau mỗi bàn / bắt đầu hiệp |
| `shoot arc` | Cú sút: `vx` về goal đối phương + `vy` lên → quỹ đạo cầu vồng | F003; không tâng BodySensor khi đang kick |
| `CharacterSlot` | `1` hoặc `2` — nhân vật trong đội | Slot 1 = Fireball, slot 2 = Teleport |
| `skinIndex` | Chỉ số skin DragonBones: `2×teamId-2` hoặc `2×teamId-1` | 48 skin / 24 team |
| `superPower` | Loại super: `0` = Fireball, `1` = Teleport | `skinIndex % 2` |
| `EnergyBar` | UI + logic nạp super; ngưỡng 12 điểm | Chỉ human v1 |
| `superHit` | Trạng thái sút Fireball: bóng ×1.8 velocity, slow-mo, trail | |
| `superShotCount` | Điểm energy hiện tại (nạp theo thời gian × 1.5) | |
| `botsSkill` | Hệ số AI 0–1; friendly v1 = **0.3** | Ảnh hưởng move/jump/shoot chance |
| `Overtime` | Hiệp phụ: hòa sau hiệp 2 → bàn thắng vàng | |
| `BodySensor` | Collider **sensor** trên Player (group `BodySensor`) — bóng xuyên `PlayerBody` nhưng bắt overlap để nảy | F002 |
| `FootSensor` | Sensor chân Player — grounded | F001 (đổi tên group từ PlayerFoot) |
| `Ball bounce` | Ground Editor nhớ `|vy|` lúc chạm sàn. BodySensor nâng `BODY_LIFT_SPEED` rồi nảy chậm về tốc độ đã nhớ | Wall → feature sau |

## Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| Component gameplay | PascalCase, vai trò rõ | `MatchController`, `SuperAbility` |
| Event (custom) | UPPER_SNAKE trong `GameEvents.ts` | `MATCH_GOAL`, `MATCH_SLOW_MO` |
| State enum | PascalCase + suffix | `MatchPhase.Playing` |
| Physics / action constants | `const` trong component liên quan | `PLAYER_MOVE` trong `PlayerController` |
| Team id | 1-based trong UI, 0-based trong code array | UI: team 1–24 |

## Module aliases

| Tên ngắn | Module / thư mục |
|----------|------------------|
| match | `scripts/gameplay/` — MatchController, MatchData |
| player | `scripts/gameplay/` — PlayerController, AiController, SuperAbility |
| common | `scripts/common/` — GameEvents, GameTypes |

## Không dùng / tránh nhầm

| Tránh | Dùng thay |
|-------|-----------|
| `Inventory` (Phaser) | `MatchSetup` hoặc plain config object — không tournament save v1 |
| `matchMode` (0/1/2 gốc) | Không dùng v1 — luôn 1v1 |
| `gameMode` (0=tournament) | `FriendlyMatch` |
| `FootballGameCore` trực tiếp | `MatchController` (Cocos) |
| `Phaser.Signal` | `BroadcastReceiver` / `GameEvents` |

---

*Cập nhật lần cuối: 2026-08-05 · Project: Football Legends*
