// 全局数据存储（vanilla 版：纯对象，无响应式）
// UI 更新由 view 层显式方法调用驱动，不再依赖响应式
import type QuietOutline from "./plugin";

export type Heading = {
    title: string;
    level: number;
};

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

class Store {
    headers: Heading[] = [];
    dark = true;
    dragModify = true;
    modifyKeys: ModifyKeys = { offsetModifies: [], removes: [], adds: [], modifies: [] };

    theme = {
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
    };

    init(plugin: QuietOutline) {
        const { settings } = plugin;
        this.dark = activeDocument.body.hasClass("theme-dark");
        this.dragModify = settings.drag_modify;
        this.theme.patchColor = settings.patch_color;
        this.theme.primaryColorLight = settings.primary_color_light;
        this.theme.primaryColorDark = settings.primary_color_dark;
        this.theme.rainbowLine = settings.rainbow_line;
        this.theme.rainbowColor1 = settings.rainbow_color_1;
        this.theme.rainbowColor2 = settings.rainbow_color_2;
        this.theme.rainbowColor3 = settings.rainbow_color_3;
        this.theme.rainbowColor4 = settings.rainbow_color_4;
        this.theme.rainbowColor5 = settings.rainbow_color_5;
        this.theme.fontSize = settings.font_size;
        this.theme.fontFamily = settings.font_family;
        this.theme.fontWeight = settings.font_weight;
        this.theme.lineHeight = settings.line_height;
        this.theme.lineGap = settings.line_gap;
    }
}

export const store = new Store();
