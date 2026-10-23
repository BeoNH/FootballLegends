# Architecture

## Overview
```mermaid
flowchart LR
  MC[MatchController] -->|setGoalCallback / enterRestMode / resetToKickoff| BC[BallController]
  MC -->|setInputEnabled / resetToKickoff| PC[PlayerController]
  PC -->|ball ref, shoot| BC
  MC -->|send| BR[BroadcastReceiver]
  BR -.-> UI[UI listeners]
  GT[GameTypes / GameEvents] --> MC
  NM[NetworkManager] -.chưa dùng.-> BE[(Backend)]
```

## Flows
```mermaid
sequenceDiagram
  participant B as BallController
  participant M as MatchController
  participant P as PlayerController
  participant E as BroadcastReceiver
  B->>M: goalCallback(sensorWorldX)
  M->>M: score (x>0→T1, else T2), phase=GoalPause
  M->>P: setInputEnabled(false)
  M->>B: enterRestMode()
  M->>E: MATCH_GOAL {scoreT1,scoreT2}
  M->>M: scheduleOnce 1.5s
  M->>P: resetToKickoff()
  M->>B: resetToKickoff()
  M->>E: MATCH_KICKOFF
```
Hết giờ: update() cộng dt tới MATCH_DURATION=90 → enterFullTime → MATCH_END {phase}.

## Data
| Type | Giá trị |
|---|---|
| MatchPhase | Playing, GoalPause, FullTime |
| GameState | IDLE, PLAYING, PAUSED, RESULT |
| IState (player) | Idle, Run, Jump, Tackle, Stun |
| Side | Human=1, Bot=-1 |
| GAME_EVENTS | paddle-hit(?legacy), MATCH_GOAL, MATCH_END, MATCH_KICKOFF |

## External
- NetworkManager: query param `url_api` → httpBaseUrl; WS wsHost/wsPort (default localhost:3000). Chưa có caller trong game.
