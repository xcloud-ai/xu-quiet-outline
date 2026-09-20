// 内联 SVG 图标：通过 Obsidian addIcon 注册，setIcon(el, id) 以官方 DOM API 创建 SVG，
// 不直接拼接 HTML 字符串写入 DOM（符合官方插件安全审核要求）。
import { addIcon } from "obsidian";

/** 图标 id 常量（与注册时一致，供 setIcon 使用） */
export const ICON_TO_BOTTOM = "qo-to-bottom";
export const ICON_RESET = "qo-reset";
export const ICON_CHEVRON = "qo-chevron";

let registered = false;

/** 注册全部自定义图标，插件 onload 时调用一次即可（重复调用安全） */
export function registerIcons(): void {
    if (registered) return;
    registered = true;
    // 置底按钮：圆圈向下箭头
    addIcon(
        ICON_TO_BOTTOM,
        `<path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8s-8-3.59-8-8s3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 10V9c0-.55-.45-1-1-1s-1 .45-1 1v3H9.21c-.45 0-.67.54-.35.85l2.79 2.79c.2.2.51.2.71 0l2.79-2.79a.5.5 0 0 0-.35-.85H13z" fill="currentColor"/>`,
    );
    // 重置按钮：环形恢复箭头
    addIcon(
        ICON_RESET,
        `<path d="M11.77 3c-2.65.07-5 1.28-6.6 3.16L3.85 4.85a.5.5 0 0 0-.85.36V9.5c0 .28.22.5.5.5h4.29c.45 0 .67-.54.35-.85L6.59 7.59C7.88 6.02 9.82 5 12 5c4.32 0 7.74 3.94 6.86 8.41c-.54 2.77-2.81 4.98-5.58 5.47c-3.8.68-7.18-1.74-8.05-5.16c-.12-.42-.52-.72-.96-.72c-.65 0-1.14.61-.98 1.23C4.28 18.12 7.8 21 12 21c5.06 0 9.14-4.17 9-9.26c-.14-4.88-4.35-8.86-9.23-8.74zM14 12c0-1.1-.9-2-2-2s-2 .9-2 2s.9 2 2 2s2-.9 2-2z" fill="currentColor"/>`,
    );
    // 展开指示箭头（chevron，通过 CSS 旋转表示展开态）
    addIcon(
        ICON_CHEVRON,
        `<path d="M9.707 18.293l6-6a.999.999 0 0 0 0-1.414l-6-6a.999.999 0 1 0-1.414 1.414L14.586 12l-6.293 6.293a.999.999 0 1 0 1.414 1.414z" fill="currentColor"/>`,
    );
}
