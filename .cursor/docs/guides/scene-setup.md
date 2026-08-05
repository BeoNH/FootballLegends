# Hướng dẫn — Scene setup (Human / Editor)

## Scene mới

1. **File → New Scene** → lưu `assets/scenes/[Tên].scene`
2. Cấu trúc node gợi ý:

```
Scene
├── Canvas (UI)
├── Gameplay (root logic)
├── Managers (optional — empty node gắn coordinator)
└── Camera / Lights (tuỳ project)
```

3. Gắn component root (game loop, session…) theo spec
4. Ghi vào `.cursor/docs/02-SCENES.md`

## Gắn script

- Component gameplay → node `Gameplay` hoặc entity con
- UI logic → node dưới `Canvas`
- **Không** gắn util class (không `@ccclass`) lên node

## Wire & validate

- Wire mọi `@property` bắt buộc trước Play mode
- Script thường `throw` trong `onLoad()` nếu thiếu ref — dùng lỗi đó để biết còn thiếu wire gì

## Scene checklist

- [ ] Scene trong **Build Settings** (nếu build multi-scene)
- [ ] Không node orphan / duplicate manager
- [ ] Event listener test: enable/disable node không leak
- [ ] Play mode full flow theo spec Fxxx

## Phân công với Agent

| Human | Agent |
|-------|-------|
| Tạo scene, hierarchy | Viết/update Component TS |
| Wire Inspector | Khai báo `@property` + validate |
| Chọn asset visual | Document path trong spec nếu load runtime |
