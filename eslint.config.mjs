import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
    {
        // 构建产物与 Node 侧工具脚本不参与插件运行时 lint
        ignores: ["main.js", "scripts/**", "vite.config.ts"],
    },
    ...obsidianmd.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ["eslint.config.*"],
                },
            },
        },
    },
]);
