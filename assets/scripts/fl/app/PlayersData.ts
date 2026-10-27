import { dragonBones, Node } from 'cc';
import { Res } from './Res';
import { UIKit } from './UIKit';

/** Tên 24 CLB (index 0..23, emblem = index+1) — SPEC §8.1. */
export const CLUBS_NAMES = ['Meringues', 'Barca', 'The Citizens', 'The Reds', 'Scousers', 'Gunners', 'Red Devils', 'Die Bayern', 'Die Borussen', 'Parisians', 'Nerazzurri', 'Giallorossi', 'As Aguias', 'Blauw-Zwart', 'The Teddy Bears', 'De Godenzonen', 'Trilos', 'Miners', 'Die Roten Bullen', 'Sarı Kanaryalar', 'The Herons', 'Knights of Najd', 'Urubu', 'Las Gallinas'];

/** Tông da tay theo skin index (PlayersData.hands gốc, 48 phần tử). */
const HANDS = [2, 2, 2, 1, 1, 1, 2, 1, 1, 3, 1, 1, 1, 3, 1, 2, 3, 1, 2, 3, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 1, 2, 1, 3, 1, 1, 1, 2];
const PLAYERS_COUNT = 48;

export class PlayersData {
    /** Giày random 1 lần mỗi phiên (setupPlayers gốc). */
    private static legs: string[] = [];

    static clubName(teamIndex: number): string { return CLUBS_NAMES[teamIndex] || ''; }

    /** Tên frame emblem theo team index 0..23. */
    static emblemFrame(teamIndex: number): string { return 'Emblems00' + (teamIndex < 10 ? '0' : '') + teamIndex; }

    /** Tạo node ArmatureDisplay 'player' (idle loop) tại (x,y) local của parent. */
    static createPlayer(parent: Node, x: number, y: number, scale = 1): dragonBones.ArmatureDisplay | null {
        if (!Res.dbAsset || !Res.dbAtlas) return null;
        const n = UIKit.node(parent, 'player', x, y);
        n.setScale(scale, scale, 1);
        const d = n.addComponent(dragonBones.ArmatureDisplay);
        d.dragonAsset = Res.dbAsset;
        d.dragonAtlasAsset = Res.dbAtlas;
        d.armatureName = 'player';
        d.playAnimation('idle', 0);
        return d;
    }

    /** Đổi skin cầu thủ: idx = 2*team + p (0..47); side 0 = áo home, 1 = áo away (SPEC §8.2). */
    static switchPlayer(d: dragonBones.ArmatureDisplay | null, idx: number, side: number): void {
        const arm = d && d.armature();
        if (!arm) return;
        idx = Math.round(idx);
        if (!(idx >= 0 && idx < PLAYERS_COUNT)) idx = 0;
        if (PlayersData.legs.length === 0) {
            for (let i = 0; i < PLAYERS_COUNT; i++) PlayersData.legs[i] = 'leg' + (1 + Math.floor(10 * Math.random()));
        }
        const body = 2 * Math.floor(idx / 2) + side;
        const set = (slot: string, anim: string) => {
            const s = arm.getSlot(slot);
            const child = s && s.childArmature;
            if (child) child.animation.play(anim);
        };
        set('head', 'head' + (idx + 1));
        set('body', 'body' + (body + 1));
        set('left hand', 'hand' + HANDS[idx]);
        set('right hand', 'hand' + HANDS[idx]);
        set('left leg', PlayersData.legs[idx]);
        set('right leg', PlayersData.legs[idx]);
        arm.animation.play('idle');
        arm.advanceTime(1 / 60);
    }
}
