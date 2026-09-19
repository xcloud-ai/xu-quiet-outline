# 大纲

> [!NOTE] 中文说明
> **大纲**：侧边栏大纲树，点击跳转，滚动与光标双向定位，层级滑条、拖拽改层级与彩虹缩进线等样式定制。

基于开源项目 [Quiet Outline](https://github.com/guopenghui/obsidian-quiet-outline)（MIT）裁剪重构的轻量大纲插件：聚焦阅读与导航，移除搜索、标题内联渲染与 Canvas / Kanban / Bases 导航，修复关闭后重开不显示的问题。支持双链标题着色、拖拽改层级、彩虹缩进线与字体样式定制，启动时自动打开大纲面板。

> English description below for review purposes. / 以下为英文说明，用于过审。

XU Quiet Outline is a lightweight outline plugin focused on reading and navigation, forked and trimmed from Quiet Outline (MIT). It keeps the sidebar outline tree with click-to-jump, two-way cursor/scroll syncing, drag-to-reorder, rainbow indentation guides and font customization, while removing search, inline markdown rendering and Canvas / Kanban / Bases navigators. The panel auto-opens on startup.

## 功能特性

- **侧边栏大纲树**：右侧边栏常驻，点击标题跳转，启动时自动打开
- **双向定位**：编辑区滚动 / 光标移动时大纲高亮最近标题，高亮标题自动滚动到可见区域
- **双链标题着色**：标题中的 `[[双链]]` 以纯文本显示（无括号、跟随主题链接色）
- **层级滑条**：0-5 级滑条批量切换展开层级，悬停显示各级标题计数
- **自动展开 4 模式**：仅展开当前 / 折叠其余到默认层级 / 折叠其余到指定层级 / 禁用
- **拖拽改层级**：在大纲中拖拽标题调整层级与位置（直接修改笔记内容）
- **彩虹缩进线**：H1-H5 缩进线独立配色，5 色可自定义
- **样式定制**：字号 / 字体 / 字重 / 行高 / 行间距，主色覆盖（明暗双色）+ 暗色适配
- **Vim 风格键位**：H / J / K / L / G / Z 及方向键操作
- **多端兼容**：不依赖桌面专属 API，移动端可用

### Features

- Sidebar outline tree with click-to-jump; auto-opens on startup
- Two-way sync between editor scrolling / cursor and outline highlight; located headings auto-scroll into view
- Wikilink headings shown as colored plain text (no brackets, theme link color)
- Level switch slider (0-5) with per-level counts
- 4 auto-expand modes
- Drag to change heading level and position (modifies note content)
- Rainbow indentation guide lines (H1-H5, 5 customizable colors)
- Font size / family / weight / line height / line gap; primary color override with dark mode adaptation
- Vim-like keymap (H / J / K / L / G / Z)
- Mobile friendly

## 与原版 Quiet Outline 的差异

| | Quiet Outline | 本插件 |
|---|---|---|
| 文档类型 | Markdown / Canvas / Kanban / Bases | 仅 Markdown |
| 搜索框与树内过滤 | 有 | 已移除 |
| 标题行内渲染（marked + 图片） | 有 | 已移除（纯文本，渲染更快） |
| 右键菜单 | 完整菜单 | 仅递归展开 / 折叠（含兄弟节点） |
| 关闭后重开不显示 | 存在此问题 | 已修复 |
| 标题颜色 / 多余设置项 | 有 | 已精简 |

## 安装

### 方式一：从 Obsidian 社区目录安装（推荐）

1. 打开 Obsidian 设置 → 社区插件
2. 点击「浏览」，搜索 "XU Quiet Outline"
3. 点击「安装」，然后「启用」

### 方式二：手动安装

1. 从 [最新 Release](https://github.com/xcloud-ai/xu-quiet-outline/releases) 下载 `main.js`、`manifest.json`、`styles.css` 三个文件
2. 在 vault 中创建目录 `.obsidian/plugins/xu-quiet-outline/`
3. 将三个文件放入该目录
4. 打开 Obsidian 设置 → 社区插件，找到 XU Quiet Outline 并开启

### Installation

**From Obsidian Community Directory:**
1. Open Obsidian Settings → Community Plugins
2. Click "Browse" and search for "XU Quiet Outline"
3. Click "Install", then "Enable"

**Manual Installation:**
1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/xcloud-ai/xu-quiet-outline/releases)
2. Put them in `<vault>/.obsidian/plugins/xu-quiet-outline/`
3. Enable in Settings → Community Plugins

## 使用方法

1. 启用插件后大纲面板自动打开；也可通过左侧功能区图标、命令「XU Quiet Outline: Open outline」或右侧边栏标签页打开
2. 点击标题跳转；拖拽标题调整层级与位置
3. 拖动面板顶部滑条批量切换展开层级

聚焦大纲树后的 Vim 风格键位：

| 键 | 作用 |
|----|------|
| `H` / `L`（或 ← / →） | 折叠 / 展开标题 |
| `J` / `K`（或 ↑ / ↓） | 上下移动 |
| `G G` / `Shift G` | 跳到最上 / 最下标题 |
| `Z Z` | 当前标题居中 |
| `Space` / `Enter` | 跳转预览 / 跳转并进入笔记 |
| `Esc` | 退出面板，返回原笔记 |

### Usage

1. The outline panel opens automatically on startup; you can also open it via the ribbon icon, the command "XU Quiet Outline: Open outline", or the sidebar tab
2. Click a heading to jump; drag headings to change level and position
3. Use the slider at the top to switch the expansion level

Vim-like keymap when the outline tree is focused: H / L (collapse / expand), J / K (move), G G / Shift G (top / bottom), Z Z (center), Space (preview jump), Enter (jump and focus), Esc (exit).

## 设置说明

设置页分「常规设置」与「样式设置」两个页签：

| 设置项 | 说明 |
|--------|------|
| 默认展开层级 | 打开笔记时标题展开到几级，0 表示全部展开 |
| 自动展开模式 | 仅展开当前 / 折叠其余到默认层级 / 折叠其余到指定层级 / 禁用 |
| 拖拽改层级 | 允许在大纲中拖拽标题修改层级与位置（会修改笔记内容） |
| 光标定位 | 根据光标位置高亮最近标题 |
| 自动滚动到可见区域 | 高亮标题时大纲自动滚动到可见区域 |
| 覆盖主色 | 明 / 暗双取色器覆盖主题主色，关闭则跟随主题 |
| 彩虹缩进线 | 开关 + 5 级颜色自定义 |
| 字号 / 字体 / 字重 / 行高 / 行间距 | 大纲文本样式，支持 CSS 值（如 `14px`、`1.5`） |

## 命令列表

| 命令 | 作用 |
|------|------|
| Open outline | 打开大纲面板 |
| To previous heading | 跳到上一个标题 |
| To next heading | 跳到下一个标题 |

## 技术说明

- Vue 3 + Naive UI 构建，`main.js` 为 Vite 打包产物，`styles.css` 随源码生成
- 双向定位：编辑器滚动 / 光标变化防抖同步大纲高亮，跳转时短暂屏蔽反向同步避免回环
- 事件驱动刷新（`metadataCache` changed + active-leaf-change，300ms 防抖），无轮询、无全库扫描
- 兼容移动端（`isDesktopOnly: false`）

## 致谢 / Credits

- 基于 [Quiet Outline](https://github.com/guopenghui/obsidian-quiet-outline)（MIT License）裁剪重构

## 许可证

MIT License - Copyright (c) 2026 旭说
