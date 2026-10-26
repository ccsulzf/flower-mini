# Agent Instructions

## Project

uni-app / Vue 3 / TypeScript 开发模板，默认微信小程序客户端，后端为支付宝 uniCloud。
使用 Vite、Pinia、UnoCSS、uni-helper、uni-id。项目业务聚焦鲜花创作；首页提供插花入口、登录状态和反馈演示。

## Dependencies And Verification

- 未经用户明确要求，不运行可能安装、更新、修复、清理依赖的包管理器命令。
- 不直接修改 node_modules，不复制其他项目的 node_modules。
- 后续任务不创建或修改任何文档，包括 README、设计文档、实施计划、规格说明、变更记录和交付说明；仅在用户明确要求时处理文档。
- 后续任务不创建或修改任何测试用例或测试文件；仅在用户明确要求时处理测试。
- `pnpm type-check`、`pnpm lint` 或 corepack 命令可能触发依赖修复；执行前确认当前会话已有明确授权，否则先询问。
- 优先只读验证。
- 获得授权后，使用 `pnpm type-check` 和 `pnpm lint`；路由和构建配置改动还需 `pnpm build:mp-weixin`。
- 不使用 `lint:fix` 对无关文件做广泛格式化。
- 完成时说明实际运行的检查和未验证项，不把离线测试视为真实云端联调。

## Structure And Style

- Vue 文件使用 `<script setup lang="ts">`，共享代码使用 `@/` 别名。
- 页面放 `src/pages/<module>/`，用 `definePage` 声明页面和布局。
- 页面内组件放 `ui/`、`components/` 或 `partials/`，这些目录不参与路由扫描。
- 共享组件、状态、类型和工具分别放 `src/components/`、`src/stores/`、`src/models/`、`src/utils/`。
- Pinia 使用 setup store。保持明确的领域类型，不滥用 any。
- 优先 UnoCSS 语义规则和主题 token；小程序尺寸使用 rpx；默认 Carbon 图标。
- 保留 default layout 中的 Feedback 全局挂载。反馈 store 仅管理通用提示的展示状态。
- 将加载、分页和数据归一化放页面入口或 store，不放叶子组件。

## Authentication And Cloud

- 加载用户数据前等待 `waitForAppAuthReady()`。
- 云对象调用默认 `uniCloud.importObject(name, { customUI: true })`，由调用方展示错误。
- 云对象 `_before` 使用公共 auth 校验身份；不得信任客户端传来的 uid。
- 所有查询、更新和删除条件都应包含服务端身份；写入前校验类型、长度和必填字段。
- 更新数据结构时同步修改 TypeScript 模型和数据库 schema/index。
- 业务集合禁止客户端直接读写，通过鉴权云对象访问。
- 保持微信小程序客户端与支付宝云服务商这两个概念独立。

## Protected Files

- 不随意修改 `src/uni_modules/` 的第三方模块。仅在用户授权时修改；登录配置按 README 操作。
- 不手改生成声明 `src/auto-imports.d.ts`、`src/components.d.ts`、`src/uni-pages.d.ts`。
- 不提交 dist、unpackage、真实密钥、登录 config.json、云空间关联文件或 .env 私有值。
- 保留用户已有修改和未跟踪文件，不擅自清理、覆盖或提交。
- 修改前先阅读相关代码；功能实现只覆盖用户明确请求的范围。
