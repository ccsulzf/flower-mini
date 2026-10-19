# 云接口架构重构设计

## 背景与目标

当前项目在页面、Pinia Store 和工具函数中直接创建 uniCloud 云对象。各云对象分别返回直接实体、`{ items }`、`{ flower }`、`{ ok }` 等不同结构，客户端也重复处理鉴权等待、异常消息和响应校验。

本次重构参考 `rentTool-mini` 的统一响应、公共鉴权和业务 Store 组织方式，但不照搬其中未完全统一的接口契约。目标是在保留当前项目安全校验、服务端 UID 隔离、素材版本校验和 revision 乐观锁的前提下，形成清晰、强类型、可渐进迁移的云接口架构。

本轮同时重构客户端调用层、云对象返回协议和公共鉴权。每日花束的正式读取链路作为首个样板域；每日花束与素材维护工具仅供开发者使用，不产品化，也不纳入第一阶段的管理员功能改造。

## 架构选择

采用“渐进式领域 API 层”方案：

```text
页面与组件
    ↓
Pinia Store / 领域流程
    ↓
src/api/<domain>.ts
    ↓
统一 cloud client
    ↓
uniCloud 云对象
    ↓
公共鉴权 + 标准响应
```

不采用单一巨型 API SDK，以免不同领域的类型和权限相互耦合；也不只在 Store 内封装调用，因为那会继续让 Store 同时承担通信、响应解析、领域校验和状态管理。

## 客户端职责边界

### 页面与组件

- 负责交互、路由参数与展示。
- 不直接调用 `uniCloud.importObject`。
- 不感知云端响应包装与底层错误结构。

### Pinia Store

- 管理 loading、error、分页、缓存、并发去重和业务状态更新。
- 调用领域 API，不创建云对象，也不解析 `code`、`errCode`。
- 保留只属于状态层的行为，例如每日花束图片缓存、弹窗关闭状态和作品列表本地同步。

### 领域 API

- 每个业务领域提供独立模块，例如 `flower-daily.ts`、`flower-works.ts` 和 `flower-catalog.ts`。
- 定义明确的输入和输出类型，调用对应云对象。
- 对解包后的数据进行领域边界校验和必要归一化。
- 不持有 Vue 响应式状态，不弹 Toast。

### 通用云客户端

建议新增：

```text
src/api/cloud-client.ts
src/api/cloud-response.ts
src/api/cloud-types.ts
```

通用客户端负责：

- 按接口权限决定是否等待 `waitForAppAuthReady()`。
- 统一使用 `{ customUI: true }` 创建或复用云对象。
- 解包标准响应。
- 将云端异常转换成统一的 `CloudApiError`。
- 在确有需要时统一处理续期 Token。

领域解析函数（如 `parseDailyFlower`、`validateDraft`）不进入通用客户端，避免基础设施层变成业务工具集合。

## 响应与错误协议

成功响应统一为：

```ts
export interface CloudResponse<T> {
  code: 0
  data: T
  requestId?: string
}
```

失败不返回 `{ code: 1 }`，而是抛出带稳定错误码的云异常：

```js
throw {
  errCode: 'INVALID_DAILY_FLOWER_DATE',
  errMsg: '花束日期格式无效',
}
```

客户端将其转换为：

```ts
export class CloudApiError extends Error {
  code: string
  cause?: unknown
}
```

通用错误码包括：

- `AUTH_REQUIRED`：未登录或登录失效。
- `PERMISSION_DENIED`：已经登录但没有权限。
- `INVALID_ARGUMENT`：通用参数错误。
- `RESOURCE_NOT_FOUND`：目标不存在。
- `REVISION_CONFLICT`：作品版本冲突。
- `RESOURCE_UNAVAILABLE`：云文件或临时地址不可用。

领域可以继续定义稳定的领域错误码。用户可见消息来自异常的 `message`，Store 不再重复识别 `Error`、`errMsg` 等底层格式。

迁移期间通用客户端暂时兼容新协议、旧直接对象以及无返回值的成功操作。只有尚未完成迁移的接口可使用兼容路径；所有领域迁移完成后删除兼容逻辑。

## 鉴权与权限

云端公共 `auth` 模块提供：

- `resolveAuth(ctx)`：可选登录，无有效身份时返回 `null`。
- `requireAuth(ctx)`：必须登录，无有效身份时抛 `AUTH_REQUIRED`。
- `requireRole(ctx, role)`：必须登录并实时读取 `uni-id-users.role`，无权限时抛 `PERMISSION_DENIED`。

接口权限分为 `public`、`authenticated` 和 `admin`。客户端领域 API 在调用时显式声明权限：

- `public` 不等待登录屏障。
- `authenticated` 与 `admin` 先等待 `waitForAppAuthReady()`。
- `AUTH_REQUIRED` 可触发一次强制重新登录并重试，禁止无限循环。
- `PERMISSION_DENIED` 不重试。
- 写操作不因普通网络错误自动重试；未来如需安全重试，应增加幂等键。

UID 只从服务端鉴权结果获得。所有用户数据的查询、更新和删除条件必须带服务端 UID，不信任客户端传入的 UID。正式管理员接口每次实时检查角色。

Token 续期优先交给 uniCloud/uni-id 客户端机制；若运行环境不能自动保存续期 Token，则只由通用客户端统一接收 `newToken`，不让各 Store 分别处理。

## 每日花束样板域

第一阶段只迁移正式环境的公共读取链路：首页弹窗、历史列表和详情页。开发者维护页面及 `flower-daily-admin` 不纳入管理员产品功能改造。

### 领域模型

将当前 Store 内的响应类型移动到 `src/models/daily-flower.ts`：

- `DailyFlowerSummary`：日期和描述。
- `DailyFlowerRecord`：摘要、作品、云文件 ID 和临时图片地址。
- `LocalDailyFlower`：在云端记录基础上增加本地图片路径。

领域实体不包含 loading、visible 等 UI 状态。

### 领域 API

新增 `src/api/flower-daily.ts`，提供：

```ts
getDailyFlowerByDate(date: string): Promise<DailyFlowerRecord | null>
getDailyFlowerArtwork(date: string): Promise<Artwork | null>
listDailyFlowerHistory(input: {
  beforeOrOn: string
  page: number
  pageSize: number
  date?: string
}): Promise<{ items: DailyFlowerSummary[], hasMore: boolean }>
```

API 模块负责调用云对象、解包响应、使用现有解析函数验证返回数据，并校验日期、图片地址和分页结构。它不下载图片，也不操作 Pinia 状态。

### Store

`dailyFlowerStore` 保留：

- 当日弹窗状态与关闭日期。
- 日期维度的请求去重与结果缓存。
- 历史列表分页和去重。
- 图片下载及本地持久缓存。
- loading 与页面可消费的错误状态。

Store 移除云对象类型、`uniCloud.importObject`、云端响应结构判断和重复底层错误解析。图片持久缓存可拆到 `src/utils/flower/daily-flower-image-cache.ts`，使 Store 保持可读。

### 云对象

`flower-daily` 的三个读取方法改用标准成功响应。分页继续限制 `pageSize <= 50`，使用 `pageSize + 1` 判断 `hasMore`。

客户端不再用可伪造的 `today` 决定可见范围。云端应自行取得当前日期或使用明确的服务端查询上限，禁止读取未来维护数据。

### 开发者维护工具

- `daily-flower-admin` 和 `material-admin` 是开发维护工具，不新增产品入口和运营角色体系。
- 第一阶段保持现有鉴权、发布和上传逻辑。
- 只有共享基础设施确实需要时才做机械性的响应协议适配。
- 正式构建应通过路由或环境配置排除维护工具，而不是只隐藏入口；是否迁移到开发分包另行评估。

## 后续领域迁移

### 用户作品

- 迁移 `flower-works`，所有接口要求登录。
- 保留服务端 UID 隔离和 revision 乐观锁。
- Store 保留列表分页、复制、保存、删除后的本地同步。
- 云端统一成功响应和稳定错误码。
- 将 `WorksCloud` 和重复错误转换移出 Store。

### 素材目录

- 迁移 `flower-catalog`，是否要求登录按业务可见性决定，不因技术便利强制登录。
- API 层校验目录版本及基础结构。
- Store 保留下载队列、缓存命中统计、并发限制和素材准备状态。
- 不把 `material-admin` 混入该阶段。

### 收口

- 移除页面、Store 和普通工具中的直接 `uniCloud.importObject`。
- 删除临时兼容响应解析。
- 统一接口命名和错误展示。
- 补充接口架构说明。
- 单独评估开发维护工具是否迁入开发分包。

## 测试策略

优先使用不触发依赖变更的离线测试：

```bash
node --test tests/*.test.cjs
```

未经明确授权，不运行 `pnpm type-check`、`pnpm lint` 或构建命令。

测试覆盖：

- 通用客户端：新协议解包、错误转换、权限等待、单次重新登录、写操作不自动重试。
- 每日花束 API：有效数据、空记录、非法日期、非法图片地址、非法响应和历史分页。
- Store 回归：请求去重、分页追加、图片缓存命中与失效、状态复位，以及详情页现有加载、重试、复制和跳转行为。
- 用户作品阶段：UID 隔离、revision 冲突、保存与删除后的列表同步。
- 素材目录阶段：目录版本、下载并发、缓存复用和文件失效恢复。

离线云对象测试不等同于真实支付宝云端联调，最终交付必须明确记录未做的云端验证。

## 迁移、兼容与回滚

- 每个领域独立迁移、验证和提交，不跨领域混合。
- 领域迁移期间保留旧调用路径，完成测试后再删除。
- 本轮不主动修改数据库结构；若后续确需修改，必须同步模型、schema 和 index。
- 若客户端与云对象无法同时发布，云端短期提供兼容字段，客户端稳定后再移除。
- 每阶段开始前检查工作区 diff，保留用户现有修改和未跟踪文件。
- 当前已修改的每日花束详情页、相关测试和 `flower-catalog` 云对象必须增量处理，不覆盖其已有意图。

## 验收标准

- 页面和正式业务 Store 不再直接创建云对象。
- 已迁移领域只消费强类型 API，Store 不解析底层云错误。
- 已迁移云对象采用统一成功响应与稳定异常代码。
- 公共接口不受应用登录初始化阻塞；私有接口必须等待鉴权完成。
- 用户数据始终以服务端 UID 作为访问条件。
- 每日花束现有用户体验、缓存、分页和详情重试行为保持不变。
- 开发者维护工具不被误设计为正式管理员产品功能。
- 离线测试通过，所有未执行的类型检查、lint、构建及真实云端联调明确记录。
