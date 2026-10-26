# Architecture

## Screen flow
```mermaid
flowchart LR
  Preloader --> Menu
  Menu -->|1/2 PLAYER| Menu2
  Menu -->|Menu2 skipped (Features)| RandomState
  Menu -->|QUICK MATCH| Gameplay
  Menu2 -->|FRIENDLY| RandomState
  Menu2 -->|TOURNAMENT| RandomState
  RandomState -->|PLAY friendly| Gameplay
  RandomState -->|NEXT tournament| Tournament --> PreMatch --> Gameplay
  Gameplay -->|half time| PreMatch
  Gameplay -->|full time| PostMatch
  PostMatch -->|friendly| RandomState
  PostMatch -->|tournament| Tournament
  PostMatch -->|eliminated/end| FinalTournament --> Menu2
```
`backToModeMenu()` (Features.ts) trả 'Menu' khi Menu2 bị skip.

## Gameplay loop (GameCore)
- `update(dt)`: accumulator, mỗi tick `t = 0.025*timeScale`; nếu t≠0: `syncSceneToPhysics → PhysicsSystem2D.step(0.9*t) → syncPhysicsToScene` rồi update ball/players/AI. `autoSimulation=false` khi vào Gameplay, khôi phục khi thoát.
- `slow(n)`: 1→0.05 (teleport), 2→0.4, 3→0 freeze (fireball), khác→1. DragonBones view nhận `setGameTimeScale` (freeze = 0.9 đo theo bản gốc).
- Va chạm: ball/player chỉ va GROUND/FLOOR; head sensor & goal sensor bắt ball; bounce sàn/mặt ngang set `vy=470` thủ công trong BEGIN_CONTACT. Goal xử lý sau step.
- Timer: internal 60s (friendly/quick) hoặc 30s/hiệp (tournament), hiển thị round(x*1.5). Countdown 3-2-1-GO ~0.89s sau bàn/kickoff/resume.

## Persistence
localStorage `fb21_pk` (Inventory save: team, tsave/tsave2, stats) + `fb21_sfx_pk` (music/sfx), mỗi key kèm hash Java-style ở key+`h`.
