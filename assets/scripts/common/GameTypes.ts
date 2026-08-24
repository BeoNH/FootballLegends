export enum GameState {
    IDLE = 'IDLE',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    RESULT = 'RESULT',
}

/** Phase phiên đấu — owner `MatchController`. */
export enum MatchPhase {
    Playing = 'Playing',
    GoalPause = 'GoalPause',
    FullTime = 'FullTime',
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
