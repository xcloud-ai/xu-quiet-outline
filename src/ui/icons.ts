// 图标统一引用 Obsidian 内置 Lucide 图标 id，由 setIcon(el, id) 直接渲染，
// 不再使用 addIcon 注册自定义 SVG。
// 背景：Obsidian 1.13 起 addIcon 注册的自定义图标被包入 viewBox="0 0 100 100" 的 SVG，
// 旧的 24 坐标系 Material path 会缩到画布左上角（18px 按钮里只剩约 4px 的小点）；
// 内置 lucide-* 图标始终使用 viewBox="0 0 24 24"，且下列三个均为 Feather 时代就存在、
// 未改名的老图标，minAppVersion 1.8.7 起全部可用，同时省去自定义图标注册（更利于过审）。

/** 置底按钮：双下箭头（语义=滚动到底部） */
export const ICON_TO_BOTTOM = "lucide-chevrons-down";
/** 重置按钮：环形恢复箭头 */
export const ICON_RESET = "lucide-rotate-ccw";
/** 展开指示箭头（朝右；展开态由 CSS rotate(90deg) 变为朝下） */
export const ICON_CHEVRON = "lucide-chevron-right";
