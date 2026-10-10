# Flower Studio Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 抽取共用插花组件与工具，使用 Pinia 管理作品编辑，并提供完成后自动生成图片、预览、保存与分享的流程。

**Architecture:** 共用模型、素材目录和渲染组件独立于页面。setup store 管理作品和历史，hooks 管理布局、触摸和平台图片 IO，页面协调临时面板。JSON 预览保持独立，不能覆盖编辑作品。

**Tech Stack:** uni-app、Vue 3、TypeScript、Pinia、微信 CanvasContext、现有 Node test 与 TypeScript 编译器。

**Spec:** `docs/superpowers/specs/2026-10-09-flower-studio-refactor-design.md`

## Global Constraints

- 不增加依赖，不接入云端素材、账号同步或上传，不修改现有花朵 SVG，不改生成声明、第三方模块及无关用户改动。
- 保留 version=2、vase="花束" 和 flowerScale 等兼容字段。
- 历史继续保留最近 30 步。
- 保留当前 698×1000 的作品导出尺寸和两倍 PNG 输出，不在本次重构中改变导出渲染方式。
- 未经明确授权，不运行 pnpm/npm/corepack 等可能修改依赖的命令，不直接修改 node_modules。
- 按用户 AGENTS.md 保留已有修改和未跟踪文件，不擅自提交；各任务以差异审查代替自动 git commit。
- 新工作室页面初始化默认作品；完成预览返回编辑不能重新初始化。

## Review Focus

- 生成旧图片时关闭面板并再次完成：晚到的旧请求不能覆盖新图片或再次打开面板（任务 4）。
- 当前颜色重复选择、层次边界、未移动触摸：不增加无效历史，色板不误收起，点击与拖动区分正确（任务 2、3）。
- 页面重进、对象引用复用、JSON 预览生成：编辑会话初始化正确、历史不污染、预览不修改 store（任务 1、2）。
- 短屏、长屏及色板展开：作品不截断，浮层不跳位，拖动使用实际缩放值（任务 3）。
- 分享 API 不存在、保存权限拒绝及主动取消：不执行错误平台 API，取消不报错，失败提供可操作提示（任务 4）。

## File Map

- `src/models/artwork.ts`：共享领域类型与 StudioTouchEvent。
- `src/config/flower-materials.ts`：目录、选项、默认作品工厂。
- `src/components/flower/{flower-board,flower-stem,flower-bloom,flower-vase,flower-bouquet}.vue`：迁移现有共享绘制组件。
- `src/styles/flower-studio.scss`：迁移共享 SCSS 变量。
- `src/utils/flower/{artwork,svg-artwork,render-artwork,artwork-history}.ts`：解析、拼接、绘制、历史。
- `src/utils/flower/arrangement.cjs`、`arrangement.d.cts`：保留现有数学实现与声明。
- `src/utils/flower/svg/*.svg`：迁移原文件，保持字节内容不变。
- `src/stores/artworkStore.ts`：setup store 与全部作品编辑操作。
- `src/hooks/{useFlowerStudioLayout,useFlowerDrag,useArtworkImage}.ts`：各自隔离布局、拖动、图片 IO。
- `src/pages/flower-demo/flower-demo-page.vue`：保留路由，简化为页面交互与组件组合。
- `src/pages/flower-demo/components/studio-finish.vue`：图片结果面板。
- `src/pages/flower-demo/components/studio-*.vue`：更新共享导入，其他已确认样式不改。
- `src/pages/flower-json/{flower-json-page.vue,example.ts}`：仅迁移共享依赖。
- `tests/helpers/load-ts.cjs`：统一现有离线测试的真实 TS、SFC、SVG raw 加载，支持 `@/`、独立 Pinia 与 uni 边界替身。
- `tests/{flower-json,flower-history,flower-rendering,flower-svg}.test.cjs`：迁移原行为测试。
- `tests/flower-store.test.cjs`、`tests/flower-image.test.cjs`：新增 store 与图片完成流程测试。

### Task 1: Move shared flower code without changing behavior

**Interfaces:**
- Produces: `Artwork`、`Stem`、`FlowerKind`、`VaseName`、`StudioTouchEvent`。
- Produces: `createDefaultArtwork(): Artwork`，返回独立默认三枝作品。
- 保留 `parseArtwork(text: string): Artwork`、`anchorY(vase: VaseName): number`、`artworkBackground(background: Artwork['background']): string`、`plantSvgSource(kind, color, stemHeight)`、`renderArtwork(ctx, artwork): Promise<void>` 和 ArtworkHistory 原签名。
- 共享组件 props/events 保持原接口，两个页面显式导入新路径。

- [x] 迁移测试加载路径，增加 `createDefaultArtwork()` 独立对象断言：修改第一份作品的花枝颜色，不改变第二份；原 JSON、连接点与历史断言继续执行。
- [x] 运行 `node --test tests/*.test.cjs`，确认新路径/默认工厂未实现导致失败，记录迁移前回归基线。
- [x] 按 File Map 迁移类型、目录、工具、SVG 和五个共享组件；逐一更新所有页面、页面组件和测试导入。删除已迁移旧实现，避免两套源码漂移。
- [x] 将重复的 TS/SFC 加载放到 `tests/helpers/load-ts.cjs`；真实相对路径、`@/`、SVG `?raw` 与依赖加载保持工作，不模拟领域函数。
- [x] 运行 `node --test tests/*.test.cjs`，预期现有行为全部通过；比对移动前后的 SVG 内容哈希，必须相同。
- [x] 审查 diff，确认 JSON 页面不再导入 `@/pages/flower-demo/` 的共享实现，且未修改无关文件。

### Task 2: Add setup artwork store and editor transactions

**Consumes:** Task 1 模型、默认工厂、ArtworkHistory、坐标约束。

**Produces — `useArtworkStore()`：**
- State: `stems: Stem[]`、`vase: VaseName`、`background: Artwork['background']`、`selectedId: number | null`。
- Getters: `selected`、`canUndo`、`canRedo`、`canClear`、`canMoveBack`、`canMoveFront`。
- Actions: `initialize(): void`、`select(id: number | null): void`、`snapshot(): Artwork`、`replaceArtwork(artwork: Artwork): void`。
- Actions: `addFlower(kind: FlowerKind): number | null`、`duplicateSelected(): number | null`、`removeSelected(): void`、`clearArtwork(): void`。
- Actions: `setColor(color: string): void`、`setVase(vase: VaseName): void`、`setBackground(background: Artwork['background']): void`、`setLayer(direction: 'front' | 'back'): void`、`undo(): void`、`redo(): void`。
- Drag actions: `beginStemEdit(id: number): Stem | null`（返回独立起始姿态，不写历史）、`updateStem(id: number, position: StemPosition): void`（首次有效变动记历史）、`endStemEdit(): void`。
- store 不调用 toast、Canvas 或导航 API；最多 16 枝，添加/复制失败返回 null，由页面提示。

- [x] 编写 `tests/flower-store.test.cjs`，每例使用独立 Pinia：清空→撤销恢复→重做为空；新编辑清空 future；历史长度≤30；快照与当前花枝不共享对象。
- [x] 增加角色操作断言：相同颜色不增加 history，前后边界不增加 history，16 枝时添加/复制返回 null；拖动多次更新仅能一次撤销到原姿态。
- [x] 增加初始化/预览隔离断言：新会话回到默认作品；同一会话预览返回不调用 initialize；解析另一份 JSON 不修改 store。
- [x] 运行 `node --test tests/flower-store.test.cjs`，确认缺少 store/行为时失败。
- [x] 实现 `src/stores/artworkStore.ts`，用 `ref`、`computed` 与 setup `defineStore`；封装下一 ID 和历史，所有写操作统一创建独立快照。
- [x] 用 `storeToRefs` 接入工作室页面；页面新挂载初始化一次，背景变化由页面监听同步导航颜色。先保留现有文件 hook 与完成面板，验证编辑逻辑迁移。
- [x] 运行 `node --test tests/*.test.cjs` 并审查无效操作、重复 ID、选择清理与撤销重做顺序。

### Task 3: Extract layout and drag hooks

**Consumes:** store drag actions 与 Task 1 的 `moveStem`、`studioMetrics`。

**Produces:**
- `useFlowerStudioLayout(selected: Ref<Stem | undefined>, vase: Ref<VaseName>)` 返回 device、unit、safeBottom、pageActionsTop、toolbarBottom、stageTop、stageBottom、boardScale、boardPosition、artworkStyle、flowerToolsStyle。
- `useFlowerDrag(store: ReturnType<typeof useArtworkStore>, boardScale: Ref<number>, unit: number, onTap: (id: number) => void, onDragStart: () => void)` 返回 `startDrag(event, stem)`、`moveDrag(event)`、`endDrag(cancelled)`。
- 初始位移阈值继续为 2px，数学计算继续使用 unit×boardScale。布局沿用当前 16rpx 页边距、88rpx 顶栏、96rpx 底栏、最大 64rpx 上移与 220rpx 浮层预留高度。

- [x] 将 `tests/flower-rendering.test.cjs` 的布局、触摸与色板用例迁移为真实 hook/store 调用，断言 480/800px 窗口不越界，长屏略上移，色板开关后 top/left 不变。
- [x] 增加拖动事务断言：小于 2px 是点击，大于阈值移动不弹栏，取消触摸不打开编辑栏；事件坐标用现有真实数学计算。
- [ ] 运行 `node --test tests/flower-rendering.test.cjs`，确认新 hooks 缺失导致失败。（未先执行缺失实现的红灯步骤；实现后执行行为验证，详见 progress ledger。）
- [x] 实现两个 hooks；浮层定位继续使用实际 boardPosition，不能重新引入导航高度或居中误差。
- [x] 页面仅管理面板、色板开关和触摸回调；保留选色后色板展开、其他操作收起，添加花材不弹编辑栏等语义。
- [x] 运行全套离线测试，并使用已安装的 Vue compiler-sfc 检查修改页面的 script/template/style，不调用包管理器。

### Task 4: Replace finish with automatic image preview, save and share

**Consumes:** store `snapshot()`、Task 1 `renderArtwork()`、作品 Canvas 尺寸。

**Produces — `useArtworkImage(createSnapshot: () => Artwork)`：**
- State: `exportingImage`、`imagePath`、`imageError`；constant: `exportCanvasId`。
- Methods: `exportImage(): Promise<boolean>`、`invalidate(): void`、`saveImage(): void`、`shareImage(): void`、`previewImage(): void`。
- `invalidate()` 使旧异步任务结果失效；不能在旧任务 finally 中重置新任务的 loading 状态。
- `exportImage()` 一次捕获独立快照，清理旧结果，画完后调用 canvasToTempFilePath；同一活动请求期间忽略重复生成。
- `shareImage()` 检测 `wx.showShareImageMenu` 和 `wx.canIUse('showShareImageMenu')`，使用 `{ path: imagePath }`，仅响应用户按钮点击；非微信及不支持能力提示先保存图片后分享。
- finish component props: `{ exporting: boolean, imagePath: string, error: string }`；events: close、retry、saveImage、shareImage、previewImage。
- 页面 `finish(): Promise<void>` 打开面板并 await exportImage；关闭完成面板调用 invalidate；重试在原面板触发生成。

- [x] 编写 `tests/flower-image.test.cjs`，使用真实 hook 和绘制入口，仅替代平台 IO：点击完成自动启动一次生成；生成中禁止重复；成功展示新 path；每次新生成清除旧 path。
- [x] 增加可控异步回调：关闭后旧任务结束不重新打开预览；再次生成时旧成功/失败/结束不能覆盖新请求状态。
- [x] 增加失败分支：素材加载失败、Canvas 导出失败返回 false 和错误；随后重试可成功。结果缺失时保存和分享不调用平台 API。
- [x] 增加用户操作分支：保存/分享使用当前图片路径；取消不报错；权限失败提示；分享能力缺失不调用 showShareImageMenu；测试不真实发送任何图片。
- [ ] 运行 `node --test tests/flower-image.test.cjs`，预期新 hook 或流程尚未实现导致失败。（未先执行缺失实现的红灯步骤；实现后执行行为验证，详见 progress ledger。）
- [x] 实现 `src/hooks/useArtworkImage.ts`，保留生成 1396×2000 PNG 及 Canvas 页面实例绑定；平台分支使用 uni 条件编译，错误不改变编辑作品。
- [x] 改写 `studio-finish.vue`：生成状态、图片预览、错误重试、保存与分享；移除 JSON、缓存作品和手动生成首张图片的 UI。
- [x] 接入页面完成/关闭/重试方法，移除 `use-artwork-files.ts` 及工作室中的 JSON/缓存动作。保留独立 JSON 页面与 parser。
- [x] 运行全套测试、Vue 编译与 `git diff --check`；复核新生成流程未修改导出画法或原 SVG。

### Task 5: Final integration and documentation

**Files:** 工作室页面、独立 JSON 页、全部变更测试、README 中现有花草工作室说明。

- [x] 确认页面仅依赖共享组件、store 与 hooks；旧共享模块没有残留引用，页面专用组件没有被不必要地全局注册。
- [x] 执行 `node --test tests/*.test.cjs`，记录测试数量、失败数量和退出码。
- [x] 执行修改 Vue 文件的 compiler-sfc script/template/style 编译；执行 TypeScript 转译语法检查与 `git diff --check`，明确这不等于完整类型检查或小程序构建。
- [x] 更新 README 中本次涉及的结构和完成流程说明，不覆盖用户已有内容，不写入密钥、dist 或云空间关联文件。
- [x] 逐项对照 spec 验收：上下布局、花材连接、点击与拖动、选色保留、历史、独立 JSON、完成自动生成、保存和分享。
- [x] 交付时说明实际检查、未运行的 type-check/lint/小程序构建，以及尚需微信真机验证的生成图片、相册权限、分享菜单。

## Execution Recommendation

建议由当前代理在当前会话内顺序执行。五个任务依赖同一组模型、store 和 hook 接口，顺序实施更便于保持目前交互和测试一致；不主动启动子代理，不运行未经授权的依赖维护或提交操作。

执行记录见 `flower-refactor-progress.md`。任务 2 接入 store、任务 3 hooks 与任务 4 面板接入在同一次页面替换中完成，避免保留临时的两套作品状态；不提交代码。完成调用采用 `void exportImage()`，返回 Promise 由 hook 处理；关闭面板通过 request generation 失效处理。
