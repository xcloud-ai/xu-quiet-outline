import {
    Component,
    debounce,
    FileView,
    Plugin,
    TFile,
    View,
    type ViewState,
    WorkspaceLeaf,
} from "obsidian";

import { Nav, createNav } from "./navigators";
import { store } from "./store";
import { OutlineView, VIEW_TYPE } from "./ui/view";
import { debounceCb } from "./utils/debounce";

import { type MarkdownHeading } from "./navigators/markdown";
import { DEFAULT_SETTINGS, type QuietOutlineSettings, SettingTab } from "./settings";
import { registerCommands } from "./commands";
import { eventBus } from "./utils/event-bus";
import "./stalin.css";

type LeafEphemeralState = Record<string, unknown> | undefined;

export default class QuietOutline extends Plugin {
    settings!: QuietOutlineSettings;
    navigator: Nav = createNav("dummy", this, null);
    // jumping flag: false while a jump-initiated scroll is settling (1s window)
    jumping = true;
    outlineView: OutlineView | null = null;

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
            this.app.metadataCache.on("changed", () => {
                this.refresh("file-modify");
            }),
        );

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", async (leaf) => {
                const prevView = this.prevView;
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
                if (this.outlineView?.leaf?.group) {
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
            console.error(`Failed to initialize ${type} navigator: ` + e);
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
        this.outlineView?.vueInstance.onLeafChange();
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
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length === 0) {
            await this.app.workspace.getRightLeaf(false)?.setViewState({
                type: VIEW_TYPE,
                active: true,
            });
        }
        await this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]);
    }
}
