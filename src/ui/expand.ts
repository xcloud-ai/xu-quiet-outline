// 展开状态管理（从原 use-expand.ts 移植为纯 TypeScript 类）
// key 由原 "item-{level}-{index}" 字符串简化为纯 header index（number），
// 层级信息展开时实时从 headers 推导，避免 diff 变换时的 key 重组
import { store, type ModifyKeys } from "@/store";
import type QuietOutline from "@/plugin";

/** 按文件路径持久化展开记忆（localStorage 单 key 存储，带容量上限） */
const MEMORY_KEY = "xu-quiet-outline-expand-memory";
const MEMORY_MAX_FILES = 800;

/**
 * 记忆格式（v2）：同时存展开集合与滑杆级别。
 * v1 只存 number[]，空数组无法区分"用户全折叠"与"启动竞态写入的脏数据"，
 * 曾导致每次启动滑杆被恢复为 0。读取时兼容 v1：空数组一律视为无记忆。
 */
interface MemoryEntry {
    level: number;
    keys: number[];
}

function loadAllMemory(): Record<string, number[] | MemoryEntry> {
    try {
        const raw = localStorage.getItem(MEMORY_KEY);
        return raw
            ? (JSON.parse(raw) as Record<string, number[] | MemoryEntry>)
            : {};
    } catch {
        return {};
    }
}

function saveAllMemory(map: Record<string, number[] | MemoryEntry>) {
    try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(map));
    } catch {
        // 存储满等异常：静默放弃（记忆是增强功能，不阻塞主流程）
    }
}

export function readMemory(path: string): number[] | MemoryEntry | undefined {
    return loadAllMemory()[path];
}

export function writeMemory(path: string, keys: number[], level: number) {
    if (!path) return;
    const map = loadAllMemory();
    map[path] = { level, keys };
    // 容量保护：超限时删除最早写入的条目（JSON 对象保留插入序）
    const paths = Object.keys(map);
    if (paths.length > MEMORY_MAX_FILES) {
        for (const p of paths.slice(0, paths.length - MEMORY_MAX_FILES)) {
            delete map[p];
        }
    }
    saveAllMemory(map);
}

export class ExpandState {
    /** 展开的 header index 集合 */
    keys = new Set<number>();
    level = 2;
    private plugin: QuietOutline;

    constructor(plugin: QuietOutline) {
        this.plugin = plugin;
    }

    /** index 处标题是否为父节点（有下级标题） */
    isParent(index: number): boolean {
        const { headers } = store;
        return index >= 0 && index < headers.length - 1 && headers[index + 1].level > headers[index].level;
    }

    /** 过滤掉无效 key（越界或不再是父节点） */
    private safeFilter(keys: number[]): Set<number> {
        const res = new Set<number>();
        for (const k of keys) {
            if (this.isParent(k)) res.add(k);
        }
        return res;
    }

    modify(keys: number[], mode: "add" | "remove" | "replace" = "replace") {
        if (mode === "replace") {
            this.keys = this.safeFilter(keys);
        } else if (mode === "remove") {
            for (const k of keys) this.keys.delete(k);
        } else {
            this.keys = this.safeFilter([...this.keys, ...keys]);
        }
    }

    getDefaultLevel(): number {
        return this.plugin.navigator.getDefaultLevel();
    }

    /** 级别滑杆切换：展开所有 level <= lev 的父节点 */
    switchLevel(lev: number) {
        this.level = lev;
        this.modify(filterKeysLessThanEqual(lev));
    }

    /** 根据当前文件路径恢复展开记忆；无记忆则按默认级别展开 */
    restore(path: string) {
        const remembered = readMemory(path);
        if (Array.isArray(remembered)) {
            // v1 旧格式：只存了 keys，级别由集合反推。
            // 空数组是旧版启动竞态产生的脏数据（无法证明是用户主动全折叠），
            // 视为无记忆，回退默认级别
            if (remembered.length === 0) {
                this.switchLevel(this.getDefaultLevel());
            } else {
                this.keys = this.safeFilter(remembered);
                this.level = currentLevelOf(this.keys);
            }
        } else if (remembered) {
            // v2：keys + level 分别恢复（空 keys + level=2 表示用户停在 2 级但无展开父节点）
            this.keys = this.safeFilter(remembered.keys);
            const lv = Number(remembered.level);
            this.level = Number.isFinite(lv) ? Math.max(0, Math.min(5, lv)) : this.getDefaultLevel();
        } else {
            this.switchLevel(this.getDefaultLevel());
        }
    }

    /** 光标/滚动定位到 index 时的自动展开（4 种模式） */
    autoExpand(index: number) {
        if (this.plugin.settings.auto_expand_ext === "disable") return;
        const { headers } = store;
        const current = headers[index];
        if (!current) return;

        // 目标标题自身是父节点时也要展开
        const should_expand = this.isParent(index) ? [index] : [];

        // 展开祖先链
        let curLevel = current.level;
        let i = index;
        while (i-- > 0) {
            if (headers[i].level < curLevel) {
                should_expand.push(i);
                curLevel = headers[i].level;
            }
            if (curLevel === 1) break;
        }

        if (this.plugin.settings.auto_expand_ext === "expand-and-collapse-rest-to-setting") {
            this.keys = this.safeFilter(filterKeysLessThanEqual(this.level));
        } else if (this.plugin.settings.auto_expand_ext === "expand-and-collapse-rest-to-default") {
            this.keys = this.safeFilter(filterKeysLessThanEqual(this.getDefaultLevel()));
        }

        this.modify(should_expand, "add");
    }

    /** 编辑导致 headers 变化后，按 diff 增量迁移展开状态（保持用户展开意图） */
    applyModifyKeys(modifyKeys: ModifyKeys) {
        const { offsetModifies, removes, adds, modifies } = modifyKeys;
        // 1. 删除已移除的标题、已变为叶子的标题
        // 2. 按增删位移变换 index
        const newKeys: number[] = [...this.keys]
            .filter((index) => {
                const notRemove = !removes.some(
                    (r) => r.begin <= index && index < r.begin + r.length,
                );
                const notParent2Child = !modifies.some(
                    (m) => m.oldBegin === index && m.levelChangeType === "parent2child",
                );
                return notRemove && notParent2Child;
            })
            .map((index) => {
                const offsetBase = offsetModifies.findLastIndex((m) => m.begin <= index);
                if (offsetBase === -1) return index;
                return index + offsetModifies[offsetBase].offset;
            });

        // 变为父节点的标题自动展开
        modifies
            .filter((m) => m.levelChangeType === "child2parent")
            .forEach((m) => newKeys.push(m.newBegin));

        // 新增标题的祖先链展开（能直接看到新标题）
        adds.forEach((add) => {
            const path = ancestorsOf(add.begin);
            if (!this.isParent(add.begin)) path.pop(); // 自身是叶子则只展开祖先
            path.forEach((index) => newKeys.push(index));
        });

        this.modify([...new Set(newKeys)]);
    }
}

/** 展开所有 level <= lev 的父节点 */
export function filterKeysLessThanEqual(lev: number): number[] {
    const res: number[] = [];
    const { headers } = store;
    for (let i = 0; i < headers.length; i++) {
        if (i === headers.length - 1 || headers[i + 1].level <= headers[i].level) continue; // 叶子不可展开
        if (headers[i].level <= lev) res.push(i);
    }
    return res;
}

/** index 的祖先链（含自身，从根到自身） */
export function ancestorsOf(index: number): number[] {
    const { headers } = store;
    const res: number[] = [];
    if (index < 0 || !headers[index]) return res;
    let curLevel = headers[index].level + 1;
    for (let i = index; i >= 0; i--) {
        if (headers[i].level < curLevel) {
            res.push(i);
            curLevel = headers[i].level;
        }
    }
    return res.reverse();
}

/** 由展开集合推导滑杆当前级别（取最深展开层级，无展开时 0） */
function currentLevelOf(keys: Set<number>): number {
    let max = 0;
    const { headers } = store;
    for (const k of keys) {
        if (headers[k]) max = Math.max(max, headers[k].level);
    }
    return Math.min(max, 5);
}
