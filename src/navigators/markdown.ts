import { MarkdownView, debounce, type Pos } from "obsidian";
import { EditorView } from "@codemirror/view";
import { editorEvent } from "@/editor-ext";
import type QuietOutline from "@/plugin";
import { store, type Heading } from "@/store";
import { Nav } from "./base";
import { calcModifies } from "@/utils/diff";
import { parseMarkdown, stringifySection, moveHeading } from "@/utils/md-process";
import { eventBus } from "@/utils/event-bus";

let plugin: QuietOutline;

export interface MarkdownHeading extends Heading {
    line: number;
    position: Pos;
}

export class MarkDownNav extends Nav {
    declare view: MarkdownView;
    canDrop: boolean = true;
    expandedKeys: string[] | undefined;
    constructor(_plugin: QuietOutline, view: MarkdownView) {
        super(_plugin, view);
        plugin = _plugin;
    }

    getId() {
        return "markdown";
    }

    async getHeaders(): Promise<MarkdownHeading[]> {
        const cache = this.view.file && this.plugin.app.metadataCache.getFileCache(this.view.file);

        const headers = structuredClone(cache?.headings) || [];
        return headers.map((cache) => ({
            title: cache.heading,
            level: cache.level,
            line: cache.position.start.line,
            position: cache.position,
        }));
    }

    async setHeaders(): Promise<void> {
        const headings = await this.getHeaders();
        store.headers = headings;
    }

    async updateHeaders(): Promise<void> {
        const headings = await this.getHeaders();
        store.modifyKeys = calcModifies(store.headers, headings);
        store.headers = headings;
    }

    async jump(index: number) {
        const line: number = getHeader(index).line;

        const cursor = {
            from: { line, ch: 0 },
            to: { line, ch: 0 },
        };
        const state = { line, cursor };

        void this.plugin.startJumping();
        plugin.outlineView?.vueInstance.onPosChange(index);

        window.setTimeout(() => {
            this.view.app.workspace.setActiveLeaf(this.view.leaf, { focus: true });
            this.view.setEphemeralState(state);
        });
    }

    // make clicking behavior consistent with core outline plugin
    // i.e. focus editor
    async jumpWhenClick(index: number): Promise<void> {
        await this.jump(index);
    }

    async jumpWithoutFocus(index: number) {
        const line: number = getHeader(index).line;

        const state = { line };

        void this.plugin.startJumping();
        plugin.outlineView?.vueInstance.onPosChange(index);

        window.setTimeout(() => {
            this.view.setEphemeralState(state);
        });
    }

    async install() {
        this.plugin.registerEditorExtension([editorEvent]);
    }

    async onload() {
        this.registerEvent(eventBus.on("cursorchange", handleCursorChange));
        this.registerDomEvent(this.view.contentEl, "scroll", handleScroll, true);
    }

    async onunload() {}

    toBottom(): void {
        const lines = this.view.data.split("\n");
        const scroll = () => {
            // For some reason, scrolling to last 4 lines gets an error.
            this.view.setEphemeralState({ line: lines.length - 5 });
        };

        scroll();
        window.setTimeout(scroll, 100);
    }

    getDefaultLevel(): number {
        let level: number | undefined;
        if (this.view.file) {
            const cache = this.plugin.app.metadataCache.getFileCache(this.view.file);
            const raw: unknown = cache?.frontmatter?.["qo-default-level"];
            if (typeof raw === "number") {
                level = raw;
            } else if (typeof raw === "string") {
                level = parseInt(raw);
            }
        }

        return level || parseInt(plugin.settings.expand_level);
    }

    getPath(): string {
        return this.view.file?.path ?? "";
    }

    onExpandKeysChange(_path: string, _keys: string[]) {}

    async handleDrop(from: number, to: number, position: "before" | "after" | "inside") {
        const structure = await parseMarkdown(this.view.data, this.view.app);
        moveHeading(structure, from, to, position);

        if (!this.view.file) return;
        await plugin.app.vault.modify(this.view.file, stringifySection(structure));
    }
}

function getHeader(idx: number) {
    return store.headers[idx] as MarkdownHeading;
}

function handleCursorChange(docChanged: boolean) {
    if (!plugin.allow_cursor_change || !plugin.jumping || docChanged) {
        return;
    }

    if (plugin.settings.locate_by_cursor) {
        // fix conflict with cursor-change and scroll both triggering highlight heading change
        plugin.block_scroll();

        const current = currentLine(false, true);
        const index = nearestHeading(current);
        if (index === undefined) return;

        plugin.outlineView?.vueInstance.onPosChange(index);
    }
}

function currentLine(fromScroll: boolean, isSourcemode: boolean) {
    const markdownView = (plugin.navigator as MarkDownNav).view;
    // there could be no editor on a markdown view when this view is initializing
    if (!markdownView.editor) {
        return 0;
    }

    if (plugin.settings.locate_by_cursor && !fromScroll) {
        return isSourcemode
            ? markdownView.editor.getCursor("from").line
            : Math.ceil(markdownView.previewMode.getScroll());
    } else {
        return isSourcemode
            ? getCurrentLineFromEditor(markdownView.editor.cm)
            : getCurrentLineFromPreview(markdownView);
    }
}

// line above and nearest to middle of the editor
function getCurrentLineFromEditor(editorView: EditorView): number {
    const { y, height } = editorView.dom.getBoundingClientRect();
    const middle = y + height / 2;
    const lineBlocks = editorView.viewportLineBlocks;

    let line: number = 0;
    lineBlocks.forEach((lb) => {
        const node = editorView.domAtPos(lb.from).node;
        const el = (node.nodeName == "#text" ? node.parentNode : node) as HTMLElement;
        const elRect = el.getBoundingClientRect();
        const base = elRect.y + elRect.height / 2;

        if (base <= middle) {
            line = editorView.state.doc.lineAt(lb.from).number;
        }
    });

    return Math.max(line - 2, 0);
}

function getCurrentLineFromPreview(view: MarkdownView): number {
    const renderer = view.previewMode.renderer;
    const previewEl = renderer.previewEl;
    const rect = previewEl.getBoundingClientRect();
    const middle = rect.y + rect.height / 2;

    const elsInViewport = previewEl.querySelectorAll<HTMLElement>(
        ".markdown-preview-sizer>div[class|=el]",
    );

    let line: number = 0;
    elsInViewport.forEach((el) => {
        const { y } = el.getBoundingClientRect();
        if (y <= middle) {
            const section = renderer.getSectionForElement(el);
            if (section) {
                line =
                    section.lineStart || // this property has been removed since Obsidian v1.9.0
                    section.start.line;
            }
        }
    });

    return line;
}

function nearestHeading(line: number): undefined | number {
    let current_heading = null;
    let i = store.headers.length;
    while (--i >= 0) {
        if (getHeader(i).line <= line) {
            current_heading = getHeader(i);
            break;
        }
    }
    if (!current_heading) {
        return;
    }

    return i;
}

const handleScroll = debounce(_handleScroll, 150, false);

function _handleScroll(evt: Event) {
    if (!plugin.allow_scroll) {
        return;
    }

    if (!plugin.jumping) {
        plugin.jumping = true;
        return;
    }

    const target = evt.target as HTMLElement;
    if (
        !target.classList.contains("markdown-preview-view") &&
        !target.classList.contains("cm-scroller") &&
        // fix conflict with outliner
        // https://github.com/guopenghui/obsidian-quiet-outline/issues/133
        !target.classList.contains("outliner-plugin-list-lines-scroller")
    ) {
        return;
    }

    const isSourcemode = (plugin.navigator as MarkDownNav).view.getMode() === "source";

    const current = currentLine(true, isSourcemode);
    const index = nearestHeading(current);
    if (index === undefined) return;

    plugin.outlineView?.vueInstance.onPosChange(index);
}
