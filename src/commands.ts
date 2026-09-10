import type { Command } from "obsidian";
import type QuietOutline from "./plugin";
import { OutlineView, VIEW_TYPE } from "./ui/view";
import { store } from "./store";
import type { MarkdownHeading } from "./navigators/markdown";

export function registerCommands(plugin: QuietOutline) {
    const commands: Command[] = [
        {
            id: "quiet-outline",
            name: "Open outline",
            callback: () => {
                void plugin.activateView();
            },
        },
        {
            id: "prev-heading",
            name: "To previous heading",
            editorCallback: (editor) => {
                const line = editor.getCursor().line;

                const headers = store.headers as MarkdownHeading[];
                const idx = headers.findLastIndex((h) => h.line < line);

                if (idx !== -1) {
                    void plugin.navigator.jump(idx);
                }
            },
        },
        {
            id: "next-heading",
            name: "To next heading",
            editorCallback: (editor) => {
                const line = editor.getCursor().line;

                const headers = store.headers as MarkdownHeading[];
                const idx = headers.findIndex((h) => h.line > line);

                if (idx !== -1) {
                    void plugin.navigator.jump(idx);
                }
            },
        },
    ];

    for (const command of commands) {
        plugin.addCommand(command);
    }
}
