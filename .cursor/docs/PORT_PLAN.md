# PORT_PLAN — Port Football Legends (Phaser) sang Cocos 3.8.7

Nguồn sự thật: `.cursor/docs/ORIGINAL_SPEC.md` (gọi tắt SPEC §x). Game gốc chạy ở `http://127.0.0.1:8090` (serve `C:\Users\hoang\Downloads\FootballLegends`), so sánh với preview Cocos `http://localhost:7456`.

## Quyết định kiến trúc
- **Code mới ở `assets/scripts/fl/`**. Code cũ (`gameplay/`, `ui/`, `Game.scene`) KHÔNG sửa; xoá sau khi bản mới chạy được (Phase 7). ccclass mới prefix `FL` để không trùng tên.
- **Dựng UI/scene bằng code** từ atlas + toạ độ SPEC (như bản gốc), không wiring tay trong Editor. Scene mới `assets/scene/Main.scene` chỉ có Canvas + node `App` gắn `FLGameApp`.
- **Design resolution 800x480, FIXED_HEIGHT** = không gian logical của bản gốc. Màn rộng hơn thấy thêm nền (tối đa 1400 logical). `gameWidthLogic = visibleSize.width`.
- **Toạ độ**: helper `P2C(x, y) = (x - 400, 240 - y)` cho object trong world 800x480 (node `gameObjects` đặt ở tâm). UI menu dùng logical 800x480 tương tự, căn trái/phải theo `gameWidthLogic`.
- **Physics**: Box2D builtin, `PhysicsSystem2D.instance.autoSimulation = false`. Vòng lặp tự quản: accumulator fixed `STEP=0.025`, mỗi tick: `t = STEP*timeScale`; nếu `t != 0`: `syncSceneToPhysics` → `step(0.9*t)` → `syncPhysicsToScene` → update objects(t). Gravity world `(0,-450/32)`, `gravityScale` ball 1.5 / player 3, `linearDamping 0.015`. Vận tốc set bằng m/s = px/32, y đảo dấu (SPEC §11.2). Không dùng restitution Box2D cho sàn/mặt ngang: tự set vận tốc trong BEGIN_CONTACT như nape.
- **Filter**: ball/player chỉ va GROUND; head sensor & goal sensor chỉ bắt ball; player không va player (SPEC §3.3, §11.1).
- **Nhân vật**: DragonBones runtime Cocos (`dragonBones.ArmatureDisplay`), file `resources/dragonbones/player_ske.json` + `player_tex.json` + `texture.png` (từ `data/sk.json`, `data/texture.json`). Đổi skin bằng child armature `gotoAndPlay("headN")`, ... (SPEC §8.2).
- **Lưu trữ**: localStorage key `fb21_pk`/`fb21_sfx_pk` + hash Java-style (SPEC §10).
- **Bỏ**: Poki ads, gamepad mobile (làm sau nếu cần), leaderboard.

## Quyết định cho điểm mơ hồ (SPEC §12)
1. Tackle hit-test giữ **đúng bản gốc** (`direction`) — fidelity trước, ghi chú TODO.
2. Tackle phát `slide.ogg` (bản gốc im lặng do thiếu key).
3. Teleport: port nguyên logic, kiểm tra bằng mắt so với bản gốc.
5. Kit mapping: render thử và so sánh.

## Phases
| # | Nội dung | Executor | Verify |
|---|---|---|---|
| P0 | Foundation: Main.scene, FLGameApp, ScreenManager (fade 325ms), Res (preload atlas interface/gameplay, DB, audio), UIKit (nine-slice button 1.05/0.95, text styles Calibri), Storage+Inventory skeleton, Sfx/music (track loop 0.5), MusicButton; Menu + Menu2 screens; import DB assets | Sonnet | screenshot Menu so với gốc |
| P1 | Gameplay core: geometry Play1 (SPEC §2.2), physics loop, BallObject, PlayerObject (graphic tạm: armature hoặc placeholder), controllers bàn phím (SPEC §4), FootballGameCore (goal, slow, restart), Timer/CountDown/Message, HUD (InfoPanel, EnergyBar, Stands help, pause/music), Pause popup; Quick Match chơi được, PostMatch | Sonnet (high) | Playwright chơi thử, so sánh độ cao nảy/nhảy/tốc độ |
| P2 | DragonBones nhân vật đầy đủ + state machine anim (SPEC §3.5, §8.2), shadow | Sonnet | screenshot |
| P3 | Super shot Fireball/Teleport + tackle/stun + effects (SPEC §6, §3.7) | Sonnet (high) | so sánh trực quan |
| P4 | AIController2 đầy đủ (SPEC §7) | Sonnet (high) | Opus review với spec |
| P5 | RandomState (chọn team/mode/difficulty), Friendly 1P/2P, PostMatch đầy đủ | Sonnet | screenshot |
| P6 | Tournament: bracket, PreMatch/HalfTime, overtime, FinalTournament, save/continue | Sonnet | chơi 1 giải |
| P7 | Polish, so sánh song song, dọn code cũ, cập nhật `.claude/map` | Opus review + Haiku chore | |

Mỗi phase: executor code → `tsc`/diagnostics sạch → Opus review diff + chạy preview so với gốc → fix.
