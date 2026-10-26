import { AudioClip, Font, resources, SpriteAtlas, SpriteFrame, dragonBones, Asset } from 'cc';

/** Load/lookup tài nguyên dùng chung (atlas interface/gameplay, font, sound, DragonBones). */
export class Res {
    static dbAsset: dragonBones.DragonBonesAsset | null = null;
    static dbAtlas: dragonBones.DragonBonesAtlasAsset | null = null;
    static clips: { [key: string]: AudioClip } = {};
    static loaded = false;
    private static _interface: SpriteAtlas | null = null;
    private static _gameplay: SpriteAtlas | null = null;
    private static _font: Font | null = null;
    private static _singles: { [name: string]: SpriteFrame } = {};

    static get font(): Font | null { return Res._font; }

    /** name KHÔNG có '.png'. Tìm interface rồi gameplay, rồi ảnh rời (0bg_0xs, logo_mad). */
    static frame(name: string): SpriteFrame | null {
        return (Res._interface && Res._interface.getSpriteFrame(name))
            || (Res._gameplay && Res._gameplay.getSpriteFrame(name))
            || Res._singles[name] || null;
    }

    private static one<T extends Asset>(path: string, type: new (...a: any[]) => T): Promise<T | null> {
        return new Promise((resolve) => {
            resources.load(path, type as any, (err, asset) => {
                if (err) console.warn('[Res] load fail', path, err);
                resolve(err ? null : (asset as T));
            });
        });
    }

    static async load(onProgress?: (p: number) => void): Promise<void> {
        if (Res.loaded) { onProgress && onProgress(1); return; }
        const total = 8;
        let done = 0;
        const tick = () => { done++; onProgress && onProgress(Math.min(1, done / total)); };
        const step = async <T>(p: Promise<T>): Promise<T> => { const r = await p; tick(); return r; };

        Res._interface = await step(Res.one('images/interface', SpriteAtlas));
        Res._gameplay = await step(Res.one('images/gameplay', SpriteAtlas));
        Res._font = await step(Res.one('fonts/Calibri-Bold', Font));
        for (const n of ['0bg_0xs', 'logo_mad']) {
            const sf = await Res.one(`images/${n}/spriteFrame`, SpriteFrame);
            if (sf) Res._singles[n] = sf;
        }
        tick();
        Res.dbAsset = await step(Res.one('dragonbones/player_ske', dragonBones.DragonBonesAsset));
        Res.dbAtlas = await step(Res.one('dragonbones/player_tex', dragonBones.DragonBonesAtlasAsset));
        // Chỉ cần dbAtlas.atlasJson trỏ tới texture.png, gán texture nếu importer chưa tự gán.
        await new Promise<void>((resolve) => {
            resources.loadDir('sound', AudioClip, (err, clips) => {
                if (err) console.warn('[Res] sound fail', err);
                else for (const c of clips) Res.clips[c.name] = c;
                resolve();
            });
        });
        tick();
        tick();
        Res.loaded = true;
    }
}
