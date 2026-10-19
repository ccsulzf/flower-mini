# 云接口基础设施与每日花束样板域实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立统一的强类型云对象调用基础设施，并将每日花束正式读取链路迁移为第一个领域 API 样板。

**Architecture:** 页面继续只消费 Pinia Store；Store 改为调用 `src/api/flower-daily.ts`，领域 API 通过 `cloud-client` 调用云对象并验证边界数据。`flower-daily` 云对象统一返回 `{ code: 0, data }`，历史查询的日期上限由服务端按 Asia/Shanghai 日期生成，开发者维护工具保持不变。

**Tech Stack:** uni-app、Vue 3、TypeScript、Pinia、uniCloud 云对象、Node.js `node:test`

**Spec:** `docs/superpowers/specs/2026-10-19-cloud-api-architecture-refactor-design.md`

## Global Constraints

- 不运行可能安装、更新、修复或清理依赖的包管理器命令。
- 未经用户明确确认，不运行 `pnpm type-check`、`pnpm lint` 或 `pnpm build:mp-weixin`。
- 可直接运行 `node --test tests/*.test.cjs`；离线测试不视为真实云端联调。
- 不修改 `node_modules`、`src/uni_modules/` 和生成声明文件。
- 保留 default layout 中的 Feedback 全局挂载。
- 云对象使用服务端身份，禁止信任客户端 UID；所有输入在服务端校验。
- 每日花束与素材维护工具是开发者工具，本计划不产品化其管理员流程。
- 当前工作区已经修改 `src/pages/daily-flower-detail/daily-flower-detail-page.vue`、`tests/daily-flower-detail.test.cjs`、`tests/flower-catalog.test.cjs` 和 `uniCloud-alipay/cloudfunctions/flower-catalog/index.obj.js`；只能增量保留，禁止覆盖或混入无关提交。
- 实施中只提交当前任务涉及的明确文件，不使用 `git add .`。

## Review Focus

- `code: 0` 但缺少 `data` 的响应必须被拒绝，不能被当作空业务数据。
- `AUTH_REQUIRED` 只能在登录型读取请求中触发一次重新登录；公共请求和写请求不得暗中重试。
- 云端历史列表必须以 Asia/Shanghai 的服务端日期排除未来维护数据，不能接受客户端日期上限。
- 详情首次加载应继续复用 Store 缓存，只有用户点击重试才强制刷新。
- 图片本地缓存记录存在但文件已经被系统清理时，必须重新下载而不是返回失效路径。

---

## File Structure

### 新建

- `src/api/cloud-types.ts`：通用响应、权限和调用选项类型。
- `src/api/cloud-response.ts`：严格解包响应和统一 `CloudApiError`。
- `src/api/cloud-client.ts`：鉴权等待、云对象创建、单次重登策略和方法调用。
- `src/api/flower-daily.ts`：每日花束领域 API 与响应边界校验。
- `src/models/daily-flower.ts`：每日花束正式领域模型。
- `src/utils/flower/daily-flower-image-cache.ts`：图片文件检查、下载与持久缓存。
- `tests/cloud-client.test.cjs`：通用客户端离线测试。
- `tests/flower-daily-api.test.cjs`：每日花束领域 API 离线测试。

### 修改

- `uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js`：标准响应与服务端日期上限。
- `tests/flower-daily.test.cjs`：更新云对象契约和 Store 回归断言。
- `src/stores/dailyFlowerStore.ts`：改用领域 API 与图片缓存工具。
- `tests/daily-flower-detail.test.cjs`：保留现有未提交测试并补充必要的调用回归。

### 明确不改

- `src/subpackages/daily-flower-admin/**`
- `uniCloud-alipay/cloudfunctions/flower-daily-admin/**`
- `src/subpackages/material-admin/**`
- `uniCloud-alipay/cloudfunctions/flower-catalog/index.obj.js`

---

### Task 1: 通用响应类型与严格解包

**Files:**
- Create: `src/api/cloud-types.ts`
- Create: `src/api/cloud-response.ts`
- Create: `tests/cloud-client.test.cjs`

**Interfaces:**
- Produces: `CloudResponse<T>`, `CloudAuthMode`, `CloudOperation`, `CloudApiError`, `unwrapCloudResponse<T>(value: unknown): T`, `toCloudApiError(error: unknown, fallbackMessage?: string): CloudApiError`。
- Consumes: 无。

- [ ] **Step 1: 写响应解包失败测试**

在 `tests/cloud-client.test.cjs` 中断言：

```js
test('只解包 code 0 且显式包含 data 的标准响应', () => {
  assert.deepEqual(unwrapCloudResponse({ code: 0, data: { ok: true } }), { ok: true })
  assert.throws(() => unwrapCloudResponse({ code: 0 }), /响应数据无效/)
  assert.throws(() => unwrapCloudResponse({ items: [] }), /响应协议无效/)
})

test('云端错误转换后保留稳定错误码和用户消息', () => {
  const error = toCloudApiError({ errCode: 'AUTH_REQUIRED', errMsg: '登录已失效' })
  assert.equal(error.code, 'AUTH_REQUIRED')
  assert.equal(error.message, '登录已失效')
})
```

- [ ] **Step 2: 运行测试并确认红灯**

Run: `node --test tests/cloud-client.test.cjs`

Expected: FAIL，原因是 `src/api/cloud-response.ts` 尚不存在。

- [ ] **Step 3: 实现最小通用协议**

在 `cloud-types.ts` 定义：

```ts
export interface CloudResponse<T> { code: 0, data: T, requestId?: string }
export type CloudAuthMode = 'public' | 'authenticated' | 'admin'
export type CloudOperation = 'read' | 'write'
```

在 `cloud-response.ts` 实现上述导出。`unwrapCloudResponse` 必须使用自有属性检查 `data`，允许 `data` 的值本身为 `null` 或 `undefined`；不接受旧直接对象。

- [ ] **Step 4: 运行测试并确认绿灯**

Run: `node --test tests/cloud-client.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交任务**

```bash
git add src/api/cloud-types.ts src/api/cloud-response.ts tests/cloud-client.test.cjs
git commit -m "feat: add cloud response contract"
```

---

### Task 2: 强类型云对象客户端

**Files:**
- Modify: `src/api/cloud-types.ts`
- Create: `src/api/cloud-client.ts`
- Modify: `tests/cloud-client.test.cjs`

**Interfaces:**
- Consumes: `unwrapCloudResponse`, `toCloudApiError`, `waitForAppAuthReady()`, `initializeAppAuth(force)`。
- Produces: `callCloud<TInput, TOutput>(options: CloudCallOptions<TInput>): Promise<TOutput>`。

- [ ] **Step 1: 写权限、配置和重试策略测试**

覆盖以下断言：

```js
test('公共读取不等待鉴权并统一使用 customUI', async () => { /* auth wait count = 0; config.customUI = true */ })
test('登录读取等待鉴权，AUTH_REQUIRED 时只强制登录并重试一次', async () => { /* method calls = 2; force login = 1 */ })
test('写请求遇到 AUTH_REQUIRED 不自动重试', async () => { /* method calls = 1; force login = 0 */ })
test('不存在的云对象方法被转换为 CloudApiError', async () => { /* code = CLIENT_METHOD_MISSING */ })
```

测试通过 `createLoader` 注入 `uniCloud.importObject`，并通过替换 `appAuth` 导出或增加 loader 的模块替身能力观察鉴权调用次数；若需要扩展 loader，只增加精确的 `options.modules` 替身入口，不改变现有默认解析行为。

- [ ] **Step 2: 运行测试并确认红灯**

Run: `node --test tests/cloud-client.test.cjs`

Expected: FAIL，原因是 `callCloud` 尚不存在。

- [ ] **Step 3: 定义调用选项并实现客户端**

在 `cloud-types.ts` 增加：

```ts
export interface CloudCallOptions<TInput> {
  object: string
  method: string
  auth: CloudAuthMode
  operation: CloudOperation
  payload: TInput
  fallbackMessage?: string
}
```

`callCloud` 行为必须固定为：

1. `public` 不等待鉴权，其余权限先调用 `waitForAppAuthReady()`。
2. 使用 `uniCloud.importObject(object, { customUI: true })`。
3. 仅以一个参数 `payload` 调用云对象方法。
4. 使用 `unwrapCloudResponse` 解包。
5. 只有 `operation: 'read'` 且非 `public` 的请求收到 `AUTH_REQUIRED` 时，执行一次 `initializeAppAuth(true)` 后重试。
6. 其他错误直接转为 `CloudApiError`；禁止普通网络错误和写请求自动重试。

- [ ] **Step 4: 运行通用客户端测试**

Run: `node --test tests/cloud-client.test.cjs tests/auth.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交任务**

```bash
git add src/api/cloud-types.ts src/api/cloud-client.ts tests/cloud-client.test.cjs tests/helpers/load-ts.cjs
git commit -m "feat: add authenticated cloud client"
```

仅在实际修改 `tests/helpers/load-ts.cjs` 时暂存该文件。

---

### Task 3: 每日花束领域模型与 API

**Files:**
- Create: `src/models/daily-flower.ts`
- Create: `src/api/flower-daily.ts`
- Create: `tests/flower-daily-api.test.cjs`

**Interfaces:**
- Consumes: `callCloud`, `Artwork`, `parseDailyFlower`, `parseDailyFlowerSummary`。
- Produces: `getDailyFlowerByDate(date)`, `getDailyFlowerArtwork(date)`, `listDailyFlowerHistory(input)`。

- [ ] **Step 1: 写领域边界测试**

测试注入 `flower-daily` 云对象并覆盖：

```js
test('按日期读取并验证每日花束记录', async () => { /* 返回 DailyFlowerRecord */ })
test('云端 flower 为 null 时返回 null', async () => { /* 严格等于 null */ })
test('拒绝日期不一致、非 HTTPS 图片和损坏 artwork', async () => { /* 三种输入均 reject */ })
test('历史 API 验证分页结果并不向云端发送客户端 today', async () => { /* payload 只有 page/pageSize/date */ })
test('历史 API 拒绝重复日期、未来日期字段之外的额外实体依赖', async () => { /* 非法摘要 reject */ })
```

- [ ] **Step 2: 运行测试并确认红灯**

Run: `node --test tests/flower-daily-api.test.cjs`

Expected: FAIL，原因是领域模型和 API 尚不存在。

- [ ] **Step 3: 定义领域模型**

在 `src/models/daily-flower.ts` 定义：

```ts
export interface DailyFlowerSummary { date: string, description: string }
export interface DailyFlowerRecord extends DailyFlowerSummary {
  artwork: Artwork
  imageFileId: string
  imageUrl: string
}
export interface LocalDailyFlower extends DailyFlowerRecord { imagePath: string }
export interface DailyFlowerHistoryPage { items: DailyFlowerSummary[], hasMore: boolean }
```

- [ ] **Step 4: 实现三个领域 API**

精确签名：

```ts
export function getDailyFlowerByDate(date: string): Promise<DailyFlowerRecord | null>
export function getDailyFlowerArtwork(date: string): Promise<Artwork | null>
export function listDailyFlowerHistory(input: {
  page: number
  pageSize: number
  date?: string
}): Promise<DailyFlowerHistoryPage>
```

三个调用均声明 `auth: 'public'`、`operation: 'read'`。API 使用现有解析器验证日期、描述和 artwork；另行验证 `imageFileId` 非空、`imageUrl` 为 HTTPS、返回日期与请求日期一致、`hasMore` 为 boolean。历史调用不得发送 `today` 或 `beforeOrOn`。

- [ ] **Step 5: 运行领域 API 测试**

Run: `node --test tests/flower-daily-api.test.cjs tests/cloud-client.test.cjs`

Expected: PASS。

- [ ] **Step 6: 提交任务**

```bash
git add src/models/daily-flower.ts src/api/flower-daily.ts tests/flower-daily-api.test.cjs
git commit -m "feat: add daily flower api"
```

---

### Task 4: 云端每日花束标准响应与服务端日期边界

**Files:**
- Modify: `uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js`
- Modify: `tests/flower-daily.test.cjs`

**Interfaces:**
- Consumes: `daily-flower` 公共校验模块、`uniCloud.database()`、`uniCloud.getTempFileURL()`。
- Produces: `getByDate(input)`, `getArtwork(input)`, `listHistory(input)` 的 `CloudResponse<T>`。

- [ ] **Step 1: 把云对象测试改成新契约并增加服务端日期断言**

更新现有断言为 `result.code === 0` 和 `result.data.*`，并增加：

```js
test('历史列表忽略客户端 today，以 Asia/Shanghai 服务端日期限制未来数据', async () => {
  const result = await cloud.listHistory({ today: '2999-12-31', page: 1, pageSize: 20 })
  assert.equal(result.code, 0)
  assert.equal(result.data.items.some(item => item.date > expectedShanghaiToday), false)
})
```

测试通过 VM 注入固定 `Date`，避免依赖执行当天；固定 UTC 时间需覆盖上海日期跨日，例如 `2026-10-18T16:30:00.000Z` 对应 `2026-10-19`。

- [ ] **Step 2: 运行云对象测试并确认红灯**

Run: `node --test tests/flower-daily.test.cjs`

Expected: FAIL，旧云对象仍返回直接对象并信任 `input.today`。

- [ ] **Step 3: 实现标准响应与上海日期函数**

在云对象内部增加无导出的 `shanghaiDate(now = new Date())`，通过 UTC 时间加 8 小时后取 `YYYY-MM-DD`，不依赖宿主机时区。

固定返回：

```js
{ code: 0, data: { flower } }
{ code: 0, data: { items, hasMore } }
```

`listHistory` 删除对 `input.today` 的读取，以 `shanghaiDate()` 作为上限；保留日期过滤、分页范围、字段裁剪和 `pageSize + 1` 查询。

- [ ] **Step 4: 运行云对象与领域 API 测试**

Run: `node --test tests/flower-daily.test.cjs tests/flower-daily-api.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交任务**

```bash
git add uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js tests/flower-daily.test.cjs
git commit -m "refactor: standardize daily flower cloud api"
```

---

### Task 5: 提取每日花束图片缓存

**Files:**
- Create: `src/utils/flower/daily-flower-image-cache.ts`
- Modify: `tests/flower-daily-api.test.cjs`

**Interfaces:**
- Consumes: `DailyFlowerRecord`、`wx.getFileSystemManager()`、`uni.downloadFile()`、`uni.saveFile()`、本地 storage。
- Produces: `resolveDailyFlowerImage(record: DailyFlowerRecord): Promise<string>`。

- [ ] **Step 1: 写缓存行为测试**

覆盖：

```js
test('有效持久文件直接命中，不下载', async () => { /* download count = 0 */ })
test('缓存路径对应文件已丢失时重新下载并保存', async () => { /* download/save count = 1 */ })
test('下载最多尝试两次并拒绝非 200 响应', async () => { /* calls <= 2 */ })
test('文件系统 API 不存在时视为未命中', async () => { /* 仍然下载 */ })
```

- [ ] **Step 2: 运行测试并确认红灯**

Run: `node --test tests/flower-daily-api.test.cjs`

Expected: FAIL，缓存模块尚不存在。

- [ ] **Step 3: 移植并收紧现有缓存实现**

从 `dailyFlowerStore.ts` 移动 `cacheKey`、文件检查、两次下载和保存逻辑。缓存记录必须同时匹配 `imageFileId` 和可用的 `imagePath`；保存成功后才写 storage。错误消息继续使用“今日花束图片下载失败”。

- [ ] **Step 4: 运行测试并确认绿灯**

Run: `node --test tests/flower-daily-api.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交任务**

```bash
git add src/utils/flower/daily-flower-image-cache.ts tests/flower-daily-api.test.cjs
git commit -m "refactor: extract daily flower image cache"
```

---

### Task 6: Store 迁移到领域 API

**Files:**
- Modify: `src/stores/dailyFlowerStore.ts`
- Modify: `tests/flower-daily.test.cjs`
- Modify: `tests/daily-flower-detail.test.cjs` only if an assertion must be adapted without discarding current uncommitted behavior.

**Interfaces:**
- Consumes: `getDailyFlowerByDate`, `getDailyFlowerArtwork`, `listDailyFlowerHistory`, `resolveDailyFlowerImage`。
- Produces: Store 现有公开接口保持不变：`loadDate`, `getArtwork`, `checkToday`, `loadHistory`, `dismissToday`。

- [ ] **Step 1: 扩充 Store 回归测试**

断言：

```js
test('同一日期并发加载只调用一次领域 API，refresh 才绕过结果缓存', async () => { /* calls = 1 then 2 */ })
test('历史分页不发送 today，追加结果按日期去重', async () => { /* payload and merged items */ })
test('领域 API 失败后 loading 复位且保留可展示错误', async () => { /* loading false; error message */ })
```

保留现有未提交测试“每日花束详情首次进入复用 store 缓存，仅重试时强制刷新”。

- [ ] **Step 2: 运行 Store 与详情测试并确认红灯**

Run: `node --test tests/flower-daily.test.cjs tests/daily-flower-detail.test.cjs`

Expected: FAIL，Store 仍直接创建云对象并发送 `today`。

- [ ] **Step 3: 迁移 Store**

- 删除 `DailyFlowerCloud` 和所有 `uniCloud.importObject('flower-daily')`。
- 将 Store 内响应类型替换为 `src/models/daily-flower.ts` 的领域类型。
- `fetchDailyFlower` 调用 `getDailyFlowerByDate` 后调用 `resolveDailyFlowerImage`。
- `getArtwork` 直接委托 `getDailyFlowerArtwork`。
- `loadHistory` 调用 `listDailyFlowerHistory({ page, pageSize: 20, date })`，不计算或发送服务器查询上限。
- 保持 Store 的公开名称、状态、请求去重、分页、关闭状态和当前错误文案行为。

- [ ] **Step 4: 运行样板域相关测试**

Run: `node --test tests/cloud-client.test.cjs tests/flower-daily-api.test.cjs tests/flower-daily.test.cjs tests/daily-flower-detail.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交任务**

```bash
git add src/stores/dailyFlowerStore.ts tests/flower-daily.test.cjs
git commit -m "refactor: migrate daily flower store to api"
```

如果实现确实修改了 `tests/daily-flower-detail.test.cjs`，先确认 diff 仅为本任务的增量，再明确加入暂存列表。

---

### Task 7: 样板域全量离线验证与架构边界检查

**Files:**
- Modify: `docs/superpowers/plans/2026-10-19-cloud-api-daily-flower-implementation.md` only to mark completed checkboxes if the execution workflow tracks them in-file.

**Interfaces:**
- Consumes: 前六个任务的全部产物。
- Produces: 可独立验收的基础设施与每日花束样板域。

- [ ] **Step 1: 运行全部允许的离线测试**

Run: `node --test tests/*.test.cjs`

Expected: 全部 PASS，无 unhandled rejection。

- [ ] **Step 2: 做只读架构扫描**

Run:

```bash
rg -n "uniCloud\.importObject\('flower-daily'" src --glob '!src/uni_modules/**'
rg -n "today:" src/stores/dailyFlowerStore.ts src/api/flower-daily.ts
git diff --check
git status --short
```

Expected:

- 正式读取链路中不存在 `flower-daily` 的直接云对象创建。
- Store 和领域 API 不再发送 `today`。
- `git diff --check` 无输出。
- 用户原有未提交的 `flower-catalog` 等修改仍然存在且未被暂存到本阶段提交。

- [ ] **Step 3: 人工核对维护工具未被改造**

Run: `git diff -- src/subpackages/daily-flower-admin uniCloud-alipay/cloudfunctions/flower-daily-admin src/subpackages/material-admin`

Expected: 无本计划产生的修改。

- [ ] **Step 4: 记录未执行验证**

交付说明必须明确列出：

- 未经授权未运行 `pnpm type-check`。
- 未经授权未运行 `pnpm lint`。
- 未经授权未运行 `pnpm build:mp-weixin`。
- 未进行真实支付宝 uniCloud 部署与联调。

- [ ] **Step 5: 如有计划跟踪改动则提交**

仅当实施过程确实在计划文件勾选状态时执行：

```bash
git add docs/superpowers/plans/2026-10-19-cloud-api-daily-flower-implementation.md
git commit -m "docs: record daily flower api rollout"
```

---

## 后续计划边界

本计划完成并验收后，按同一设计另行编写并批准以下计划：

1. `flower-works` 登录接口、服务端 UID 隔离和 revision 冲突迁移。
2. `flower-catalog` 目录接口迁移，基于届时保留下来的用户修改增量实施。
3. 全项目收口：删除兼容响应、扫描残余直接云调用，并单独评估开发维护工具分包。

这些阶段不会提前混入本计划，以确保每日花束样板可以独立回滚和评审。
