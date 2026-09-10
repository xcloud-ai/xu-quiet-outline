// eslint 可解析 .vue 模块的类型垫片；vue-tsc 对 .vue 仍走真实 SFC 类型
declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent<
        Record<string, never>,
        Record<string, never>,
        Record<string, never>
    >;
    export default component;
}
