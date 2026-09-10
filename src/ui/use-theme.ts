import { store } from "@/store";
import { computed } from "vue";
import { darkTheme, type GlobalThemeOverrides } from "naive-ui";

type MakeRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
type ThemeOverrides = MakeRequired<GlobalThemeOverrides, "common" | "Slider" | "Tree">;

export function useOutlineTheme() {
    // toggle light/dark theme
    const theme = computed(() => {
        if (store.dark) {
            return darkTheme;
        }
        return null;
    });

    const primaryColor = computed(() => {
        if (store.theme.patchColor) {
            return store.dark ? store.theme.primaryColorDark : store.theme.primaryColorLight;
        }
        void store.cssChange; // track css change
        return getDefaultColor();
    });

    const iconColor = computed(() => {
        if (store.dark) {
            return { color: "var(--icon-color)" };
        }
        return { color: "var(--icon-color)" };
    });

    const lightThemeConfig = computed<ThemeOverrides>(() => {
        const color = store.theme.patchColor ? store.theme.primaryColorLight : primaryColor.value;
        return {
            common: {
                primaryColor: color,
                primaryColorHover: color,
            },
            Slider: {
                handleSize: "10px",
                fillColor: color,
                fillColorHover: color,
                dotBorderActive: `2px solid ${color}`,
            },
            Tree: {
                nodeTextColor: "var(--nav-item-color)",
                arrowColor: "var(--nav-collapse-icon-color)",
            },
        };
    });

    const darkThemeConfig = computed<ThemeOverrides>(() => {
        const color = store.theme.patchColor ? store.theme.primaryColorDark : primaryColor.value;
        return {
            common: {
                primaryColor: color,
                primaryColorHover: color,
            },
            Slider: {
                handleSize: "10px",
                fillColor: color,
                fillColorHover: color,
                dotBorderActive: `2px solid ${color}`,
            },
            Tree: {
                nodeTextColor: "var(--nav-item-color)",
                arrowColor: "var(--nav-collapse-icon-color)",
            },
        };
    });

    const themeOverrides = computed(() => {
        return theme.value === null ? lightThemeConfig.value : darkThemeConfig.value;
    });

    const rainbowColors = computed(() => {
        if (store.theme.rainbowLine) {
            return {
                h1: `rgba(${hexToRGB(store.theme.rainbowColor1)}, 0.6)`,
                h2: `rgba(${hexToRGB(store.theme.rainbowColor2)}, 0.6)`,
                h3: `rgba(${hexToRGB(store.theme.rainbowColor3)}, 0.6)`,
                h4: `rgba(${hexToRGB(store.theme.rainbowColor4)}, 0.6)`,
                h5: `rgba(${hexToRGB(store.theme.rainbowColor5)}, 0.6)`,
            };
        }
        return {
            h1: "var(--nav-indentation-guide-color)",
            h2: "var(--nav-indentation-guide-color)",
            h3: "var(--nav-indentation-guide-color)",
            h4: "var(--nav-indentation-guide-color)",
            h5: "var(--nav-indentation-guide-color)",
        };
    });

    const containerStyle = computed(() => {
        const style: Record<string, string> = {};

        style["--custom-font-size"] = store.theme.fontSize;
        style["--custom-font-family"] = store.theme.fontFamily;
        style["--custom-font-weight"] = store.theme.fontWeight;
        style["--custom-line-height"] = store.theme.lineHeight;
        style["--custom-line-gap"] = store.theme.lineGap;

        return style;
    });

    // RTL
    const biDi = computed(() => "isolate" as string);

    return {
        theme,
        themeOverrides,
        iconColor,
        primaryColor,
        rainbowColors,
        containerStyle,
        biDi,
    };
}

function getDefaultColor() {
    const el = activeDocument.body.createDiv({
        attr: { style: "width: 0px; height: 0px; background-color: var(--interactive-accent);" },
    });
    const color = activeWindow.getComputedStyle(el, null).getPropertyValue("background-color");
    el.remove();

    // for compatibility
    return cssColorToRgba(color);
}

function cssColorToRgba(color: string) {
    if (!CSS.supports("color", color)) return "rgba(0, 0, 0, 0)";

    const canvas = activeDocument.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);

    const [r, g, b, a255] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${a255 / 255})`;
}

function hexToRGB(hex: string) {
    return (
        `${parseInt(hex.slice(1, 3), 16)},` +
        `${parseInt(hex.slice(3, 5), 16)},` +
        `${parseInt(hex.slice(5, 7), 16)}`
    );
}
