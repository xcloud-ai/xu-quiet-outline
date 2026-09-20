# 大纲

> [!NOTE] 中文说明
> **大纲**：侧边栏大纲树，点击跳转，滚动与光标双向定位，层级滑条、拖拽改层级与彩虹缩进线等样式定制。

基于开源项目 [Quiet Outline](https://github.com/guopenghui/obsidian-quiet-outline)（MIT）裁剪后**零框架重写**的轻量大纲插件：v2.0.0 起移除 Vue 3 / Naive UI，改为原生 DOM 渲染与固定行高虚拟滚动，打开与切换文件更快，长文档（上千标题）滚动不卡。仅支持 Markdown，保留搜索过滤、拖拽移动章节、展开状态按文件记忆与样式定制，启动时自动打开大纲面板。

> English description below for review purposes. / 以下为英文说明，用于过审。

XU Quiet Outline is a lightweight outline plugin forked and trimmed from Quiet Outline (MIT). Since v2.0.0 it is rewritten with zero UI framework: plain DOM rendering and fixed-row-height virtual scrolling replace Vue 3 / Naive UI, making file opening and switching faster and keeping long documents (1000+ headings) smooth. It supports Markdown only and keeps search filtering, drag-to-move sections, per-file expansion memory and style customization. The outline panel auto-opens on startup.

## 功能特性

- **侧边栏大纲树**：右侧边栏常驻，点击标题跳转并聚焦编辑器，启动时自动打开
- **双向定位**：编辑区滚动 / 光标移动时大纲高亮最近标题，高亮标题自动滚动到可见区域
- **拖拽移动章节**：在大纲中拖拽标题即可移动整个章节块、调整层级与位置（直接写回笔记，带防呆校验）
- **展开状态管理**：0-5 级滑条批量切换；右键递归 / 兄弟展开折叠 4 项菜单；展开状态按文件记忆，切换后恢复
- **编辑跟随**：正文增删标题时展开状态增量迁移，不错乱、不跳位
- **搜索过滤**：关键词匹配标题，自动保留命中项的祖先链，清空即恢复
- **双链标题着色**：标题中的 `[[双链]]` 以纯文本显示（无括号、跟随主题链接色）
- **彩虹缩进线**：H1-H5 缩进线 5 色可自定义
- **样式定制**：字号 / 字体 / 字重 / 行高 / 行间距，主色覆盖（明暗双色，默认跟随主题）+ 明暗主题适配
- **多端兼容**：不依赖桌面专属 API，移动端可用

### Features

- Sidebar outline tree; click a heading to jump and focus the editor; auto-opens on startup
- Two-way sync between editor scrolling / cursor and outline highlight; located headings auto-scroll into view
- Drag a heading to move the whole section block and change its level or position (writes back to the note with safety checks)
- Expansion control: 0-5 level slider, recursive / sibling expand-collapse context menus, and per-file expansion memory
- Expansion state is migrated incrementally when headings are added or removed in the note
- Search filtering: keyword matching keeps the ancestor chain of matches; clearing restores the tree
- Wikilink headings shown as colored plain text (no brackets, theme link color)
- Rainbow indentation guide lines (H1-H5, 5 customizable colors)
- Font size / family / weight / line height / line gap customization; optional primary color override (light / dark, follows the theme by default)
- Mobile friendly

## 与原版 Quiet Outline 的差异

| | Quiet Outline | 本插件 |
|---|---|---|
| 技术栈 | Vue 3 + Naive UI + Vite | 零框架原生 DOM + esbuild，虚拟滚动 |
| 文档类型 | Markdown / Canvas / Kanban / Bases / PDF | 仅 Markdown |
| 搜索框与树内过滤 | 有（含正则） | 保留，仅纯文本匹配（无正则） |
| 标题行内渲染（marked + 图片） | 有 | 纯文本，渲染更快 |
| 右键菜单 | 完整菜单（重命名 / 复制链接等） | 仅递归 / 兄弟 展开折叠 4 项 |
| Vim 风格键位 / 多面板同步 / 拖出成链接 | 有 | 已移除 |
| 关闭后重开不显示 | 存在此问题 | 已修复 |

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

1. 启用插件后大纲面板自动打开；也可通过命令「XU Quiet Outline: Open outline」或右侧边栏标签打开
2. 点击标题跳转并聚焦编辑器；拖拽标题移动整个章节
3. 拖动面板顶部滑条批量切换展开层级；右键标题可递归 / 按兄弟展开折叠
4. 搜索框输入关键词过滤标题；置底按钮快速跳到笔记末尾；重置按钮恢复默认展开

### Usage

1. The outline panel opens automatically on startup; you can also run the command "XU Quiet Outline: Open outline" or click the right sidebar tab
2. Click a heading to jump and focus the editor; drag headings to move a whole section
3. Use the slider at the top to switch the expansion level; right-click a heading for recursive / sibling expand and collapse
4. Type keywords in the search box to filter headings; the bottom button jumps to the note end, and reset restores the default expansion

## 设置说明

设置页分「常规设置」与「样式设置」两个页签：

| 设置项 | 说明 |
|--------|------|
| 默认展开层级 | 打开笔记时默认展开的标题层级，0 为全部折叠，数字越大展开越深（最高到 H5），默认 2；可用 frontmatter `qo-default-level` 为单篇笔记覆盖 |
| 自动展开模式 | 光标 / 滚动定位时对所在折叠分支的处理：仅展开当前（默认）/ 折叠其余到默认层级 / 折叠其余到指定层级 / 禁用 |
| 拖拽改层级 | 允许在大纲中拖拽标题移动章节、修改层级与位置（会写回笔记内容），默认开启 |
| 光标定位 | 根据光标位置高亮最近标题，默认开启 |
| 自动滚动到可见区域 | 高亮标题时大纲自动滚动到可见区域，默认开启 |
| 覆盖主色 | 明 / 暗双取色器覆盖主题主色；默认关闭，关闭时跟随当前主题强调色 |
| 彩虹缩进线 | 总开关 + 缩进层级 1-5 颜色自定义，默认开启 |
| 字号 / 字体 / 字重 / 行高 / 行间距 | 大纲文本样式，支持 CSS 值（如 `14px`、`1.5`），留空回退主题默认值 |

## 命令列表

| 命令 | 作用 |
|------|------|
| Open outline | 打开大纲面板 |
| To previous heading | 跳到光标上方最近的标题 |
| To next heading | 跳到光标下方最近的标题 |

## 技术说明

- v2.0.0 零框架重写：原生 DOM + esbuild 打包，运行时仅 external 引用 Obsidian 内置的 `@codemirror/view`，`main.js` 约 90KB
- 固定行高虚拟滚动：每次刷新只重算扁平可见行列表与渲染视口内（含 6 行缓冲）的 DOM，行高实测校准，字体 / 行高变化后自动重测
- 展开状态以 header index 集合存储，编辑后按 diff 增量迁移；按文件路径持久化到 localStorage（上限 800 个文件），空文件不写入
- 双向定位：编辑器滚动 / 光标变化经防抖同步大纲高亮，点击跳转后短时间屏蔽反向同步避免回环
- 拖拽写回前双重防呆：重新读取磁盘最新内容 + 校验拖拽期间标题结构未变化，异常时 Notice 中止
- 事件驱动刷新（`metadataCache` changed / resolved + active-leaf-change，300ms 防抖），无轮询、无全库扫描
- 兼容移动端（`isDesktopOnly: false`）

## 致谢 / Credits

- 基于 [Quiet Outline](https://github.com/guopenghui/obsidian-quiet-outline)（MIT License）裁剪重写

## 许可证

MIT License - Copyright (c) 2026 旭说
