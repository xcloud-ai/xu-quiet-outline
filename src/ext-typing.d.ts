/* eslint-disable no-undef -- module augmentation 内的类型名由 TS 从被增强的 "obsidian" 模块解析，no-undef 无法理解增强语法 */
import type { EditorView } from "@codemirror/view";

declare global {
    interface ScrollIntoViewOptions {
        // supported in chrome 140, obsidian 1.11
        container?: "all" | "nearest";
    }
}

declare module "obsidian" {
    interface EventRef {
        e?: Events;
    }

    interface MetadataCache {
        computeMetadataAsync(buffer: ArrayBufferLike): Promise<CachedMetadata>;
    }

    interface Workspace {
        getActiveFileView: () => FileView | null;
    }

    interface WorkspaceLeaf {
        group: string | null;
    }

    interface MarkdownPreviewSection {
        el: HTMLElement;
        height: number;
        html: string;
        /** legacy field, only present before Obsidian 1.9.0 (removed upstream) */
        lineStart: number;
        /** legacy field, only present before Obsidian 1.9.0 (removed upstream) */
        lineEnd: number;
        lines: number;
        start: { line: number; col: number; offset: number };
        end: { line: number; col: number; offset: number };
    }

    interface MarkdownPreviewRenderer {
        sections: MarkdownPreviewSection[];
        viewportHeight: number;
        previewEl: HTMLElement;

        applyScroll(scroll: number, config: { highlight: boolean; center: boolean }): boolean;

        highlightEl(el: HTMLElement): void;
        getSectionForElement(el: HTMLElement): MarkdownPreviewSection | null;
        /**
         * calculate top position of a section by sum height of all previous section
         */
        getSectionTop(section: MarkdownPreviewSection): number;
    }

    interface MarkdownPreviewView {
        renderer: MarkdownPreviewRenderer;
    }

    interface Editor {
        cm: EditorView;
    }

    interface MenuItem {
        setSubmenu(): Menu;
        setWarning(isWarning: boolean): MenuItem;
    }
}

/* eslint-enable no-undef -- module augmentation 范围结束，恢复全局 no-undef 检查 */

export {};
