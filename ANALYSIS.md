# 插件分析: Quiet Outline

**一句话定位**: Make outline quiet and more powerful, including no-auto-expand, rendering heading as markdown, and search support.

| 字段 | 值 |
|---|---|
| id / version | obsidian-quiet-outline / 0.5.18 |
| author | the_tree |
| minAppVersion / isDesktopOnly | 1.7.2 / False |
| 目录 | `C:\obsidiandownloads\obsidian-test\quiet-outline` |
| 技术栈 | vite, TypeScript, Actions CI |
| 代码规模 | 7337 行 / 45 个源文件 |
| 入口 | `未找到` |

## 功能面

- **命令** 0 个: 无
- **代码块语言**: 无
- **类结构**: PluginSettingTab:SettingTab, ItemView:OutlineView, Modal:ConfirmModal
- **事件订阅**: css-change(1), changed(1), active-leaf-change(1), window-open(1), window-close(1)

## API 热点

- Setting: 44
- registerEvent: 10
- metadataCache: 6
- vault.adapter: 6
- Notice: 5
- debounce: 4
- addCommand: 1
- addRibbonIcon: 1
- registerDomEvent: 1
- registerView: 1
- registerEditorExtension: 1

## 最大源文件(TOP8)

| 文件 | 行数 |
|---|---|
| `src\settings.ts` | 945 |
| `src\navigators\markdown.ts` | 544 |
| `src\utils\update-heading-links.ts` | 533 |
| `src\navigators\canvas.ts` | 473 |
| `src\ext-typing.d.ts` | 393 |
| `src\plugin.ts` | 298 |
| `src\ui\use-tree.ts` | 272 |
| `src\navigators\bases.ts` | 247 |

## 风险点自查

- isDesktopOnly=false 但用了 vault.adapter(移动端需验证)