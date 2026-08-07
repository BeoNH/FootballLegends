# Changelog

Một dòng mỗi thay đổi đáng kể. Agent thêm khi implement; dòng review khi `/checklist-done`.

## [Unreleased]

### Added
- Template workflow: docs, rules, commands (`agent-boundary`, `/new-feature`, `/checklist-done`)
- Script inventory: phân folder `common/`, `managers/`, `ui/`, `i18n/` trong `scripts/` (ngoài `assets/`)
- Docs v1 1v1 Friendly: reverse-engineer `football_legends.min.js` → `00-GDD.md`, `CONTEXT.md`, `03-ARCHITECTURE.md`, `01-MODULES.md`, `02-SCENES.md`, `SOURCE-REFERENCE.md`
- [F001] `PlayerController` + `PlayerState`/`Side` — move / jump / shoot; prefab node tree rút gọn; hằng số trong code (không `ObjectsData`)

### Changed
- Tổ chức lại 10 file TS theo module — Human tự kéo vào `assets/scripts/` khi cần
- `00-GDD.md`, `CONTEXT.md`, `03-ARCHITECTURE.md`, `01-MODULES.md`, `02-SCENES.md`: điền nội dung Football Legends v1 (1v1 Friendly + Super Fireball/Teleport)
- Kiến trúc khóa: Component-Based + Manager (ít) + Event Bus + State Machine + MVC nhẹ (UI/Menu); gỡ `football_legends.min.js` (logic đã ghi trong `SOURCE-REFERENCE.md`)

### Review
- (tick qua `/checklist-done` — không thêm tay)

---

## Format

```
- [Fxxx] Mô tả ngắn — Agent/Human
- [Review Fxxx] Play mode OK — yyyy-mm-dd
```
