import { App, PluginSettingTab, Setting } from "obsidian";
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

class SettingTab extends PluginSettingTab {
    plugin: QuietOutline;

    constructor(app: App, plugin: QuietOutline) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        // 标准头：英文名（中文名）标题 + 1 行功能描述
        // 官方审核要求：设置页标题用 Setting.setHeading()，禁止直接创建 h2/h3 等 HTML 标题元素
        new Setting(containerEl).setName(t("setting_title")).setHeading();
        containerEl.createDiv({ cls: "quiet-outline-hint", text: t("setting_header_desc") });

        // 语言切换器（强制紧随标题区顶部）
        new Setting(containerEl)
            .setName(t("setting_language"))
            .setDesc(t("setting_language_desc"))
            .addDropdown((dropdown) =>
                dropdown
                    .addOptions({
                        auto: t("lang_auto"),
                        zh: t("lang_zh"),
                        en: t("lang_en"),
                        "zh-TW": t("lang_zh-TW"),
                    })
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        setLanguage(value);
                        await this.plugin.saveSettings();
                        this.display();
                        this.plugin.refreshUI();
                    }),
            );

        this.displayGeneralSettings(containerEl);
        this.displayCommonStyleSettings(containerEl);
        this.displayAdvancedSettings(containerEl);

        // GitHub 使用文档（统一入口，始终在最底部）
        containerEl.createEl("hr", { cls: "quiet-outline-divider" });
        new Setting(containerEl)
            .setName(t("setting_docs"))
            .setDesc(t("setting_docs_desc"))
            .addButton((btn) =>
                btn.setButtonText(t("btn_github")).onClick(() => {
                    window.open(REPO_URL, "_blank");
                }),
            );

        // 复位滚动位置：containerEl 即设置页滚动容器（.vertical-tab-content, overflow-y:auto）。
        // Obsidian 会保留上次离开时的滚动偏移，导致从侧栏进入时顶部标题被滚出视口，
        // 每次重绘后回到最顶，确保插件名标题始终第一可见。
        containerEl.scrollTop = 0;
    }

    /** 常用区：5 个核心行为设置 */
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

    /** 常用区：主色覆盖 + 彩虹线总开关（装完最可能先调的外观项） */
    displayCommonStyleSettings(containerEl: HTMLElement): void {
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
    }

    /**
     * 高级设置（原生 details/summary，默认收起）：
     * 5 个缩进层级彩虹色 + 5 个字体微调项。
     * 布局遵循 PATTERNS §16.4.1：常用在前，低频收进折叠块。
     */
    displayAdvancedSettings(containerEl: HTMLElement): void {
        const adv = containerEl.createEl("details", { cls: "quiet-outline-advanced" });
        const summary = adv.createEl("summary");
        summary.setText(t("sec_advanced"));
        summary.style.cursor = "pointer";
        summary.style.fontWeight = "600";
        summary.style.fontSize = "var(--h3-size)";
        summary.style.color = "var(--text-normal)";
        summary.style.userSelect = "none";

        const rainbowColorKeys = [
            "rainbow_color_1",
            "rainbow_color_2",
            "rainbow_color_3",
            "rainbow_color_4",
            "rainbow_color_5",
        ] as const;
        rainbowColorKeys.forEach((key, i) => {
            new Setting(adv)
                .setName(`${t("Indent level")} ${i + 1}`)
                .addColorPicker((color) =>
                    color.setValue(this.plugin.settings[key]).onChange(async (value) => {
                        this.plugin.settings[key] = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshUI();
                    }),
                );
        });

        new Setting(adv).setName(t("Font Settings")).setHeading();

        new Setting(adv)
            .setName(t("Font size"))
            .addText((text) =>
                text.setValue(this.plugin.settings.font_size).onChange(async (value) => {
                    this.plugin.settings.font_size = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshUI();
                }),
            );

        new Setting(adv).setName(t("Font family")).addText((text) =>
            text.setValue(this.plugin.settings.font_family).onChange(async (value) => {
                this.plugin.settings.font_family = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );

        new Setting(adv).setName(t("Font weight")).addText((text) =>
            text.setValue(this.plugin.settings.font_weight).onChange(async (value) => {
                this.plugin.settings.font_weight = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );

        new Setting(adv).setName(t("Line height")).addText((text) =>
            text.setValue(this.plugin.settings.line_height).onChange(async (value) => {
                this.plugin.settings.line_height = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );

        new Setting(adv).setName(t("Line gap")).addText((text) =>
            text.setValue(this.plugin.settings.line_gap).onChange(async (value) => {
                this.plugin.settings.line_gap = value;
                await this.plugin.saveSettings();
                this.plugin.refreshUI();
            }),
        );
    }

}

export { SettingTab, DEFAULT_SETTINGS, REPO_URL };
