import {
    Component,
    debounce,
    FileView,
    Plugin,
    TFile,
    View,
    type WorkspaceLeaf,
} from "obsidian";

import { Nav, createNav } from "./navigators";
import { store } from "./store";
import { OutlineView, VIEW_TYPE } from "./ui/view";
import { debounceCb } from "./utils/debounce";

import { DEFAULT_SETTINGS, type QuietOutlineSettings, SettingTab } from "./settings";
import { registerCommands } from "./commands";
import { setLanguage } from "./lang/helper";
import { eventBus } from "./utils/event-bus";

export default class QuietOutline extends Plugin {
    // declare：1.13 类型包基类 Plugin 已声明 settings，此处收窄为本插件具体类型
    declare settings: QuietOutlineSettings;
    navigator: Nav = createNav("dummy", this, null);
    // jumping flag: false while a jump-initiated scroll is settling (1s window)
    jumping = true;
    /** 当前挂载的大纲面板（单面板模型） */
    outlineView: OutlineView | null = null;
    /** 延迟兜底清扫定时器（更新后残留重复面板的自愈） */
    private staleSweepTimer = -1;

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
        // 按用户设置应用界面语言（"auto" 时 helper 内回退到 Obsidian 界面语言）
        setLanguage(this.settings.language);

        store.init(this);

        this.registerView(VIEW_TYPE, (leaf) => new OutlineView(leaf, this));
        // 插件被卸载/替换时撤掉兜底清扫定时器，避免新实例的面板被旧实例定时器误删
        this.register(() => window.clearTimeout(this.staleSweepTimer));
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
                    h.title !== oldHeaders[i]?.title ||
                    h.level !== oldHeaders[i]?.level ||
                    (h as { line?: number }).line !==
                        (oldHeaders[i] as { line?: number } | undefined)?.line,
            );
        if (!changed) return;

        store.headers = newHeaders;
        this.forEachOutlineView((v) => v.onHeadersModified());
    }

    onunload(): void {
        // 官方审核规则（2026-09-23 v2.2.1 审核 Error）：禁止在 onunload detach 本类型 leaf——
        // 用户可能已把面板移到左栏/主区/新窗口，detach 后重载会被 ensureSideLeaf 重置回右栏默认位置。
        // 更新导致的双面板改在 onload 的 activateView 内以「只撤自己新建的 leaf」方式收敛（见该方法）。
        window.clearTimeout(this.staleSweepTimer);
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
        // 入口同步快照：更新/重载前已存在的 leaf（含 ghost ZD、deferred QD 占位——二者
        // getViewType 均上报本类型），这些是「用户的 leaf」，全程禁止 detach（官方审核规则）。
        const preExisting = new Set(this.app.workspace.getLeavesOfType(VIEW_TYPE));

        // 更新竞态防护：disable/enable 周期中，框架对旧 leaf 执行
        // open(空视图 $D) → setViewState(恢复) 的异步链且不 await；$D 不匹配本类型的窗口里
        // getLeavesOfType 恰好为空，此刻新建面板，旧 leaf 随后恢复就成双面板。
        // 恢复链是纯微任务+DOM（无 IO），短等一帧让它落地后复查；仍为空才是「真没有面板」
        // （首装 / 用户曾手动关闭），允许新建。冷启动 deferred leaf（QD）在快照中已可见，不会等待。
        if (preExisting.size === 0) {
            await sleep(60);
            for (const revived of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
                preExisting.add(revived);
            }
        }

        // Obsidian 1.7.2+ defers sidebar views by default: an existing leaf may be
        // unloaded, and revealLeaf alone won't restore it ("second open" bug).
        // ensureSideLeaf creates the leaf if missing and reveals it, honoring deferral.
        const leaf = await this.app.workspace.ensureSideLeaf(VIEW_TYPE, "right", {
            active: true,
            reveal: true,
        });
        await this.app.workspace.revealLeaf(leaf);

        // leaf 不在快照中 = 本次调用新建。若稍后旧 leaf 被框架恢复造成重复，
        // 只撤「我们新建的」这个（右栏默认位），保留用户原位 leaf；定时器卸载时清理。
        if (!preExisting.has(leaf)) {
            this.scheduleRetractCreatedLeaf(leaf);
        }
    }

    /**
     * 60ms 空窗等待后仍可能因极端时序与框架恢复链并行落地两个 leaf（新建 + 旧 leaf 延迟复活）。
     * 500ms 后清点：仅当本实例新建的 leaf 与其他本类型 leaf 并存时，撤掉新建项，
     * 绝不触碰其余 leaf（用户可能手动拆分或移动过位置）。
     */
    private scheduleRetractCreatedLeaf(created: WorkspaceLeaf) {
        window.clearTimeout(this.staleSweepTimer);
        this.staleSweepTimer = window.setTimeout(() => {
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
            if (leaves.length > 1 && leaves.includes(created)) {
                created.detach();
            }
        }, 500);
    }
}
