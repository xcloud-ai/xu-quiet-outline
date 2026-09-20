// esbuild 构建脚本（vanilla 版，替代 vite + vue）
// 用法：
//   node esbuild.config.mjs            → 开发构建（带 inline sourcemap，不压缩）
//   node esbuild.config.mjs production  → 发布构建（压缩，无 sourcemap）
//   node esbuild.config.mjs --watch    → 开发 watch 模式
import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";

const prod = (process.argv[2] || "").toLowerCase() === "production";

// Obsidian 运行时内置了 @codemirror，构建时不打包
const codemirrorExternals = [
    "@codemirror/autocomplete",
    "@codemirror/commands",
    "@codemirror/comment",
    "@codemirror/fold",
    "@codemirror/gutter",
    "@codemirror/highlight",
    "@codemirror/history",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/matchbrackets",
    "@codemirror/panel",
    "@codemirror/rangeset",
    "@codemirror/rectangular-selection",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/stream-parser",
    "@codemirror/text",
    "@codemirror/tooltip",
    "@codemirror/view",
];

const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

const context = await esbuild.context({
    entryPoints: ["src/plugin.ts"],
    bundle: true,
    external: ["obsidian", "electron", ...codemirrorExternals, ...nodeBuiltins],
    ignoreAnnotations: !prod, // 开发构建忽略 esbuild 的副作用告警
    alias: { "@": "./src" },
    format: "cjs",
    target: "es2022",
    charset: "utf8", // CJK 直接输出 UTF-8；默认 ascii 会转义成 unicode 转义序列，徒增体积且干扰工具扫描
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
});

if (process.argv.includes("--watch")) {
    // 开发 watch 模式：文件变更自动重建 main.js（任何模式都可用）
    await context.watch();
} else {
    await context.rebuild();
    await context.dispose();
}

// CSS 单独打包为 styles.css（不压缩，便于审查）
await esbuild.build({
    entryPoints: ["src/stalin.css"],
    outfile: "styles.css",
    bundle: true,
    minify: false,
    logLevel: "info",
});
