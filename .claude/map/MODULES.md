# Modules

## gameplay — `assets/scripts/gameplay`
Role: luật trận + vật lý bóng/cầu thủ (Box2D).
Key files: `MatchController.ts` (159; timer 90s, GOAL_PAUSE 1.5s, score, phase), `BallController.ts` (270; shoot(sign), contact ground/sensor, rest mode, const BALL_SHOT_X/Y; header = BodySensor lift vx=HEAD_PUSH_X*side; isShooting() trả hướng sút), `PlayerController.ts` (360; keyboard input, move/jump/shoot, shoot cooldown, foot-stand sensor; F007: requestTackle (S/↓, 0.4s, hộp 40×50) → applyStun(dir) 80% / opponent nhảy né, state Tackle/Stun không bị input ghi đè vx, events PLAYER_TACKLE/PLAYER_STUN).
Public API: Ball.shoot/setGoalCallback/enterRestMode/resetToKickoff; Player.setInputEnabled/resetToKickoff/requestJump/requestShoot.
Depends on: common | Used by: scene
`AiController.ts` (F006; port AIController2, tick 0.025s, strategy theo tỉ số lúc MATCH_KICKOFF, chỉ move/jump/shoot qua API Player; không delay move đầu kickoff; thủ môn nhảy chắn khi ball.isShooting()==-side); Player.isHuman (false = bot, không đăng ký keyboard), isInputEnabled, opponent.

`SuperAbility.ts` (F008; Z/K hoặc requestSuper(); superSlot 0 Fireball/1 Teleport, setSuperSlot; cần MatchData.energy ≥ SUPER_COST; events ENERGY_CHANGED/SUPER_USED). Energy tick trong MatchController (ENERGY_RATE/SUPER_COST export ở MatchData.ts). Ball.shoot(sign, mult), isFireball(). `common/SlowMo.ts`: static set/reset/play(scale, realSec)/scale — scale physics qua fixedTimeStep+accumulator, KHÔNG đổi scheduler timeScale.
Gotchas: IState có Tackle/Stun nhưng comment ghi F001 chỉ Idle/Run/Jump (?).

## common — `assets/scripts/common`
`BroadcastReceiver.ts` static event bus (register/unRegisterByAction/ByTarget/send; listener gắn Component), `GameEvents.ts`, `GameTypes.ts`.

## managers — `assets/scripts/managers`
`NetworkManager.ts` (503) singleton WS request/notify + HTTP, reconnect backoff, ping; `AssetLoader.ts` static loader + clearCache; `PhysicsDebug2D.ts` bật debug draw; `AudioManager.ts` singleton nghe GAME_EVENTS (+BALL_SHOT/BALL_BOUNCE) phát SFX/loop (stadium, track), `playButton()`, `setMuted()`.

## i18n — `assets/scripts/i18n`
`LocalizationManager.ts` (EventTarget), `LocalizedLabel.ts`, `LocalizedSprite.ts`.

## ui — `assets/scripts/ui`
`popup/UiPopup.ts` (show/hide có animation, attachToPopupRoot, `destroyOnHide`), `NumberScrolling.ts`.
F009: `HudMatch.ts` (gắn trên Canvas/UIRoot; score/timer/countdown/banner/energy radial FILLED, quantize 36 bước, child `Hint` hiện khi đầy), `TouchControls.ts` (dưới UIRoot, ẩn desktop), `popup/PopupManager.ts` (gắn PopupRoot; `show(name,data)` load `resources/prefabs/popup/<name>`, cache, nghe HALFTIME/RESULT, start → Menu). Popup (MenuPopup/HalfTimePopup/ResultPopup) là prefab độc lập, không ref scene; nhận data qua `UiPopup.show(data)` → `onShow(data)`. Super slot lưu ở `MatchData.superSlot` (không reset).

## extensions/funplay-cocos-mcp (third-party, untracked)
MCP server cho Cocos editor (tool-registry.js, server.js, scene.js, panel/). Bỏ qua khi làm game.
