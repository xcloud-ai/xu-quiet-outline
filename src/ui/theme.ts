// 主题应用：将设置中的样式值写入容器 CSS 变量（替代原 naive-ui 主题系统）
import { store } from "@/store";

/** 把彩虹线颜色 / 字体五项 / 主题色写入容器 CSS 变量 */
export function applyTheme(container: HTMLElement) {
    const { theme } = store;

    // 彩虹缩进线：开启时用自定义 5 色，关闭时统一用 Obsidian 原生缩进线颜色
    const line = (hex: string) => `rgba(${hexToRGB(hex)}, 0.6)`;
    const nativeGuide = "var(--nav-indentation-guide-color)";
    const colors: string[] = theme.rainbowLine
        ? [
              line(theme.rainbowColor1),
              line(theme.rainbowColor2),
              line(theme.rainbowColor3),
              line(theme.rainbowColor4),
              line(theme.rainbowColor5),
          ]
        : [nativeGuide, nativeGuide, nativeGuide, nativeGuide, nativeGuide];
    colors.forEach((c, i) => container.style.setProperty(`--qo-line-${i + 1}`, c));

    // 字体五项设置
    container.style.setProperty("--custom-font-size", theme.fontSize);
    container.style.setProperty("--custom-font-family", theme.fontFamily);
    container.style.setProperty("--custom-font-weight", theme.fontWeight);
    container.style.setProperty("--custom-line-height", theme.lineHeight);
    container.style.setProperty("--custom-line-gap", theme.lineGap);

    // 主题色：patch 开启时用用户配色，否则读取当前主题的 interactive-accent
    const primary = theme.patchColor
        ? store.dark
            ? theme.primaryColorDark
            : theme.primaryColorLight
        : getDefaultColor();
    container.style.setProperty("--qo-primary", primary);
}

function getDefaultColor(): string {
    // 读取 --interactive-accent 的实际计算值（明暗主题切换后由 css-change 事件触发重算）
    const el = activeDocument.body.createDiv({
        attr: { style: "width: 0px; height: 0px; background-color: var(--interactive-accent);" },
    });
    const color = activeWindow.getComputedStyle(el, null).getPropertyValue("background-color");
    el.remove();
    return color || "#7c3aed";
}

function hexToRGB(hex: string): string {
    return (
        `${parseInt(hex.slice(1, 3), 16)},` +
        `${parseInt(hex.slice(3, 5), 16)},` +
        `${parseInt(hex.slice(5, 7), 16)}`
    );
}
