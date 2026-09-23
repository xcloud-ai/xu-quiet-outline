import zh from "./locale/zh";
import en from "./locale/en";
import zhTW from "./locale/zh-TW";
import { getLanguage } from "obsidian";

const localeMap: { [k: string]: Partial<typeof en> } = {
    en,
    zh,
    "zh-TW": zhTW,
};

export type LangCode = "auto" | "en" | "zh" | "zh-TW";

/** 当前生效语言；"auto" 表示跟随 Obsidian 界面语言 */
let currentLang: string = "auto";

function resolveLang(lang: string): string {
    if (lang !== "auto") return lang;
    // Obsidian 界面语言：zh / zh-TW / en ...
    return getLanguage() || "en";
}

/**
 * 切换界面语言（由插件 onload 与设置页语言切换器调用）。
 * @param lang "auto" 跟随 Obsidian，或显式语言代码
 */
export function setLanguage(lang: string): void {
    currentLang = lang || "auto";
}

export function t(text: keyof typeof en): string {
    const resolved = resolveLang(currentLang);
    const locale = localeMap[resolved];
    return (locale && locale[text]) || en[text];
}
