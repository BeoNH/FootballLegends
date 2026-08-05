# Hướng dẫn — Animation (Human / Editor)

Phân chia: **Human** tạo clip & gán trong Editor; **Agent** trigger animation từ TS.

## Human (Editor)

### Tạo Animation Clip

1. Chọn node có `Animation` component (hoặc `SkeletalAnimation`)
2. **Animation** panel → Create Clip → lưu `assets/animations/...`
3. Keyframe transform / property cần thiết

### Gán vào component

- [ ] Clip trong **Clips** list của Animation component
- [ ] Default clip (nếu cần)
- [ ] Prefab lưu kèm clip reference

### Checklist visual

- [ ] Timing đúng feel (Play mode — mắt/tay)
- [ ] Loop / không loop đúng spec
- [ ] Không clip missing khi build

## Agent (TypeScript)

- Gọi `animation.play('clipName')` hoặc API tương ứng Cocos 3.x
- **Không** tạo/sửa file `.anim` / clip asset
- Document tên clip string trong spec (Agent/Human dùng cùng tên)

## Spec Fxxx — ghi rõ

| Clip name | Node/Prefab | Trigger từ TS |
|-----------|-------------|---------------|
| | | |

## Verify

Play mode — Human xác nhận feel; Agent xác nhận không lỗi runtime khi gọi tên clip.
