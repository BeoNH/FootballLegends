# Modules

## gameplay — `assets/scripts/gameplay`
Role: luật trận + vật lý bóng/cầu thủ (Box2D).
Key files: `MatchController.ts` (159; timer 90s, GOAL_PAUSE 1.5s, score, phase), `BallController.ts` (270; shoot(sign), contact ground/sensor, rest mode, const BALL_SHOT_X/Y), `PlayerController.ts` (360; keyboard input, move/jump/shoot, shoot cooldown, foot-stand sensor).
Public API: Ball.shoot/setGoalCallback/enterRestMode/resetToKickoff; Player.setInputEnabled/resetToKickoff/requestJump/requestShoot.
Depends on: common | Used by: scene
Gotchas: AI đối thủ chưa có (aiPlayer comment-out); IState có Tackle/Stun nhưng comment ghi F001 chỉ Idle/Run/Jump (?).

## common — `assets/scripts/common`
`BroadcastReceiver.ts` static event bus (register/unRegisterByAction/ByTarget/send; listener gắn Component), `GameEvents.ts`, `GameTypes.ts`.

## managers — `assets/scripts/managers`
`NetworkManager.ts` (503) singleton WS request/notify + HTTP, reconnect backoff, ping; `AssetLoader.ts` static loader + clearCache; `PhysicsDebug2D.ts` bật debug draw.

## i18n — `assets/scripts/i18n`
`LocalizationManager.ts` (EventTarget), `LocalizedLabel.ts`, `LocalizedSprite.ts`.

## ui — `assets/scripts/ui`
`popup/UiPopup.ts` (show/hide có animation, attachToPopupRoot), `NumberScrolling.ts`.

## extensions/funplay-cocos-mcp (third-party, untracked)
MCP server cho Cocos editor (tool-registry.js, server.js, scene.js, panel/). Bỏ qua khi làm game.
