import { reactive } from "vue";
import type QuietOutline from "./plugin";

export type SupportedIcon = string;

export type Heading = {
    title: string;
    level: number;
    id?: string;
    icon?: SupportedIcon;
};

export function getParent(headId: number, headings: Heading[]): number {
    for (let i = headId; i >= 0; i--) {
        if (headings[i].level < headings[headId].level) return i;
    }
    return -1;
}

// -1 表示根
export function getChildren(headId: number, headings: Heading[]): Set<number> {
    if (headId === -1) return new Set(headings.map((_, i) => i));
    const children = [];
    for (let i = headId + 1; i < headings.length; i++) {
        if (headings[i].level <= headings[headId].level) break;

        children.push(i);
    }
    return new Set(children);
}

export type ModifyKeys = {
    offsetModifies: {
        begin: number;
        offset: number;
    }[];
    removes: {
        begin: number;
        length: number;
    }[];
    adds: {
        begin: number;
    }[];
    modifies: {
        oldBegin: number;
        newBegin: number;
        levelChangeType: "parent2parent" | "parent2child" | "child2parent";
    }[];
};

export const store = reactive({
    headers: [] as Heading[],
    dark: true,
    cssChange: false,
    leafChange: false,
    currentEditingKey: "",
    modifyKeys: {} as ModifyKeys,
    dragModify: false,
    refreshTree: () => {},
    theme: {
        patchColor: false,
        primaryColorLight: "",
        primaryColorDark: "",
        rainbowLine: false,
        rainbowColor1: "",
        rainbowColor2: "",
        rainbowColor3: "",
        rainbowColor4: "",
        rainbowColor5: "",
        fontSize: "",
        fontFamily: "",
        fontWeight: "",
        lineHeight: "",
        lineGap: "",
    },
    init,
});

function init(plugin: QuietOutline) {
    const { app, settings } = plugin;
    store.dark = activeDocument.body.hasClass("theme-dark");
    store.dragModify = settings.drag_modify;
    store.refreshTree = () => {
        plugin.outlineView?.vueInstance.forceRemakeTree();
        app.workspace.trigger("layout-change");
    };
    store.theme.patchColor = settings.patch_color;
    store.theme.primaryColorLight = settings.primary_color_light;
    store.theme.primaryColorDark = settings.primary_color_dark;
    store.theme.rainbowLine = settings.rainbow_line;
    store.theme.rainbowColor1 = settings.rainbow_color_1;
    store.theme.rainbowColor2 = settings.rainbow_color_2;
    store.theme.rainbowColor3 = settings.rainbow_color_3;
    store.theme.rainbowColor4 = settings.rainbow_color_4;
    store.theme.rainbowColor5 = settings.rainbow_color_5;
    store.theme.fontSize = settings.font_size;
    store.theme.fontFamily = settings.font_family;
    store.theme.fontWeight = settings.font_weight;
    store.theme.lineHeight = settings.line_height;
    store.theme.lineGap = settings.line_gap;
}
