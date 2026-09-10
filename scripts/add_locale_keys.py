# -*- coding: utf-8 -*-
"""一次性脚本：给 quiet-outline 裁剪版 locale 补设置页新键"""
import io

new_en = {
    "General Settings": "General Settings",
    "Default expanding level": "Default expanding level",
    "0 means no limitation, and all the rest of levels will be expanded": "0 means no limitation, and all the rest of levels will be expanded",
    "Auto expand mode": "Auto expand mode",
    "Control the expansion behavior when a leaf is changed": "Control the expansion behavior when a leaf is changed",
    "Drag to modify": "Drag to modify",
    "Allow dragging headings in the outline to change their level and position. This will modify the note content.": "Allow dragging headings in the outline to change their level and position. This will modify the note content.",
    "Locate by cursor": "Locate by cursor",
    "Highlight the nearest heading by the cursor": "Highlight the nearest heading by the cursor",
    "Auto scroll into view": "Auto scroll into view",
    "Highlighting headings auto scroll into view": "Highlighting headings auto scroll into view",
    "Style Settings": "Style Settings",
    "Override primary color": "Override primary color",
    "This setting is used to override the primary color of the theme": "This setting is used to override the primary color of the theme",
    "Rainbow line color": "Rainbow line color",
    "The color of the line can be customized by rainbow": "The color of the line can be customized by rainbow",
    "Rainbow line colors": "Rainbow line colors",
    "Font Settings": "Font Settings",
    "Font size": "Font size",
    "Font family": "Font family",
    "Font weight": "Font weight",
    "Line height": "Line height",
    "Line gap": "Line gap",
    "Heading Colors": "Heading Colors",
    "Custom font color": "Custom font color",
    "Use custom colors for different heading levels": "Use custom colors for different heading levels",
}
new_zh = {
    "General Settings": "常规设置",
    "Default expanding level": "默认展开层级",
    "0 means no limitation, and all the rest of levels will be expanded": "0 表示无限制，其余层级将全部展开",
    "Auto expand mode": "自动展开模式",
    "Control the expansion behavior when a leaf is changed": "切换文档时控制大纲的展开行为",
    "Drag to modify": "拖拽改层级",
    "Allow dragging headings in the outline to change their level and position. This will modify the note content.": "允许在大纲中拖拽标题改变其层级和位置。此操作会修改笔记内容。",
    "Locate by cursor": "光标定位",
    "Highlight the nearest heading by the cursor": "根据光标位置高亮最近的标题",
    "Auto scroll into view": "自动滚动到可见区域",
    "Highlighting headings auto scroll into view": "高亮标题时自动滚动到可见区域",
    "Style Settings": "样式设置",
    "Override primary color": "覆盖主色",
    "This setting is used to override the primary color of the theme": "此设置用于覆盖主题的主色调（左浅色/右深色）",
    "Rainbow line color": "彩虹缩进线",
    "The color of the line can be customized by rainbow": "用彩虹色自定义缩进线颜色",
    "Rainbow line colors": "彩虹线颜色",
    "Font Settings": "字体设置",
    "Font size": "字号",
    "Font family": "字体",
    "Font weight": "字重",
    "Line height": "行高",
    "Line gap": "行间距",
    "Heading Colors": "标题颜色",
    "Custom font color": "自定义标题颜色",
    "Use custom colors for different heading levels": "为不同级别的标题使用自定义颜色（左浅色/右深色）",
}

base = r"C:\obsidiandownloads\obsidian-plugin\.obsidian\plugins\xu-quiet-outline\src\lang\locale"
for fname, extra in [("en.ts", new_en), ("zh.ts", new_zh)]:
    p = base + "\\" + fname
    src = io.open(p, encoding="utf-8").read()
    missing = {k: v for k, v in extra.items() if ('"' + k + '"') not in src}
    if not missing:
        print(fname, "all keys present")
        continue
    # 找对象结尾：最后一个 '}' 前
    rstrip = src.rstrip()
    # 定位 export default {...}; 的最后 '}'（排除结尾 ';' 或 '}' 之后内容）
    close_idx = rstrip.rfind("}")
    # 向前找最后一个键值行结尾（可能是 ',' 或 '}' —— 若对象内最后是嵌套则复杂；locale 是平铺键值，直接找 close_idx 前最后一个非空白字符）
    j = close_idx - 1
    while rstrip[j] in " \t\r\n":
        j -= 1
    insert_pos = j + 1
    add_comma = "" if rstrip[j] == "," else ","
    body = "".join('\n    "%s": "%s",' % (k, v.replace('"', '\\"')) for k, v in missing.items())
    new = rstrip[:insert_pos] + add_comma + body + "\n" + rstrip[close_idx:]
    io.open(p, "w", encoding="utf-8", newline="").write(new)
    print(fname, "added", len(missing), "keys")
