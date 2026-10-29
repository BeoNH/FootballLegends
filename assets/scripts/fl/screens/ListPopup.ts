import { BlockInputEvents, Color, Label, Layout, Mask, Node, ScrollView, Sprite, UIOpacity, UITransform, instantiate } from 'cc';
import { Inventory } from '../app/Inventory';
import { NetworkManager } from '../app/NetworkManager';
import { Res } from '../app/Res';
import { UIKit } from '../app/UIKit';

const PANEL_W = 600, PANEL_H = 460;
const VIEW_W = 560, ROW_W = 540, ROW_H = 40;
const VIEW_TOP = 130;      // mép trên vùng list (so với tâm panel)
const FOOTER_Y = -170;     // tâm dải yourInfo
const VIEW_BOTTOM_FOOTER = -140, VIEW_BOTTOM_FULL = -190;

export interface HeaderCol { text: string; x: number; anchor: number }

/** Popup danh sách từ API portal (Rank/History): open → gọi API → fill list (tái dùng children của content). */
export abstract class ListPopup {
    readonly node: Node;
    protected readonly itemTpl: Node;
    protected readonly panel: Node;
    private readonly content: Node;
    private readonly scroll: ScrollView;
    private readonly statusTxt: Label;
    private seq = 0;

    protected abstract readonly path: string;
    protected abstract onData(res: any): void;
    /** Dựng các con của row mẫu (tên cố định) — gọi trong constructor, không dùng field của lớp con. */
    protected abstract buildRow(tpl: Node): void;
    /** Điền 1 row (node đã active). */
    protected abstract fillRow(row: Node, d: any, i: number): void;
    /** Xoá dữ liệu phụ trước khi tải (vd. dải "your rank"). */
    protected reset(): void { }

    constructor(parent: Node, name: string, title: string, headers: HeaderCol[], hasFooter: boolean) {
        this.node = UIKit.node(parent, name);

        // nền tối + chặn input toàn màn hình
        const dimSp = UIKit.sprite(this.node, 'black0000');
        dimSp.sizeMode = Sprite.SizeMode.CUSTOM;
        dimSp.node.getComponent(UITransform)!.setContentSize(4000, 3000);
        dimSp.node.addComponent(UIOpacity).opacity = 153;
        dimSp.node.addComponent(BlockInputEvents);

        this.panel = UIKit.node(this.node, 'panel');
        UIKit.slice(this.panel, 'dark_blue', PANEL_W, PANEL_H);
        UIKit.slice(this.panel, 'navy', 280, 50, 0, 194);
        UIKit.label(this.panel, title, 'calibri40_yellow', 0, 194);
        UIKit.iconButton(this.panel, 'close0000', 266, 194, 1, () => this.close()).name = 'btnClose';
        for (const h of headers) UIKit.label(this.panel, h.text, 'calibri26_yellow', h.x, 148, h.anchor);

        // ScrollView dọc: scroll → view (Mask) → content (anchor trên, Layout dọc)
        const viewBottom = hasFooter ? VIEW_BOTTOM_FOOTER : VIEW_BOTTOM_FULL;
        const viewH = VIEW_TOP - viewBottom;
        const midY = (VIEW_TOP + viewBottom) / 2;
        const sn = UIKit.node(this.panel, 'scroll', 0, midY);
        sn.getComponent(UITransform)!.setContentSize(VIEW_W, viewH);
        const view = UIKit.node(sn, 'view');
        view.getComponent(UITransform)!.setContentSize(VIEW_W, viewH);
        view.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
        this.content = UIKit.node(view, 'content', 0, viewH / 2);
        const ct = this.content.getComponent(UITransform)!;
        ct.setAnchorPoint(0.5, 1);
        ct.setContentSize(ROW_W, 0);
        const lay = this.content.addComponent(Layout);
        lay.type = Layout.Type.VERTICAL;
        lay.resizeMode = Layout.ResizeMode.CONTAINER;
        lay.spacingY = 4;
        this.scroll = sn.addComponent(ScrollView);
        this.scroll.content = this.content;
        this.scroll.horizontal = false;
        this.scroll.vertical = true;
        this.scroll.inertia = true;
        this.scroll.elastic = true;

        // row mẫu nằm NGOÀI content, ẩn
        this.itemTpl = UIKit.node(this.node, 'itemTpl');
        const sp = this.itemTpl.addComponent(Sprite);
        sp.trim = false;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = Res.frame('popup_row');
        this.itemTpl.getComponent(UITransform)!.setContentSize(ROW_W, ROW_H);
        this.buildRow(this.itemTpl);
        this.itemTpl.active = false;

        this.statusTxt = UIKit.label(this.panel, '', 'calibri26', 0, midY);
    }

    /** Dải "your info" ở đáy panel (navy 560x44), trả node để thêm label. */
    protected buildFooter(): Node {
        const strip = UIKit.slice(this.panel, 'navy', VIEW_W, 44, 0, FOOTER_Y).node;
        strip.name = 'yourInfo';
        return strip;
    }

    init(): void { this.node.active = false; }

    open(): void {
        const seq = ++this.seq; // bỏ response của lần mở cũ
        this.node.active = true;
        this.reset();
        this.fill([]);
        const user = Inventory.userName;
        if (!user) { this.setStatus('OFFLINE'); return; }
        this.setStatus('LOADING...');
        NetworkManager.instance.httpPost(this.path, { username: user }).then((res) => {
            if (seq !== this.seq || !this.node.isValid || !this.node.active) return;
            this.onData(res);
        });
    }

    close(): void {
        this.seq++;
        this.node.active = false;
    }

    /** Hiện list; rỗng/không phải mảng → NO DATA. */
    protected showItems(items: any): void {
        const list = Array.isArray(items) ? items : [];
        this.fill(list);
        this.setStatus(list.length ? '' : 'NO DATA');
    }

    protected setStatus(s: string): void {
        this.statusTxt.string = s;
        this.statusTxt.node.active = s !== '';
    }

    private fill(items: any[]): void {
        const c = this.content;
        for (let i = 0; i < items.length; i++) {
            let row = c.children[i];
            if (!row) { row = instantiate(this.itemTpl); row.setPosition(0, 0); c.addChild(row); } // tpl nằm ngoài content
            row.active = true;
            this.fillRow(row, items[i], i);
        }
        for (let i = items.length; i < c.children.length; i++) c.children[i].active = false;
        c.getComponent(Layout)!.updateLayout();
        this.scroll.scrollToTop(0);
    }

    protected static txt(v: any): string {
        return v === undefined || v === null || v === '' ? '-' : String(v);
    }

    protected static setLabel(row: Node, name: string, s: string): void {
        row.getChildByName(name)!.getComponent(Label)!.string = s;
    }

    /** Thêm label con của row với tên cố định. */
    protected static rowLabel(tpl: Node, name: string, x: number, anchor: number): void {
        UIKit.label(tpl, '', 'calibri20', x, 0, anchor).node.name = name;
    }
}

const ROW_COLOR = new Color(30, 78, 140, 255);
const SELF_COLOR = new Color(230, 140, 40, 255);
const MEDALS = [new Color(255, 200, 40, 255), new Color(200, 205, 215, 255), new Color(210, 130, 60, 255)];
const NAME_MAX = 15;
const cut = (s: string) => (s.length > NAME_MAX ? s.slice(0, NAME_MAX) + '...' : s);

/** Popup bảng xếp hạng (POST /getRankList). */
export class RankPopup extends ListPopup {
    protected readonly path = '/getRankList';
    private yourInfo: Node;
    private yourRank: Label;
    private yourName: Label;
    private yourScore: Label;

    constructor(parent: Node) {
        super(parent, 'RankPopup', 'RANK', [
            { text: 'RANK', x: -230, anchor: 0.5 }, { text: 'NAME', x: -190, anchor: 0 }, { text: 'SCORE', x: 250, anchor: 1 },
        ], true);
        this.yourInfo = this.buildFooter();
        this.yourRank = UIKit.label(this.yourInfo, '', 'calibri20', -230, 0, 0.5);
        this.yourName = UIKit.label(this.yourInfo, '', 'calibri20', -190, 0, 0);
        this.yourScore = UIKit.label(this.yourInfo, '', 'calibri20', 250, 0, 1);
        this.yourInfo.active = false;
    }

    protected buildRow(tpl: Node): void {
        UIKit.sprite(tpl, 'medal', -230, 0).node.name = 'medal';
        ListPopup.rowLabel(tpl, 'rank', -230, 0.5);
        ListPopup.rowLabel(tpl, 'name', -190, 0);
        ListPopup.rowLabel(tpl, 'score', 250, 1);
    }

    protected reset(): void { this.yourInfo.active = false; }

    protected onData(res: any): void {
        this.showItems(res?.board);
        const y = res?.yourInfo;
        this.yourInfo.active = !!y;
        if (y) {
            this.yourRank.string = ListPopup.txt(y.rank);
            this.yourName.string = cut(ListPopup.txt(y.name));
            this.yourScore.string = ListPopup.txt(y.numScore);
        }
    }

    protected fillRow(row: Node, d: any, i: number): void {
        const name = d?.name;
        row.getComponent(Sprite)!.color = name !== undefined && name === Inventory.userName ? SELF_COLOR : ROW_COLOR;
        const medal = row.getChildByName('medal')!;
        medal.active = i < 3;
        if (i < 3) medal.getComponent(Sprite)!.color = MEDALS[i];
        ListPopup.setLabel(row, 'rank', String(i + 1));
        ListPopup.setLabel(row, 'name', cut(ListPopup.txt(name)));
        ListPopup.setLabel(row, 'score', ListPopup.txt(d?.numScore));
    }
}

const p2 = (n: number) => (n < 10 ? '0' : '') + n;

/** Popup lịch sử chơi (POST /getHistory). */
export class HistoryPopup extends ListPopup {
    protected readonly path = '/getHistory';

    constructor(parent: Node) {
        super(parent, 'HistoryPopup', 'HISTORY', [
            { text: 'DATE', x: -250, anchor: 0 }, { text: 'TIME', x: 60, anchor: 0.5 }, { text: 'SCORE', x: 250, anchor: 1 },
        ], false);
    }

    protected buildRow(tpl: Node): void {
        ListPopup.rowLabel(tpl, 'date', -250, 0);
        ListPopup.rowLabel(tpl, 'time', 60, 0.5);
        ListPopup.rowLabel(tpl, 'score', 250, 1);
    }

    protected onData(res: any): void { this.showItems(res?.history); }

    protected fillRow(row: Node, d: any): void {
        row.getComponent(Sprite)!.color = ROW_COLOR;
        ListPopup.setLabel(row, 'date', HistoryPopup.date(d?.date));
        ListPopup.setLabel(row, 'time', d?.numTime === undefined || d?.numTime === null ? '-' : `${d.numTime}s`);
        ListPopup.setLabel(row, 'score', ListPopup.txt(d?.numScore));
    }

    /** ISO → dd/MM/yyyy HH:mm (local). */
    private static date(iso: any): string {
        const t = iso ? new Date(iso) : null;
        if (!t || isNaN(t.getTime())) return '-';
        return `${p2(t.getDate())}/${p2(t.getMonth() + 1)}/${t.getFullYear()} ${p2(t.getHours())}:${p2(t.getMinutes())}`;
    }
}
