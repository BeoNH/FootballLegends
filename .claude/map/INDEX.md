# FootballLegends — map
Game bóng đá 2D 1v1 (human vs bot) trên Cocos Creator 3.8.7, 1 scene `assets/scene/Game.scene`. Đang ở giai đoạn đầu (F001–F003).
Stack: Cocos Creator 3.8.7 + TypeScript (strict=false) + Box2D physics | Run/Build: Creator editor (Play/Build panel) | Test: không có (game); chỉ extension có test

## Where things are
| Area | Path | Notes |
|---|---|---|
| Gameplay | assets/scripts/gameplay | MatchController (timer/score/phase), BallController, PlayerController |
| Common | assets/scripts/common | GameTypes (enum), GameEvents (tên event), BroadcastReceiver (event bus) |
| Managers | assets/scripts/managers | NetworkManager (WS+HTTP, chưa được dùng), AssetLoader, PhysicsDebug2D |
| i18n | assets/scripts/i18n | LocalizationManager + LocalizedLabel/Sprite |
| UI | assets/scripts/ui | UiPopup (show/hide anim), NumberScrolling |
| Assets | assets/resources/{fonts,images,sound} | scene: assets/scene/Game.scene |
| Docs thiết kế | .cursor/docs | GDD, MODULES, ARCHITECTURE, features/F00x, CHANGELOG (nguồn spec) |
| Tool | mark-review-done.mjs | tick checklist feature trong .cursor/docs (`npm run review:done`) |
| MCP plugin | extensions/funplay-cocos-mcp | extension bên thứ 3 (untracked), KHÔNG phải code game |

## Entry points
- assets/scripts/gameplay/MatchController.ts — gắn vào scene, điều phối phiên đấu
- assets/scene/Game.scene — scene duy nhất (không đọc cả file)

## Key flows (details: ARCHITECTURE.md#flows)
- Goal: Ball sensor → MatchController.onGoalSensorHit → score++ → GoalPause 1.5s → kickoff → MATCH_KICKOFF
- FullTime: matchElapsed ≥ 90 → MatchPhase.FullTime → MATCH_END

## Conventions
- Component Cocos: `@ccclass('Name')` + `@property` có tooltip tiếng Việt; ref `| null`, validate trong onLoad.
- Event: `BroadcastReceiver.send(GAME_EVENTS.X, payload)`; tên event khai báo ở common/GameEvents.ts, enum/type ở GameTypes.ts.
- Side: Human=+1 (sút sang phải, GoalRight→T_1), Bot=-1. Score T_1=human, T_2=đối thủ.
- Comment/tooltip bằng tiếng Việt. Thông số gameplay là const đầu file.

## Don't touch / generated
- library/ temp/ local/ build/ profiles/ *.meta, *.scene/*.prefab (JSON lớn)
- extensions/funplay-cocos-mcp (third-party)

## Where to find X
- "thêm event mới" → GameEvents.ts + payload type trong GameTypes.ts
- "thêm popup" → copy pattern ui/popup/UiPopup.ts
- "thêm state cầu thủ" → IState (GameTypes.ts) + PlayerController
- "text đa ngôn ngữ" → i18n/LocalizedLabel.ts
- Spec feature → .cursor/docs/features/Fxxx
