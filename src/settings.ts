import { App, PluginSettingTab, Setting } from "obsidian";
import QuietOutline from "./plugin";
import { t } from "@/lang/helper";

type AutoExpandMode =
    | "only-expand"
    | "expand-and-collapse-rest-to-default"
    | "expand-and-collapse-rest-to-setting"
    | "disable";

export interface QuietOutlineSettings {
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

class SettingTab extends PluginSettingTab {
    plugin: QuietOutline;
    private activeTab: "general" | "styles" = "general";

    constructor(app: App, plugin: QuietOutline) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        // 标准头：英文名（中文名）标题 + 1 行功能描述
        // 官方审核要求：设置页标题用 Setting.setHeading()，禁止直接创建 h2 等 HTML 标题元素
        new Setting(containerEl).setName(t("setting_title")).setHeading();
        containerEl.createDiv({ cls: "quiet-outline-hint", text: t("setting_header_desc") });
        // Create tab navigation
        const tabContainer = containerEl.createDiv({ cls: "quiet-outline-tabs" });
        const generalTab = tabContainer.createEl("button", {
            text: t("General"),
            cls: this.activeTab === "general" ? "active" : "",
        });
        const stylesTab = tabContainer.createEl("button", {
            text: t("Styles"),
            cls: this.activeTab === "styles" ? "active" : "",
        });

        generalTab.onclick = () => {
            this.activeTab = "general";
            this.display();
        };
        stylesTab.onclick = () => {
            this.activeTab = "styles";
            this.display();
        };

        const contentContainer = containerEl.createDiv({ cls: "quiet-outline-tab-content" });

        if (this.activeTab === "general") {
            this.displayGeneralSettings(contentContainer);
        } else if (this.activeTab === "styles") {
            this.displayStyleSettings(contentContainer);
        }

        // GitHub 使用文档（统一入口）
        containerEl.createEl("hr", { cls: "quiet-outline-divider" });
        new Setting(containerEl)
            .setName(t("Documentation"))
            .setDesc(t("View the full manual on GitHub"))
            .addButton((btn) =>
                btn.setButtonText(t("GitHub")).onClick(() => {
                    window.open("https://github.com/xcloud-ai/xu-quiet-outline", "_blank");
                }),
            );
    }

    displayGeneralSettings(containerEl: HTMLElement): void {
        new Setting(containerEl).setName(t("General Settings")).setHeading();

        new Setting(containerEl)
            .setName(t("Default expanding level"))
            .setDesc(t("Default expanding level desc"))
            .addDropdown((dropdown) => {
                for (let i = 0; i <= 5; i++) {
                    dropdown.addOption(String(i), String(i));
                }
                dropdown.setValue(this.plugin.settings.expand_level).onChange(async (value) => {
                    this.plugin.settings.expand_level = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t("Auto expand mode"))
            .setDesc(t("Control the expansion behavior when a leaf is changed"))
            .addDropdown((dropDown) =>
                dropDown
                    .addOptions({
                        "only-expand": t("Only Expand"),
                        "expand-and-collapse-rest-to-default": t(
                            "Expand and collapse the rest to default level",
                        ),
                        "expand-and-collapse-rest-to-setting": t(
                            "Expand and collapse the rest to the level below",
                        ),
                        disable: t("Disable"),
                    })
                    .setValue(this.plugin.settings.auto_expand_ext)
                    .onChange(async (value) => {
                        this.plugin.settings.auto_expand_ext = value as AutoExpandMode;
                        await this.plugin.saveSettings();
                        this.plugin.refreshUI();
                    }),
            );

        new Setting(containerEl)
            .setName(t("Drag to modify"))
            .setDesc(
                t(
                    "Allow dragging headings in the outline to change their level and position. This will modify the note content.",
                ),
            )
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.drag_modify).onChange(async (value) => {
                    this.plugin.settings.drag_modify = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshUI();
                }),
            );

        new Setting(containerEl)
            .setName(t("Locate by cursor"))
            .setDesc(t("Highlight the nearest heading by the cursor"))
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.locate_by_cursor).onChange(async (value) => {
                    this.plugin.settings.locate_by_cursor = value;
                    await this.plugin.saveSettings();
                }),
            );

        new Setting(containerEl)
            .setName(t("Auto scroll into view"))
            .setDesc(t("Highlighting headings auto scroll into view"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.auto_scroll_into_view)
                    .onChange(async (value) => {
                        this.plugin.settings.auto_scroll_into_view = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }

    displayStyleSettings(containerEl: HTMLElement): void {
        new Setting(containerEl).setName(t("Style Settings")).setHeading();

        new Setting(containerEl)
            .setName(t("Override primary color"))
            .setDesc(t("This setting is used to override the primary color of the theme"))
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.patch_color).onChange(async (value) => {
                    this.plugin.settings.patch_color = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshUI();
                }),
            )
            .addColorPicker((color) =>
                color.setValue(this.plugin.settings.primary_color_light).onChange(async (value) => {
                    this.plugin.settings.primary_color_light = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshUI();
                }),
            )
            .addColorPicker((color) =>
                color.setValue(this.plugin.settings.primary_color_dark).onChange(async (value) => {
                    this.plugin.settings.primary_color_dark = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshUI();
                }),
            );

        new Setting(containerEl)
            .setName(t("Rainbow line color"))
            .setDesc(t("The color of the line can be customized by rainbow"))
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.rainbow_line).onChange(async (value) => {
                    this.plugin.settings.rainbow_line = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshUI();
                }),
            );

        const rainbowColorKeys = [
            "rainbow_color_1",
            "rainbow_color_2",
            "rainbow_color_3",
            "rainbow_color_4",
            "rainbow_color_5",
        ] as const;
        rainbowColorKeys.forEach((key, i) => {
            new Setting(containerEl)
                .setName(`${t("Indent level")} ${i + 1}`)
                .addColorPicker((color) =>
                    color.setValue(this.plugin.settings[key]).onChange(async (value) => {
                        this.plugin.settings[key] = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshUI();
                    }),
                );
        });

        // font settings
        new Setting(containerEl).setName(t("Font Settings")).setHeading();

        new Setting(containerEl)
            .setName(t("Font size"))
            .addText((text) =>
                text.setValue(this.plugin.settings.font_size).onChange(async (value) => {
                    this.plugin.settings.font_size = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshUI();
                }),
            );

        new Setting(containerEl).setName(t("Font family")).addText((text) =>
            text.setValue(this.plugin.settings.font_family).onChange(async (value) => {
                this.plugin.settings.font_family = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );

        new Setting(containerEl).setName(t("Font weight")).addText((text) =>
            text.setValue(this.plugin.settings.font_weight).onChange(async (value) => {
                this.plugin.settings.font_weight = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );

        new Setting(containerEl).setName(t("Line height")).addText((text) =>
            text.setValue(this.plugin.settings.line_height).onChange(async (value) => {
                this.plugin.settings.line_height = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );

        new Setting(containerEl).setName(t("Line gap")).addText((text) =>
            text.setValue(this.plugin.settings.line_gap).onChange(async (value) => {
                this.plugin.settings.line_gap = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );
    }

    /**
     * Obsidian 1.13+ 声明式设置（官方双支持 Path B：旧版本忽略此方法，继续使用 display()）。
     * 作用：让全部设置进入 1.13+ 的全局设置搜索索引；返回纯字面量结构，
     * 不依赖 1.13 才有的类型定义（minAppVersion 为 1.8.7）。
     */
    getSettingDefinitions() {
        const levelOptions: Record<string, string> = {};
        for (let i = 0; i <= 5; i++) levelOptions[String(i)] = String(i);

        return [
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
                            defaultValue: "2",
                            options: levelOptions,
                        },
                    },
                    {
                        name: t("Auto expand mode"),
                        desc: t("Control the expansion behavior when a leaf is changed"),
                        control: {
                            type: "dropdown",
                            key: "auto_expand_ext",
                            defaultValue: "only-expand",
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
                    },
                    {
                        name: t("Primary color (dark mode)"),
                        control: { type: "color", key: "primary_color_dark" },
                    },
                    {
                        name: t("Rainbow line color"),
                        desc: t("The color of the line can be customized by rainbow"),
                        control: { type: "toggle", key: "rainbow_line" },
                    },
                    ...[1, 2, 3, 4, 5].map((i) => ({
                        name: `${t("Indent level")} ${i}`,
                        control: { type: "color", key: `rainbow_color_${i}` },
                    })),
                    {
                        name: t("Font size"),
                        control: { type: "text", key: "font_size" },
                    },
                    {
                        name: t("Font family"),
                        control: { type: "text", key: "font_family" },
                    },
                    {
                        name: t("Font weight"),
                        control: { type: "text", key: "font_weight" },
                    },
                    {
                        name: t("Line height"),
                        control: { type: "text", key: "line_height" },
                    },
                    {
                        name: t("Line gap"),
                        control: { type: "text", key: "line_gap" },
                    },
                ],
            },
        ];
    }

    /**
     * 1.13+ 声明式控件写值钩子：默认实现只改 settings + saveData，
     * 这里覆盖以便颜色/开关变化后即时重算 CSS 变量（与旧版 display() 的 onChange 行为一致）。
     * 旧版本 Obsidian 不调用此方法。
     */
    async setControlValue(key: string, value: unknown): Promise<void> {
        (this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
        await this.plugin.saveSettings();
        this.plugin.refreshUI();
    }
}

export { SettingTab, DEFAULT_SETTINGS };
