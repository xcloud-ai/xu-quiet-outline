# XU Quiet Outline

> [!NOTE] 中文说明
> **大纲（XU Quiet Outline）**：侧边栏大纲树，支持点击跳转、滚动与光标双向定位、层级滑条、拖拽改层级、彩虹缩进线与字体样式定制。

一个专注于阅读与导航的轻量大纲插件，基于开源项目 [Quiet Outline](https://github.com/guopenghui/obsidian-quiet-outline)（MIT）裁剪重构。

## 与原版 Quiet Outline 的差异

| 项目 | 原版 | 本插件 |
|------|------|--------|
| 文档类型 | Markdown / Canvas / Kanban 等 | 仅 Markdown |
| 搜索框与树内过滤 | 有 | 已移除 |
| 标题行内渲染（marked + 图片） | 有 | 已移除（纯文本，渲染更快） |
| 右键菜单 | 完整菜单 | 仅递归展开 / 折叠 |
| 关闭后重开不显示 | 存在此问题 | 已修复 |
| 标题颜色 / 多余设置项 | 有 | 已精简 |

保留的核心功能：侧边栏大纲树、点击跳转、滚动与光标双向定位同步、默认展开层级、自动展开 4 模式、层级滑条、拖拽改层级 / 位置、彩虹缩进线（5 色）、字号 / 字体 / 字重 / 行高 / 行距、主色覆盖 + 暗色适配、Vim 风格键位。

## Features

XU Quiet Outline is a lightweight outline plugin focused on reading and navigation, forked and trimmed from [Quiet Outline](https://github.com/guopenghui/obsidian-quiet-outline) (MIT).

- Outline tree in sidebar with click-to-jump
- Two-way sync between editor scrolling / cursor and outline highlight
- Default expanding level and 4 auto-expand modes
- Level switch slider
- Drag to change heading level and position
- Rainbow indentation guide lines (5 colors)
- Font size / family / weight / line height / line gap customization
- Primary color override with dark mode adaptation
- Vim-like keymap (H / J / K / L / G / Z)

### Differences from the original

Removed: search box, inline markdown rendering, Canvas / Kanban / Bases navigators, heading colors and other extra settings. Fixed: outline not showing after closing and reopening. Kept: all core navigation features above.

## Installation

### From BRAT (recommended)

1. Install and enable the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Run command `BRAT: Add a beta plugin for testing`
3. Enter `https://github.com/xcloud-ai/xu-quiet-outline`
4. Enable **XU Quiet Outline** in community plugins

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release
2. Create folder `<vault>/.obsidian/plugins/xu-quiet-outline/` and put the three files in it
3. Enable the plugin in Settings → Community plugins

## Usage

Open the outline via: ribbon icon, command `XU Quiet Outline: Open outline`, or the sidebar tab.

## License

[MIT](LICENSE) © 旭说 (xcloud-ai)
