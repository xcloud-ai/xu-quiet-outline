import { Component, debounce, FileView, Plugin, TFile, View } from "obsidian";

import { Nav, createNav } from "./navigators";
import { store } from "./store";
import { OutlineView, VIEW_TYPE } from "./ui/view";
import { debounceCb } from "./utils/debounce";

import { DEFAULT_SETTINGS, type QuietOutlineSettings, SettingTab } from "./settings";
import { registerCommands } from "./commands";
import { eventBus } from "./utils/event-bus";

export default class QuietOutline extends Plugin {
    settings!: QuietOutlineSettings;
    navigator: Nav = createNav("dummy", this, null);
    // jumping flag: false while a jump-initiated scroll is settling (1s window)
    jumping = true;
    /** 当前挂载的大纲面板（单面板模型） */
    outlineView: OutlineView | null = null;

    /** 遍历所有已挂载的大纲面板（插件更新后可能残留多个，均需刷新） */
    forEachOutlineView(cb: (view: OutlineView) => void) {
        if (this.outlineView) {
            cb(this.outlineView);
            return;
        }
        // 防御：引用丢失时回退到 workspace 查找
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
            const view = leaf.view;
            if (view instanceof OutlineView) cb(view);
        }
    }

    allow_scroll = true;
    block_scroll!: () => void;
    allow_cursor_change = true;
    block_cursor_change!: () => void;
    private prevActiveFile: TFile | null = null;
    private prevActiveFileView: View | null = null;

    async startJumping() {
        this.jumping = false;
        await sleep(1000);
        this.jumping = true;
    }

    async onload() {
        await this.loadSettings();

        store.init(this);

        this.registerView(VIEW_TYPE, (leaf) => new OutlineView(leaf, this));
        this.registerListener();
        registerCommands(this);
        this.addSettingTab(new SettingTab(this.app, this));

        // activate outline view on plugin enable when not already open
        this.app.workspace.onLayoutReady(() => {
            void this.activateView();
            void this.saveSettings();
        });

        this.block_scroll = debounceCb(
            () => {
                this.allow_scroll = false;
            },
            300,
            () => {
                this.allow_scroll = true;
            },
        );
        this.block_cursor_change = debounceCb(
            () => {
                this.allow_cursor_change = false;
            },
            300,
            () => {
                this.allow_cursor_change = true;
            },
        );
    }

    private registerListener() {
        this.registerEvent(
            this.app.workspace.on("css-change", () => {
                store.dark = activeDocument.body.hasClass("theme-dark");
                // 主题变化后重算 CSS 变量（彩虹线/主题色/字体）
                this.forEachOutlineView((view) => view.forceRemakeTree());
            }),
        );

        this.registerEvent(
            this.app.metadataCache.on("changed", (file) => {
                // only react to the file shown in the outline, ignore the rest
                if (this.navigator.handlesFile(file)) {
                    this.refresh();
                }
            }),
        );

        // 启动时序加固：面板挂载可能早于 vault 索引完成，getHeaders 会读到磁盘上的旧缓存
        // （文件在 Obsidian 关闭期间被外部脚本/同步修改 → 尾部新增标题缺失）。
        // resolved 后重拉标题；仅在确有变化时刷新面板，避免高频 resolved 重置用户展开状态
        this.registerEvent(
            this.app.metadataCache.on("resolved", () => {
                void this.reinitHeaders();
            }),
        );

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", async (leaf) => {
                if (!leaf) return;

                const activeFileView = this.app.workspace.getActiveFileView();
                if (!activeFileView) {
                    this.prevActiveFileView = null;
                    this.prevActiveFile = null;
                    eventBus.trigger("active-fileview-change", null);
                    return;
                }

                if (leaf.view instanceof FileView && leaf.view.navigation && leaf.view.file) {
                    if (
                        leaf.view !== this.prevActiveFileView ||
                        leaf.view.file !== this.prevActiveFile
                    ) {
                        this.prevActiveFileView = leaf.view;
                        this.prevActiveFile = leaf.view.file;
                        eventBus.trigger("active-fileview-change", leaf.view);
                    }
                }
            }),
        );

        this.registerEvent(
            eventBus.on("active-fileview-change", async (view) => {
                // 面板在主编辑区 tab 组时跳过（保持原语义：主区面板不随文件切换自动刷新）
                const outlineLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
                if (outlineLeaves.length > 0 && outlineLeaves.every((leaf) => leaf.group)) {
                    return;
                }

                if (!view) {
                    await this.updateNavAndRefresh("dummy", null);
                    return;
                }

                // block cursor change event to trigger auto-expand when switching between notes
                this.block_cursor_change();
                await this.updateNavAndRefresh(view.getViewType(), view);
            }),
        );
    }

    // set store.headers（编辑后统一走 diff 增量迁移）
    refresh_outline = async () => {
        await this.navigator.updateHeaders();
        // headers + modifyKeys 已更新：面板做 diff 增量迁移并重绘
        this.forEachOutlineView((v) => v.onHeadersModified());
    };

    refresh = debounce(this.refresh_outline, 300, true);

    private async updateNav(type: string, view: Component | null) {
        try {
            await this.navigator.unload();
            this.navigator = createNav(type, this, view);
            await this.navigator.load();
        } catch (e) {
            console.error(`Failed to initialize ${type} navigator: ${String(e)}`);
            this.navigator = createNav("dummy", this, null);
            await this.navigator.load();
        }
    }

    async updateNavAndRefresh(type: string, view: Component | null) {
        await this.updateNav(type, view);

        const newHeaders = await this.navigator.getHeaders();
        store.headers = newHeaders;
        this.forEachOutlineView((v) => v.onLeafChange());
    }

    /** resolved 后重拉标题：修复启动期读到旧缓存导致新增/尾部标题缺失 */
    private async reinitHeaders(): Promise<void> {
        const newHeaders = await this.navigator.getHeaders();
        const oldHeaders = store.headers;
        const changed =
            newHeaders.length !== oldHeaders.length ||
            newHeaders.some(
                (h, i) =>
                    h.title !== oldHeaders[i]!.title ||
                    h.level !== oldHeaders[i]!.level ||
                    (h as { line?: number }).line !== (oldHeaders[i] as { line?: number }).line,
            );
        if (!changed) return;

        store.headers = newHeaders;
        this.forEachOutlineView((v) => v.onHeadersModified());
    }

    onunload(): void {
        void this.unloadPlugin();
    }

    private async unloadPlugin(): Promise<void> {
        try {
            await this.navigator.unload();
        } finally {
            this.outlineView = null;
        }
    }

    async loadSettings() {
        const data = (await this.loadData()) as Partial<QuietOutlineSettings>;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
        // 空样式值归一化为默认值（兼容旧数据；清空输入框也回默认）
        for (const key of ["font_size", "font_family", "font_weight", "line_height", "line_gap"] as const) {
            if (!this.settings[key].trim()) {
                this.settings[key] = DEFAULT_SETTINGS[key];
            }
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /** 设置变化后由 SettingTab 调用：同步 store 并让面板重算主题/重绘 */
    refreshUI() {
        store.init(this);
        this.forEachOutlineView((view) => view.forceRemakeTree());
    }

    async activateView() {
        // 插件更新/重载后 workspace 可能残留多个大纲面板（旧面板未随卸载销毁 + 新面板被创建），
        // 保留最新一个并移除其余，避免出现不再接收更新的"僵尸面板"
        const staleLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        while (staleLeaves.length > 1) {
            staleLeaves.shift()?.detach();
        }

        // Obsidian 1.7.2+ defers sidebar views by default: an existing leaf may be
        // unloaded, and revealLeaf alone won't restore it ("second open" bug).
        // ensureSideLeaf creates the leaf if missing and reveals it, honoring deferral.
        const leaf = await this.app.workspace.ensureSideLeaf(VIEW_TYPE, "right", {
            active: true,
            reveal: true,
        });
        await this.app.workspace.revealLeaf(leaf);
    }
}
