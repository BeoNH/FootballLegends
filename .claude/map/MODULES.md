# Modules
Xem bảng "Where things are" trong INDEX.md; chi tiết hành vi lấy từ .claude/docs/ORIGINAL_SPEC.md (mỗi file game/ ghi chú mục SPEC tương ứng trong comment đầu file).
- fl/app: hạ tầng không phụ thuộc gameplay. UIKit.sprite dùng trim=false (anchor theo sourceSize như Phaser).
- fl/screens: mỗi màn = class extends FLScreen, đăng ký trong FLGameApp.
- fl/game: không import fl/screens. Bot = AIController2 (port nguyên văn, dùng toạ độ Phaser từ PhysBody).
