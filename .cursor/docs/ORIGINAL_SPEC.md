# ORIGINAL_SPEC — Football Legends (Phaser 2 CE + nape + DragonBones)

Reverse-engineer từ `C:\Users\hoang\Downloads\FootballLegends` (`football_legends.min.js` ~24k dòng sau beautify, webpack bundle; code game = các module TypeScript compile, phần còn lại là Phaser/p2/WebFont/DragonBones). Mọi số liệu bên dưới copy từ code. Tọa độ **gốc Phaser**: origin góc trên-trái, y hướng xuống, đơn vị px, trừ khi ghi khác. Chỗ nào không chắc có đánh dấu **[?]**.

Tóm tắt nhanh: game bóng đá 2D side-view, chơi bằng đầu + chân (kiểu Head Soccer): 1v1 / 2v2 / 1v2, có Friendly, Tournament 16 đội (Round of 16 → Final), Quick Match. 24 CLB x 2 cầu thủ = 48 nhân vật; mỗi cầu thủ có 1 super shot (chẵn = Fireball, lẻ = Teleport). Không có coins, unlock, shop. Poki SDK (ads) có thể bỏ.

---

## 0. Cấu trúc file nguồn và module (để tra ngược)

| Module (webpack id) | Vai trò | Name state |
|---|---|---|
| 63 `Boot` | init scale, plugin, load tối thiểu | `boot` |
| 41 `SiteLock` | check domain (đã comment, luôn đi tiếp) | `sitelock` |
| 4 `Preloader` | load toàn bộ asset, load storage | `preloader` |
| 35 `Menu` | 1 PLAYER / 2 PLAYERS / QUICK MATCH | `menu` |
| 17 `Menu2` | TOURNAMENT / FRIENDLY / BACK | `menu2` |
| 36 `RandomState` | chọn team, mode, difficulty | `randomstate` |
| 98 `TournamentState` | bracket 16 đội | `tournamentstate` |
| 37 `PreMatch` | preview trận / half-time | `prematchstate` |
| 24 `Gameplay` | trận đấu | `gameplay` |
| 53 `PostMatch` | kết quả trận | `postmatchstate` |
| 55 `FinalTournament` | podium cuối giải | `finaltournamentstate` |

Class gameplay: `FootballGameCore` (13), `NapePhysics` (27), `PlayerObject` (77), `BallObject` (30), `AIController2` (79), `PlayerController/2/General` (80/81/82), `TimerObject` (45), `CountDownObject` (87), `EnergyBar` (88), `MessageInfo` (89), `PlayGroundObject` (90), `Teleport` (84), `GameBuilder` (46), `Inventory` (23), `PlayersData` (20), `ObjectsData` (26 – hằng số vật lý), `Materials/Filters/CbTypes` (76/75/74).

**Code chết / không dùng** (đừng port): `AIController` (78, bot đơn giản), `WaveObject`, `MagicFistObject`, `BallTrail` (class rỗng; trail thật là Phaser emitter), `superPower == 2` (không bao giờ xảy ra vì `skinIndex % 2`), anim `hulk_hit`, `Sounds.slide` (không được phát, xem mục 9). `assets/data/Players.json` chỉ dùng key `match1..match16` (vị trí panel bracket); toàn bộ key khác (`driver_*`, `suspend_*`...) là rác từ game xe. `Play1.json` có `settings.par/star/hole` cũng là rác từ game golf, chỉ dùng `layers`.

---

## 1. Màn hình, state, flow

### 1.1 Độ phân giải & scaling
- Phaser.Game: `width 1066, height 640`, WEBGL, transparent, parent `#content`, antialias. `Constants.WIDTH=1066, HEIGHT=640`, `GAME_W=1066, GAME_H=640, GAME_W2=400, GAME_H2=240` (400/240 là nửa của **800x480 logical**).
- **Toàn bộ gameplay + UI thiết kế trong không gian logical 800x480**, render scale `1.33333` (800*1.3333 = 1066). Scale mode `USER_SCALE`; game size tính lại theo cửa sổ: `CALCULATED_WIDTH/HEIGHT`; `gameWidthLogic = game.width/1.3333` (>= 800, tối đa `GAME_WIDTH_LOGIC_MAX = 1400`). Nghĩa là màn rộng hơn 16:10 sẽ thấy thêm nền hai bên (background rộng 1400, đặt x=-300). UI menu đặt theo `gameWidthLogic` (sidebar canh phải, nút BACK canh trái, NEXT canh phải).
- Tween chuyển state: `PRELOADER_TIME = 325 ms`, easing `Linear.None` khi thoát, `Back.Out` khi vào. `changeState`: tween alpha popup (nếu có) rồi `state.hide()` rồi sau 325 ms `state.start(next)`.
- Fixed timestep gameplay: `STEP = 0.025` (40 Hz), accumulator, `MAX_FRAME_TIME = 0.1`. `game.time.desiredFps = 40`.
- Font: `Calibri-Bold` (woff đi kèm). Màu text: xanh `#005887` (button), vàng `#FFD400`, trắng `#FFFFFF`, đen `#000000`, cam `#FF9900`. Màu nền loading `0x247AF9`; nền portrait mobile `0x44C0F4`/`0x7C4418` (bỏ qua nếu chỉ làm landscape).
- Style text: `styleCalibri80 (80px trắng)`, `48 trắng`, `40 (#005887)`, `40_yellow`, `36_white`, `30 = 32px #005887`, `26`, `20 trắng`, `18`, `16`, `16_black`, `16_orange`, `16_blue`.

### 1.2 Nine-slice (atlas `interface`)
`NineSlice(atlas, key, top, bot, left, right)`: `tex_blue0000/tex_yellow0000/tex_green0000/tex_dark_blue0000 = (28,32,28,28)`, `tex_navy0000 = (16,16,16,16)`, `tex_yellow_fill0000 = (20,22,20,20)`. Button chuẩn: nine-slice `w x h` + label căn giữa; hover/down scale 1.05 / 0.95 (`_dynamicScaleUp/Down`), disable tint `0x999999`.

### 1.3 Sơ đồ flow

```
Boot -> SiteLock(bỏ qua) -> Preloader -> Menu
Menu: [1 PLAYER]   numPlayers=0  -> Menu2
      [2 PLAYERS]  numPlayers=1  -> Menu2      (ẩn trên mobile)
      [QUICK MATCH] initQuickMatch -> Gameplay (matchState=0, bot skill 0.2)
Menu2: [TOURNAMENT] gameMode=0 (nếu có save -> popup CONTINUE / NEW Tournament)
       [FRIENDLY]   gameMode=1 -> RandomState
       [BACK] -> Menu
RandomState (friendly):  PLAY -> Gameplay   | BACK -> Menu2
RandomState (tournament): NEXT -> createNewTournament -> TournamentState
TournamentState: NEXT/Space -> PreMatch (matchState=1) | BACK -> Menu2
PreMatch: PLAY/Space -> Gameplay | BACK -> TournamentState | (matchState==2: "LEAVE TOURNAMENT" -> popup xác nhận -> Menu2)
Gameplay: pause (P / nút / Space để resume) ; hết hiệp 1 -> PreMatch ("Half-Time") ; hết trận -> PostMatch
PostMatch: friendly -> NEXT -> RandomState ; quick -> NEXT -> Menu ; tournament -> nextLeg()
           còn thi đấu -> TournamentState ; bị loại/giải kết thúc -> FinalTournament
           BACK (chỉ friendly/quick) = chơi lại ngay (clearScore, Gameplay)
FinalTournament: NEXT -> clearTournamentData -> Menu2
```
Space = nút chính (NEXT/PLAY/Resume) trong các màn có phím tắt.

### 1.4 UI từng màn (logical coords 800x480, trừ ghi chú)

**Preloader**: nền `0x247AF9` 800x480, text "MADPUFFERS 2019©" (style16) canh dưới, "LOADING..." (style48) ở `y = 0.75*height`, hiển thị `Loading N%`. Load: images `0bg_0xs`, `logo_mad`; atlas `interface`; (nền) atlas `gameplay`, `images/texture.png`, json `sk`, `texture`, `Play1`, `Players`, 13 sfx, rồi track nhạc. Xong -> `Menu`, phát nhạc `track`.

**Menu (`menu`)**: sidebar (class `MenuSideBar`) `WIDTH 350 x HEIGHT 480`, canh phải: `x = gameWidthLogic - 350`. `addButton`: `x += 175 + 24`, `y += 240`. Nút 226x74:
- "1 PLAYER" (texYellowSlice) tại (0,-80) => tâm (199, 160)
- "2 PLAYERS" (texYellowSlice) tại (0,0) => (199, 240)
- "QUICK MATCH" (texBlueSlice) tại (0,80) => (199, 320)
- Mobile: ẩn 2 PLAYERS; 1 PLAYER y+=20, QUICK y-=20.
- Logo `logo_game0000` (559x90) tại `(gameWidthLogic/2, 45)`, tween vào `from y:-145` Back.Out; sidebar `from x: gameWidthLogic+width`.
- Music button tại (40,40); text version "1.1.0p" style16 tại (0, 460).
- Nền: sprite cầu thủ trang trí của team lưu (`Inventory.getTeam()`): shadow `ShadowMC0000` scale 1.5 + armature scale 0.64 tại (580, 360) trên nền sân (`PlaygroundUI`, bg `0bg_00000` + Goals tại (277,172) và (1125,172) scale -1 — vị trí cho nền 1400 rộng).

**Menu2 (`menu2`)**: giống Menu; nút "TOURNAMENT" (yellow), "FRIENDLY" (yellow), "BACK" (blue) cùng vị trí (0,-80/0/80), 226x74. Popup khi đã có save Tournament: nền đen alpha .5 + panel 312x356 (`tex_dark_blue`), title "WARNING" (style26), 4 dòng "IF YOU CHOOSE / NEW TOURNAMENT, / YOU WILL LOST / YOUR PROGRESS" (style20), nút "CONTINUE" (yellow 226x80 tại y=30, label 2 dòng "CONTINUE" + "Tournament"), "NEW Tournament" (blue tại y=115). Space = NEW.

**RandomState (chọn team)**: nền tối `backgroundFade` (đen alpha 0.8). `centeredContent.x = gameWidthLogic/2`. Logo panel `logo` (0,35) với nút-label 500x60 darkblue: "Friendly Match" hoặc "Championship" (style40_yellow). `SelectPlayer` (panel 340x364 darkblue) P1 tại (-228,122), P2 tại (228,122) (chỉ khi `gameMode==1`). Trong panel:
  - nút mũi tên `btn_blue_arrow0000` tại (-89,14) scale -1 và (89,14) đổi team (prev/next, vòng 1..24, không trùng team đối thủ; sfx `button`).
  - emblem `Emblems00xx` (anchor .5, y+10), tên CLB (style26_yellow, maxSize 130x60, y=-45), navy bar 160x36 tại (-80,-66), blue box 128x92 tại (-64,-32).
  - 2 cầu thủ (armature `player` scale .65) tại x=-40 và x=55, y=159; click để chọn cầu thủ 1/2 (`manager.players[id]=1|2`; cầu thủ không chọn bị gotoAndStop idle), shadow cam `ShadowMC_or0000` / hồng `ShadowMC_pi0000` đánh dấu người được chọn (x LEFT_SHADOW_X=-72 / RIGHT_SHADOW_X=88, y 220, scale 1.5).
  - Dưới: 2 box yellow 160x54 tại (-157,228), (3,228) hiện icon `icon_ball0000`/`icon_ball0001` (scale .6) + text "Fireball" / "Teleport" (style20_blue) = hint super shot.
  - label "Player N" / "Player 1","Player 2" tuỳ `setUp(0|1|2)`.
  - `MatchModePanel` (x=4,y=178): panel 144x260 darkblue, title "Mode" (yellow), 3 nút 128x48 (y=-30,30,90) dùng icon `iconPl0000`: mode0 = 1v1, mode1 = 2v2, mode2 = 1v2 (P vs 2 bot); "CPU" label cam/xanh khi 2 người chơi. Chỉ hiện khi friendly, hoặc tournament 1 người (`createPanel`).
  - Difficulty (chỉ tournament + 1 người): panel 144x154 tại (3,380), "Normal" / "Hard" (mặc định Normal, `Inventory.difficulty` 0/1).
  - Nút dưới y=446: PLAY ("NEXT" nếu tournament) 192x76 canh phải `x = gameWidthLogic - w/2 - 10`; BACK canh trái `x = w/2+10`.
  - Mặc định team P1 = `Inventory.getTeam()+1` (lưu trong save key `team`, lần đầu đoán theo `navigator.language`). P2 mặc định khác P1.
  - Matchstate: friendly=0, tournament=1.

**TournamentState (bracket)**: `centeredContent.y=-10`, logo (0,35) "Tournament Grid" (style40_yellow, nút 310x68 darkblue). 16 `MatchPanelResult` (128x88 nine-slice: blue=chưa/đội khác, yellow=trận có đội của người chơi, green=trận hiện tại của người chơi); vị trí lấy từ `Players.json` (x phải trừ 400 khi add vào centeredContent): `match1..4` x=70 y=62,164,266,368; `match5..8` x=730 y=62,164,266,368; `match9,10` x=200 y=113,317; `match11,12` x=600 y=113,317; `match13` (270,215); `match14` (530,215); `match15` Final (400,140); `match16` 3rd place (400,340). Text nhãn tại (x-400, y-50): 9,11 "Quarterfinal", 13,14 "Semifinal", 15 "Final" (style20), 16 "3rd place match" (style18). Mỗi panel: 2 emblem `Emblemsv2xxxx` scale .45 tại (-25,-18) và (-25,16), điểm số text (style30) tại (30,-16) và (30,18) ("-" nếu chưa đá). Panel i dùng `rounds[2i-2], rounds[2i-1]`, kết quả `results[...]`. `fill(n, done)`: state0 fill(8,0); 1 fill(12,8); 2 fill(14,12); 3 fill(16,14); 4 fill(16,16).

**PreMatch (`PreMatchPanelResult(id)`)**: id 0 (cũ, "Match Preview"), 1 = "Half-Time" (dùng ở tournament giữa trận: `matchState-1`), 2 = kết quả (PostMatch). Panel 450x360 darkblue; tiêu đề chặng bằng `defineLeg()`: "Round of 16" / "Quarterfinal" / "Semifinal" / "Final" hoặc "3rd place match" (state 3 và `!isFinal()`). Hiện "0 : 0" hoặc điểm (style80) tại y=140, emblem hai đội scale .8 tại x=±150, tên CLB (style20) y=220, mode panel hiện mode hiện tại. 1 cầu thủ trái tại (selectPlayer -228,122 ẩn mũi tên). Nút PLAY (yellow 192x80) và BACK / "LEAVE\nTOURNAMENT" (blue 192x80), y=444.

**PostMatch**: logo (400,100) và panel id 2: title "YOU WON!!!" / "YOU LOST" / "DRAW" (style48, y=-40), điểm "s1 : s2" (style80, y=15), emblem scale 1 tại x=±140, tên CLB. Hai armature `player` (scale .8, player2 flip scale -.8) tại (±125, 350) trên shadow `ShadowMC0000` scale 2.5; thắng: anim `happy` (thua `sad`, hoà `idle`). Nút NEXT (yellow 192x76) y=440 canh phải, BACK y=440 canh trái; **khi thắng, NEXT/BACK bị khoá 3 giây** (`botButtonsDelay = 3000` rồi tween vào). `canRematch` (tournament, thua): nút "Rematch" + "Watch ad" (rewarded ad -> `restoreTournamentFromBackup`; **bỏ** hoặc thay bằng nút free).

**FinalTournament (podium)**: logo (400,35) text "1st PLACE!!!" / "2nd PLACE!!!" / "3d PLACE!!!" (nếu người chơi vào top 3), "4th PLACE" (`outInfo=="4"`), "YOU LOST" (loại sớm). Sprite `TribuneFinal0000` (283x97) tại (0,443) anchor (.5,1) trong group scale .7 y=80; 3 cầu thủ (scale .8) tại (-6,-93) hạng 1, (-97,-77) hạng 2, (97,-70) hạng 3; emblem `Emblemsv2xxxx` + tên đội ở y=110/150, x: hạng1=0, hạng2=-106, hạng3=106. Cầu thủ người chơi `happy`, đội khác `idle` (dùng cầu thủ 1 của đội đó `2*(team-1)`), bone `cup` hiện cúp frame `frame1/2/3`. Nếu không top 3: panel hạng 4 phụ bên phải (tribune4 tại (280,360)) cầu thủ `sad`. Nút NEXT (0,440).

**Gameplay HUD** (toạ độ trên 1066x640 container, scale ngoài; HUD nằm trong `gui` group của view):
- `InfoPanel` tại (400, 458): sprite `infoPanel0000` (289x65) tại (-2,-10) anchor .5; emblem `Emblemsv2xxxx` scale .75 tại (-109,-9) và (109,-9); score1 text 40px trắng anchor (1,.5) tại (-9,-8) align right; score2 anchor (0,.5) tại (5,-8) align left. Emblem frame: `"Emblemsv200" + (team<=10 ? "0":"") + (team-1)`.
- `Timer` tại (400,50): text style48 trắng (`TimerObject`).
- `EnergyBar` (nhớ y=435): id1 và id2 x=45, id3 x=754 (nằm góc dưới-trái / dưới-phải): nền `btn_bg0000` scale .75, icon `icon_ball000{superPower}` (màu), bản xám `icon_ball2000{superPower}` tint 0x555555 che dần bằng mask arc; hint phím (key_hint0000 tại (-30,30) chữ Z cho id1, V cho id2, K cho id3).
- Nút trên phải: `topRight` group tại x = 1066 (hoặc `game.width - container.x`): Pause (`btn_bg0000` + icon `InGamePauseButton0000`) tại (-90,40), Music (`btn_bg0000` + `InGameMusicButton000{0,1,2}`) tại (-30,40).
- Message ("GOAL!!!", "HALF TIME!", "FULL TIME!", "OVERTIME!") và Countdown tại (400,170), style80. Message: text bọc 2 space, scale tween `from 0.2` 270 ms `Back.Out` rồi `to 0.9` 450 ms `Back.Out` rồi ẩn.
- Gợi ý phím (chỉ desktop) `Stands` = sprite `help000{2*numPlayers}` tại (500,0) và `help000{2*numPlayers+1}` tại (900,0), anchor (.5,0), nằm trong group back có x=-300, tức vị trí thế giới (200,0) và (600,0). Ảnh: `help0000` = ↑←↓→ + "Z-supershot, X-shot, ↓ slide"; `help0001` = WASD + "K-supershot, L-shot, S slide"; `help0002` = WASD + "V-supershot, B-shot, S slide"; `help0003` = mũi tên + "K-supershot, L-shot".
- Mobile (isDesktop=false): bàn phím ảo `GamePad` (nút `btn_bg_white0000`, icon `arrow_icon0000`, `shoot_icon0000`), nằm neo góc dưới: nhóm phải (x=game.width, y=game.height): Up (-100,-80), Z-super (-80,-200), Down/X-shoot (-220,-80); nhóm trái: Left (75,-80), Right (202,-80). Energy bar chuyển vào nút Z. Có thể bỏ nếu chỉ PC.

**Pause popup**: nền tối bắt input; panel 450x356 darkblue (scale 1.3333) với: thanh navy 280x50 tại y=-142 + title "GAME PAUSED" (style40_yellow) y=-140; "s1 : s2" (style80) y=-40; tên 2 CLB (style20) y=-10, x=±140; emblem scale 1 y=-60, x=±140; nút "BACK" (blue 192x76) tại (-100,120), "RESUME" (yellow) tại (100,120). Phím `P` toggle, `Space` (khi đang pause) resume. **Resume không tiếp tục ngay mà chạy lại countdown 3-2-1-GO** (`disposePopup` đặt `isCountDown=true`, `countDown.activate()`; lúc mở pause `isPlaying=false`). BACK -> Quick? Menu : Menu2 (không confirm khi pause popup; hàm `confirmExit` tồn tại nhưng không được gọi).

---

## 2. Thế giới, sân, hình học (tọa độ Phaser, world 800x480)

World gameplay = **x ∈ [0,800], y ∈ [0,480]**, sân trong view: group `gameObjects` đặt tại `FootballGameView` scale 1.3333, `alignIn(world.bounds, CENTER)`, `x = (gameWidthLogic<800)?0 : 0.5*(gameWidthLogic-800)*1.3333`.

### 2.1 Layer vẽ (dưới -> trên, trong `gameObjects`)
`back` (bg `0bg_00000` 1400x480 đặt tại **x=-300**, y=0; stands/help) -> `shadows` -> `players` -> `ball` (ball graphic, countdown, message) -> `effects` (ball trail emitter, ball splash, teleport/…) -> `goals` (2 sprite `Goals0000` 112x145: trái tại (-23,172); phải tại (825,172) scale.x=-1, anchor 0 nên phủ x 713..825). Lưới khung thành vẽ **đè lên** cầu thủ/bóng. HUD ở `gui` riêng.

### 2.2 Geometry vật lý (từ `assets/data/Play1.json`, `levelWidth 800 levelHeight 480`)
`createPolyShape` cộng `params.x/y + vertex` (rotation=0). Ảnh kiểm tra đã dựng overlay xác nhận khớp nền.

| Thành phần | Tọa độ tuyệt đối | Material / CbType / Filter |
|---|---|---|
| **Sàn (SandShaper)** | rect (0,377)-(800,377)-(800,482)-(0,482). Mặt sân y = **377** | `FLOOR`, `cbFloor`, `IF_GROUND` |
| **Trần** | rect x 5..795, y **-184..-174** (nằm ngoài màn hình) | `GROUND`, `cbGround` |
| **Khối khung thành trái** | (-10,-185) (5,-185) (5,165) (65,175) (65,180) (60,185) (10,185) (10,290) (90,290) (95,295) (95,380) (-10,380) | `GROUND`, `cbGround` |
| **Khối khung thành phải** (đối xứng qua x=400) | (705,295) (710,290) (790,290) (790,185) (740,185) (735,180) (735,175) (795,165) (795,-185) (810,-185) (810,280) (810,380) (705,380) | như trên |
| **Sensor bàn thắng trái** (`ToggleE`, id **-1**) | rect x=15, y=185, w=10, h=104 (tức y 185..289; code: `Polygon.rect(x, y - h/2, w, h)` với y=237) | sensor, `cbGoals` |
| **Sensor bàn thắng phải** (id **+1**) | rect x=785, y=185, w=10, h=104 | sensor, `cbGoals` |
| **Điểm đặt bot (`IncBall`, id→x)** | id0=200, id1=280, id2=120 (đội trái); id3=600, id4=520, id5=680 (đội phải); y=340 không dùng | `PlayersData.POINTS=[200,280,120,600,520,680]` |

Hiểu hình học: **khung thành nằm cao hơn sân**: "sàn" trong khung thành là mặt phẳng y=290 (x từ 10..90 / 710..790), dưới đó là khối đặc đến sàn sân. Tường trái/phải: mặt trong x=5 (phía trên xà), x=10 (trong hốc khung thành); xà ngang là hình thang x 5..65, y 165..185 (trái) nghiêng nhẹ xuống. Cầu thủ có thể nhảy lên mặt phẳng y=290 và đi vào khung thành (nhảy ~133px, chênh sàn 87px) **[?]** chưa chắc là cố ý. Bàn thắng = bóng chạm sensor (tâm bóng x ≲ 41 vì r=16, sensor 15..25), `NapePhysics.isGoal` chặn lặp.

Bounce theo mặt phẳng: `onGroundCollision` chỉ dội (`doBounce`) khi **normal.angle == ±π/2** (tức mặt ngang: mặt khối y=290, trần); chạm mặt đứng/nghiêng thì chỉ để solver nape xử lý (restitution 0.75, friction 0).

### 2.3 Vị trí khởi tạo / kickoff
- Bóng: `restart()` đặt (400, 240), vel 0, rot 0, angularVel 0 (spawn giữa không trung rồi rơi).
- Cầu thủ: `indent = (400 + dir*(INDENT + (playerID==2 ? 100 : 0)), 330)`, `INDENT=150`, `dir=-1` đội trái, `+1` đội phải. => đội trái: id0/id1 x=250, id2 x=150; đội phải: id0/id1 x=550, id2 x=650; y=330 (COM; đứng yên khi COM y≈335.8, xem 3.2). Không đổi bên khi hiệp 2, không đổi bên sau bàn thắng.
- `restart()` (sau bàn thắng/đầu trận/resume): `timeScale=1`, mọi object restart, `physics.isGoal=false`, vận tốc về 0, countdown chạy lại.

---

## 3. Vật lý (nape) và thông số

### 3.1 Space & step
```js
NapePhysics.space = new Space(new Vec2(0, 450));      // gravity +450 (xuống), px/s^2
update(t) { space.step(0.9 * t) }                      // t = 0.025 * timeScale (fixed 40Hz); vel/pos iter mặc định 10/10
```
- Mỗi tick logic 0.025 s chỉ step vật lý **0.0225 s** => mọi chuyển động chạy **chậm 0.9x** so với đồng hồ thật; timer/AI/cooldown dùng `t` chưa nhân 0.9.
- `Space` mặc định `worldLinearDrag = worldAngularDrag = 0.015` (nape: `v *= 1 - dt*0.015` mỗi step).
- `FootballGameCore.update`: `e = dt*timeScale; if (e != 0) { physics.update(e); mọi object.update(e) }`. `slow(n)`: 1→timeScale 0.05, 2→0.4, 3→0 (freeze), khác→1. DragonBones khi `timeScale==0` chỉ advance `0.3*STEP` mỗi frame render; `timeScale!=1`: advance `STEP*timeScale`; bình thường `advanceTime(-1)` (thời gian thật).
- Gravity thực tế: nape `Body.gravMass` ghi đè khối lượng chịu trọng lực: **bóng `gravMass *= 1.5` -> gia tốc 675 px/s²**, **cầu thủ `gravMass *= 3` -> 1350 px/s²** (đơn vị thời gian nape; thời gian thật nhân 0.81).

### 3.2 Materials (nape: `Material(elasticity, dynFric, statFric, density, rollingFric)`)
```js
BALL         = new Material(1.5, 0, 0, 1, 0)
PLAYER       = Material.wood()            // 0.4, 0.2, 0.38, 0.7, 0.005 (nape default wood)
PLAYER_BODY  = new Material(-1, 0, 0, 1)  // elasticity -1 (clamp -> 0), friction 0
PLAYER_FLOOR = new Material(0, 4, 4, 1)   // friction 4, bị đổi runtime (xem 3.4)
GROUND       = new Material(0, 1, 1, 100, 0)
FLOOR        = new Material(0, 1, 1, 100, 0)
```
Nape combine (đã xác minh trong `nape.min.js`): `restitution = clamp((e1+e2)/2, 0, 1)` (bóng vs mặt = 0.75), `friction = sqrt(f1*f2)`. Player-floor vs ground: ma sát hiệu dụng `sqrt(4*1)=2` khi đứng yên, `0` khi đang nhấn di chuyển.

### 3.3 Collision filter (nape `InteractionFilter(group, mask, sensorGroup=1, sensorMask=-1)`)
```js
IF_BALL         = (16, -17)   // -17 = ~16
IF_PLAYER_HEAD  = (17, -17)
IF_PLAYER_BODY  = (16, -17)
IF_PLAYER_FLOOR = (16, -17)
IF_GROUND       = (1)         // mask -1
```
Hệ quả: ball chỉ **va chạm vật lý** với Ground/Floor; player body/floor chỉ va chạm với Ground/Floor; **ball không va chạm vật lý với cầu thủ** và **cầu thủ không va chạm nhau**. Đầu = **sensor** (`sensorEnabled=true`) phát hiện bóng; goal = sensor phát hiện bóng. CbTypes: `cbBall, cbPlayerHead, cbPlayerBody, cbPlayerFloor, cbGround, cbFloor, cbGoals`.

Listeners (`NapePhysics.setupListners`):
- `BEGIN SENSOR ball x playerHead` -> `ball.bounceHead(head.direction, player.ballCollision())`
- `BEGIN COLLISION ball x floor` -> `ball.onFloorCollision()`
- `BEGIN COLLISION ball x ground` -> `ball.onGroundCollision(isGoal, arbiter.normal.angle)`
- `BEGIN SENSOR ball x goals` -> nếu `!isGoal`: `isGoal = true; goalSignal.dispatch(sensor.userData.id)`
- `BEGIN/END COLLISION playerFloor x floor/ground` -> `onFloorGround()`/`onEndFloorGround()` (đếm `floor.userData.fc` ++/--)
- `BEGIN COLLISION playerBody x ground` -> `onBodyGround()`

### 3.4 Bóng (`BallObject`)
- Body DYNAMIC, 1 `Circle(r = 16, material BALL, filter IF_BALL)`, cbBall, `allowRotation = true`, `gravMass *= 1.5`. Sprite `BallGraphic0000` (thường) / `BallGraphic0001` + 3 lớp lửa (super) anchor .5. Shadow `ShadowMC0000` đặt ở điểm raycast xuống (filter IF_BALL), `alpha = max(0, 1 - dist/400)`.
- Hằng số (`ObjectsData`): `BALL_SHOT_X = 550`, `BALL_SHOT_Y = -220`, `BALL_BOUNCE_HEAD = 75`, `BALL_BOUNCE_Y = -470`, `SHOOT_DISTANCE_X = 80`, `SHOOT_DISTANCE_Y = 80`, `PLAYER_JUMP_Y = 600`, `PLAYER_MOVE = 370`, `INDENT = 150`, `TACKLE_X = 40`, `TACKLE_Y = 50`.
- `shoot(dir, superShot=false)`: `vel = (dir * 550 * k, -220)`, `k = 1.8` nếu super (=> vx ±990) và `superHit=true`; sút thường phát `b_shot`; `ballSplash.activate`; `setState('shoot')`.
- `setState('shoot')`: `allowRotation=false`, bật trail (`emitter 100 particleStar0000`, alpha 1->0, scale .8->0, lifespan 1000ms, rate 5/tick, gravity 10), scale graphic (1.2, 0.8) (nếu không super). Mỗi update khi 'shoot': `rotation = velocity.angle`. Trạng thái khác: `allowRotation=true`, trail tắt, scale 1.
- `isShooting()`: `state=='shoot' ? sign(vel.x) : 0` (AI dùng).
- `doBounce()` (khi chạm **sàn cát** hoặc mặt ngang): `angularVel = -2 * atan(vy/vx)` (=0 nếu atan == -π/2), `vx *= 0.6`, `vy = -470` **(cố định, không phụ thuộc tốc độ rơi)**. Apex ≈ 470²/(2*675) = 163.6 px. Mỗi lần chạm sàn/ground: `setState('ground')`, `b_bounce`, `checkSuperHit()` (kết thúc super: `superHit=false`, `slow(0)`).
- `onGroundCollision(isGoal, angle)`: `isGoal ? vel *= 0.3 : (angle == ±π/2 ? doBounce())`.
- `bounceHead(headDir, canBounce)`: nếu `canBounce && !superHit`: `b_bounce`, `vel = (75 * -headDir, -470)`, state 'head'.
- `hulkUp()` (vô dụng, chỉ MagicFist). `restart()` reset full.
- Ball `update`: cập nhật shadow ray; khi 'shoot' cập nhật emitter.

### 3.5 Cầu thủ (`PlayerObject`)
Body DYNAMIC, vị trí khởi tạo (300,100) rồi `restart()` đặt `indent`. Shapes (local trước `align()`):
```js
head  = Circle(24, localCOM (0,11), PLAYER wood, IF_PLAYER_HEAD); sensorEnabled = true; cbPlayerHead
body  = Polygon(rect(-10,-10, 20, 64), PLAYER_BODY, IF_PLAYER_BODY)         // x -10..10, y -10..54
floor = Polygon([(-3,54),(-2,58),(2,58),(3,54)], PLAYER_FLOOR.copy(), IF_PLAYER_FLOOR); cbPlayerFloor; userData.fc=0
body.align()          // dời COM về gốc local
body.gravMass *= 3; allowRotation = false
userData: graphic, owner, direction
```
Tính COM (nape tính cả sensor vào khối lượng, đã xác minh `validate_mass`): head area 1809.6*0.7=1266.7 @y=11; body 1280*1 @y=22; floor ≈20*1 @y≈55.9 => **COM_y ≈ 16.84** (x=0). Sau `align()`: head center y=-5.84, rect y -26.84..37.16, đáy floor +41.16. Cầu thủ đứng trên sàn y=377 khi **COM y ≈ 335.84**. Graphic group đặt tại COM; `armature.display` offset **(x=4, y=40)** và scale **0.4**; group scale.x = `-direction` lúc đầu (sprite mặc định hướng phải), `faceToBall` đặt `scale.x = ball.x >= self.x ? 1 : -1`.

Hằng số hành vi (khởi tạo): `velX = 370`, `velY = -600`, `timeBodyHead = 0.5`, `delayIdle = 3`, `delayShot = 0.5`, `chanceToBeStunned = 0.8`, `delayStunned = 1`, `superShotPts = 12`, `superKoef = T_KOEF = 1.5`. Bot với `botsSkill > 0.5` có `velX *= 1.15` (=425.5).

State machine anim: `idle`, `run`, `stop`, `jump`, `fly1..fly5` (chọn theo vy: <0 fly1, <150 fly2, <300 fly3, <450 fly4, else fly5; chỉ gotoAndStopByTime(...,0)), `landing`, `hit`, `superhit`, `tackle start` -> `tackle anim` -> `tackle end`, `stun`, `superStart` -> `super` -> `superEnd`, `sad`/`sad1`, `happy`. Chi tiết xem mục 8.

### 3.6 `update(t)` của cầu thủ (thứ tự thực thi, t đã nhân timeScale)
1. `updateRay()` (shadow, filter IF_PLAYER_FLOOR, alpha như bóng).
2. Nếu `activeState == -2` (đang trong trận) và có energyBar: `superShotCount += t * 1.5` (không cap), cập nhật bar.
3. Cooldown: `deltaShoot` (>= 0.5 s thì -1), `deltaStunned` (>=1 s thì -1), `deltaBodyHead` (>= 0.5 s: -1 và `notCollide=false`).
4. Nếu `!canAct`: nếu `ball.superHit` thì `body.velocity = ball.velocity` (bị bóng lửa kéo đi) ngược lại `canAct = true`; **return**.
5. Nếu không bị stun:
   - `checkTackle() || faceToBall()`
   - nếu đang `tackle anim`: `gamecore.tackle(body.position, direction, graphic.scale.x)`
   - nếu không (đang trên đất / state=='jump' / đang hit): bỏ; ngược lại `checkVelocity(); playState()` (anim rơi)
   - `controller.readyToJump() && canJump = true`
   - nếu `activeState == -2 && !isSuperActive`: `jump(getJump)`, `move(getMove)`, `shoot(getShoot)`, `tackle(getTackle)`, `superShot(getSuperShot)`; ngược lại `onGoal()` (anim ăn mừng)
   - nếu đang `idle` và `activeState == -2`: `deltaIdle += t`; khi >= 3 s: 50% `jumpIdle()` (`vel=(0,-250)`, anim jump) / 50% `moveIdle()` (`vel=(200*direction,0)`, anim run) [dành cho cầu thủ đứng yên quá lâu].

### 3.7 Hành vi chi tiết
- **move(m)** (`canAct`, không đang tackle): `m==0`: `floor.friction = baseFriction(4)`; nếu `isOnGround` và state run/fly thì anim `stop`; nếu trên không `vel.x *= 0.9`. `m!=0`: `floor.friction = 0`, `vel.x = m * velX` (**gán trực tiếp, không gia tốc**), nếu `idle` thì anim `run`.
- **jump(pressed)**: cần `canAct && pressed && canJump && !checkTackle()`; nếu đã `isDoubleJump` thì bỏ; `isOnGround ? isOnGround=false : isDoubleJump=true`; `vel.y = -600`; `canJump=false`; anim `jump`. => **tối đa 2 nhảy** (nhảy đất + 1 nhảy đôi); `canJump` được reset khi nhả phím (`readyToJump`) hoặc chạm đất. Apex nhảy 1: 600²/(2*1350)=133 px (nape-time). Chạm sàn (`onFloorGround`): `canJump=true; isOnGround=true; isDoubleJump=false; vel.y=0` + anim `landing`.
- **shoot(pressed)**: điều kiện `!ball.superHit && ((pressed && deltaShoot<0 && !checkTackle()) || isSuperActive)` -> `deltaShoot=0`, anim `hit`; nếu `|dx|<=80 && |dy|<=80` (toạ độ graphic tâm bóng - tâm cầu thủ) -> `ball.shoot(-direction)` **ngay lập tức** (animation chỉ trang trí), `notCollide=true; deltaBodyHead=0`. Cooldown 0.5 s kể cả khi sút trượt. Hướng sút luôn **về phía khung thành đối phương** (`-direction`), không phụ thuộc hướng mặt.
- **notCollide** (0.5 s sau khi sút): cú đụng đầu tiếp theo bị bỏ qua (`ballCollision` trả `false` rồi reset), tránh "ăn" bóng vừa sút.
- **ballCollision()** (sensor đầu chạm bóng): nếu bóng đang `superHit`: nếu `ball.isShooting()*direction > 0` (bóng bay về phía **sân nhà** của cầu thủ này): `canAct=false`, anim `superStart`, `body.velocity = ball.velocity` (bị cuốn), return true; else nếu `notCollide`: return false; else `stopY()` (`vel.y = 0`) và return true => `bounceHead`.
- **tackle (slide)**: `isOnGround && pressed && !checkHit && !checkTackle` -> `faceToOpponent()` (hướng thằng gần nhất), `move(0)`, anim `tackle start` (5 frame) -> complete -> `tackle anim` (9 frame, `move(scale.x, true)` tức vel.x = ±370) -> complete -> `tackle end` (7 frame, `move(0)`). Trong `tackle anim` mỗi tick gọi `FootballGameCore.tackle(pos, direction, scale.x)`. Anim `tackle*` đặt vào `onAnimationComplete` của DragonBones (thời gian thật 30 fps).
  - `tackle(t=pos, e=direction, i=scale.x)`: với mỗi đối thủ `o`: `r = e * (o.x - t.x)`; nếu `0 <= r <= 40` và `o.y >= t.y - 50` -> `o.getStun(i)`. **[?] Dấu `e = direction` làm hit-test nằm phía SAU lưng người tackle theo hướng tấn công (đội trái dir=-1 trúng đối thủ có x ∈ [self.x-40, self.x]). Có vẻ bug nhưng đó là hành vi thật; nếu muốn "đúng bóng đá" thì đổi dấu. Cần quyết định khi port.**
  - `getStun(dir, force=false)`: nếu `deltaStunned < 0`: 80% `doStun(dir)`, 20% `jumpIdle(2)` (`vel=(0,-500)`); rồi `deltaStunned = 0` (miễn nhiễm 1 s). `doStun`: `move(0)`, anim `stun` (33 frame, timeScale anim 1.8), `vel.x = 500 * dir` (dir = `scale.x` của người tackle). Khi đang `stun` không điều khiển được (nhánh 5 bị bỏ qua).
- **Ăn mừng** (`onGoal`/`unActive(t)`): `activeState = t` (hướng bàn thắng: +1 = bàn vào lưới phải => đội trái ăn mừng, `-1` ngược lại, `0` hoà): `activeState == -direction` -> anim `happy` (loop); `== direction` -> `sad`; 0 -> `idle`. `unActive` còn kết thúc tackle và `move(0,true)`. Khi `activeState != -2` input bị khoá.

### 3.8 Camera/đuổi bóng: **không có** camera follow; view tĩnh.

---

## 4. Điều khiển

`GamePad` (module 22) đọc phím vật lý bằng `keyboard.isDown`; `addKeyCapture` cho các phím mũi tên, A, W, S, D, Z, X, K, L. (Nút V, B có property nhưng **không** `addKeyCapture`.)

Controller được gán theo `Inventory.numPlayers` và vị trí cầu thủ (`PlayerObject` ctor):
- `numPlayers == 0` (1 người chơi): **`PlayerControllerGeneral`** cho **mọi** 'P': trái/phải = `← or A` / `→ or D`; nhảy = `↑ or W`; sút = `X or L`; slide = `↓ or S`; super = `Z or K`. `energyID=1` (bar x=45, nhãn **Z**).
- `numPlayers == 1` (2 người chơi): đội trái (dir=-1, `playerID < 2`) -> **`PlayerController`**: `A/D` di chuyển, `W` nhảy, `B` sút, `S` slide, `V` super (`energyID=2`, bar x=45, nhãn **V**). Mọi 'P' còn lại (đội phải, hoặc cầu thủ id 2 đội trái trong mode PP-vs-BB) -> **`PlayerController2`**: `←/→`, `↑` nhảy, `L` sút, `↓` slide, `K` super (`energyID=3`, bar x=754, nhãn **K**).
- Ảnh gợi ý trong game: `help0000` (mũi tên + Z/X, slide=↓), `help0001` (WASD + K/L, slide=S) cho 1 người chơi; `help0002` (WASD + V/B), `help0003` (mũi tên + K/L) cho 2 người. => yêu cầu "P1 arrows+Z+X, P2 WASD+K+L" chỉ đúng với hint 1-người (cả 2 bộ phím đều hoạt động cho 1 người).
- `readyToJump()` = phím nhảy đang **thả**; phải thả rồi nhấn lại mới nhảy đôi (hoặc chạm đất).
- Điều khiển toàn cục: `P` toggle pause, `Space` resume (desktop). Nút Pause (trên phải), Music button (chu kỳ: nhạc bật -> tắt nhạc; nếu nhạc tắt và sfx bật -> tắt sfx; nếu cả hai tắt -> bật cả hai; icon frame index = (music?0:1)+(sfx?0:1) trong `InGameMusicButton000{0|1|2}`).

---

## 5. Luật trận

### 5.1 Chế độ & đội hình (`GameBuilder.createPlayObjects`)
Ký hiệu chuỗi: `P`=người chơi, `B`=bot, ký tự thứ h; `playerID = (len-1)+h` => đội 1 người: id0; đội 2 người: id1 (ký tự đầu), id2 (ký tự sau). `skinIndex = 2*(team-1) + (player-1)` (đội thứ 2 chỉ định `players[]`; cầu thủ thứ 2 trong đội = `(chọn+1)%2`).
- Quick Match: trái `"P"` vs phải `"B"`, `botsSkill = 0.2`.
- Tournament (`gameMode=0`): `botsSkill = {0:0.1, 1:0.2, 2:0.4, else 0.5}[state] + (difficulty==1 ? 0.5 : 0)`. 1 người: mode0 `P` vs `B`; mode1 `PB` vs `BB`; mode2 `P` vs `BB`. 2 người: `PP` vs `BB`.
- Friendly (`gameMode=1`): `botsSkill = 0.3`. 1 người: như tournament. 2 người: mode0 `P` vs `P`; mode1 `PB` vs `PB`; mode2 `PP` vs `BB`.
- Cầu thủ tối đa 4. `P` trong đội 2 người có shadow màu (`ShadowMC_or0000` cam cho P đầu, `ShadowMC_pi0000` hồng cho P sau) để phân biệt; bot dùng `ShadowMC0000`.

### 5.2 Timer
- Hằng số `TIMER=30`, `T_KOEF=45/30=1.5`. `MatchData.matchState`: **0** = trận đơn (friendly/quick, 1 hiệp), **1** = hiệp 1 tournament, **2** = hiệp 2 tournament.
- `timer.start(t,e)`: `startTime = t*30`, `fullTime = e*30`, `noticeTime = fullTime - 5`. matchState 0 -> (0,2): **60 giây thực** (logic) hiển thị **00 -> 90** (`Math.round(e*1.5)`, 2 chữ số); state 1 -> (0,1): 30 s thực hiển thị 00->45; state 2 -> (1,2): 30 s thực 45->90.
- `deltaMatchTime += dt` (dt gốc 0.025, **không** nhân timeScale, nên slow-mo không làm timer chậm) chỉ khi `isPlaying` và không ở giai đoạn dừng sau bàn thắng. Countdown/goal pause/pause: timer dừng.
- Mỗi giây nguyên trong 5 giây cuối: phát `beep5sec` (noticeTime tăng mỗi giây tới fullTime).
- Khi `e >= fullTime`: `matchEndSignal.dispatch()` (một lần) -> `matchEnd()` và timer hiển thị `round(fullTime*1.5)`; nếu tiếp tục (overtime) timer vẫn đếm lên 91, 92...

### 5.3 Countdown & kickoff
`CountDownObject.process(dt)`: `timer += 1.5*dt; e = floor(3*timer)` (tức mỗi mốc 0.222 s): e=0 -> "3", e=1 -> "2", e=2 -> "1", e=3 -> " GO!!!", e=4 -> ẩn, `isPlaying = true`, phát `whistle`. Tổng ≈ 0.889 s. Mỗi lần đổi số: tween scale `from 0.2` 100 ms `Back.Out`. Vật lý đóng băng trong countdown. Countdown xuất hiện: đầu trận, sau mỗi bàn thắng, sau khi Resume.

### 5.4 Bàn thắng (`onGoal(id)`)
Guard: `deltaDelay >= 0` thì bỏ qua. Thực hiện: `slow(0)` (timeScale 1); nếu `isOvertime` phát `FinalWhistle`; `id > 0` (bóng vào lưới phải): `score1++`, phát `goal1`; `id < 0`: `score2++`, phát `goal1` nếu `(numPlayers==1 && matchMode<2)` còn lại phát `goal2` (tức 1-người: bị thủng lưới phát `goal2`); cập nhật HUD; `unActive(id)` (ăn mừng/buồn); Message "GOAL!!!"; `isGoal = true; deltaDelay = 0`. Trong `update` khi `deltaDelay >= 0`: vật lý vẫn chạy 1.5 s (`timeDelay = 1.5`), timer dừng; hết: nếu `isEnd` -> `finishMatch`; nếu `isGoal`: `isOvertime ? finishMatch() : restart()` (restart = kickoff mới + countdown).
- Điểm: `score1` = đội trái (dir=-1, người chơi 1, `T_1`), `score2` = đội phải.

### 5.5 Hết giờ
`matchEnd()`: nếu `matchState == 2 && score1 == score2`: Message "OVERTIME!", `isOvertime=true`, phát `beepOvertime` (không kết thúc; **golden goal**: bàn thắng kế tiếp -> `FinalWhistle` -> sau 1.5 s `finishMatch`). Ngược lại: phát `FinalWhistle`, `slow(0)`, Message `matchState==1 ? "HALF TIME!" : "FULL TIME!"`, `unActive(0|±1)` (thắng ăn mừng, hoà idle), `isEnd=true; deltaDelay=0` -> sau 1.5 s `finishMatch`.
- **Friendly/quick (matchState 0) hoà vẫn kết thúc "FULL TIME!" (không có overtime)**; chỉ tournament hiệp 2 mới có overtime.
- `finishMatch`: dừng `stadium`, `isPaused = true`, dispatch `menuPauseSignal(matchState==1 ? "HalfTime" : "PostMatch")` -> Gameplay: `HalfTime` => `MatchData.matchState = 2` rồi chuyển `PreMatch`; `PostMatch` => chuyển `PostMatch`.
- `MatchData.clearScore()` đặt `score1=score2=0`, `energies=[0,0,0]`. `startMatch`: matchState 0 hoặc 1 -> clear; 2 (hiệp 2) -> giữ điểm và **giữ năng lượng super** (energies lưu khi `release()` của PlayerObject theo `energyID`).

### 5.6 Tournament logic (`Inventory`)
- `createNewTournament`: `rounds[0] = team người chơi`, `rounds[1..15]` = 15 team khác chọn ngẫu nhiên không lặp từ 24 team (loại team của mình); `state=0`; `teamNo` = index của mình (0); `defineOpponent`: `opponentNo = teamNo ± 1` (chẵn +1, lẻ -1) -> trận của mình luôn là panel 1 ở vòng đầu; `players[1]` đối thủ ngẫu nhiên 1|2.
- Mỗi chặng `calcVars`: state0: `startTeam 0, teamsLeg 16`; state1: `16, 8`; state2 (bán kết): `24, 4, finalLegs`; state3 (chung kết/3-4): `28, 4, finalLegs`. `endTeam = start + teamsLeg`.
- `generateScore()` cho trận AI: P(0)=10%, P(1)=20%, P(2)=35%, P(3)=20%, P(4)=10%, P(5)=5%. Hoà -> tung đồng xu +1 bàn cho 1 đội. Người thắng ghi vào `rounds[endTeam+e]`; ở finalLegs người thua vào `rounds[n+2]`.
- Cuối cùng: `rounds[32]` vô địch, `rounds[34]` á quân, `rounds[33]` hạng 3, `rounds[35]` hạng 4.
- `nextLeg(score1, score2)`: backup, `calcScore`, `summarizeMatch` (cộng `tournamentGoals`, `stats.goals`, `clearWin++` nếu thủng lưới 0), tạo kết quả, `defineWinners`. Nếu `++state == 4`: kết thúc giải (`outInfo="4"` nếu hạng 4), xoá save, return false. Nếu người chơi đi tiếp: `defineOpponent`, `saveTournament`, return true. Nếu bị loại: `outInfo = state==1 ? "9-16" : state==2 ? "5-8" : ""`, mô phỏng tất cả chặng còn lại, xoá save, return false.
- Điểm số (`calcScore`): `t=s1-s2; base = t>0 ? 1000 : 500; nếu state==3 && base==500 && isFinal() then base=1000; pts = (100*s1 + 10*max(t,0) + base*(state+1)) * (matchMode+1)`; `currentScore += pts`; `stats["t"+matchMode] = max(...)`. Điểm này không hiển thị ở UI nào đã đọc (có thể dành cho leaderboard đã bỏ) **[?]**.

### 5.7 Quick match
`initQuickMatch`: `teams[0] = 1 + rand(24)`; `t = teams[0] + (1 + rand(15))`, `teams[1] = t>16 ? t-16 : t` (đối thủ ∈ 1..23, không bao giờ team 24); `players[0..1]` = random 1|2; `isQuickMatch=true; matchState=0; numPlayers=0`; vào thẳng `Gameplay`. Hết trận -> `PostMatch` -> NEXT về `Menu`.

---

## 6. Super shot

- Mỗi cầu thủ (skin index `s`): **`superPower = s % 2`**: cầu thủ **thứ nhất** (`s` chẵn) = **0 Fireball**, cầu thủ **thứ hai** (`s` lẻ) = **1 Teleport**. (Mục chọn team hiển thị hint: icon `icon_ball0000` "Fireball" cho cầu thủ trái, `icon_ball0001` "Teleport" cho cầu thủ phải.) Chỉ `P` có energy bar & super; bot **không** dùng super (`getSuperShot=false`).
- **Nạp năng lượng**: `superShotCount += t*1.5` mỗi update khi `activeState == -2` (tức ≈ 8 s thực để đạt `superShotPts=12`; vẫn cộng tiếp quá 12). Bar: `curFrame = floor(3*energy)`, 36 nấc; mask cung 36px bán kính, từ 12 trở đi bar hiện màu đầy. Reset về 0 khi dùng. Giữa 2 hiệp được giữ (MatchData.energies).
- Kích hoạt: `superShot(pressed)`: `pressed && !ball.superHit && superShotCount >= 12`.
  - **Fireball (power 0)**: `superHit()` = `shoot(true, true)`: cần `deltaShoot<0` và `!checkTackle`; chơi anim `superhit`; nếu bóng trong hộp 80x80: `continueSuperHit()` -> `slow(3)` (timeScale=0 đóng băng), `superShotCount=0`, `isSuperHit=true`, phát `fireball`, `notCollide`, `deltaBodyHead=0`. Anim `superhit` (19 frame, timeScale anim 0.8) có frame-event **`shot`** (sau 4 frame) -> `onLabel`: `ball.shoot(-direction, true)` (vx ±990, vy -220, sprite lửa `BallGraphic0001` + `ball_fire` anim 30fps scale 1.5, `SuperBallSplashMC` 8 frame scale 2.5), `slow(0)`, `isSuperHit=false`. Nếu bóng ngoài hộp: anim chạy nhưng **không** tiêu năng lượng, cooldown 0.5 s.
  - Trạng thái `ball.superHit`: **mọi sút thường/đụng đầu bị vô hiệu** (`shoot` và `bounceHead` đều check `!superHit`). Bóng lửa va **cầu thủ đối phương** (sensor đầu, khi bóng bay về phía sân của họ): họ `canAct=false`, anim `superStart`, bị kéo theo vận tốc bóng (`body.velocity = ball.velocity`) tới khi bóng chạm sàn/mặt ngang (`checkSuperHit` -> `superHit=false`, `slow(0)`, `canAct=true` ở update kế) hoặc thân chạm Ground (`onBodyGround` -> `canAct=true`, anim `superEnd`). Chạm sàn: `onFloorCollision` (doBounce) kết thúc fireball.
- **Teleport (power 1)**: `isSuperActive=true; superShotCount=0; energyBar.reset(); superDefence()`: anim `fly1` (đóng băng), effect `teleprte0000..0029` (30 frame, 30 fps) tại vị trí hiện tại, `slow(1)` (timeScale 0.05), tween `graphic.scale` -> (0,0) 300 ms (thời gian thật). `continueDefence`: `notCollide=true`; `x = ball.x + 60*direction` clamp `[30, 770]` (đội trái: x = ball.x - 60 tức **phía sau bóng** theo hướng tấn công), `y = ball.y`; đặt body+graphic; effect teleport mới + phát `teleport`; tween scale -> (1,1) 300 ms. `finishDefence`: `ball.shoot(-direction)` (sút **thường** vx ±550, vy -220), `deltaBodyHead=0, deltaShoot=0, isSuperActive=false, slow(0)`.
  - **[?]** Trong lúc tween `scale`, `faceToBall()` vẫn có thể ghi đè `scale` mỗi update (vì `timeScale=0.05` ≠ 0 nên `update` vẫn chạy) – hiệu ứng thực tế có thể khác; cần xem chạy thật. Khi `isSuperActive` các input bị khoá.
- Hiệu ứng lửa đuôi bóng khi bay: emitter `particleStar0000` (xem 3.4). `WavesMC`, `MagicFistMC` không dùng.

---

## 7. Bot AI (`AIController2`) — đầy đủ

Mỗi bot (`B`) có `AIController2(player)`. Mọi quyết định tính **mỗi tick logic (0.025 s)**, các xác suất `chance*` được roll **mỗi tick**.

Tham số khởi tạo:
```js
deltaBasePoint = 35; deltaBallCloseToGoal = 150; currentMove = -1; addBallDistance = 0;
delayNeedBack = 0.3; inactiveTime = 6; step = deltaTime = 0.025;
dir = player.direction; id = player.playerID;
basePoint = PlayersData.POINTS[ dir==-1 ? id : 3+id ]      // [200,280,120,600,520,680]
width2 = 400
dJumpY = -100; dShootX = 78; dShootY = 90; dMove = 60; dMoveOwnSide = 40 (không dùng)
dMoveAttack = id<2 ? 150 : 200
id0: dJumpX = 100, limitToRun = 0
id1: dJumpX = 100, addBallDistance = 270, limitToRun = 0
id2: dJumpX = 170, limitToRun = 400, player1 = getFirstPlayer(dir)  // đồng đội id1 (hoặc phần tử đầu)
limitForBall = 400 - dir*addBallDistance         // id0/id2: 400 ; id1: đội trái 670, đội phải 130
delayForShoot = 0.1 (không dùng); delayForMove = 1.1; delayForJump = 0.8
chanceToJump = chanceToMove = chanceToShoot = MatchData.botsSkill
```

Hàm tiện ích:
- `deltaX = ball.graphic.x - player.graphic.x` (dương: bóng bên phải), `deltaY = ball.graphic.y - (player.graphic.y + 6)`.
- `allowMove()`: `rand <= chanceToMove ? 1 : 0`; `allowJump()`, `allowShoot()` tương tự.
- `moveToBasePoint()`: `atBasePoint() ? 0 : (player.x < basePoint ? 1 : -1)`; `atBasePoint = |player.x - basePoint| < 35`.
- `moveToBall()`: `deltaX <= -60 ? -allowMove() : deltaX >= 60 ? allowMove() : 0`.
- `ballOnThisSide() = (ball.getSide()*dir >= 0)` với `getSide = ball.x - 400`.
- `ballInZone() = dir*(ball.x - limitForBall) >= 0`.
- `ballInAttackZone() = |deltaX| < dMoveAttack`.
- `ballCloseToGoal() = (ball.x - player.x)*dir >= 150`: với dir=-1 nghĩa là bóng nằm **cách bot >=150px về phía trái (sau lưng bot, phía khung thành nhà)**; khi đó `currentMove = dir` (bot chạy về phía nhà để lùi theo bóng).
- `ballInZone()` với dir=-1: `ball.x <= limitForBall` (id0/id2: bóng ở nửa nhà; id1 trái: ball.x <= 670).

`getMove()`:
```
if deltaForMove >= 0:                       // đang chờ sau kickoff (chỉ id2 bắt đầu = 0 -> chờ 1.1 s; id0 = -2, id1 = -1 chạy ngay)
    deltaForMove += step; if >= 1.1: deltaForMove = -1; return 0
if id < 2:
    if needBack:  currentMove = dir; deltaNeedBack += step; if >= 0.3: needBack = false
    elif ballCloseToGoal(): currentMove = dir
    elif strategy == -1: currentMove = moveToBall()
    elif strategy < 1:        // strategy == 0
        currentMove = (ballInZone() || ballInAttackZone()) ? moveToBall() : moveToBasePoint()
    elif strategy == 1:
        currentMove = ballOnThisSide() ? moveToBall() : moveToBasePoint()
elif id == 2:
    if ballCloseToGoal(): currentMove = dir
    elif jumpOnly: currentMove = 0
    elif strategy == -1:
        currentMove = ((player1.x - 400)*dir < 0) ? moveToBasePoint()          // đồng đội đang ở nửa sân kia
                      : (ballInAttackZone() ? moveToBall() : moveToBasePoint())
    elif strategy == 0:  currentMove = ballInZone() ? moveToBall() : moveToBasePoint()
    elif strategy == 1:  currentMove = (ballInZone() && ballInAttackZone()) ? moveToBall() : moveToBasePoint()
if currentMove == 0 && id < 2: deltaInactiveMove += step; if >= 6: strategy = -1; deltaInactiveMove = 0   // đứng yên 6 s -> hung hãn
else: deltaInactiveMove = 0
return currentMove
```
(`currentMove = dir`: bot trái chạy sang trái = về phía khung thành nhà khi `needBack`/`ballCloseToGoal`.)

`getJump()`:
```
id0:
  if deltaForJump >= 0:                         // sau restart: = 0 nên chờ 0.8 s
      deltaForJump += step; if >= 0.8: deltaForJump = -1
      if ball.isShooting() == dir: jump = true; deltaForJump = -1     // bóng đang bay về phía mình -> nhảy ngay
  else: jump = |deltaX| <= dJumpX(100) && deltaY <= dJumpY(-100) && allowJump()
id1: jump = |deltaX| <= 100 && deltaY <= -100 && allowJump()
id2:
  if deltaForJump >= 0:                         // chờ 0.8 s
      jump = false; deltaForJump += step
      if >= 0.8: deltaForJump = -1; if ball.isShooting() == dir: jump = true
  elif allowJump():
      if ball.isShooting() == dir:
          if |deltaX| <= 170 && deltaY <= -100:
              if atBasePoint(): currentMove = 0; jumpOnly = true; jump = true
              else: jump = !isPlayer1JumpingUp()
          else jump = false
      else: jump = |deltaX| <= 3*170/4 && deltaY <= -100 && !isPlayer1JumpingUp()
  else jump = false
```
`getShoot()`: `|deltaX| <= 78 && |deltaY| <= 90 && allowShoot()`. `getTackle()`: luôn false (bot không slide). `getSuperShot()`: false. `readyToJump()` luôn false (bot đặt `canJump` bằng tiếp đất, vì `jump` đòi `canJump`).

`restart()` (mỗi kickoff): `t = MatchData.getScore(dir) = (score1 - score2) * -dir` (>0 khi bot đang dẫn): 
- `t < 0` (thua): `strategy = -1`, `needBack = rand < 0.2`
- `t == 0`: `strategy = 0`, `needBack = rand < 0.7`
- `t > 0`: `strategy = 1`, `needBack = rand < 0.9`
Sau đó: `deltaInactiveMove=0, deltaForShoot=-1, deltaForMove = id - 2, deltaForJump = 0, deltaNeedBack = 0, jumpOnly=false`. `makeAggressive()` đặt `strategy=-1` (không thấy được gọi trong code đã đọc).

Độ khó = `botsSkill` (xem 5.1); skill > 0.5 còn tăng tốc 15%. Skill 1.0 (hard, state cuối) => mọi roll = true.

---

## 8. Nhân vật & asset DragonBones

### 8.1 Danh sách
- **24 CLB (team index 0..23, hiển thị `emblem = index+1`)**, mỗi CLB 2 cầu thủ => skin index `2*team + p` (p=0 chẵn **Fireball**, p=1 lẻ **Teleport**):

| # | CLB (`CLUBS_NAMES`) | Cầu thủ 0 (Fireball) | Cầu thủ 1 (Teleport) | Kit home/away (body display) |
|---|---|---|---|---|
|0|Meringues|mbape|Jude Bellingham|RM_home/RM_away|
|1|Barca|Pedri|lewandowski|brca_*|
|2|The Citizens|Erling Haaland|Kevin De Bruyne|MC_*|
|3|The Reds|Mohamed Salah|Darwin Nunez|liver_*|
|4|Scousers|Cole Palmer|Nicolas Jackson|chls_*|
|5|Gunners|Leandro Trossard|Kai Havertz|ars_*|
|6|Red Devils|Bruno Fernandes|Amad Diallo|MU_*|
|7|Die Bayern|Harry Kane|Jamal Musiala|baye_*|
|8|Die Borussen|Serhou Guirassy|Maximilian Beier|bd_*|
|9|Parisians|ach_ha|Ousmane Dembélé|psg_*|
|10|Nerazzurri|Lautaro Martínez|Nicolò Barella|int_mil_*|
|11|Giallorossi|dybala|dovbyk|rom_*|
|12|As Aguias|Vangelis Pavlidis|Kerem Aktürkoğlu|(bnfc_away…)|
|13|Blauw-Zwart|Christos Tzolis|Hans Vanaken|brug_*|
|14|The Teddy Bears|cyriel dessers|Václav Černý|rang_*|
|15|De Godenzonen|Wout Weghorst|Kenneth Taylor|aja_*|
|16|Trilos|Ayoub El Kaabi|Rodinei|oly_*|
|17|Miners|Heorhii Sudakov|Artem Bondarenko|shak_*|
|18|Die Roten Bullen|Oscar Gloukh|Nene Dorgeles|red_b_*|
|19|Sarı Kanaryalar|Youssef En-Nesyri|Dušan Tadić|fnrb_*|
|20|The Herons|messi|Suarez|intr_mi_* (tên display ghép theo thứ tự trong `head` display list)|
|21|Knights of Najd|ronaldo|Sadio Mane|al_na_*|
|22|Urubu|Giorgian de Arrascaeta|Luiz Araújo|flame_*|
|23|Las Gallinas|Facundo Colidio|Miguel Borja|river_pl_*|

(Bảng tên cầu thủ lấy từ `head` armature display list index `2*i`, `2*i+1`. Bảng kit lấy theo thứ tự body display/texture; map chính xác kit-theo-CLB có thể lệch ở các đội cuối vì tên texture không khớp tên CLB (`bnfc_away` chỉ có away) **[?]** — nên xác nhận bằng cách render thử.) Quốc gia/ngôn ngữ mặc định (`countryCodes`) chỉ dùng để chọn team mặc định (trong `Inventory.getTeam`).
- **Không có chỉ số khác nhau giữa các nhân vật**: mọi cầu thủ cùng `velX=370, jump 600`, khác nhau duy nhất `superPower` (chẵn Fireball / lẻ Teleport) và skin. Không có stat/rarity/giá.

### 8.2 DragonBones (`sk.json` v5.5, 30 fps, tên `Player_anim_2025`; atlas `images/texture.png` 2048x1024 + `data/texture.json` 147 SubTexture)
- Armature chính **`player`**: 13 bone/slot: `body, head, right hand, left hand, left leg, right leg, effects stop, effects hit, effects tackle, eyes, effects stun, effects stun star, cup` (slots giống tên bone; `eyes` = armature `eyes_stunned`, `effects stun` = `tears_01`/stars, `cup` = `cup_0123`).
- Armature con (child armature trong slot, đổi skin bằng `gotoAndPlay(animName, 0)`):
  - `head`: 48 anim `head1..head48` (index = `skinIndex`, `heads[n] = "head"+(n+1)`)
  - `footballer_body_01`: 48 anim `body1..body48` (`bodies[r] = "body"+(r+1)`, `r = 2*floor(i/2) + side`, `side = 0` đội trái (home) / `1` đội phải (away); 2 cầu thủ cùng đội dùng chung kit)
  - `right_hand` / `left hand`: `hand1..hand3` (tông da, `PlayersData.hands[n]` ∈ {1,2,3} theo bảng 48 phần tử)
  - `left_leg` / `right_leg`: `leg1..leg10` (giày `boots_01_02..boots_10_02`) — **random mỗi lần vào menu** (`setupPlayers`: `legs[e] = "leg" + (1 + floor(10*random))`)
  - `cup_0123`: `frame0..frame3` (cúp podium: `frame1/2/3` = hạng 1/2/3)
  - `eyes_stunned`, `tears_01`, `ball_fire` (anim lửa)
- Animation của `player` (frame @30fps; `playTimes 0` = loop): `idle` 23 loop, `run` 19 loop, `stop` 10, `hit` 19 (timeScale .8), `jump` 6, `fly1..fly5` (pose tĩnh), `landing` 7, `tackle start` 5, `tackle anim` 9, `tackle end` 7, `stun` 33 (timeScale 1.8), `superStart` 4, `super` (tĩnh), `superEnd` 4, `sad` 14, `sad1` 4 (pose tĩnh sau sad), `happy` 19 loop, `superhit` 19 (timeScale .8; frame events: `shot` @ frame 4, `norm` @ frame 12), `hulk_hit` 17 (dead).
- Sự kiện `COMPLETE` điều khiển state machine (`onAnimationComplete`): `stop` -> idle; `landing` -> idle|run (theo input); `hit*`/`stun`/`tackle end`/`hulk_hit` -> `checkVelocity()||idle`; `tackle start` -> `tackle anim` + slide; `tackle anim` -> `tackle end`; `jump` -> `fly1`; `superStart` -> `super`; `sad` -> `sad1`. `FRAME_EVENT` `shot` -> bắn bóng lửa.
- Port sang Cocos: dùng Cocos DragonBones runtime (`dragonBones.ArmatureDisplay`), import `sk.json` + `texture.json` + `texture.png`; hoặc chuyển sang Spine nếu cần.

---

## 9. Âm thanh

`assets/sound/*.ogg` (cũng có `.mp3`/`.m4a` fallback trong bản gốc). `AudioManager.play(key, vol=1, loop=false)`; `sfx` off -> phát volume 0; `stadium` volume = sfx?1:0 và 0 khi pause; nhạc `track` volume **0.5** loop, **dùng chung Menu và Gameplay** (`MenuMusic = GameMusic = "track"`; chỉ khởi động 1 lần ở Preloader -> không restart khi đổi state).

| Key (file) | Phát khi |
|---|---|
| `button` | mọi click UI (`Sounds.Click`), đổi team, chọn mode |
| `whistle` | hết countdown, bắt đầu/ tiếp tục trận |
| `stadium` | loop ambience suốt trận (start ở `startMatch`, stop ở `finishMatch`) |
| `b_shot` | sút thường (`BallObject.shoot` không super) |
| `b_bounce` | bóng chạm sàn/ground, đụng đầu bật |
| `fireball` | kích hoạt fireball (`continueSuperHit`) |
| `teleport` | teleport tới nơi (`continueDefence`) |
| `beep5sec` | mỗi giây trong 5 giây cuối |
| `beepOvertime` | bắt đầu overtime |
| `FinalWhistle` | hết hiệp/trận; bàn thắng trong overtime |
| `goal1` / `goal2` | bàn thắng (xem 5.4) |
| `slide` | **không dùng**: code tackle gọi key **`p_tackle` (không tồn tại, không được load)** nên slide im lặng/lỗi nhẹ **[?]**; khi port nên phát `slide.ogg` cho tackle. |

---

## 10. Lưu trữ (phaser-super-storage; localStorage/IndexedDB do plugin)

- Hash chuỗi dùng cho mọi save: `h = 0; for c: h = ((h << 5) - h + charCode) | 0; return h.toString()` (Java-style `hashCode`). Save chỉ hợp lệ nếu `storage[KEY+"h"] == hash(storage[KEY])`, nếu sai -> reset.
- `fb21_sfx_pk` = `{"m": musicOn, "sf": sfxOn}`, + `fb21_sfx_pkh`. Mặc định cả hai true.
- `fb21_pk` = `{"invsav": <save>}`, + `fb21_pkh`. `save` (Inventory) chứa:
  - `tsave` (tournament 1 người) và `tsave2` (2 người): `{state, team, rounds[], results[], player, teamNo, opponentNo, mode (matchMode), score, clearWin, difficulty, goals}`; `state==4` coi như không có save.
  - `team`: index CLB gần nhất người chơi chọn (lưu ở onPlay/onTournament = `emblem-1`).
  - `stats`: `{t0,t1,t2: best score theo matchMode, goals: tổng bàn}`; `achievs`: `{}` (không dùng); các key `nickNames` (G0, S0…) là rác leaderboard.
- Không có coins, không unlock, không shop, không achievement thật.
- Quảng cáo (Poki SDK: `gameplayStart/Stop`, `commercialBreak`, `rewardedBreak`, `happyTime`) -> bỏ.

---

## 11. Mapping sang Cocos Creator 3.8.7 (đề xuất)

### 11.1 Hệ toạ độ & scale
- Dùng **design resolution 800x480** (hoặc 1066x640, scale 4/3); root world node đặt origin giữa màn.
- **Phaser (px, y↓) -> Cocos (px, y↑)**: `cx = px - 400`, `cy = 240 - py` (nếu world 800x480 căn giữa). Ví dụ mặt sân y=377 -> cy=-137; trần y=-184 -> cy=424; goal sensor trái (15..25, 185..289) -> x -385..-375, y 55..-49.
- **Cocos px -> Box2D (m)**: chia `PTM_RATIO = 32` (PhysicsSystem2D tự dùng 32 trong Cocos). Vận tốc: `vx_cocos = vx_phaser`, `vy_cocos = -vy_phaser` (đổi dấu y); đổi sang m/s chia 32.
- Gravity nape `+450` (xuống) -> Cocos `(0, -450 px/s²)` = `(0, -14.0625 m/s²)`. Dùng `RigidBody2D.gravityScale`: **ball = 1.5, player = 3.0** (đúng cơ chế `gravMass`), world gravity -450/32.
- Góc: nape `rotation` rad theo chiều kim đồng hồ (y↓); Cocos `angle` độ CCW => `angle_cocos = -rotation*180/π`. Spin bóng: `angularVelocity_cocos = -angularVel_nape` (đơn vị rad/s -> độ/s với Cocos `angularVelocity` tính **độ/s**: nhân 180/π).
- **Time step**: nape step `0.9*0.025 = 0.0225 s` mỗi tick logic 0.025 s. Giữ đúng cảm giác bằng cách `PhysicsSystem2D.instance.fixedTimeStep = 0.0225` và chạy logic AI/cooldown ở 0.025, hoặc chạy fixed 0.025 và nhân mọi vận tốc/gravity mô tả bằng 0.9 (giữ đối tượng, đừng lẫn). Số vận tốc (550, 600, 370, 470...) áp dụng cho vật lý **đã nhân 0.9** (nên không đổi số, chỉ tin đơn vị nape).
- Drag: nape `worldLinearDrag 0.015` => `linearDamping ≈ 0.015/s`.
- Material: Box2D friction mix = sqrt(f1*f2) (giống nape) -> bóng friction 0, ground 1, floor shape cầu thủ **friction 4 khi không nhấn move / 0 khi di chuyển** (hoặc đơn giản: dừng `vx` về 0 thủ công). Restitution Box2D mix = **max** (khác nape avg): đặt bóng restitution 0.75, ground 0, và **tự xử lý** bounce sàn (`vy=-470`, `vx*=0.6`).
- Nên viết **vật lý bóng theo đúng nape**: gán trực tiếp vận tốc ở các sự kiện (shoot, bounceHead, doBounce); phần còn lại Box2D lo (trọng lực, va chạm tường/xà).
- Collision categories gợi ý: `GROUND=1`, `BALL=2`, `PLAYER_BODY=4`, `PLAYER_HEAD(sensor)=8`, `GOAL(sensor)=16`. Mask: ball chỉ `GROUND`; player body/floor chỉ `GROUND`; head sensor ↔ ball; goal sensor ↔ ball; **player không va player**.
- Geometry: dựng từ bảng 2.2 (convert như trên). `PolygonCollider2D` cần convex: tách khối khung thành thành các convex (wall strip, xà hình thang, hốc, khối nền). Giữ tag để phân biệt `FLOOR` (sàn: bounce thủ công), `GROUND` (mặt ngang: bounce thủ công nếu `normal.y == ±1`; mặt đứng/nghiêng: để Box2D), `GOAL`.
- Body cầu thủ: COM nape ≈ gốc local; nếu dùng Box2D trong Cocos, đặt các collider theo **toạ độ sau align** (head circle r=24 tại (0,-5.84)·, body rect x±10 y -26.84..37.16, floor poly đáy +41.16) hoặc tự đặt node tại COM; nhớ `fixedRotation = true`. Sprite/armature offset (4,40) so với COM, scale 0.4, flip theo `scale.x`.
- Bóng: `CircleCollider2D r=16`, `angularDamping` mặc định, sprite 32x32 (frame `BallGraphic0000`) + ghosting.
- Chuyển trạng thái: `ball.state ∈ {ground, shoot, head}`; `ball.superHit`.
- Timer nội bộ: `internalSeconds` (60 hoặc 30 mỗi hiệp) hiển thị `round(internal*1.5)`.

### 11.2 Dấu của các giá trị khi chuyển đổi
| Tham số nape (px, y↓) | Cocos (y↑) |
|---|---|
| gravity (0, +450) | (0, -450) px/s² |
| ball shoot `vel = (±550, -220)` (lên) | `(±550, +220)` |
| super shot `vel = (±990, -220)` | `(±990, +220)` |
| head bounce `vel = (75*-headDir, -470)` | `(75*-headDir, +470)` |
| doBounce `vy = -470` | `vy = +470` |
| jump `vy = -600` | `vy = +600` |
| jumpIdle `(0,-250)`, stun-jump `(0,-500)` | `(0,+250)`, `(0,+500)` |
| stun knock `vx = 500*dir` | không đổi |
| `deltaY = ball.y - (player.y + 6)`; `deltaY <= -100` ("bóng ở trên") | trong Cocos: `deltaY = (player.y - 6) - ball.y`... tức "bóng cao hơn người > 100px" |
| `dx = ball.x - player.x` | không đổi (x không đảo) |
| Direction: đội trái `-1`, tấn công sang phải | giữ nguyên (x không đổi dấu) |

---

## 12. Điểm còn mơ hồ / cần quyết định khi port

1. **Dấu tackle** (3.7): hit-test dùng `direction` (không phải `scale.x`) nên hiệu quả ở phía sau lưng; có thể coi là bug.
2. **`p_tackle`** thiếu file, `slide.ogg` mồ côi (9).
3. **Teleport**: xung đột tween `scale` vs `faceToBall()` (6).
4. **COM cầu thủ** tính tay từ shape/density nape: đã xác minh logic `validate_mass` bao gồm sensor, giá trị COM_y≈16.84 tin cậy (±0.1). Đặt body trong Box2D sao cho **mặt sàn chạm đáy floor shape +41.16 dưới COM**.
5. **Kit mapping** CLB ↔ body/texture ở các đội cuối bảng (8.1).
6. Vị trí/ý nghĩa `Constants.GAME_LOGIC_HEIGHT`, nền mobile/portrait: bỏ qua.
7. **Tournament score** (`currentScore`) không có UI hiển thị.
8. Số liệu thời gian anim (frame events `shot` @ frame 4) quyết định độ trễ giữa nhấn super và bóng bay; nếu dùng animation khác (không phải DragonBones), phải mô phỏng: `slow(3)` freeze, đợi ≈ `4/30/0.8/0.3 ≈ 0.55 s` thời gian thật **[?]** (render advance `0.3*0.025 = 0.0075 s` anim-time mỗi frame × timeScale anim 0.8 → ≈ 22 render-frame ≈ 0.37 s @60fps; ước lượng).
9. `ball.update` có kiểm `rotation = velocity.angle` khi 'shoot' (xoay theo hướng bay) — cần xoay sprite bóng đúng.
10. Cả `Constants.VERSION = "1.1.0p"`, `STORAGE_KEY = "fb21_pk"`.
