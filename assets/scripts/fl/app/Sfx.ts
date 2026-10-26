import { AudioSource, Node, director } from 'cc';
import { Res } from './Res';
import { KEY_SFX, Storage } from './Storage';

/** Âm thanh: key = tên file trong resources/sound. Nhạc 'track' vol 0.5 loop dùng chung (SPEC §9). */
export class Sfx {
    static music = true;
    static sfx = true;
    private static host: Node | null = null;
    private static sources: { [key: string]: AudioSource } = {};
    private static vols: { [key: string]: number } = {};
    private static inited = false;

    static init(): void {
        if (Sfx.inited) return;
        Sfx.inited = true;
        const d = Storage.read<any>(KEY_SFX);
        if (d) { Sfx.music = d.m !== false; Sfx.sfx = d.sf !== false; }
    }

    private static get(key: string): AudioSource | null {
        let src = Sfx.sources[key];
        if (src) return src;
        const clip = Res.clips[key];
        if (!clip) return null;
        if (!Sfx.host) {
            Sfx.host = new Node('FLAudio');
            director.getScene()?.addChild(Sfx.host);
            director.addPersistRootNode(Sfx.host);
        }
        const n = new Node(key);
        Sfx.host.addChild(n);
        src = n.addComponent(AudioSource);
        src.clip = clip;
        Sfx.sources[key] = src;
        return src;
    }

    private static isMusic(key: string): boolean { return key === 'track'; }

    private static effVol(key: string): number {
        const v = Sfx.vols[key] != null ? Sfx.vols[key] : 1;
        return (Sfx.isMusic(key) ? Sfx.music : Sfx.sfx) ? v : 0;
    }

    static play(key: string, volume = 1, loop = false): void {
        const src = Sfx.get(key);
        if (!src) return;
        Sfx.vols[key] = volume;
        src.loop = loop;
        src.volume = Sfx.effVol(key);
        if (loop) {
            if (!src.playing) src.play();
        } else {
            src.stop();
            src.play();
        }
    }

    static stop(key: string): void {
        const src = Sfx.sources[key];
        if (src) src.stop();
    }

    static setVolume(key: string, v: number): void {
        Sfx.vols[key] = v;
        const src = Sfx.sources[key];
        if (src) src.volume = Sfx.effVol(key);
    }

    static startMusic(): void {
        if (!Sfx.sources['track'] || !Sfx.sources['track'].playing) Sfx.play('track', 0.5, true);
    }

    /** Trạng thái nút music: 0 = nhạc+sfx, 1 = chỉ nhạc, 2 = tắt hết (frame InGameMusicButton000N). */
    static get state(): number { return Sfx.music ? (Sfx.sfx ? 0 : 1) : 2; }

    static toggleCycle(): void {
        const s = (Sfx.state + 1) % 3;
        Sfx.music = s !== 2;
        Sfx.sfx = s === 0;
        Storage.write(KEY_SFX, { m: Sfx.music, sf: Sfx.sfx });
        for (const k of Object.keys(Sfx.sources)) Sfx.sources[k].volume = Sfx.effVol(k);
    }
}
