# F009 — HUD & UI (Menu, HalfTime, Result, TouchControls)

| Mục | Giá trị |
|-----|---------|
| Trạng thái | `planned` |
| Module | ui |
| Ngày tạo | 2026-10-23 |
| Phụ thuộc | F005, F008 |

## Mô tả

HUD lắng nghe event F005/F008 qua `BroadcastReceiver` (không giữ ref MatchController): score (`NumberScrolling`), timer, 2 energy bar (Sprite fillRange), countdown label, banner GOAL!!!/HALF TIME!/OVERTIME!/FULL TIME!. Popup kế thừa `ui/popup/UiPopup.ts`: Menu (Play + chọn Super), HalfTime, Result (YOU WON/LOST/DRAW + Rematch + Menu). TouchControls gọi API PlayerController human, ẩn trên desktop (`sys.isMobile`). Phím P pause / Space resume là tùy chọn, làm cuối.

## Acceptance criteria

- [ ] AC1 — HUD hiển thị score, timer, energy 2 bên, cập nhật theo event
- [ ] AC2 — Countdown 3-2-1-GO và banner đúng thời điểm
- [ ] AC3 — Menu: Play bắt đầu trận (`MATCH_START`), chọn Fireball/Teleport
- [ ] AC4 — HalfTime popup hiện giữa hiệp; Result popup hiện kết quả đúng + Rematch/Menu hoạt động
- [ ] AC5 — TouchControls (←/→ hold, Jump, Shoot, Tackle, Super) điều khiển Player; ẩn trên desktop
- [ ] AC6 — Hủy đăng ký `BroadcastReceiver` ở `onDestroy`

## Phân công

### Agent (TypeScript)

| File | Thay đổi |
|------|----------|
| `assets/scripts/ui/HudMatch.ts` (mới) | score/timer/energy/countdown/banner |
| `assets/scripts/ui/popup/MenuPopup.ts` (mới) | `onClickPlay`, `onClickSuper0/1` |
| `assets/scripts/ui/popup/HalfTimePopup.ts` (mới) | popup nghỉ giữa hiệp |
| `assets/scripts/ui/popup/ResultPopup.ts` (mới) | `onClickRematch`, `onClickMenu` |
| `assets/scripts/ui/TouchControls.ts` (mới) | 6 nút → API PlayerController |

**`@property` cần Human wire:**

| Component | Property | Kiểu | Ghi chú |
|-----------|----------|------|---------|
| `HudMatch` | labels score/timer/countdown/banner, 2 energy Sprite | Label/Sprite | Sprite type Filled |
| `TouchControls` | `player` + 6 button | PlayerController/Node | |

### Human (Editor)

- [ ] H001 — Node HUD: labels score/timer/countdown/banner, 2 Sprite energy (Filled)
- [ ] H002 — Node PopupRoot + 3 popup (Menu, HalfTime, Result); Button Click Events → `onClickPlay/onClickRematch/onClickMenu/onClickSuper0/1`
- [ ] H003 — Node TouchControls + 6 button
- [ ] H004 — Wire `@property` theo bảng; Play theo checklist

## Plan

### Agent

- [ ] T001 — `HudMatch`
- [ ] T002 — `MenuPopup`, `HalfTimePopup`, `ResultPopup`
- [ ] T003 — `TouchControls`
- [ ] T004 — (Cuối) pause P / resume Space

### Human

- [ ] H001 — Dựng HUD
- [ ] H002 — Dựng popup + Click Events
- [ ] H003 — Dựng TouchControls
- [ ] H004 — Play + `npm run review:done -- F009`

## Play mode checklist

1. Menu hiện trước; Play → countdown → HUD chạy
2. Ghi bàn → score cuộn, banner GOAL
3. Energy bar tăng đúng, tối đa khi đủ 12
4. HalfTime/Result popup đúng; Rematch reset sạch
5. Mobile preview: TouchControls điều khiển được; desktop ẩn

## Ghi chú / liên kết

- Pattern: `assets/scripts/ui/popup/UiPopup.ts`
- Thuật ngữ: `.cursor/docs/CONTEXT.md`
