# FootballLegends — map
Port 1:1 game web "Football Legends" (Phaser 2 + nape + DragonBones) sang Cocos Creator 3.8.7. 1 scene `assets/scene/Main.scene` (Canvas + node App/FLGameApp); mọi màn/UI dựng bằng code từ atlas.
Stack: Cocos 3.8.7 + TS + Box2D builtin (step thủ công) + DragonBones runtime | Run: Editor preview http://localhost:7456 | Typecheck: `npx -y -p typescript@5.4.5 tsc --noEmit -p .` (lọc `^assets/`)

## Where things are
| Area | Path | Notes |
|---|---|---|
| Entry | assets/scripts/FLGameApp.ts | component gốc trên node App; onLoad đăng ký các màn qua ScreenManager.registerAll |
| App shell | assets/scripts/fl/app | ScreenManager (fade 325ms), Res (atlas/DB/audio + ảnh rời), UIKit, NetworkManager (httpPost → portal, null khi lỗi), Sfx, Storage(fb21_pk+hash), Inventory (mode/team/tournament), MatchData, PlayersData (CLB, skin), Features (ẩn/hiện mode) |
| Screens | assets/scripts/fl/screens | Preloader, Menu/Menu2 (MenuScreen.ts; Menu có nút RANK/HISTORY → ListPopup.ts: RankPopup/HistoryPopup, API /getRankList /getHistory), RandomState (chọn team/mode), PostMatch, Tournament*, PreMatch, FinalTournament, TournamentUI |
| Gameplay | assets/scripts/fl/game | GameplayScreen, GameCore (fixed 40Hz, slow, goal, timer), Physics (PhysBody API kiểu Phaser), BallObject, PlayerObject, PlayerView (DragonBones/placeholder), Controllers (phím), TouchControls (nút cảm ứng, mobile), AIController2 (bot), GameBuilder, Hud, GameConsts |
| Assets | assets/resources/{images,dragonbones,sound,fonts} | atlas plist interface/gameplay (offset trim đã sửa), DB player_ske/tex |
| Spec gốc | .claude/docs/ORIGINAL_SPEC.md | nguồn sự thật: số liệu, toạ độ Phaser, AI, luật |
| Game gốc | C:\Users\hoang\Downloads\FootballLegends | serve `python -m http.server 8090` để so sánh |
| MCP plugin | extensions/funplay-cocos-mcp | third-party, profile full (funplay-cocos-mcp.config.json) |
| Build hook | extensions/build-zip | sau build tự zip thư mục build → `<tên>_DDMMYY.zip` |

## Entry points
- assets/scene/Main.scene — start scene (preview), node App gắn FLGameApp
- assets/scripts/FLGameApp.ts — registerAll({...}), Preloader → Menu, drive ScreenManager.update

## Key flows (details: ARCHITECTURE.md)
- Menu → PLAYER → (Menu2 bị skip nếu chỉ 1 mode) → RandomState (mỗi đội 1 cầu thủ random) → PLAY → Gameplay → PostMatch; pause HOME → Menu
- Backend: FLGameApp.start `/login` {token URL} → Inventory.userName (rỗng = offline); PostMatch `/saveScore`; Menu popup `/getRankList` `/getHistory`
- Tick: accumulator STEP 0.025 → physics.step(0.9*t) → objects.update(t) → contact callbacks set vận tốc trực tiếp (nape style)

## Conventions
- Toạ độ logic Phaser (x→, y↓, world 800x480). `P2C(x,y)=(x-400,240-y)`; PhysBody.px/py/vx/vy đã ở hệ Phaser. Box2D raw m/s (1m=32px).
- Hằng số gameplay ở GameConsts.ts, copy đúng số từ spec. ccclass mới prefix `FL`. Comment tiếng Việt.
- Ẩn/hiện mode: chỉ sửa `fl/app/Features.ts`.
- Mobile UI: Features.isMobileUI() (FORCE_MOBILE_UI để test trên PC)
- Ảnh build web dùng preset nén `webp` (builder.json + compressSettings trong .meta); ảnh mới → chạy skill `cocos-webp`.
- Sau khi sửa script từ ngoài: refresh asset-db `db://assets/scripts/fl` rồi mới test preview.

## Don't touch / generated
- library/ temp/ local/ build/ profiles/ *.meta, *.scene/*.prefab
- extensions/funplay-cocos-mcp (third-party)

## Where to find X
- thông số vật lý/sút/nhảy → game/GameConsts.ts (+ spec §3)
- bot → game/AIController2.ts (spec §7)
- super shot Fireball/Teleport → game/PlayerObject.ts (superHit/superDefence), BallObject.ts
- HUD/pause → game/Hud.ts, GameplayScreen.ts
- tournament logic → app/Inventory.ts; UI → screens/Tournament*.ts
- skin cầu thủ → app/PlayersData.ts


## Debug trực quan
- Không dùng prefab màn hình: mọi màn dựng bằng code (UIKit), tên node rõ ràng (sidebar, content, gameObjects/players/ball, physics, gui).
- Xem cây node runtime: chạy Preview in Editor → Hierarchy/Inspector hiện node thật, chỉnh vị trí trực tiếp để thử.
