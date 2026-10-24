# F010 — Audio (AudioManager)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `planned` |
| Module | managers |
| Ngày tạo | 2026-10-23 |
| Phụ thuộc | F005, F008 |

## Mô tả

`AudioManager` singleton dùng `AssetLoader.loadAudio`: 1 AudioSource cho music + `playOneShot` cho sfx. Lắng nghe event, không bị gameplay gọi trực tiếp (trừ shot/bounce → thêm event `BALL_SHOT`, `BALL_BOUNCE`).

## Acceptance criteria

- [ ] AC1 — Đủ map sfx: whistle (kickoff), b_shot, b_bounce, goal1/goal2, FinalWhistle, beep5sec (5s cuối), beepOvertime, fireball, teleport, slide (tackle)
- [ ] AC2 — Music: `track` ở Menu, `stadium` loop khi chơi
- [ ] AC3 — Âm thanh phát đúng theo event, không lỗi khi thiếu clip
- [ ] AC4 — `BALL_SHOT`/`BALL_BOUNCE` được gửi từ `BallController`
- [ ] AC5 — Hủy đăng ký event ở `onDestroy`

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/managers/AudioManager.ts` (mới) | singleton, music + sfx, map event → clip |
| `assets/scripts/common/GameEvents.ts` | `BALL_SHOT`, `BALL_BOUNCE` |
| `assets/scripts/gameplay/BallController.ts` | gửi event shot/bounce |

**Map sfx:**

| Clip | Event/Trigger |
|------|---------------|
| whistle | kickoff (`MATCH_KICKOFF`) |
| b_shot / b_bounce | `BALL_SHOT` / `BALL_BOUNCE` |
| goal1 / goal2 | `MATCH_GOAL` |
| FinalWhistle | `MATCH_END` / `MATCH_RESULT` |
| beep5sec | 5s cuối mỗi hiệp |
| beepOvertime | `MATCH_OVERTIME` |
| fireball / teleport / slide | Super / tackle |
| stadium (loop) / track | khi chơi / Menu |

**`@property` cần Human wire:**

| Component | Property | Kiểu | Ghi chú |
|-----------|----------|------|---------|
| `AudioManager` | `musicSource` | AudioSource | |

### Human (Editor)

- [ ] H001 — Node `Audio` + `AudioManager` (+ AudioSource)
- [ ] H002 — Đảm bảo clip nằm trong `assets/resources/sound`
- [ ] H003 — Play theo checklist bên dưới

## Plan

### Agent

- [ ] T001 — `AudioManager` singleton + load clip
- [ ] T002 — Event `BALL_SHOT`/`BALL_BOUNCE` trong GameEvents + BallController
- [ ] T003 — Map event → sfx/music

### Human

- [ ] H001 — Tạo node Audio
- [ ] H002 — Kiểm tra clip
- [ ] H003 — Play + `npm run review:done -- F010`

## Play mode checklist

1. Menu có nhạc `track`; vào trận chuyển `stadium`
2. Sút/nảy bóng có tiếng
3. Ghi bàn goal1/goal2; còi cuối trận
4. 5s cuối beep; Overtime beepOvertime
5. Fireball/Teleport/Tackle có sfx riêng

## Ghi chú / liên kết

- Thuật ngữ: `.cursor/docs/CONTEXT.md`
