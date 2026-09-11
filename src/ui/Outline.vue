<template>
    <NConfigProvider :theme="theme" :theme-overrides="themeOverrides" :style="containerStyle">
        <div class="function-bar">
            <QButton
                @click="toBottom"
                :icon-style="iconColor"
                :svg-icon="ArrowCircleDownRound"
                :label="t('To Bottom')"
            />
            <QButton
                @click="reset"
                :icon-style="iconColor"
                :svg-icon="SettingsBackupRestoreRound"
                :label="t('Reset')"
            />
        </div>
        <NSlider
            :value="level"
            :on-update:value="switchLevel"
            :marks="marks"
            step="mark"
            :min="0"
            :max="5"
            style="margin: 4px 0"
            :format-tooltip="formatTooltip"
        />
        <NTree
            ref="tree"
            block-line
            :indent="17"
            :data="data"
            :render-label="renderLabel"
            :selected-keys="selectedKeys"
            :node-props="nodeProps"
            :keyboard="false"
            :expanded-keys="expanded"
            :on-update:expanded-keys="expand"
            :key="keyOfTree"
            :draggable="store.dragModify"
            @drop="onDrop"
            :allow-drop="() => plugin.navigator.canDrop"
        />
    </NConfigProvider>
</template>

<script setup lang="ts">
import { ref, inject } from "vue";
import { NTree, NSlider, NConfigProvider } from "naive-ui";

import { store } from "@/store";
import { t } from "@/lang/helper";
import type QuietOutline from "@/plugin";
import { useEventBus } from "@/utils/use";
import { SettingsBackupRestoreRound, ArrowCircleDownRound } from "./icons";
import QButton from "./Button.vue";
import { useOutlineTree } from "./use-tree";
import { useOutlineTheme } from "./use-theme";
import { useOutlineDnd } from "./use-dnd";
import { useOutlineExpand } from "./use-expand";
import { useOutlineController } from "./use-controller";
import { renderLabel } from "./use-tree";

const plugin = inject<QuietOutline>("plugin")!;
const container = inject<HTMLElement>("container")!;
const tree = ref<InstanceType<typeof NTree>>();

// level switch
const marks = { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" };
function formatTooltip(value: number): string {
    const num = store.headers.filter((h) => h.level === value).length;

    if (value > 0) {
        return `H${value}: ${num}`;
    }
    return "No expand";
}

const { theme, themeOverrides, iconColor, rainbowColors, containerStyle } = useOutlineTheme();
const { level, switchLevel, expanded, modifyExpandKeys, getDefaultLevel, autoExpand } =
    useOutlineExpand(plugin);
const { data, nodeProps, locateIdx, resetLocated, selectedKeys } = useOutlineTree({
    plugin,
    container,
    level,
    expanded,
    modifyExpandKeys,
});

const { onDrop } = useOutlineDnd(container, plugin);

// to-bottom button
async function toBottom() {
    plugin.navigator.toBottom();
}

// reset button
function reset() {
    selectedKeys.value = [];
    switchLevel(getDefaultLevel());
}
useEventBus("reset-panel", reset);

function expand(keys: string[]) {
    modifyExpandKeys(keys);
}

// force remake tree
const keyOfTree = ref(0);
function forceRemakeTree() {
    keyOfTree.value++;
}

function onPosChange(index: number) {
    autoExpand(index);
    resetLocated(index);
}

function onLeafChange() {
    // force reset animation-in-progress state of naive-ui tree component
    tree.value?.handleAfterEnter();

    // clear selection and located state on view switch
    locateIdx.value = -1;
    selectedKeys.value = [];

    // reset level
    level.value = getDefaultLevel();
    switchLevel(level.value);
}
onLeafChange();

const { selectVisible, setExpand, center, move, currentSelected } = useOutlineController({
    container,
    locateIdx,
    selectedKeys,
    expanded,
    modifyExpandKeys,
});

defineExpose({
    setExpand,
    center,
    move,
    selectVisible,
    currentSelected,
    onPosChange,
    onLeafChange,
    forceRemakeTree,
});
</script>

<style>
.quiet-outline .n-tree {
    padding-top: 5px;
}

/* ============ */
/*  彩虹大纲线   */
/* rainbow line */
/* ============ */
.quiet-outline .n-tree .n-tree-node-indent {
    content: "";
    height: unset;
    align-self: stretch;
}
.quiet-outline .n-tree-node-indent {
    position: relative;
}
.quiet-outline .n-tree-node-indent::after {
    content: "";
    position: absolute;
    height: 100%;
    right: 8px;
}

:is(
    .quiet-outline .level-2 .n-tree-node-indent:first-child,
    .quiet-outline .level-3 .n-tree-node-indent:first-child,
    .quiet-outline .level-4 .n-tree-node-indent:first-child,
    .quiet-outline .level-5 .n-tree-node-indent:first-child,
    .quiet-outline .level-6 .n-tree-node-indent:first-child
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h1");
}

:is(
    .quiet-outline .level-3 .n-tree-node-indent:nth-child(2),
    .quiet-outline .level-4 .n-tree-node-indent:nth-child(2),
    .quiet-outline .level-5 .n-tree-node-indent:nth-child(2),
    .quiet-outline .level-6 .n-tree-node-indent:nth-child(2)
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h2");
}

:is(
    .quiet-outline .level-4 .n-tree-node-indent:nth-child(3),
    .quiet-outline .level-5 .n-tree-node-indent:nth-child(3),
    .quiet-outline .level-6 .n-tree-node-indent:nth-child(3)
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h3");
}

:is(
    .quiet-outline .level-5 .n-tree-node-indent:nth-child(4),
    .quiet-outline .level-6 .n-tree-node-indent:nth-child(4)
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h4");
}

.quiet-outline .level-6 .n-tree-node-indent:nth-child(5)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h5");
}

/* located heading*/

.quiet-outline .n-tree {
    color: var(--nav-item-color);
}

.quiet-outline .n-tree-node-wrapper .n-tree-node.located {
    background-color: var(--nav-item-background-active);
    border-radius: var(--nav-item-radius);
}

/* adjust indent */
.quiet-outline .n-tree .n-tree-node .n-tree-node-content .n-tree-node-content__prefix {
    margin-right: 0;
}
.quiet-outline
    .n-tree
    .n-tree-node
    .n-tree-node-content
    .n-tree-node-content__prefix
    > *:last-child {
    margin-right: 8px;
}
.n-tree-node-switcher__icon {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
