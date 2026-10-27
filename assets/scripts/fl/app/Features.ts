import { sys } from 'cc';

/** Bật true để test giao diện mobile trên PC/editor. */
export const FORCE_MOBILE_UI = false;

/** Giao diện điều khiển cảm ứng (nút ảo + HUD dời chỗ). */
export function isMobileUI(): boolean { return FORCE_MOBILE_UI || sys.isMobile; }

/** Bật/tắt mode theo phiên bản build. */
export const Features = {
    quickMatch: false,   // nút QUICK MATCH ở Menu
    twoPlayers: false,   // nút 2 PLAYERS ở Menu
    tournament: false,   // nút TOURNAMENT ở Menu2
    friendly: true,      // nút FRIENDLY ở Menu2
    matchModes: [true, false, false] as boolean[], // MatchModePanel: 0 = 1v1, 1 = 2v2, 2 = 1v2
};

/** Menu2 bị bỏ qua khi chỉ đúng 1 trong TOURNAMENT/FRIENDLY được bật. */
export function isMenu2Skipped(): boolean { return Features.tournament !== Features.friendly; }

/** Màn quay lại từ các màn mode: 'Menu' nếu Menu2 bị bỏ qua, ngược lại 'Menu2'. */
export function backToModeMenu(): string { return isMenu2Skipped() ? 'Menu' : 'Menu2'; }

/** Đảm bảo Inventory.matchMode luôn là mode đang bật (fallback mode bật đầu tiên). */
export function sanitizeMatchMode(mode: number): number {
    if (Features.matchModes[mode]) return mode;
    const i = Features.matchModes.indexOf(true);
    return i >= 0 ? i : 0;
}
