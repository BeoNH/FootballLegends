# Tối ưu kích thước Bundle (<5MB mục tiêu)

## Nén Texture (Tác động lớn nhất)

**Mục tiêu: <5MB tổng kích thước bundle cho playable ads**

Nén texture là yếu tố quan trọng nhất ảnh hưởng kích thước bundle. Bật nén cho tất cả nền tảng.

### Cấu hình Build Settings

```json
// Project Settings → Build → Web Mobile
{
    "textureCompression": {
        "web-mobile": "auto",     // Tự chọn nén tốt nhất
        "web-desktop": "auto",
        "android": "etc1",        // ETC1 cho Android
        "ios": "pvrtc"            // PVRTC cho iOS
    },
    "packAutoAtlas": true,       // Tự tạo atlas
    "md5Cache": false,           // Tắt để output nhỏ hơn
    "inlineSpriteFrames": true   // Giảm số file
}
```

### Hướng dẫn kích thước Texture

```typescript
// ✅ XUẤT SẮC: Kích thước texture tối ưu cho playable

// Sprite nhân vật: tối đa 512x512 (thường 256x256 là đủ)
// Phần tử UI: tối đa 256x256
// Nền: tối đa 1024x1024 (hoặc dùng texture nhỏ lặp tile)
// Hiệu ứng: 128x128 hoặc 256x256
// Icon: 64x64 hoặc 128x128

// ❌ SAI: Texture quá lớn
// - 2048x2048 cho sprite nhân vật nhỏ
// - Ảnh độ phân giải cao không hiển thị ở quy mô đó
// Dùng kích thước phù hợp độ phân giải hiển thị
```

## Thứ tự ưu tiên tối ưu Asset

### 1. Texture (50–60% bundle)

```typescript
// ✅ XUẤT SẮC: Cấu hình sprite atlas
// Gộp nhiều texture nhỏ thành một atlas
// - Animation nhân vật: một atlas
// - Phần tử UI: một atlas
// - Hiệu ứng: một atlas

// Cài đặt auto-atlas (Project Settings):
// - Max Width: 2048
// - Max Height: 2048
// - Padding: 2
// - Allow Rotation: true
// - Force Square: false

// ❌ SAI: File texture riêng lẻ
// Mỗi texture riêng = một HTTP request + nén kém hơn
```

### 2. Audio (20–30% bundle)

```typescript
// ✅ XUẤT SẮC: Tối ưu audio
// - Định dạng: MP3 hoặc OGG (không dùng WAV)
// - Nhạc nền: tối đa 128kbps, vòng lặp ngắn (<30 giây)
// - Hiệu ứng âm thanh: 64kbps, rất ngắn (<2 giây)

// ❌ SAI: Audio không nén
// - File WAV: lớn hơn 10–20 lần so với đã nén
// - Track nhạc dài: dùng vòng lặp ngắn
// - Bitrate cao: 320kbps không cần thiết cho playable
```

### 3. Code (5–10% bundle)

```typescript
// ✅ XUẤT SẮC: Minify code
// rollup.config.js hoặc webpack.config.js
export default {
    mode: 'production',
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,      // Xóa console.log
                        drop_debugger: true,     // Xóa debugger
                        dead_code: true,         // Xóa code không thể chạy tới
                        unused: true             // Xóa biến không dùng
                    },
                    mangle: { toplevel: true }   // Rút gọn tên biến
                }
            })
        ]
    }
};

// ✅ XUẤT SẮC: Chỉ import những gì cần
import { Vec3, Node } from 'cc'; // Import cụ thể

// ❌ SAI: Import toàn bộ module
import * as cc from 'cc'; // Import mọi thứ (bundle lớn hơn)
```

### 4. Font (5–10% bundle)

```typescript
// ✅ XUẤT SẮC: Bitmap font cho playable
// - Render trước ký tự lên texture
// - Chỉ gồm ký tự cần: "0123456789,."
// - Nhỏ hơn nhiều so với font TTF

// Tạo bitmap font:
// 1. Dùng công cụ BMFont hoặc generator online
// 2. Chỉ gồm ký tự cần thiết
// 3. Export dạng .fnt + .png
// 4. Import vào Cocos Creator dạng BitmapFont

// ❌ SAI: Font TTF
// - Kích thước file lớn (hàng trăm KB)
// - Font hệ thống khác nhau theo nền tảng
// - Dùng bitmap font cho playable
```

## Cấu hình Build cho kích thước tối thiểu

```json
// Project Settings → Build → Web Mobile

{
    // Cài đặt bundle
    "inlineSpriteFrames": true,      // Giảm số file
    "md5Cache": false,               // Tắt MD5 trong tên file
    "mainBundleCompressionType": "default",
    "mainBundleIsRemote": false,

    // Tối ưu code
    "debug": false,                  // Tắt chế độ debug
    "sourceMaps": false,             // Tắt source map
    "separateEngine": false,         // Gộp engine vào bundle

    // Tối ưu texture
    "packAutoAtlas": true,           // Tự tạo atlas
    "textureCompression": "auto",    // Bật nén

    // Loại trừ tính năng
    "excludeScenes": [],             // Xóa scene không dùng
    "useBuiltinServer": false        // Playable không cần server
}
```

## Xóa Asset không dùng

```typescript
// ✅ XUẤT SẮC: Dọn dẹp asset thường xuyên

// 1. Dùng tính năng "Find References" của Cocos Creator
// - Chuột phải asset → Find References
// - Xóa nếu không có tham chiếu

// 2. Kiểm tra output build
// - Xem kích thước thư mục build sau mỗi lần build
// - Xác định file lớn nhất
// - Xóa asset không dùng

// 3. Xóa asset debug trước khi build
// - Level test
// - Sprite và texture debug
// - Công cụ chỉ dùng khi phát triển
// - Asset tạm thời

// ❌ SAI: Giữ tất cả asset "phòng khi cần"
// - Texture không dùng làm tăng kích thước không cần thiết
// - Dọn dẹp thường xuyên trong quá trình phát triển
```

## Ví dụ thực tế: Phân tích kích thước

```typescript
// Mục tiêu: bundle playable <5MB
// Phân bổ tối ưu điển hình:

// Texture: 2.5MB (50%)
// - Sprite nhân vật: 800KB (sprite atlas, nén ETC1)
// - Phần tử UI: 600KB (sprite atlas, nén ETC1)
// - Nền: 700KB (1024x1024, nén, hoặc tile)
// - Hiệu ứng: 400KB (sprite atlas, đã nén)

// Code: 400KB (8%)
// - Engine Cocos: 200KB (minify, tree-shaken)
// - Logic game: 200KB (minify, đã xóa dead code)

// Audio: 1.5MB (30%)
// - Nhạc nền: 1MB (MP3, 128kbps, vòng lặp 60s)
// - Hiệu ứng âm thanh: 500KB (MP3, 64kbps, 10 clip ngắn)

// Khác: 600KB (12%)
// - Bitmap font: 200KB (chỉ ký tự cần)
// - File cấu hình: 100KB (JSON, minify)
// - Asset khác: 300KB

// Tổng: 5.0MB (trong giới hạn mạng quảng cáo)

// ❌ VÍ DỤ TỆ: Chưa tối ưu (12MB+)
// - Texture: 8MB (không nén, file riêng lẻ)
// - Audio: 3MB (file WAV, track dài)
// - Code: 800KB (không minify, chế độ dev)
// - Font: 400KB (font TTF)
// Tổng: 12.2MB (bị mạng quảng cáo từ chối!)
```

## Giám sát kích thước Bundle

```bash
# ✅ XUẤT SẮC: Giám sát kích thước thường xuyên

# 1. Kiểm tra kích thước output build
du -sh build/web-mobile/

# 2. Phân tích theo loại asset
du -sh build/web-mobile/assets/
du -sh build/web-mobile/src/

# 3. Tìm file lớn nhất
find build/web-mobile -type f -exec du -h {} \; | sort -rh | head -20

# 4. Đặt ngân sách kích thước trong CI/CD
# Fail build nếu bundle >5MB
# Cảnh báo nếu bundle >4.5MB (ngưỡng warning)
```

## Pattern Lazy Loading (Tùy chọn)

```typescript
import { _decorator, Component, resources, Prefab } from 'cc';
const { ccclass } = _decorator;

@ccclass('LazyLoader')
export class LazyLoader extends Component {
    // ✅ XUẤT SẮC: Load level theo nhu cầu
    // Với playable nhiều level, chỉ load level hiện tại

    private levelPrefabs: Map<number, Prefab> = new Map();

    public async loadLevel(levelId: number): Promise<void> {
        if (this.levelPrefabs.has(levelId)) {
            return; // Đã load rồi
        }

        const path = `levels/level_${levelId}`;
        return new Promise((resolve, reject) => {
            resources.load(path, Prefab, (err, prefab) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.levelPrefabs.set(levelId, prefab);
                resolve();
            });
        });
    }

    // ✅ TỐT: Unload level trước
    public async switchLevel(fromLevel: number, toLevel: number): Promise<void> {
        const prevPrefab = this.levelPrefabs.get(fromLevel);
        if (prevPrefab) {
            prevPrefab.decRef();
            this.levelPrefabs.delete(fromLevel);
        }
        await this.loadLevel(toLevel);
    }
}

// ❌ SAI: Load tất cả level lúc bắt đầu
// - Tăng kích thước bundle ban đầu
// - Thời gian load lâu hơn
// - Chỉ load những gì cần cho level đầu
```

## Checklist tối ưu kích thước

**🔴 Quan trọng (Tác động lớn nhất):**
- [ ] Bật nén texture (auto hoặc theo nền tảng)
- [ ] Dùng sprite atlas (gộp texture)
- [ ] Giảm kích thước texture (tối đa 512x512 cho nhân vật)
- [ ] Nén audio (MP3/OGG, 64–128kbps)
- [ ] Xóa asset không dùng

**🟡 Quan trọng vừa:**
- [ ] Bật minify code (drop_console, xóa dead code)
- [ ] Dùng bitmap font (không dùng TTF)
- [ ] Tắt source map trong production
- [ ] Import module cụ thể (tree shaking)
- [ ] Xóa asset debug/test

**🟢 Nên có:**
- [ ] Lazy load level (nếu có nhiều level)
- [ ] Giám sát kích thước bundle trong CI/CD
- [ ] Đặt cảnh báo ngân sách kích thước (<5MB giới hạn cứng)
- [ ] Theo dõi xu hướng kích thước theo thời gian

**Mục tiêu: <5MB tổng kích thước bundle để playable ad được duyệt.**
