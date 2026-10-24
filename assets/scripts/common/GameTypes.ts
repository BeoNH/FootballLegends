export enum GameState {
    IDLE = 'IDLE',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    RESULT = 'RESULT',
}

/** Phase phiên đấu — owner `MatchController`. */
export enum MatchPhase {
    Idle = 'Idle',
    Countdown = 'Countdown',
    HalfTime = 'HalfTime',
    Overtime = 'Overtime',
    Playing = 'Playing',
    GoalPause = 'GoalPause',
    FullTime = 'FullTime',
}

/** n: 3|2|1, 0 = GO. */
export interface IMatchCountdownPayload {
    n: number;
}

export interface IMatchTimePayload {
    display: number;
}

export interface IMatchResultPayload {
    score1: number;
    score2: number;
}

/** Payload event PLAYER_TACKLE / PLAYER_STUN. */
export interface IPlayerSidePayload {
    side: Side;
}

/** Payload ENERGY_CHANGED: value đã làm tròn xuống, max = SUPER_COST. */
export interface IEnergyPayload {
    side: Side;
    value: number;
    max: number;
}

/** Payload SUPER_USED: slot 0 = Fireball, 1 = Teleport. */
export interface ISuperUsedPayload {
    side: Side;
    slot: number;
}

/** Payload BALL_SHOT. */
export interface IBallShotPayload {
    fireball: boolean;
}

/** Hướng sút về goal đối phương: human → phải (+1), bot → trái (-1). */
export enum Side {
    Human = 1,
    Bot = -1,
}

/** State machine hành vi cầu thủ (F001: Idle / Run / Jump). */
export enum IState {
    Idle = 'Idle',
    Run = 'Run',
    Jump = 'Jump',
    Tackle = 'Tackle',
    Stun = 'Stun',
}

export interface IGameInfo {
    gameId: number;
    title: string;
    description: string;
    introduction: string;
}
