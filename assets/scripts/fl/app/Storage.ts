/** localStorage + hash kiểu Java hashCode (SPEC §10). Mọi truy cập bọc try/catch. */
export const KEY_SAVE = 'fb21_pk';
export const KEY_SFX = 'fb21_sfx_pk';

function hash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h.toString();
}

export class Storage {
    /** Đọc JSON đã validate hash; sai hash/lỗi -> null. */
    static read<T = any>(key: string): T | null {
        try {
            const raw = localStorage.getItem(key);
            if (raw == null) return null;
            if (localStorage.getItem(key + 'h') !== hash(raw)) return null;
            return JSON.parse(raw) as T;
        } catch (e) {
            return null;
        }
    }

    static write(key: string, value: any): void {
        try {
            const raw = JSON.stringify(value);
            localStorage.setItem(key, raw);
            localStorage.setItem(key + 'h', hash(raw));
        } catch (e) { /* bỏ qua */ }
    }
}
