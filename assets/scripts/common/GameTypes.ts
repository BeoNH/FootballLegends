export enum GameState {
    IDLE = 'IDLE',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    RESULT = 'RESULT',
}

/** Hướng sân: human trái = -1, bot phải = 1. */
export enum Side {
    Human = -1,
    Bot = 1,
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
