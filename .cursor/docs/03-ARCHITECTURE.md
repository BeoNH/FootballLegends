# Architecture — Pattern & hệ thống

> Mô tả cách code Cocos tổ chức trong project. Cập nhật khi ADR hoặc feature thay đổi kiến trúc.

## Nguyên tắc

| Nguyên tắc | Mô tả |
|------------|-------|
| Component-first | Logic gắn node qua `@ccclass`, không singleton global |
| Inject qua `@property` | Reference scene/prefab do Human wire |
| Event-driven | Custom event qua dispatcher hoặc `GameEvents` pattern |
| Lifecycle strict | onLoad → start → onEnable → update → onDisable → onDestroy |

## Cấu trúc thư mục script

Thư viện template ở **`scripts/`** (repo root). Human kéo file cần dùng vào `assets/scripts/` trong Editor — không copy hàng loạt.

```
scripts/
├── common/          # Types, event constants, event bus dùng chung
│   ├── GameTypes.ts
│   ├── GameEvents.ts
│   └── BroadcastReceiver.ts
├── managers/        # Service singleton (network, asset, save…)
│   ├── NetworkManager.ts
│   └── AssetLoader.ts
├── ui/              # UI components (@ccclass)
│   ├── NumberScrolling.ts
│   └── popup/
│       └── UiPopup.ts
├── i18n/            # Localization
│   ├── LocalizationManager.ts
│   ├── LocalizedLabel.ts
│   └── LocalizedSprite.ts
├── utils/           # Logic thuần, không @ccclass (khi cần)
└── gameplay/        # Core gameplay (tuỳ project)
```

| Folder | Đặt gì | Không đặt |
|--------|--------|-----------|
| `common/` | enum, interface, `GAME_EVENTS`, `BroadcastReceiver` | Component gắn scene |
| `managers/` | Singleton/service (network, load asset) | UI tween component |
| `ui/` | `@ccclass` UI: popup, label effect | Logic thuần không Cocos |
| `i18n/` | Localization manager + localized components | Gameplay logic |
| `utils/` | Hàm thuần, helper math/format | `@ccclass` |
| `gameplay/` | Component gameplay theo feature | Manager toàn cục |

Chi tiết inventory: `01-MODULES.md`.

## Event

| Event | Emitter | Listener(s) | Payload | Ghi chú |
|-------|---------|-------------|---------|---------|
| | | | | |

## State (nếu có)

| State | Enum / class | Owner component | Chuyển khi |
|-------|--------------|-----------------|------------|
| | | | |

## Load tài nguyên

| Loại | Cách load | Path convention |
|------|-----------|-----------------|
| Prefab | `resources.load` / Addressable | `assets/resources/` |
| Config | JSON trong resources | |

## Quyết định kiến trúc (ADR)

Xem `.cursor/docs/adr/` — mỗi quyết định quan trọng một file ADR.

## Chuẩn code chi tiết

Skill: `.cursor/skills/theone-cocos-standards/`
