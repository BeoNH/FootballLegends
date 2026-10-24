# F008 — Energy + Super (Fireball/Teleport) + SlowMo

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `planned` |
| Module | gameplay |
| Ngày tạo | 2026-10-23 |
| Phụ thuộc | F005, F007 |

## Mô tả

Energy tăng 1.5/s khi Playing, đủ 12 thì dùng Super (lưu `MatchData`, giữ qua hiệp). Fireball (slot 0): slowmo ~0.4s đứng hình → `ball.shoot(dir, ×1.8)` + trail, đối thủ trúng bị stun. Teleport (slot 1): scale-out tween → đặt player `ballX + 60·dir` (clamp trong sân) → shoot, slowmo 1s. Human chọn slot ở Menu, Z/K kích hoạt. Goal slow-mo 0.05. Bot không dùng Super.

## Acceptance criteria

- [ ] AC1 — Energy +1.5/s chỉ khi Playing, tối đa 12, giữ qua HalfTime
- [ ] AC2 — Z/K kích hoạt Super khi đủ 12; trừ `SUPER_COST`
- [ ] AC3 — Fireball: slowmo, bóng bay nhanh ×1.8, đối thủ trúng bị stun
- [ ] AC4 — Teleport: dịch chuyển tới `ballX + 60·dir` trong sân rồi sút
- [ ] AC5 — `SlowMo` về 1.0 sau khi xong; physics thật sự chậm (verify Play)
- [ ] AC6 — Ghi bàn → slow-mo 0.05 rồi trở lại bình thường

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/common/SlowMo.ts` (mới) | `set(scale)`: `director.getScheduler().setTimeScale` + `PhysicsSystem2D.fixedTimeStep = base*s` |
| `assets/scripts/gameplay/SuperAbility.ts` (mới) | energy, Fireball, Teleport |
| `assets/scripts/gameplay/BallController.ts` | `shoot(dir, mult)` |
| `assets/scripts/gameplay/MatchData.ts` | energy lưu |

**Hằng số (gốc → Cocos):**

| Const | Giá trị | Ghi chú |
|-------|---------|---------|
| `ENERGY_RATE` | 1.5/s | gốc |
| `SUPER_COST` | 12 | gốc |
| `FIREBALL_MULT` | 1.8 | gốc |
| `FIREBALL_SLOWMO_TIME` | ~0.4s | |
| `TELEPORT_OFFSET` | 60 | `ballX + 60·dir`, clamp |
| `TELEPORT_SLOWMO_TIME` | 1s | |
| `GOAL_SLOWMO` | 0.05 | gốc |

**Rủi ro:** `fixedTimeStep` có thể không làm chậm physics; fallback `PhysicsSystem2D.enable` (scale 0 tắt step).

**`@property` cần Human wire:**

| Component | Property | Kiểu | Ghi chú |
|-----------|----------|------|---------|
| `SuperAbility` | `ball`, `opponent` | Node/PlayerController | |

### Human (Editor)

- [ ] H001 — Gắn `SuperAbility` vào Player; wire `ball`, `opponent`
- [ ] H002 — (Tùy chọn) node Trail MotionStreak con của Ball
- [ ] H003 — Play theo checklist bên dưới

## Plan

### Agent

- [ ] T001 — `SlowMo` + verify physics chậm
- [ ] T002 — `SuperAbility`: energy + Fireball
- [ ] T003 — Teleport + clamp
- [ ] T004 — Goal slow-mo 0.05

### Human

- [ ] H001 — Gắn/wire SuperAbility
- [ ] H002 — Trail (tùy chọn)
- [ ] H003 — Play + `npm run review:done -- F008`

## Play mode checklist

1. Energy tăng đều, qua HalfTime không mất
2. Đủ 12 + Z → Fireball đúng hướng, đối thủ stun
3. Teleport tới cạnh bóng, không ra ngoài sân
4. Slowmo về 1.0 sau khi xong
5. Ghi bàn có slow-mo ngắn

## Ghi chú / liên kết

- Thuật ngữ: `.cursor/docs/CONTEXT.md`
