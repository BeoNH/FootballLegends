# Modules — Bản đồ script

> v1: gameplay 1v1 Friendly. Agent sync sau mỗi implement.

Script nằm trong **`scripts/`** (ngoài `assets/`). Human kéo/copy file cần dùng vào `assets/scripts/` trong Cocos Editor.

## Trạng thái

| Ký hiệu | Ý nghĩa |
|---------|---------|
| planned | Chưa có code |
| in-progress | Đang làm |
| done | Đã review Play mode |

## Bảng module

| Module | Đường dẫn | Mô tả | Trạng thái | Feature |
|--------|-----------|-------|------------|---------|
| *common* | `scripts/common/` | Types, event constants, event bus | done | — |
| *managers* | `scripts/managers/` | Manager toàn cục (ít) — asset load | done | — |
| *ui* | `scripts/ui/` | UI / Menu — MVC nhẹ | done | — |
| *i18n* | `scripts/i18n/` | Localization | done | — |
| *gameplay* | `scripts/gameplay/` | **1v1 Friendly** — Component + State Machine | in-progress | F004 |
| *utils* | `scripts/utils/` | Helper thuần (nếu cần) | planned | — |

## Script inventory — template (done)

| File | Module | Loại | Mô tả |
|------|--------|------|-------|
| `common/GameTypes.ts` | common | types | Enum `GameState`, `Side`, `PlayerState`; interface `IGameInfo` |
| `common/GameEvents.ts` | common | constants | Hằng số tên event |
| `common/BroadcastReceiver.ts` | common | event bus | Pub/sub static |
| `managers/AssetLoader.ts` | managers | service | Load + cache asset |
| `ui/popup/UiPopup.ts` | ui | component | Popup cơ sở |
| `i18n/LocalizationManager.ts` | i18n | manager | i18n singleton |

## Script inventory — gameplay v1

| File | Module | Loại | Mô tả | Map source | Trạng thái |
|------|--------|------|-------|------------|------------|
| `gameplay/MatchController.ts` | gameplay | component | Phiên đấu: timer 90s, GoalSensor, kickoff 1.5s | `FootballGameCore` | in-progress (F004) |
| `gameplay/MatchData.ts` | gameplay | data | `score1`, `score2`, `energies[]` | `MatchData` | planned |
| `gameplay/PlayerController.ts` | gameplay | component | Move + jump; sút X; lock input / kickoff (F004) | `PlayerObject` + input | done |
| `gameplay/AiController.ts` | gameplay | component | Bot 1v1, strategy theo tỉ số | `AIController2` | planned |
| `gameplay/BallController.ts` | gameplay | component | Bounce / shoot; rest-mode bàn thắng (F004) | `BallObject` | done |
| `gameplay/SuperAbility.ts` | gameplay | component | Fireball / Teleport logic | `PlayerObject.superShot`, `Teleport` | planned |
| `gameplay/EnergyBar.ts` | gameplay | component | UI + nạp energy, ngưỡng 12 | `EnergyBar` | planned |

## Quy ước thêm module

1. Thêm dòng vào bảng trước khi tạo file.
2. Không tạo `SaveInventory` / tournament module trong v1.
3. Mở rộng `GameTypes.ts` / `GameEvents.ts` khi thêm enum/event mới.

Rule: `.cursor/rules/scripts-inventory.mdc`
