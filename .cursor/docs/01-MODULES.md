# Modules — Bản đồ script

> Cập nhật khi thêm/xóa module hoặc hoàn thành feature. Agent sync sau mỗi implement.

Script nằm trong **`scripts/`** (ngoài `assets/`). Human kéo/copy file cần dùng vào `assets/scripts/` trong Cocos Editor.

## Trạng thái

| Ký hiệu | Ý nghĩa |
|---------|---------|
| planned | Chưa có code |
| in-progress | Đang làm (spec Fxxx) |
| done | Đã review Play mode |

## Bảng module

| Module | Đường dẫn | Mô tả | Trạng thái | Feature |
|--------|-----------|-------|------------|---------|
| *common* | `scripts/common/` | Types, event constants, event bus dùng chung | done | — |
| *managers* | `scripts/managers/` | Service singleton (network, asset load) | done | — |
| *ui* | `scripts/ui/` | UI components (`@ccclass`) | done | — |
| *i18n* | `scripts/i18n/` | Localization | done | — |
| *utils* | `scripts/utils/` | Logic thuần, không `@ccclass` | planned | — |
| *gameplay* | `scripts/gameplay/` | Core gameplay (tuỳ project) | planned | — |

## Quy ước thêm module

1. Thêm dòng vào bảng trên trước khi tạo folder/file hàng loạt.
2. Khớp với spec Fxxx hoặc ADR nếu là kiến trúc mới.
3. Không tạo module trùng vai trò — mở rộng module hiện có nếu được.

## Script inventory

| File | Module | Loại | Mô tả |
|------|--------|------|-------|
| `common/GameTypes.ts` | common | types | Enum `GameState`, interface `IGameInfo` |
| `common/GameEvents.ts` | common | constants | Hằng số tên event gameplay |
| `common/BroadcastReceiver.ts` | common | event bus | Pub/sub static, gắn `Component` target |
| `managers/NetworkManager.ts` | managers | service | WebSocket + HTTP REST, reconnect, ping |
| `managers/AssetLoader.ts` | managers | service | Load remote/resources asset + cache |
| `ui/NumberScrolling.ts` | ui | component | Tween số trên `Label` |
| `ui/popup/UiPopup.ts` | ui | component | Popup cơ sở show/hide tween |
| `i18n/LocalizationManager.ts` | i18n | manager | Singleton i18n, `t()`, đổi ngôn ngữ |
| `i18n/LocalizedLabel.ts` | i18n | component | Label/RichText theo key JSON |
| `i18n/LocalizedSprite.ts` | i18n | component | SpriteFrame theo ngôn ngữ |

Rule: `.cursor/rules/scripts-inventory.mdc`
