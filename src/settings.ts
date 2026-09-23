import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import QuietOutline from "./plugin";
import { setLanguage, t } from "@/lang/helper";

type AutoExpandMode =
    | "only-expand"
    | "expand-and-collapse-rest-to-default"
    | "expand-and-collapse-rest-to-setting"
    | "disable";

/** GitHub 仓库（底部文档入口统一使用） */
const REPO_URL = "https://github.com/xcloud-ai/xu-quiet-outline";

export interface QuietOutlineSettings {
    // 界面语言："auto" 跟随 Obsidian，或 zh / en / zh-TW
    language: string;

    expand_level: string;
    auto_expand_ext: AutoExpandMode;
    drag_modify: boolean;
    locate_by_cursor: boolean;
    auto_scroll_into_view: boolean;

    // Style settings
    patch_color: boolean;
    primary_color_light: string;
    primary_color_dark: string;
    rainbow_line: boolean;
    rainbow_color_1: string;
    rainbow_color_2: string;
    rainbow_color_3: string;
    rainbow_color_4: string;
    rainbow_color_5: string;

    // New style settings
    font_size: string;
    font_family: string;
    font_weight: string;
    line_height: string;
    line_gap: string;
}

const DEFAULT_SETTINGS: QuietOutlineSettings = {
    language: "auto",

    expand_level: "2",
    auto_expand_ext: "only-expand",
    drag_modify: true,
    locate_by_cursor: true,
    auto_scroll_into_view: true,

    // Style settings
    patch_color: false,
    primary_color_light: "#18a058",
    primary_color_dark: "#63e2b7",
    rainbow_line: true,
    rainbow_color_1: "#FD8B1F",
    rainbow_color_2: "#FFDF00",
    rainbow_color_3: "#07EB23",
    rainbow_color_4: "#2D8FF0",
    rainbow_color_5: "#BC01E2",

    // New style settings
    font_size: "var(--nav-item-size)",
    font_family: "inherit",
    font_weight: "inherit",
    line_height: "1.6em",
    line_gap: "0px",
};

/**
 * 设置页（Obsidian 1.13+ 声明式 Settings API）。
 *
 * 设计要点：
 * - 不实现 display()：getSettingDefinitions() 返回非空数组时 Obsidian 自行渲染，
 *   display() 不会被调用（两者不能混用，详见官方 Migrate to declarative settings）。
 * - 控件自动读写 this.plugin.settings[key] 并 saveData()；本类重写 setControlValue
 *   统一在持久化后追加 refreshUI() 副作用（颜色/字体/行为设置即时生效）。
 * - 「界面语言」需要切换后整体重绘，用 render 回调 + this.update()。
 * - 低频的彩虹色/字体微调收进 type:'page' 子页面。
 */
class SettingTab extends PluginSettingTab {
    plugin: QuietOutline;

    constructor(app: App, plugin: QuietOutline) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /** 声明式控件写入：默认实现只改 settings + saveData，这里追加即时刷新 */
    async setControlValue(key: string, value: unknown): Promise<void> {
        (this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
        await this.plugin.saveSettings();
        this.plugin.refreshUI();
    }

    getSettingDefinitions(): SettingDefinitionItem<keyof QuietOutlineSettings>[] {
        const s = this.plugin.settings;

        return [
            // 顶部：插件名 + 一句话功能说明（纯信息行，不进设置搜索索引）
            {
                name: t("setting_title"),
                desc: t("setting_header_desc"),
                searchable: false,
            },

            // 界面语言（render：切换语言后必须整体重绘，control 无法表达该副作用）
            {
                name: t("setting_language"),
                desc: t("setting_language_desc"),
                aliases: ["language", "语言", "語言", "English", "繁體"],
                render: (setting) => {
                    setting.addDropdown((dropdown) =>
                        dropdown
                            .addOptions({
                                auto: t("lang_auto"),
                                zh: t("lang_zh"),
                                en: t("lang_en"),
                                "zh-TW": t("lang_zh-TW"),
                            })
                            .setValue(s.language)
                            .onChange(async (value) => {
                                s.language = value;
                                setLanguage(value);
                                await this.plugin.saveSettings();
                                // 声明式模式下重绘走 update()，display() 已被旁路
                                this.update();
                                this.plugin.refreshUI();
                            }),
                    );
                },
            },

            // ── 常规设置 ──
            {
                type: "group",
                heading: t("General Settings"),
                items: [
                    {
                        name: t("Default expanding level"),
                        desc: t("Default expanding level desc"),
                        control: {
                            type: "dropdown",
                            key: "expand_level",
                            options: { 0: "0", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5" },
                        },
                    },
                    {
                        name: t("Auto expand mode"),
                        desc: t("Control the expansion behavior when a leaf is changed"),
                        control: {
                            type: "dropdown",
                            key: "auto_expand_ext",
                            options: {
                                "only-expand": t("Only Expand"),
                                "expand-and-collapse-rest-to-default": t(
                                    "Expand and collapse the rest to default level",
                                ),
                                "expand-and-collapse-rest-to-setting": t(
                                    "Expand and collapse the rest to the level below",
                                ),
                                disable: t("Disable"),
                            },
                        },
                    },
                    {
                        name: t("Drag to modify"),
                        desc: t(
                            "Allow dragging headings in the outline to change their level and position. This will modify the note content.",
                        ),
                        control: { type: "toggle", key: "drag_modify" },
                    },
                    {
                        name: t("Locate by cursor"),
                        desc: t("Highlight the nearest heading by the cursor"),
                        control: { type: "toggle", key: "locate_by_cursor" },
                    },
                    {
                        name: t("Auto scroll into view"),
                        desc: t("Highlighting headings auto scroll into view"),
                        control: { type: "toggle", key: "auto_scroll_into_view" },
                    },
                ],
            },

            // ── 样式设置 ──
            {
                type: "group",
                heading: t("Style Settings"),
                items: [
                    {
                        name: t("Override primary color"),
                        desc: t("This setting is used to override the primary color of the theme"),
                        control: { type: "toggle", key: "patch_color" },
                    },
                    {
                        name: t("Primary color (light mode)"),
                        control: { type: "color", key: "primary_color_light" },
                        visible: () => s.patch_color,
                    },
                    {
                        name: t("Primary color (dark mode)"),
                        control: { type: "color", key: "primary_color_dark" },
                        visible: () => s.patch_color,
                    },
                    {
                        name: t("Rainbow line color"),
                        desc: t("The color of the line can be customized by rainbow"),
                        control: { type: "toggle", key: "rainbow_line" },
                    },
                ],
            },

            // ── 高级设置（导航式子页面，默认不占主页面空间）──
            {
                type: "page",
                name: t("sec_advanced"),
                items: [
                    {
                        type: "group",
                        heading: t("Rainbow line colors"),
                        items: [1, 2, 3, 4, 5].map((i) => ({
                            name: `${t("Indent level")} ${i}`,
                            control: {
                                type: "color" as const,
                                key: `rainbow_color_${i}` as keyof QuietOutlineSettings,
                            },
                        })),
                    },
                    {
                        type: "group",
                        heading: t("Font Settings"),
                        items: [
                            { name: t("Font size"), control: { type: "text" as const, key: "font_size" as const } },
                            { name: t("Font family"), control: { type: "text" as const, key: "font_family" as const } },
                            { name: t("Font weight"), control: { type: "text" as const, key: "font_weight" as const } },
                            { name: t("Line height"), control: { type: "text" as const, key: "line_height" as const } },
                            { name: t("Line gap"), control: { type: "text" as const, key: "line_gap" as const } },
                        ],
                    },
                ],
            },

            // ── 底部：GitHub 使用文档 ──
            {
                name: t("setting_docs"),
                desc: t("setting_docs_desc"),
                searchable: false,
                render: (setting) => {
                    setting.addButton((btn) =>
                        btn.setButtonText(t("btn_github")).onClick(() => {
                            window.open(REPO_URL, "_blank");
                        }),
                    );
                },
            },
        ];
    }
}

export { SettingTab, DEFAULT_SETTINGS, REPO_URL };
