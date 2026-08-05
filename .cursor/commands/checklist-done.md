---
name: checklist-done
description: Xác nhận đã test Play mode — tick checklist docs (npm run review:done)
---

Đã test Play mode xong. Tick checklist review trong docs bằng script — **không** tick tay từng checkbox.

1. Chạy `npm run review:done -- [Fxxx]` (bỏ `Fxxx` nếu không chỉ định — script tự tìm feature `in-progress`)
2. Xem output script; báo user file nào đã cập nhật
3. Không hỏi lại từng checkbox — user đã xác nhận bằng lệnh

Xem trước không ghi file: `node mark-review-done.mjs --dry-run F001`
