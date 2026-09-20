// 大纲面板视图（vanilla DOM 版，替代 Vue Outline.vue + use-* 组合层）
import { ItemView, Menu, debounce, setIcon, type WorkspaceLeaf } from "obsidian";
import type QuietOutline from "@/plugin";
import { store } from "@/store";
import { t } from "@/lang/helper";
import { applyTheme } from "./theme";
import { ExpandState, ancestorsOf, writeMemory } from "./expand";
import { TreeRenderer } from "./tree";
import { ICON_TO_BOTTOM, ICON_RESET } from "./icons";

export const VIEW_TYPE = "xu-quiet-outline";

export class OutlineView extends ItemView {
    plugin: QuietOutline;
    private rootEl!: HTMLElement; // .quiet-outline
    private renderer!: TreeRenderer;
    private expand!: ExpandState;
    private sliderEl!: HTMLInputElement;
    private searchEl!: HTMLInputElement;
    private currentPath = "";
    private unloads: (() => void)[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: QuietOutline) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Quiet outline";
    }

    getIcon(): string {
        return "lines-of-text";
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        this.rootEl = container.createDiv({ cls: "quiet-outline" });
        this.expand = new ExpandState(this.plugin);
        this.buildFunctionBar();
        this.buildSlider();
        this.buildTree();
        this.renderer = new TreeRenderer(this.treeEl!, this.viewportEl!, {
            onRowClick: (idx) => {
                this.renderer.setSelected(idx);
                void this.plugin.navigator.jumpWhenClick(idx);
            },
            onToggle: (idx) => {
                if (this.expand.keys.has(idx)) this.expand.modify([idx], "remove");
                else this.expand.modify([idx], "add");
                this.renderer.render();
                this.saveMemoryDebounced();
            },
            onContextMenu: (idx, ev) => this.showMenu(idx, ev),
            onDragDrop: (from, to, position) => {
                void this.plugin.navigator.handleDrop(from, to, position);
            },
            canDrag: () => store.dragModify,
            getExpanded: () => this.expand.keys,
        });

        this.applyThemeAndRender();
        this.bindGlobalEvents();

        // 双保险：面板延迟挂载导致首帧 measureRow 测高为 0 时，下一帧补测重绘
        // （ResizeObserver 之外再兜一次，覆盖容器尺寸已非 0 但样式刚应用的时序）
        window.requestAnimationFrame(() => this.renderer?.remeasureIfNeeded());

        this.plugin.outlineView = this;

        // 启动时序兜底：面板创建晚于首个 active-fileview-change 时，
        // headers 已就位但展开状态尚未初始化，这里主动走一次文件切换流程
        this.onLeafChange();
    }

    private treeEl?: HTMLElement;
    private viewportEl?: HTMLElement;

    // ============ DOM 骨架 ============

    private buildFunctionBar() {
        const bar = this.rootEl.createDiv({ cls: "qo-function-bar" });

        const toBottom = bar.createEl("button", {
            cls: "qo-icon-btn",
            attr: { title: t("To Bottom"), "aria-label": t("To Bottom") },
        });
        setIcon(toBottom, ICON_TO_BOTTOM);
        toBottom.addEventListener("click", () => this.plugin.navigator.toBottom());

        const reset = bar.createEl("button", {
            cls: "qo-icon-btn",
            attr: { title: t("Reset"), "aria-label": t("Reset") },
        });
        setIcon(reset, ICON_RESET);
        reset.addEventListener("click", () => this.resetPanel());

        this.searchEl = bar.createEl("input", {
            type: "search",
            cls: "qo-search",
            attr: { placeholder: t("Input to search"), spellcheck: "false" },
        });
        this.searchEl.addEventListener("input", () => {
            this.renderer.filterText = this.searchEl.value;
            this.renderer.render();
        });
    }

    private buildSlider() {
        const box = this.rootEl.createDiv({ cls: "qo-slider-box" });
        this.sliderEl = box.createEl("input", {
            type: "range",
            cls: "qo-slider",
            attr: { min: "0", max: "5", step: "1", value: String(this.expand?.level ?? 2) },
        });
        this.sliderEl.addEventListener("input", () => {
            this.expand.switchLevel(parseInt(this.sliderEl.value));
            this.renderer.render();
            this.updateSliderTitle();
            this.saveMemoryDebounced();
        });
        // 刻度标记 0-5
        const marks = box.createDiv({ cls: "qo-marks" });
        for (let i = 0; i <= 5; i++) {
            marks.createSpan({ cls: "qo-mark", attr: { "data-v": String(i) } });
        }
    }

    private buildTree() {
        this.treeEl = this.rootEl.createDiv({ cls: "qo-tree" });
        this.viewportEl = this.treeEl.createDiv({ cls: "qo-viewport" });
    }

    // ============ 全局事件 ============

    private bindGlobalEvents() {
        // 点击面板外/空白处清除选中高亮
        const onClick = (ev: MouseEvent) => {
            if (!(ev.target as HTMLElement).closest(`.quiet-outline .qo-row`)) {
                this.renderer.setSelected(-1);
            }
        };
        activeWindow.addEventListener("click", onClick);
        this.unloads.push(() => activeWindow.removeEventListener("click", onClick));
    }

    // ============ 对外接口（plugin / navigator 调用） ============

    /** 光标或滚动定位变化：自动展开 + 高亮 + 滚入视野 */
    onPosChange(index: number) {
        if (!store.headers[index]) return;
        this.expand.autoExpand(index);
        this.renderer.render();

        // 定位行位于折叠分支内时，高亮最近的可见祖先
        const path = ancestorsOf(index);
        const firstCollapsed = path.find((i) => this.expand.isParent(i) && !this.expand.keys.has(i));
        const target = firstCollapsed ?? path[path.length - 1] ?? index;
        // 滚动/光标定位以 locate 为唯一高亮：清除点击/右键残留的 selected，避免双高亮
        this.renderer.setSelected(-1);
        this.renderer.setLocate(target);
        if (this.plugin.settings.auto_scroll_into_view) {
            this.renderer.scrollToIdx(target);
        }
        this.saveMemoryDebounced();
    }

    /** 文件切换（或启动初始化）：恢复展开记忆，重置高亮与搜索 */
    onLeafChange() {
        // 保存上一个文件的展开记忆（含滑杆级别）
        if (this.currentPath) {
            writeMemory(
                this.plugin.app,
                this.currentPath,
                [...this.expand.keys],
                this.expand.level,
            );
        }
        this.currentPath = this.plugin.navigator.getPath();
        this.expand.restore(this.currentPath);

        this.renderer.filterText = "";
        this.searchEl.value = "";
        this.renderer.setLocate(-1);
        this.renderer.setSelected(-1);
        this.syncSlider();
        this.renderer.render();
    }

    /** 文件内容编辑后：按 diff 增量迁移展开状态并重绘 */
    onHeadersModified() {
        this.expand.applyModifyKeys(store.modifyKeys);
        this.renderer.render();
        this.saveMemoryDebounced();
    }

    /** 设置变化 / 主题变化 / 强制重建 */
    forceRemakeTree() {
        this.applyThemeAndRender();
    }

    // ============ 内部逻辑 ============

    private applyThemeAndRender() {
        applyTheme(this.rootEl);
        this.renderer.measureRow();
        this.updateSliderTitle();
        this.renderer.render();
    }

    private resetPanel() {
        this.renderer.setSelected(-1);
        this.renderer.setLocate(-1);
        this.searchEl.value = "";
        this.renderer.filterText = "";
        this.expand.switchLevel(this.expand.getDefaultLevel());
        this.syncSlider();
        this.renderer.render();
        this.saveMemoryDebounced();
    }

    private syncSlider() {
        this.sliderEl.value = String(this.expand.level);
        this.updateSliderTitle();
    }

    /** 滑杆提示：H{n}: 数量 / No expand */
    private updateSliderTitle() {
        const v = this.expand.level;
        if (v > 0) {
            const count = store.headers.filter((h) => h.level === v).length;
            this.sliderEl.title = `H${v}: ${count}`;
        } else {
            this.sliderEl.title = t("No expand");
        }
    }

    private saveMemoryDebounced = debounce(() => this.saveMemoryNow(), 500, true);

    private saveMemoryNow() {
        const path = this.plugin.navigator.getPath();
        // headers 为空（启动竞态/dummy 导航）时禁止写记忆，
        // 否则空展开集合会污染该文件，下次启动被恢复为 0 级
        if (path && store.headers.length > 0) {
            writeMemory(this.plugin.app, path, [...this.expand.keys], this.expand.level);
        }
    }

    /** 右键菜单：递归/兄弟 展开/折叠 四项 */
    private showMenu(idx: number, ev: MouseEvent) {
        this.renderer.setSelected(idx);
        const menu = new Menu().setNoIcon();

        const subtreeKeys = this.collectSubtreeParents(idx);
        const siblingKeys = this.collectSiblingParents(idx);
        const expanded = this.expand.keys.has(idx);

        const modify = (keys: number[], mode: "add" | "remove") => {
            this.expand.modify(keys, mode);
            this.renderer.render();
            this.saveMemoryDebounced();
        };

        if (expanded) {
            menu.addItem((item) =>
                item.setTitle(t("Collapse Recursively")).onClick(() => modify(subtreeKeys, "remove")),
            );
        } else {
            menu.addItem((item) =>
                item.setTitle(t("Expand Recursively")).onClick(() => modify(subtreeKeys, "add")),
            );
        }
        menu.addItem((item) =>
            item.setTitle(t("Collapse Sibling")).onClick(() => modify(siblingKeys, "remove")),
        );
        menu.addItem((item) =>
            item.setTitle(t("Expand Sibling")).onClick(() => modify(siblingKeys, "add")),
        );

        menu.showAtMouseEvent(ev);
    }

    /** idx 子树内所有父节点（含自身） */
    private collectSubtreeParents(idx: number): number[] {
        const { headers } = store;
        const level = headers[idx]?.level ?? 1;
        const res: number[] = [];
        for (let i = idx; i < headers.length; i++) {
            if (i > idx && headers[i].level <= level) break;
            if (this.expand.isParent(i)) res.push(i);
        }
        return res;
    }

    /** idx 的同级（同父）父节点 */
    private collectSiblingParents(idx: number): number[] {
        const { headers } = store;
        if (!headers[idx]) return [];
        const level = headers[idx].level;
        // 找父节点：idx 前最近的 level 更小的标题
        let parentLevel = 0;
        for (let i = idx - 1; i >= 0; i--) {
            if (headers[i].level < level) {
                parentLevel = headers[i].level;
                break;
            }
        }
        const res: number[] = [];
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].level !== level) continue;
            // 同层且同父：向前找最近的更小 level == parentLevel
            let p = 0;
            for (let j = i - 1; j >= 0; j--) {
                if (headers[j].level < headers[i].level) {
                    p = headers[j].level;
                    break;
                }
            }
            if (p === parentLevel && this.expand.isParent(i)) res.push(i);
        }
        return res;
    }

    async onClose() {}

    onunload(): void {
        for (const fn of this.unloads) fn();
        this.unloads = [];
        this.renderer?.destroy();
        // 保存当前文件展开记忆
        this.saveMemoryNow();
        // 多面板并存时，仅当自己是当前注册的面板才清空引用，避免误清其他面板
        if (this.plugin.outlineView === this) {
            this.plugin.outlineView = null;
        }
    }
}
