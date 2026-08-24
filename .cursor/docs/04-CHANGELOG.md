# Changelog

Một dòng mỗi thay đổi đáng kể. Agent thêm khi implement; dòng review khi `/checklist-done`.

## [Unreleased]

### Added
- Template workflow: docs, rules, commands (`agent-boundary`, `/new-feature`, `/checklist-done`)
- Script inventory: phân folder `common/`, `managers/`, `ui/`, `i18n/` trong `scripts/` (ngoài `assets/`)
- Docs v1 1v1 Friendly: reverse-engineer `football_legends.min.js` → `00-GDD.md`, `CONTEXT.md`, `03-ARCHITECTURE.md`, `01-MODULES.md`, `02-SCENES.md`, `SOURCE-REFERENCE.md`
- [F001] `PlayerController` + `PlayerState`/`Side` — move / jump / shoot; prefab node tree rút gọn; hằng số trong code (không `ObjectsData`)
- Pipeline đa model: rule `multi-model-pipeline` + skill `game-dev-pipeline` (Claude → Composer → Codex Review → Human; Debug khi Human báo)

### Changed
- Tổ chức lại 10 file TS theo module — Human tự kéo vào `assets/scripts/` khi cần
- `00-GDD.md`, `CONTEXT.md`, `03-ARCHITECTURE.md`, `01-MODULES.md`, `02-SCENES.md`: điền nội dung Football Legends v1 (1v1 Friendly + Super Fireball/Teleport)
- Kiến trúc khóa: Component-Based + Manager (ít) + Event Bus + State Machine + MVC nhẹ (UI/Menu); gỡ `football_legends.min.js` (logic đã ghi trong `SOURCE-REFERENCE.md`)
- Pipeline: **bỏ Agent Play** — Codex chỉ review code; Play do Human; debug khi Human báo bug
- [F001] Plan re-scope theo `assets/scene/Game.scene` thực tế (Player/Ball dựng trong scene, `@property` đã wire): thêm AC7/AC8, task T004–T007 (intent API, đa phím, lifecycle guard) — Agent (Plan)
- [F001] `PlayerController`: intent API (`setMoveIntent`/`requestJump`/`requestShoot`), getter runtime, fix giữ A+D (AC7), guard `onEnable` + reset grounded `onDisable` (T004–T006) — Agent (Build)
- [F001] `PlayerController`: chỉ move 2 bên + double jump (`MAX_JUMPS=2`); gỡ shoot / `ballBody` / `facingSign` property — Agent
- [F001] `PlayerController`: gộp physics trên node Player; resolve `RigidBody2D`/`BoxCollider2D` theo group `PlayerBody`/`PlayerFoot` (bỏ `@property` + child FootSensor) — Agent
- [F001] `PlayerController`: `bodyCollider.friction = 0` tránh dính mặt dọc Polygon Ground khi dí tường nhảy — Agent
- Physics matrix: tắt Ball ↔ PlayerBody — bóng xuyên player, vẫn chạm Ground/Wall — Agent
- [F002] `BallController`: nảy Ground do Editor (RigidBody2D/Collider2D); code chỉ BodySensor đỡ bóng — Agent
- [F003] `PlayerController`: sút X (`SHOOT_DISTANCE` 60 phía trước), face ball, cooldown 0.5s — Agent
- [F003] `BallController.shoot(side)`: `Side.Human=1`; `BALL_SHOT_X/Y=18/12`; skip BodySensor lift 0.5s; baseline `|vy|` — Agent
- [F004] `MatchController`: timer 90s, GoalSensor → T_1/T_2, GoalPause 1.5s, kickoff; không popup — Agent
- [F004] Player `setInputEnabled` / `resetToKickoff`; Ball `enterRestMode` (gravity+damping) — Agent
### Review
- [Review F003] Play mode OK — 2026-08-14
- [Review F002] Play mode OK — 2026-08-13
- [Review F001] Play mode OK — 2026-08-12
- (tick qua `/checklist-done` — không thêm tay)

---

## Format

```
- [Fxxx] Mô tả ngắn — Agent/Human
- [Review Fxxx] Play mode OK — yyyy-mm-dd
```
