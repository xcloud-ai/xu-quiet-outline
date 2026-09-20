// 树渲染器：扁平可见列表 + 固定行高虚拟滚动 + keydiff DOM 复用 + 事件委托
// 性能目标：文件切换/编辑只做 O(标题数) 的列表重算 + O(视口行数) 的 DOM 增删
import { store } from "@/store";
import { iconChevron } from "./icons";

export interface VisibleRow {
    idx: number; // header index
    level: number;
    hasChildren: boolean;
    expanded: boolean;
}

export interface TreeHandlers {
    /** 点击行主体（跳转） */
    onRowClick(idx: number): void;
    /** 点击展开箭头 */
    onToggle(idx: number): void;
    /** 右键菜单 */
    onContextMenu(idx: number, ev: MouseEvent): void;
    /** 拖动落点（from/to 为 header index） */
    onDragDrop(from: number, to: number, position: "before" | "after" | "inside"): void;
    /** 是否允许拖动（drag_modify 设置） */
    canDrag(): boolean;
    /** 当前展开集合（由 view 层持有） */
    getExpanded(): Set<number>;
}

const OVERSCAN = 6; // 视口外预渲染行数
const WIKILINK_RE = /\[\[([^\][]+?)\]\]/g;

export class TreeRenderer {
    rows: VisibleRow[] = [];
    private rowEls = new Map<number, HTMLElement>();
    private rowHeight = 24;
    private locateIdx = -1;
    private selectedIdx = -1;
    private draggingIdx = -1;
    private measured = false; // 行高是否已成功实测（首帧面板可能未布局，测高为 0）
    private resizeObserver?: ResizeObserver;
    filterText = "";

    constructor(
        private container: HTMLElement, // .qo-tree 滚动容器
        private viewport: HTMLElement, // .qo-viewport 高度撑开层
        private handlers: TreeHandlers,
    ) {
        this.bindEvents();
        // 面板延迟挂载（Obsidian sidebar deferral）：构造时容器可能还没布局，
        // 尺寸从 0 变为有时自动补测行高并重绘
        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => this.remeasureIfNeeded());
            this.resizeObserver.observe(this.container);
        }
    }

    // ============ 渲染 ============

    /** 重算可见行列表并绘制（数据或展开状态变化后调用） */
    render() {
        this.rows = this.computeVisible();
        this.paint();
    }

    /** 仅按滚动位置重绘窗口（行数据不变） */
    paint() {
        const { rows } = this;
        const viewH = this.container.clientHeight;
        const start = Math.max(0, Math.floor(this.container.scrollTop / this.rowHeight) - OVERSCAN);
        const end = Math.min(
            rows.length,
            Math.ceil((this.container.scrollTop + viewH) / this.rowHeight) + OVERSCAN,
        );

        const wanted = new Set<number>();
        for (let i = start; i < end; i++) wanted.add(rows[i].idx);

        // 移除不再需要的行
        for (const [idx, el] of this.rowEls) {
            if (!wanted.has(idx)) {
                el.remove();
                this.rowEls.delete(idx);
            }
        }

        // 更新/创建窗口内的行
        for (let i = start; i < end; i++) {
            const row = rows[i];
            let el = this.rowEls.get(row.idx);
            if (!el) {
                el = this.createRow(row, i);
                this.rowEls.set(row.idx, el);
                this.viewport.appendChild(el);
            } else {
                this.updateRow(el, row, i);
            }
        }

        this.viewport.style.height = `${Math.max(rows.length * this.rowHeight, 1)}px`;
    }

    /**
     * 测量实际行高（字体/行高/行距设置变化后需重测）。
     * 返回是否测量成功：面板未布局时 offsetHeight 为 0，此时保留默认 24px，
     * 由 ResizeObserver / rAF 在布局完成后补测，绝不能把 0 落成 8px 导致行堆叠。
     */
    measureRow(): boolean {
        const probe = createEl("div", {
            cls: "qo-row qo-measure",
            attr: { style: "visibility:hidden" },
        });
        probe.innerHTML = `<div class="qo-content"><span class="qo-switcher">${iconChevron}</span><span class="qo-label">Ag</span></div>`;
        this.viewport.appendChild(probe);
        const h = probe.offsetHeight;
        probe.remove();
        if (h <= 0) return false;
        this.rowHeight = Math.max(h, 8);
        this.measured = true;
        return true;
    }

    /** 布局完成后的补测：仅在首帧测高失败、且容器已有尺寸时执行一次 */
    remeasureIfNeeded() {
        if (this.measured || this.container.clientHeight <= 0) return;
        if (this.measureRow()) this.render();
    }

    /** 释放观察器（面板卸载时调用） */
    destroy() {
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
    }

    // ============ 可见列表计算 ============

    private computeVisible(): VisibleRow[] {
        const { headers } = store;
        const ft = this.filterText.trim().toLowerCase();
        const expanded = this.handlers.getExpanded();

        if (ft) {
            // 搜索模式：匹配标题 + 其祖先链（自动全展开），其余隐藏
            const matched = new Set<number>();
            const keep = new Set<number>();
            for (let i = 0; i < headers.length; i++) {
                if (headers[i].title.toLowerCase().includes(ft)) {
                    matched.add(i);
                    // 祖先链
                    let curLevel = headers[i].level + 1;
                    for (let j = i; j >= 0; j--) {
                        if (headers[j].level < curLevel) {
                            keep.add(j);
                            curLevel = headers[j].level;
                        }
                    }
                }
            }
            const res: VisibleRow[] = [];
            for (let i = 0; i < headers.length; i++) {
                if (!keep.has(i)) continue;
                res.push(this.makeRow(i, true));
            }
            return res;
        }

        // 普通模式：祖先全展开才可见（栈式一遍扫描）
        const res: VisibleRow[] = [];
        const stack: { level: number; expanded: boolean }[] = [];
        for (let i = 0; i < headers.length; i++) {
            const h = headers[i];
            while (stack.length > 0 && stack[stack.length - 1].level >= h.level) stack.pop();

            const parentVisible = stack.every((s) => s.expanded);
            if (parentVisible) res.push(this.makeRow(i, false));

            const hasChildren = i < headers.length - 1 && headers[i + 1].level > h.level;
            stack.push({ level: h.level, expanded: hasChildren && expanded.has(i) });
        }
        return res;
    }

    private makeRow(i: number, filterMode: boolean): VisibleRow {
        const h = store.headers[i];
        const hasChildren = i < store.headers.length - 1 && store.headers[i + 1].level > h.level;
        return {
            idx: i,
            level: h.level,
            hasChildren,
            expanded: filterMode || this.handlers.getExpanded().has(i),
        };
    }

    // ============ 行 DOM ============

    private createRow(row: VisibleRow, pos: number): HTMLElement {
        const el = createEl("div", { cls: "qo-row", attr: { "data-idx": String(row.idx) } });
        el.innerHTML = `<div class="qo-content"></div>`;
        const content = el.firstElementChild as HTMLElement;
        this.fillContent(content, row);
        this.applyRowState(el, row);
        el.style.top = `${pos * this.rowHeight}px`;
        el.draggable = true;
        return el;
    }

    /** 填充行的内部结构（缩进线/箭头/标题） */
    private fillContent(content: HTMLElement, row: VisibleRow) {
        content.className = `qo-content level-${row.level}`;
        content.empty();

        // 彩虹缩进线：level-1 根
        for (let j = 0; j < row.level - 1; j++) {
            content.createSpan({ cls: `qo-indent line-${Math.min(j + 1, 5)}` });
        }

        // 展开箭头（叶子节点无箭头，文字直接开始——与核心大纲一致）
        const switcher = content.createSpan({ cls: "qo-switcher" });
        if (row.hasChildren) {
            switcher.innerHTML = iconChevron;
            if (row.expanded) switcher.addClass("is-open");
        }

        // 标题（双链渲染为蓝色纯文本）
        const label = content.createSpan({ cls: "qo-label" });
        buildLabel(label, store.headers[row.idx].title);
    }

    /** 更新已存在行（位置/展开态/高亮/内容签名变化时重建内容） */
    private updateRow(el: HTMLElement, row: VisibleRow, pos: number) {
        const h = store.headers[row.idx];
        const sig = `${row.level}|${h.title}|${row.hasChildren}`;
        const content = el.firstElementChild as HTMLElement;
        if (el.dataset.sig !== sig) {
            this.fillContent(content, row);
            el.dataset.sig = sig;
        } else if (row.hasChildren) {
            const sw = content.querySelector(".qo-switcher");
            sw?.toggleClass("is-open", row.expanded);
        }
        this.applyRowState(el, row);
        el.style.top = `${pos * this.rowHeight}px`;
    }

    private applyRowState(el: HTMLElement, row: VisibleRow) {
        const content = el.firstElementChild as HTMLElement;
        content.toggleClass("located", this.locateIdx === row.idx);
        content.toggleClass("selected", this.selectedIdx === row.idx);
        el.toggleClass("dragging", this.draggingIdx === row.idx);
        el.dataset.sig =
            el.dataset.sig ??
            `${row.level}|${store.headers[row.idx].title}|${row.hasChildren}`;
    }

    // ============ 高亮与滚动 ============

    setLocate(idx: number) {
        const prev = this.locateIdx;
        this.locateIdx = idx;
        this.toggleRowClass(prev, "located", false);
        this.toggleRowClass(idx, "located", true);
    }

    setSelected(idx: number) {
        const prev = this.selectedIdx;
        this.selectedIdx = idx;
        this.toggleRowClass(prev, "selected", false);
        this.toggleRowClass(idx, "selected", true);
    }

    private toggleRowClass(idx: number, cls: string, on: boolean) {
        const el = this.rowEls.get(idx);
        if (!el) return;
        (el.firstElementChild as HTMLElement).toggleClass(cls, on);
    }

    /** 将 header idx 滚入视野 */
    scrollToIdx(idx: number, center = true) {
        const pos = this.rows.findIndex((r) => r.idx === idx);
        if (pos < 0) return; // 不在可见列表（折叠/过滤）时忽略
        const top = pos * this.rowHeight;
        const viewH = this.container.clientHeight;
        const target = center
            ? top - viewH / 2 + this.rowHeight / 2
            : Math.max(0, Math.min(top, this.viewport.offsetHeight - viewH));
        this.container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }

    // ============ 事件委托 ============

    private bindEvents() {
        this.container.addEventListener("scroll", () => this.paint());

        this.container.addEventListener("click", (ev) => {
            const row = (ev.target as HTMLElement).closest<HTMLElement>(".qo-row");
            if (!row) return;
            const idx = parseInt(row.dataset.idx!);
            if ((ev.target as HTMLElement).closest(".qo-switcher")) {
                this.handlers.onToggle(idx);
                return;
            }
            this.handlers.onRowClick(idx);
        });

        this.container.addEventListener("contextmenu", (ev) => {
            const row = (ev.target as HTMLElement).closest<HTMLElement>(".qo-row");
            if (!row) return;
            ev.preventDefault();
            this.handlers.onContextMenu(parseInt(row.dataset.idx!), ev);
        });

        // ---- 原生拖拽（面板内移动标题块） ----
        this.container.addEventListener("dragstart", (ev) => {
            if (!this.handlers.canDrag()) {
                ev.preventDefault();
                return;
            }
            const row = (ev.target as HTMLElement).closest<HTMLElement>(".qo-row");
            if (!row) return;
            this.draggingIdx = parseInt(row.dataset.idx!);
            (row.firstElementChild as HTMLElement).addClass("dragging");
            ev.dataTransfer?.setData("text/plain", store.headers[this.draggingIdx]?.title ?? "");
            ev.dataTransfer && (ev.dataTransfer.effectAllowed = "move");
        });

        this.container.addEventListener("dragover", (ev) => {
            if (this.draggingIdx < 0 || !this.handlers.canDrag()) return;
            const row = (ev.target as HTMLElement).closest<HTMLElement>(".qo-row");
            if (!row) return;
            const to = parseInt(row.dataset.idx!);
            // 防呆：不能拖到自己或自己的子树里
            if (to === this.draggingIdx || isAncestorOf(this.draggingIdx, to)) return;
            ev.preventDefault();
            this.showDropHint(row, ev);
        });

        this.container.addEventListener("drop", (ev) => {
            if (this.draggingIdx < 0) return;
            const row = (ev.target as HTMLElement).closest<HTMLElement>(".qo-row");
            if (!row) return this.endDrag();
            const to = parseInt(row.dataset.idx!);
            const position = this.dropPositionOf(row, ev);
            this.clearDropHint();
            const from = this.draggingIdx;
            this.endDrag();
            if (from === to || isAncestorOf(from, to)) return;
            ev.preventDefault();
            this.handlers.onDragDrop(from, to, position);
        });

        this.container.addEventListener("dragend", () => this.endDrag());
        this.container.addEventListener("dragleave", (ev) => {
            if (ev.target === this.container) this.clearDropHint();
        });
    }

    private endDrag() {
        const el = this.rowEls.get(this.draggingIdx);
        (el?.firstElementChild as HTMLElement | undefined)?.removeClass("dragging");
        this.draggingIdx = -1;
        this.clearDropHint();
    }

    /** 依据鼠标在行内的纵向位置判定落点：上 25% 之前 / 下 25% 之后 / 中间放入内部 */
    private dropPositionOf(row: HTMLElement, ev: DragEvent): "before" | "after" | "inside" {
        const rect = row.getBoundingClientRect();
        const rel = (ev.clientY - rect.top) / rect.height;
        if (rel < 0.25) return "before";
        if (rel > 0.75) return "after";
        return "inside";
    }

    private showDropHint(row: HTMLElement, ev: DragEvent) {
        this.clearDropHint();
        const content = row.firstElementChild as HTMLElement;
        content.addClass(`drop-${this.dropPositionOf(row, ev)}`);
    }

    private clearDropHint() {
        for (const el of this.viewport.querySelectorAll(".drop-before, .drop-after, .drop-inside")) {
            el.removeClass("drop-before", "drop-after", "drop-inside");
        }
    }
}

/** headers[from] 是否为 headers[to] 的祖先（to 在 from 的子树内） */
export function isAncestorOf(from: number, to: number): boolean {
    const { headers } = store;
    const base = headers[from]?.level;
    if (base === undefined || from >= to) return false;
    for (let i = from + 1; i <= to; i++) {
        if (headers[i].level <= base) return false;
    }
    return true;
}

/** 构建标题文本：双链 [[xx]] 渲染为蓝色纯文本 span（无括号、不可点击） */
export function buildLabel(el: HTMLElement, title: string) {
    if (typeof title !== "string" || !title.includes("[[") || !title.includes("]]")) {
        el.textContent = title ?? "";
        return;
    }
    let last = 0;
    for (const m of title.matchAll(WIKILINK_RE)) {
        const idx = m.index ?? 0;
        if (idx > last) el.appendChild(document.createTextNode(title.slice(last, idx)));
        const inner = m[1];
        const sep = inner.indexOf("|");
        const text = sep >= 0 ? inner.slice(sep + 1) || inner.slice(0, sep) : inner;
        el.createSpan({ cls: "qo-wikilink", text });
        last = idx + m[0].length;
    }
    if (last < title.length) {
        el.appendChild(document.createTextNode(title.slice(last)));
    }
}
