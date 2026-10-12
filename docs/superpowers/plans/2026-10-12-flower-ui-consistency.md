# 鲜花创作界面一致性实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以插花工作台为首页和视觉基准，统一创作、完成、详情、贺卡与作品列表的配色和交互层级。

**Architecture:** 使用 UnoCSS `theme`、语义 shortcuts 和动态 rules 维护跨页面视觉 token；保留 scoped SCSS 处理画布定位、弹层动画和页面特有布局。业务状态和云端接口保持不变，仅为默认花器撤销历史与素材添加反馈增加必要的状态控制。

**Tech Stack:** uni-app、Vue 3、TypeScript、UnoCSS、SCSS、Pinia、微信小程序

**Spec:** `docs/superpowers/specs/2026-10-12-flower-ui-consistency-design.md`

## Global Constraints

- `pages/flower-studio/flower-studio-page` 是实际首页。
- 页面背景为 `#f6f3eb`，主要表面为 `#fffdf7`，品牌色为 `#74806b`。
- 保留现有数据模型、云对象调用、鉴权和页面导航逻辑。
- 不引入新依赖，不修改 `node_modules`、锁文件和生成声明。
- 优先使用 UnoCSS 主题 token 与语义 shortcuts；仅布局算法、动画和复杂伪元素保留 scoped SCSS。
- 保留 default layout 中的 Feedback 全局挂载。
- 不运行可能修复依赖的包管理器命令，除非用户明确授权。

## Review Focus

- 默认花器异步加载后，空白作品的撤销按钮仍应保持禁用；在 Task 2 的离线状态测试中验证。
- 素材面板打开时，小屏设备仍能看到花器和主要构图区；在 Task 2 的微信开发者工具截图检查中验证。
- 异步保存或图片生成时，按钮位置不变化且只禁用关联操作；在 Task 3 和 Task 4 的交互检查中验证。
- 标题过长、描述为空和作品列表只有一个条目时，信息不得被无意义截断或产生大面积空白；在 Task 5 的页面检查中验证。
- 安全区较大的设备上，底部操作区不得遮挡作品或表单；在 Task 3、Task 4 的模拟器检查中验证。

---

### Task 1: 全局鲜花主题与语义样式

**Files:**
- Modify: `uno.config.ts`
- Modify: `src/styles/variables.scss`
- Modify: `src/styles/flower-studio.scss`
- Modify: `src/layouts/default.vue`
- Modify: `src/components/feedback/feedback.vue`
- Modify: `src/pages/index/index-page.vue`

**Interfaces:**
- Produces: UnoCSS 颜色 token `page`, `surface`, `surfaceMuted`, `ink`, `inkMuted`, `brand`, `brandSoft`, `line`, `danger`。
- Produces: 语义类 `app-page`, `app-surface`, `app-primary-btn`, `app-secondary-btn`, `app-ghost-btn`, `app-danger-btn`, `app-section-title`, `app-section-desc`。

- [ ] **Step 1: 记录现有语义类的消费者和硬编码主题色基线**

运行：`rg -n "app-(gradient-page|card|primary-btn|secondary-btn)|#f6f3eb|#fffdf7|#74806b" src uno.config.ts`

预期：输出当前消费者和重复颜色位置，作为迁移清单。

- [ ] **Step 2: 在 `uno.config.ts` 建立鲜花主题 token 与语义 shortcuts**

将现有蓝色主题替换为设计规格中的暖米白和鼠尾草绿；按钮规则包含最小高度、按压态所需基础样式和统一禁用态。保留现有类名兼容内部管理页面。

- [ ] **Step 3: 让 SCSS 变量从相同数值派生并统一公共背景与 Feedback**

`variables.scss` 与 `flower-studio.scss` 使用同一组固定 token；`default.vue` 改为暖米白背景；Feedback 使用品牌、警告和危险色系，但不改变 store 接口和挂载层级。

- [ ] **Step 4: 检查语义类覆盖与裸色值数量**

运行：`rg -n "#0b5cab|#0a477f|#e3eaf3|#edf4fb|#f2f7fd" src uno.config.ts`

预期：消费端页面不再使用旧蓝色主题；若内部管理页面仍使用兼容类，样式已由新主题统一。

### Task 2: 工作台状态和素材面板反馈

**Files:**
- Modify: `src/pages/flower-studio/flower-studio-page.vue`
- Modify: `src/pages/flower-studio/components/studio-header.vue`
- Modify: `src/pages/flower-studio/components/studio-options.vue`
- Modify: `src/pages/flower-studio/components/studio-toolbar.vue`
- Modify: `src/styles/flower-creation.scss`
- Modify: `src/hooks/useFlowerPageArtwork.ts` or the existing session/store boundary that records history
- Test: `tests/flower-creation-flow.test.cjs`

**Interfaces:**
- Consumes: Task 1 semantic colors and button classes.
- Produces: 默认花器初始化不产生可撤销历史；素材添加具有 `addedMaterialId` 或等价的短时 UI 状态，不进入持久化模型。

- [ ] **Step 1: 添加默认花器不进入撤销历史的失败测试**

在 `tests/flower-creation-flow.test.cjs` 增加断言：初始化空白作品并应用默认花器后 `canUndo` 为 `false`；用户主动更换花器后 `canUndo` 为 `true`。

- [ ] **Step 2: 运行离线测试确认新增断言先失败**

运行：`node --test tests/flower-creation-flow.test.cjs`

预期：仅新增的默认花器历史断言失败。

- [ ] **Step 3: 在现有 session/store 边界实现无历史默认花器初始化**

复用初始化或 replace 语义设置默认花器；用户通过面板选择花器仍走正常历史记录路径。

- [ ] **Step 4: 实现面板与素材添加反馈**

面板统一标题、关闭按钮、分类标签和卡片选中态；添加成功后卡片短暂显示完成反馈，并保持新增花材选中。调整面板高度和画布区域关系，使 iPhone 12/13 尺寸仍可看到花器与主要构图。

- [ ] **Step 5: 运行工作台离线测试**

运行：`node --test tests/flower-creation-flow.test.cjs tests/cloud-material-flow.test.cjs`

预期：全部通过。

- [ ] **Step 6: 使用微信开发者工具检查空白态、面板、添加与撤销**

预期：空白态撤销禁用；面板打开时画布主体可见；添加后出现明确反馈；撤销恢复正确。

### Task 3: 完成页与作品详情操作层级

**Files:**
- Modify: `src/pages/flower-complete/flower-complete-page.vue`
- Modify: `src/pages/flower-detail/flower-detail-page.vue`
- Modify: `src/components/flower/flower-vase.vue` only if artwork spacing requires an existing prop/style adjustment
- Test: `tests/flower-creation-flow.test.cjs`
- Test: `tests/flower-card-image.test.cjs`

**Interfaces:**
- Consumes: Task 1 semantic buttons and surfaces.
- Produces: 完成页固定安全区操作栏；详情页顶部轻量操作和底部主次操作。

- [ ] **Step 1: 为页面文案和原有保存分支补充必要的源级断言**

只验证业务关键文案分支：新作品“保存作品”、已有作品“保存修改”，以及加载/保存状态不改变处理函数。避免为纯 CSS 写镜像测试。

- [ ] **Step 2: 运行相关测试确认行为基线**

运行：`node --test tests/flower-creation-flow.test.cjs tests/flower-card-image.test.cjs`

预期：现有行为通过；新增业务断言在实现前按预期失败。

- [ ] **Step 3: 重排完成页结构与状态样式**

作品为主要区域，说明靠近固定底部操作栏；保存按钮保留原事件和 loading 分支，并使用底部安全区。

- [ ] **Step 4: 重排详情页信息与操作结构**

顶部仅保留分享和保存图片；底部“继续编辑”为主要按钮，“制作贺卡”为次要按钮；标题、描述和日期形成稳定信息区。保留所有原有事件、权限处理和元数据编辑弹层。

- [ ] **Step 5: 运行相关离线测试并进行模拟器检查**

运行：`node --test tests/flower-creation-flow.test.cjs tests/flower-card-image.test.cjs`

预期：全部通过；iPhone 12/13 模拟器中底部操作不遮挡作品。

### Task 4: 贺卡预览与编辑弹层

**Files:**
- Modify: `src/pages/flower-card/flower-card-page.vue`
- Modify: `src/pages/flower-studio/components/studio-card-editor.vue` if shared form styling can be reused without coupling behavior
- Modify: `src/utils/flower/render-flower-card.ts` only if visual spacing must match the on-screen preview
- Test: `tests/flower-card-image.test.cjs`

**Interfaces:**
- Consumes: Task 1 semantic controls; existing card draft and rendering interfaces.
- Produces: 一致的贺卡底部操作区、编辑弹层和预览更新状态。

- [ ] **Step 1: 运行贺卡渲染基线测试**

运行：`node --test tests/flower-card-image.test.cjs`

预期：当前测试全部通过，记录用例数量。

- [ ] **Step 2: 更新贺卡页面结构与操作层级**

“填写内容”为主要操作；“保存图片”和“分享贺卡”为次要操作；更新预览时只在预览区域展示状态。保持保存、分享和表单验证函数不变。

- [ ] **Step 3: 统一编辑弹层表单样式**

输入框、标签、字数、关闭按钮和完成按钮使用主题 token；保留 120 字限制和当前校验行为。

- [ ] **Step 4: 运行贺卡测试并在模拟器填写长短文案**

运行：`node --test tests/flower-card-image.test.cjs`

预期：全部通过；空文案、短文案和接近 120 字文案均不溢出编辑弹层。

### Task 5: 我的作品列表与空状态

**Files:**
- Modify: `src/pages/flower-works/flower-works-page.vue`
- Test: `tests/flower-works.test.cjs`
- Test: `tests/flower-works-cloud.test.cjs`

**Interfaces:**
- Consumes: Task 1 card and button styles.
- Produces: 通栏作品卡片、稳定标题/时间区域、复制和删除操作层级。

- [ ] **Step 1: 运行作品列表数据测试基线**

运行：`node --test tests/flower-works.test.cjs tests/flower-works-cloud.test.cjs`

预期：当前测试全部通过。

- [ ] **Step 2: 更新列表卡片和空状态**

卡片整行可点击进入详情；缩略图、标题和更新时间完整利用横向空间；复制为次要操作，删除为危险轻量操作；空状态使用明确的“去插花”主要按钮。保留删除确认和分页逻辑。

- [ ] **Step 3: 验证一条、多条和空列表状态**

运行：`node --test tests/flower-works.test.cjs tests/flower-works-cloud.test.cjs`

预期：全部通过；模拟器中单条作品不产生右侧大面积空白，长标题有稳定换行或截断规则。

### Task 6: 全流程回归与视觉验收

**Files:**
- Modify: only files required to correct issues found during this verification

**Interfaces:**
- Consumes: Tasks 1–5 complete UI and behavior.
- Produces: 经离线测试与微信开发者工具验证的完整用户路径。

- [ ] **Step 1: 运行允许的完整离线测试**

运行：`node --test tests/*.test.cjs`

预期：0 个失败；明确记录通过和跳过数量。

- [ ] **Step 2: 使用 computer-use 完整体验核心路径**

路径：空白工作台 → 打开各素材面板 → 添加花材 → 撤销/重做 → 完成并保存 → 详情 → 贺卡 → 我的作品。

预期：所有主要操作可发现，颜色和按钮层级一致，无面板遮挡关键构图，无底部安全区重叠。

- [ ] **Step 3: 检查运行日志和工作区改动**

运行：`git diff --check && git status --short`

预期：无 whitespace 错误；没有生成文件、构建产物、依赖或无关文件变化。

- [ ] **Step 4: 记录未执行的高成本检查**

若当前会话没有额外明确授权，不运行 `pnpm type-check`、`pnpm lint` 或 `pnpm build:mp-weixin`；在交付中列出这些未验证项。
