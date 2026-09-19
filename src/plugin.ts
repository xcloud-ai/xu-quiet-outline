import { Component, debounce, FileView, Plugin, TFile, View } from "obsidian";

import { Nav, createNav } from "./navigators";
import { store } from "./store";
import { OutlineView, VIEW_TYPE } from "./ui/view";
import { debounceCb } from "./utils/debounce";

import { DEFAULT_SETTINGS, type QuietOutlineSettings, SettingTab } from "./settings";
import { registerCommands } from "./commands";
import { eventBus } from "./utils/event-bus";
import "./stalin.css";

export default class QuietOutline extends Plugin {
    settings!: QuietOutlineSettings;
    navigator: Nav = createNav("dummy", this, null);
    // jumping flag: false while a jump-initiated scroll is settling (1s window)
    jumping = true;
    outlineView: OutlineView | null = null;

    /** 遍历所有已挂载的大纲面板（插件更新后可能残留多个，均需同步刷新） */
    forEachOutlineView(cb: (view: OutlineView) => void) {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
            const view = leaf.view;
            if (view instanceof OutlineView && view.vueInstance) {
                cb(view);
            }
        }
    }

    allow_scroll = true;
    block_scroll!: () => void;
    allow_cursor_change = true;
    block_cursor_change!: () => void;
    private prevActiveFile: TFile | null = null;
    private prevActiveFileView: View | null = null;
    private prevView: View | null = null;

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
                store.cssChange = !store.cssChange;
            }),
        );

        this.registerEvent(
            this.app.metadataCache.on("changed", (file) => {
                // only react to the file shown in the outline, ignore the rest
                if (this.navigator.handlesFile(file)) {
                    this.refresh("file-modify");
                }
            }),
        );

        // 启动时序加固：vault 索引完成后补刷所有面板（挂载瞬间缓存可能未就绪）
        this.registerEvent(
            this.app.metadataCache.on("resolved", () => {
                this.forEachOutlineView((view) => view.vueInstance.onLeafChange());
            }),
        );

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", async (leaf) => {
                this.prevView = leaf?.view || null;
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
                // 所有面板都在主编辑区 tab 组时才跳过（保持原语义：主区面板不随文件切换自动刷新）
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

    // set store.headers
    refresh_outline = async (reason?: "file-modify") => {
        if (reason === "file-modify") {
            await this.navigator.updateHeaders();
        } else {
            await this.navigator.setHeaders();
        }
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

        // update naive-ui tree's data and expandedKey in the same tick
        // to avoid animation-in-progress stuck
        // https://github.com/tusen-ai/naive-ui/issues/5217
        const newHeaders = await this.navigator.getHeaders();
        store.headers = newHeaders;
        this.forEachOutlineView((view) => view.vueInstance.onLeafChange());
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
