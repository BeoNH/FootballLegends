import { _decorator, AudioClip, AudioSource, Component, resources } from 'cc';
import BroadcastReceiver from '../common/BroadcastReceiver';
import { GAME_EVENTS } from '../common/GameEvents';
import {
    IBallShotPayload,
    IMatchCountdownPayload,
    IMatchTimePayload,
    ISuperUsedPayload,
} from '../common/GameTypes';

const { ccclass, property } = _decorator;

/** Thư mục clip trong assets/resources (không đuôi file). */
const SOUND_DIR = 'sound/';
const CLIP_NAMES = [
    'beep5sec', 'beepOvertime', 'button', 'b_bounce', 'b_shot', 'FinalWhistle', 'fireball',
    'goal1', 'goal2', 'slide', 'stadium', 'teleport', 'track', 'whistle',
];
const STADIUM_VOLUME = 0.4;
const TRACK_VOLUME = 0.6;
const SFX_VOLUME = 1;
/** Hiệp = 45 phút hiển thị; beep khi còn 5s thật = 5 × 1.5 phút hiển thị (khớp MatchController). */
const HALF_DISPLAY = 45;
const BEEP_DISPLAY_LEAD = 5 * 1.5;

/** Âm thanh toàn game: nghe GAME_EVENTS, gameplay không gọi trực tiếp (trừ playButton cho UI). */
@ccclass('AudioManager')
export class AudioManager extends Component {
    public static instance: AudioManager | null = null;

    @property({ type: AudioSource, tooltip: 'AudioSource nhạc nền/ambience (loop): track, stadium' })
    public musicSource: AudioSource | null = null;

    @property({ type: AudioSource, tooltip: 'AudioSource cho SFX (playOneShot)' })
    public sfxSource: AudioSource | null = null;

    private clips = new Map<string, AudioClip>();
    private muted = false;
    private musicVolume = TRACK_VOLUME;
    /** Nhạc chờ phát khi clip load xong (menu lúc vào game). */
    private pendingMusic: string | null = 'track';
    private beepedHalf = -1;

    protected onLoad(): void {
        AudioManager.instance = this;
        if (this.musicSource == null || this.sfxSource == null) {
            console.warn('[AudioManager] Thiếu musicSource/sfxSource');
        }
        const reg = (e: string, cb: (d: any) => void) => BroadcastReceiver.register(e, cb, this);
        reg(GAME_EVENTS.MATCH_START, () => this.onMatchStart());
        reg(GAME_EVENTS.MATCH_COUNTDOWN, (d: IMatchCountdownPayload) => { if (d.n === 0) this.playSfx('whistle'); });
        reg(GAME_EVENTS.BALL_SHOT, (d: IBallShotPayload) => this.playSfx(d?.fireball ? 'fireball' : 'b_shot'));
        reg(GAME_EVENTS.BALL_BOUNCE, () => this.playSfx('b_bounce'));
        reg(GAME_EVENTS.MATCH_GOAL, () => this.playSfx(Math.random() < 0.5 ? 'goal1' : 'goal2'));
        reg(GAME_EVENTS.MATCH_HALFTIME, () => this.playSfx('FinalWhistle'));
        reg(GAME_EVENTS.MATCH_END, () => this.playSfx('FinalWhistle'));
        reg(GAME_EVENTS.MATCH_OVERTIME, () => this.playSfx('beepOvertime'));
        reg(GAME_EVENTS.MATCH_TIME, (d: IMatchTimePayload) => this.onMatchTime(d));
        reg(GAME_EVENTS.PLAYER_TACKLE, () => this.playSfx('slide'));
        reg(GAME_EVENTS.SUPER_USED, (d: ISuperUsedPayload) => { if (d.slot === 1) this.playSfx('teleport'); });
        reg(GAME_EVENTS.MATCH_RESULT, () => this.playMusic('track', TRACK_VOLUME));
        this.preload();
    }

    protected onDestroy(): void {
        BroadcastReceiver.unRegisterByTarget(this);
        if (AudioManager.instance === this) {
            AudioManager.instance = null;
        }
    }

    /** Gọi từ click event của Button UI. */
    public playButton(): void {
        this.playSfx('button');
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.musicSource != null) {
            this.musicSource.volume = muted ? 0 : this.musicVolume;
        }
    }

    private preload(): void {
        let left = CLIP_NAMES.length;
        for (const name of CLIP_NAMES) {
            resources.load(SOUND_DIR + name, AudioClip, (err, clip) => {
                if (err == null) {
                    this.clips.set(name, clip);
                } else {
                    console.warn('[AudioManager] Không load được clip', name, err);
                }
                if (--left === 0 && this.pendingMusic != null) {
                    this.playMusic(this.pendingMusic, this.pendingMusic === 'track' ? TRACK_VOLUME : STADIUM_VOLUME);
                }
            });
        }
    }

    private onMatchStart(): void {
        this.beepedHalf = -1;
        this.playMusic('stadium', STADIUM_VOLUME);
    }

    /** Beep 1 lần mỗi hiệp khi còn ≤ 5s thật (display ≥ 37.5 / 82.5). */
    private onMatchTime(d: IMatchTimePayload): void {
        if (d.display >= 2 * HALF_DISPLAY) {
            return;
        }
        const half = d.display < HALF_DISPLAY ? 0 : 1;
        if (this.beepedHalf === half) {
            return;
        }
        if (d.display >= (half + 1) * HALF_DISPLAY - BEEP_DISPLAY_LEAD) {
            this.beepedHalf = half;
            this.playSfx('beep5sec');
        }
    }

    private playSfx(name: string): void {
        const clip = this.clips.get(name);
        if (this.muted || clip == null || this.sfxSource == null) {
            return;
        }
        this.sfxSource.playOneShot(clip, SFX_VOLUME);
    }

    private playMusic(name: string, volume: number): void {
        this.pendingMusic = name;
        this.musicVolume = volume;
        const src = this.musicSource;
        const clip = this.clips.get(name);
        if (src == null || clip == null) {
            return;
        }
        this.pendingMusic = null;
        src.stop();
        src.clip = clip;
        src.loop = true;
        src.volume = this.muted ? 0 : volume;
        src.play();
    }
}
