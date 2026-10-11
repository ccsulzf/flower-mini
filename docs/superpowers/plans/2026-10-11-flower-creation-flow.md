# 插花、花卡与我的作品 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 按用户流程图接通恢复、全屏插花、作品预览、花卡、保存分享与结束创作，并补齐我的作品。

**Architecture:** 保留 artworkStore 的编辑领域，新增会话状态和账号隔离的本地草稿及鉴权云端作品存储。作品/花卡预览是工作室内完整视图，“我的作品”使用独立路由；目录、恢复与文件加载只由页面入口或 store 管理。原作品和花卡图片分别管理，绘制请求串行且可失效。

**Tech Stack:** uni-app、Vue 3、TypeScript、Pinia、现有 Canvas/SVG 渲染与微信本地文件系统；不新增依赖。

**Spec:** `docs/superpowers/specs/2026-10-11-flower-creation-flow-design.md`

## Global Constraints

- 已保存作品全部保存到云端；本地只保留按账号隔离的恢复草稿。等待 waitForAppAuthReady 后读取账号草稿与作品。
- 保留 default layout 的 Feedback 全局挂载。
- 祝福最多 120 字，署名最多 24 字，作品名称最多 40 字。
- 只有重新开始和结束本次创作清草稿；两者均保留我的作品、素材文件缓存。
- 不运行依赖安装/修复命令，不手改生成声明，不修改第三方模块，不部署云端。
- 新页面使用 definePage，中文文案、rpx、现有主题；全屏遵守微信胶囊和安全区。
- 使用 `node --test tests/*.test.cjs` 和已安装 Vue 编译器验证；微信构建需另外取得明确授权。
- 工作区已有大量用户修改和未跟踪文件；不清理、不覆盖、不擅自提交。

## Review Focus

- 恢复选择前空初始状态不得覆盖旧草稿；隐藏与卸载需立即保存实际编辑。
- 已清除/已切换作品后，迟到的保存、图片生成、目录回调不得恢复旧状态。
- 相册拒绝权限、本地草稿存储失败、云端写入失败时旧作品数据仍保留。
- 花瓶落点、背景版本与容器布局恢复完整，缺失素材不得静默替换。
- 我的作品详情返回列表不覆盖原草稿；更新/删除作品不得误删他人或素材文件。

---

### Task 1: 创作记录、本地草稿与云端作品接口

**Files:** Create `src/models/flower-creation.ts`, `src/utils/flower/creation-storage.ts`, `uniCloud-alipay/cloudfunctions/flower-works/index.obj.js`, `uniCloud-alipay/cloudfunctions/flower-works/package.json`, `uniCloud-alipay/cloudfunctions/common/auth/package.json`, `uniCloud-alipay/cloudfunctions/flower-works/validation.js`, `uniCloud-alipay/database/flower-works.schema.json`, `uniCloud-alipay/database/flower-works.index.json`; Modify `src/utils/flower/artwork.ts`, `uniCloud-alipay/cloudfunctions/common/auth/index.js`; Test `tests/flower-creation-storage.test.cjs`, `tests/flower-works-cloud.test.cjs`.

**Interfaces:**
- `FlowerCardText = { blessing: string, signature: string }`。
- `CreationDraft = { version: 1, artwork: Artwork, card: FlowerCardText, updatedAt: number, workId?: string }`。
- `SavedFlowerWork = { id: string, title: string, createdAt: number, updatedAt: number, draft: CreationDraft, thumbnailFileId: string, thumbnailUrl?: string, revision: number }`。
- `readDraft(owner: string): CreationDraft | null`, `writeDraft(owner: string, draft: CreationDraft): void`, `clearDraft(owner: string): void`。
- 云对象 `list({ page: number, pageSize: number })`, `get({ id: string })`, `save({ id?: string, expectedRevision?: number, title: string, artwork: Artwork, card: FlowerCardText, thumbnailBase64: string })`, `remove({ id: string, expectedRevision: number })`；客户端使用 `uniCloud.importObject("flower-works", { customUI: true })`。
- 查询每页 20 条，最大 50 条；list/get 返回云缩略图临时 URL。缩略图为 349×500 PNG，解码后最多 512KB，由服务端上传到本账号作品路径。
- 草稿存储异常向调用方抛出中文错误；记录深拷贝并校验版本、类型、长度。我的作品接口由下述云对象实现，不创建本地作品索引。

- [x] 写失败测试：本地草稿账号隔离与非法结构拒绝；合法云花瓶落点如 x=300/400 恢复不变；云对象拒绝未登录/伪造 uid，不能读取、更新或删除另一账号记录。
- [x] 运行 `node --test tests/flower-creation-storage.test.cjs`，确认失败原因是接口缺失或旧落点校验。
- [x] 实现版本化记录与账号命名空间；云容器落点按合法画板范围保留，在素材准备后检查实际瓶口。
- [x] 修正公共 auth 使用 checkToken 的 errCode 成功字段，保留 Token 续期返回；创建云对象和禁止客户端直接读写的 schema，索引 user_id/updatedAt/_id。
- [x] 实现服务端白名单数据校验、PNG 缩略图上传、带 uid 的数据库写入和 expectedRevision 原子更新；数据库失败仅清理本次新文件，更新成功清理旧缩略图。
- [x] 补充同 workId 更新、不重复收藏、倒序分页、跨客户端读取、多设备冲突、缩略图失败和数据库失败测试；删除取消由页面测试负责。

### Task 2: 会话状态、恢复选择与生命周期

**Files:** Create `src/hooks/useFlowerCreationSession.ts`; Modify `src/pages/flower-studio/studio-types.ts`, `src/pages/flower-studio/flower-studio-page.vue`; Test `tests/flower-creation-session.test.cjs`.

**Interfaces:**
- `CreationView = 'edit' | 'artwork' | 'card'`。
- `useFlowerCreationSession(store)` 返回 view、card、pendingDraft、workId、dirty、storageError 与 `initialize(owner)`, `continueDraft()`, `restart()`, `markEdited()`, `flushDraft()`, `openWork(work)`, `commitCard(text)`。
- 初始化合并重复请求；恢复浮层待选择时禁止自动保存。`restart` 撤销防抖/旧请求并重置空作品、花卡和 workId；不删除作品。
- 自动保存 300ms 防抖；onHide/onUnload 调用 flushDraft，只有实际用户编辑后 dirty 才成立。

- [x] 写无草稿、有草稿不覆盖、恢复、重新开始、损坏缓存和隐藏保存的失败测试并运行。
- [x] 实现会话状态与草稿存储接口，复用 artworkStore.initialize 恢复作品。
- [x] 连接页面编辑动作 markEdited，恢复和默认容器准备不得误标记用户编辑。
- [x] 测试清除时取消待保存任务、预览返回不重置、账号变化重新初始化、储存异常不会显示成功。
- [x] 验证 `node --test tests/flower-creation-session.test.cjs tests/flower-container-layouts.test.cjs`。

### Task 3: 原作品与花卡两种图片

**Files:** Create `src/utils/flower/render-flower-card.ts`; Modify `src/hooks/useArtworkImage.ts`; Test `tests/flower-card-image.test.cjs`, `tests/flower-image.test.cjs`。

**Interfaces:**
- `renderFlowerCard(ctx, artworkImagePath: string, text: FlowerCardText): Promise<{ width: number, height: number }>`，原作品保持 698×1000 比例，下方扩展文字区。
- useArtworkImage 增加 `cardImagePath`, `cardImageError`, `exportingCard`, `exportCard(text): Promise<boolean>`，原图片状态保留。
- `exportThumbnail(): Promise<string>` 生成 349×500 PNG 并返回本地临时路径；缩略图绘制同样串行且可失效。
- `saveImage(kind?: 'artwork' | 'card')`, `shareImage(kind?: 'artwork' | 'card')`, `previewImage(kind?: 'artwork' | 'card')` 选择对应路径；省略参数保持旧调用兼容。
- `invalidate()` 清除两种图片并使旧 generation 失效；共用 Canvas 的绘制任务串行，不同图片状态不互相覆盖。

- [x] 写祝福为空、仅署名、仅祝福、120 字混合换行、多段文字、超长输入拒绝的失败测试。
- [x] 实现按 measureText 分行和动态文字区域，署名靠右；无英文装饰文案。
- [x] 写并实现原图与花卡分别分享/保存、修改后重新生成、结束创作旧结果作废与串行绘制测试。
- [x] 补齐相册拒绝权限提供设置入口、用户取消不提示失败、不支持分享平台的分支。
- [x] 验证 `node --test tests/flower-card-image.test.cjs tests/flower-image.test.cjs`。

### Task 4: 全屏视图和图中所有预览分支

**Files:** Create `src/pages/flower-studio/components/studio-restore.vue`, `studio-card-editor.vue`, `studio-artwork-preview.vue`, `studio-card-preview.vue`; Modify `src/pages/flower-studio/flower-studio-page.vue`, `src/hooks/useFlowerStudioLayout.ts`, `src/pages/index/index-page.vue`; Test `tests/flower-creation-flow.test.cjs`, `tests/flower-rendering.test.cjs`。

**Interfaces:**
- Restore 组件发出 continue/restart。
- CardEditor 接收已提交 text，发出 cancel/skip/preview(text)，维护临时副本，maxlength 为 120/24。
- ArtworkPreview 接收图片/生成状态/错误，发出 edit/retry/saveImage/share/saveWork/end。
- CardPreview 接收花卡图片状态，发出 back/editText/retry/saveImage/share。
- 页面协调：finish → artwork；share → editor；skip/全空 → 原图分享；非空 → card；cancel/back → artwork；edit → edit；end → restart。

- [x] 写上述每条状态流向的失败测试；确保取消不提交文字、清空不删除收藏、系统分享返回不重复恢复。
- [x] 将工作室 definePage 设置 type: home/navigationStyle: custom；原首页移除 home 标记，保留辅助入口。
- [x] 适配状态栏、胶囊和安全区，保留编辑区域倍率；完成页改完整页面视图，不沿用旧小预览浮层。
- [x] 实现四个组件和页面事件；保留既有花材/容器/背景/浮动工具行为。
- [x] 实现“保存作品”命名浮层与异步保存状态，结束创作使用已有明确按钮动作，不增加多余确认步骤。
- [x] 使用 Vue 编译器校验组件，并验证 `node --test tests/flower-creation-flow.test.cjs tests/flower-rendering.test.cjs`。

### Task 5: 我的作品页、详情及继续编辑

**Files:** Create `src/stores/flowerWorksStore.ts`, `src/pages/flower-works/flower-works-page.vue`; Modify `src/pages/flower-studio/flower-studio-page.vue`; Test `tests/flower-works.test.cjs`。

**Interfaces:**
- `useFlowerWorksStore()` 提供 items/loading/saving/error/hasMore 与 `load(reset?: boolean): Promise<void>`, `get(id: string): Promise<SavedFlowerWork>`, `save(input: { draft: CreationDraft, title: string, imagePath: string, workId?: string, expectedRevision?: number }): Promise<SavedFlowerWork>`, `remove(id: string, expectedRevision: number): Promise<void>`；等待鉴权后调用 Task 1 云对象，不传 uid、不直接读写数据库。
- 保存时读取 Task 3 的小尺寸 PNG 转 base64，交给鉴权云对象；更新带上最新 revision，冲突保留编辑副本并提示刷新。
- 工作室“我的作品” navigateTo 列表；先 flush 当前草稿。列表“去插花/返回” navigateBack 到原编辑会话，不初始化它。
- 点击记录使用 `/pages/flower-studio/flower-studio-page?workId=<id>` 打开作品预览；会话以详情只读状态启动，原草稿保留。
- 继续编辑才开启该作品的草稿副本；保存更新 workId 对应记录。详情退出未编辑不覆盖原草稿。

- [x] 写列表加载/排序、云端分页、账号隔离、跨设备打开作品原图及文字、继续编辑副本、连续保存更新、删除确认/取消的失败测试。
- [x] 实现两列缩略图、名称时间、加载更多、空态和失败重试；不在缩略图组件读取云目录。
- [x] 实现 query workId 的有效校验与记录读取，详情图片缺失时重新生成，不删原作品数据。
- [x] 实现删除仅作用于指定记录；从当前作品详情删除后回到列表，已存在独立草稿不受影响。
- [x] 验证 `node --test tests/flower-works.test.cjs tests/flower-creation-flow.test.cjs`。

### Task 6: 全流程检查和交付

**Files:** Modify `README.md`, `docs/flower-studio-flow-review.md`; 新增流程测试保留在上述各测试文件。

- [x] 按图逐条核对：无缓存/恢复/重启；工具展开收起；完成/返回编辑；原图保存；花卡取消/跳过/全空/非空；花卡修改/返回/保存/分享；结束清草稿；作品保存/更新/打开/编辑/删除。
- [x] 执行 `node --test tests/*.test.cjs`，要求所有测试通过；运行 Vue 编译器及 git diff --check，读取结果。
- [x] 执行只读路由源检查，确认只有工作室 home、新作品页不会进入分包，保留开发素材管理入口。完整微信构建执行前获取明确授权。
- [x] 对完整改动进行独立审查（只读，不接触已有无关改动），修复重要问题并用失败回归测试验证。
- [x] 更新 README 与流程检查记录，明确云对象/schema/index 需部署后联调，实机与完整构建未验证项。

## 执行记录（2026-10-11）

代码、离线验证和用户授权后的完整微信构建均已完成，云端部署仍未执行。以上勾选表示步骤里的本地实现/验证部分完成，不代表真机或云端验收完成。

- 在原工作区执行，保留已有修改，不提交、不安装依赖。
- 每个工作室实例拥有独立 Artwork store，详情预览不会修改后方编辑会话。
- 公共 auth 的 package.json 已有正确的 uni-id-common 依赖，复用原文件；只修正鉴权成功字段和 token 续期。
- 临时草稿读取失败可重新读取，失败处理前暂停写入旧缓存。
- 服务端 PNG 校验检查 CRC、必要块、受限解压后的行数据；测试采用真实 PNG。
- 独立只读审查发现的账号切换、迟到素材回调、花卡新旧文本竞态、图片放大、草稿重读和 PNG 校验问题均已通过回归验证。
- 使用已安装的 node / Vue / Sass / vue-tsc / ESLint 直接验证，未执行 pnpm、npm、corepack 命令。定向格式化仅覆盖本次创作功能文件。
- 用户已按 AGENTS.md 明确授权微信构建，正式构建通过；云对象、schema/index 需上传后再验证同账号跨设备操作。
