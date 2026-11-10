# 插花工作台重构设计

## 目标

重构现有插花工作台，使作品数据、坐标计算、素材渲染、编辑交互和页面流程各自具有清晰边界。重构后，同一作品在不同尺寸的手机上保持一致构图，花材、容器和背景通过统一接口编辑和渲染。

本轮仅适配手机竖屏，不处理 iPad、其他平板或横屏。作品数据不包含任何版本字段。若实现涉及云函数、云对象、数据库 schema 或索引，直接切换到新结构，不兼容历史作品、历史草稿或旧接口，也不自动删除历史数据库记录。

## 范围

本轮包含：

- 工作台组件重构；
- 固定逻辑坐标系和手机显示适配；
- 花材、容器、背景的数据模型；
- 作品 Store 与临时 UI 状态的职责划分；
- 撤销、重做和连续编辑事务；
- 花材选择、搜索和最近使用；
- 花瓶与花束切换及布局记忆；
- 首次进入工作台时的素材准备 Modal；
- 草稿、作品、预览、导出、每日花束和 JSON 导入等消费者同步切换新模型；
- 必要的云函数和数据库变更。

本轮不包含：

- iPad、平板或横屏适配；
- 分层或响应式背景素材；
- 旧作品和旧草稿迁移；
- 作品、素材或画布版本字段；
- 收藏、拼音搜索、同义词或复杂标签筛选；
- 花材数量上限。

## 组件架构

```text
FlowerStudioPage
├── StudioTopBar
├── StudioCommandToolbar
├── FlowerWorkspace
│   ├── StudioBackground
│   ├── FlowerArrangement
│   │   └── FlowerInstance[]
│   ├── StudioContainer
│   │   ├── VaseInstance
│   │   └── BouquetInstance
│   └── SelectionOverlay
├── MaterialAdjustPanel
└── StudioMaterialDock
    ├── FlowerMaterialPicker
    ├── ContainerPicker
    └── BackgroundPicker
```

### FlowerStudioPage

页面只负责流程编排：

- 等待登录初始化；
- 准备素材目录和本地素材；
- 恢复草稿或打开已有作品；
- 保存和完成作品；
- 处理离开页面前的保存确认；
- 展示页面级错误。

页面不直接修改花材数组，不处理坐标约束，不维护组件内部状态，也不实现撤销记录。

### FlowerWorkspace

工作台是展示和坐标转换的唯一入口，负责：

- 建立 `698 × 1000` 逻辑坐标系；
- 根据手机可用区域等比缩放并居中；
- 将屏幕触摸坐标转换为逻辑坐标；
- 裁剪画布外内容；
- 按背景、容器后层、花材、容器前层和选中控件的顺序渲染；
- 将交互转换为领域动作。

现有 `FlowerBoard` 演进为该组件，不平行维护两套画板。

### FlowerInstance

每个实例代表一枝完整、可编辑的花材：

- 主花和配花由花朵与花茎组成一个不可分离实例；
- 叶材作为完整枝材使用同一接口；
- 组件只负责渲染；
- 输入为素材内容和完整变换参数；
- 输出为实例 ID 和点击、拖动事件；
- 组件不直接依赖作品 Store 或素材目录 Store。

### StudioContainer

容器组件对外提供统一接口，内部根据类型选择花瓶或花束实现。花束后纸、花材、前纸的分层属于容器内部实现，外部无需感知。

### 工具和选择面板

- `StudioCommandToolbar`：撤销、重做、清空花材、完成作品；
- `MaterialAdjustPanel`：调整当前花材；
- `FlowerMaterialPicker`：分类、搜索和添加花材；
- `ContainerPicker`：切换花瓶和花束；
- `BackgroundPicker`：切换纯色或场景背景。

面板只展示状态并发出操作意图，不直接修改作品数据或维护历史记录。

## 坐标系与手机适配

### 逻辑坐标

作品、拖动约束、容器锚点和导出统一使用固定逻辑画布：

```text
width = 698
height = 1000
```

作品数据不保存手机像素、`rpx`、缩放倍率或屏幕尺寸。

### 显示变换

```text
可用区域 = 屏幕区域 - 顶部导航 - 全局工具栏 - 底部素材栏 - 安全区
scale = min(可用宽度 / 698, 可用高度 / 1000)
offsetX = (可用宽度 - 698 × scale) / 2
offsetY = (可用高度 - 1000 × scale) / 2
```

短屏缩小整个作品，长屏增加留白。作品不拉伸、不重排。

### 坐标转换

```text
logicX = (clientX - offsetX) / scale
logicY = (clientY - offsetY) / scale
```

转换集中在页面级 `useFlowerWorkspaceLayout` 中。Store 和叶子组件只处理逻辑坐标。

### 花材位置

花材保存花茎在容器口的固定点，不保存可推导的花头坐标：

```ts
interface Point {
  x: number
  y: number
}

interface MaterialTransform {
  anchor: Point
  angle: number
  height: number
  scale: number
  mirrored: boolean
}
```

花头位置由固定点、高度和角度推导：

```text
headX = anchor.x + sin(angle) × height
headY = anchor.y - cos(angle) × height
```

花茎底部必须位于当前容器有效瓶口内：

```text
mouthLeft ≤ anchor.x ≤ mouthRight
anchor.y = container.mouthY
```

花头可以少量超出画布以支持自然构图，但其可操作中心不能完全离开安全范围。边界根据实际素材几何、缩放和旋转后的包围盒计算。

画布拖动用于快速调整视觉位置；调整面板用于精确调整位置、高度和大小。花材不能自由脱离容器口。

### 背景

本轮背景继续使用 `698 × 1000` 素材，与作品共享显示变换。`surfaceY` 继续表示容器底部的场景落点。不增加背景分层、平板延展或任何版本信息。

## 作品数据模型

```ts
interface Artwork {
  background: BackgroundSelection
  container: ContainerSelection
  materials: MaterialInstance[]
  containerLayouts: Record<string, MaterialLayout[]>
}

interface BackgroundSelection {
  materialId: string
}

type ContainerType = 'vase' | 'bouquet'

interface ContainerSelection {
  materialId: string
  type: ContainerType
}

type MaterialGroup = 'main' | 'filler' | 'foliage'

interface MaterialInstance {
  id: number
  materialId: string
  group: MaterialGroup
  color: string
  transform: MaterialTransform
}

interface MaterialLayout {
  materialInstanceId: number
  anchor: Point
  angle: number
  height: number
  scale: number
}
```

数组顺序表示图层顺序，索引越大越靠前，不增加 `zIndex` 字段。

容器布局以容器素材 ID 为键，仅保存与容器有关的位置、角度、高度和大小。颜色、镜像、图层顺序以及实例是否存在在所有容器间共享。复制或删除实例时同步更新已有容器布局。

作品数据不保存：

- 任何版本信息；
- 手机或画布显示尺寸；
- 面板、选中和加载状态；
- 撤销、重做历史；
- 素材准备进度。

## 容器切换

容器素材提供统一几何信息：

```ts
interface ContainerGeometry {
  width: number
  height: number
  mouthX: number
  mouthY: number
  mouthWidth: number
}
```

切换规则：

1. 保存当前容器下各花材的布局；
2. 目标容器已有布局时恢复该布局；
3. 首次进入目标容器时，根据目标瓶口重新分布固定点；
4. 首次切换到花束时按花束构图范围调整高度和角度；
5. 切回已使用的容器时恢复布局，不重复缩短或放大；
6. 花瓶和花束共用一个 Store action，组件不包含几何分支；
7. 点击已选容器不产生历史记录。

## Store 设计

### artworkStore

它是唯一作品状态，负责：

- 添加、删除、复制和清空花材；
- 修改颜色、位置、角度、高度、大小和镜像；
- 前移一层、后移一层；
- 切换背景和容器；
- 保存、恢复容器布局；
- 生成作品快照；
- 撤销和重做。

它不请求云端素材、不缓存 SVG、不保存云端作品、不跳转页面、不展示 Toast 或 Modal，也不管理设备布局。

### studioUiStore

管理不属于作品的临时编辑状态：

```ts
interface StudioUiState {
  activePanel: 'materials' | 'containers' | 'backgrounds' | 'adjustment' | null
  activeMaterialGroup: 'recent' | 'main' | 'filler' | 'foliage'
  materialKeyword: string
  selectedMaterialId: number | null
  colorsExpanded: boolean
  finishing: boolean
  addingMaterialId: string | null
}
```

选中状态属于编辑器 UI，不进入作品快照和撤销历史。

### flowerCatalogStore

负责素材目录、按 ID 准备素材、下载和校验文件、内存和持久缓存、搜索以及素材颜色与几何查询。它不修改作品。

### useFlowerWorkspaceLayout

设备布局由页面级 composable 管理，不使用 Pinia。它读取当前窗口和安全区，返回可用编辑区域、缩放、偏移以及屏幕和逻辑坐标转换函数。

### creationSession

继续负责草稿恢复、自动保存、打开作品、未保存修改判断以及保存成功后的会话清理。它通过 `artworkStore.snapshot()` 读取作品，不参与具体编辑动作。

## 撤销与重做

每个完整用户意图对应一条历史记录：

- 添加、复制、删除或清空花材；
- 修改颜色或镜像；
- 前移一层或后移一层；
- 切换背景或容器；
- 一次连续拖动；
- 一次连续滑杆调整。

拖动或滑杆开始时记录原快照，过程中持续预览，结束时提交一个事务。没有实际变化时不产生记录。

历史只保存 `Artwork`。撤销或重做后，如果当前选中实例不存在，则清除选中并关闭调整面板。

## 工具栏与花材调整

### 全局工具栏

包含撤销、重做、清空花材和完成作品。没有相应操作时禁用撤销、重做或清空。清空前二次确认并允许撤销。素材尚未准备好、容器不可用或正在保存时不能完成作品。

### 选中与重叠素材

- 点击花材显示选中轮廓并打开调整面板；
- 点击空白处取消选中；
- 重叠区域按从前到后的视觉顺序命中；
- 重复点击同一区域可以轮换命中项；
- 保留上一枝和下一枝操作。

### 调整能力

- 位置；
- 高度；
- 大小；
- 左右反转；
- 颜色；
- 复制；
- 前移一层；
- 后移一层；
- 删除。

前移和后移分别与数组中的相邻项交换。每次点击形成一条历史记录，到达边界时禁用对应操作。

复制后的实例轻微错开，位于原实例前一层并自动选中。删除后优先选择相邻实例；没有实例时关闭调整面板。

花材添加和复制均不设置数量限制。Store、作品校验、界面和导出流程都不得保留最大数量判断或提示。

## 花材选择

### 分类

分类顺序为：

```text
最近｜主花｜配花｜叶材
```

首次打开默认显示主花。用户主动切换分类后，本次工作台会话记住选择。没有最近记录时，从最近入口回到主花。

### 搜索

- 搜索框位于分类栏下方；
- 按花材名称搜索；
- 忽略首尾空格；
- 搜索跨主花、配花和叶材；
- 搜索结果显示分类；
- 清空关键词后回到原分类；
- 不实现拼音、同义词和复杂标签搜索。

### 最近使用

- 只在本机保存最近成功添加的素材 ID；
- 最多保留 12 个；
- 新使用的排在最前；
- 同一种素材不重复；
- 已下架或不可用的素材自动忽略；
- 不写入作品数据，也不跨设备同步。

### 素材卡

素材卡展示缩略图、名称、当前作品使用数量、加载状态和添加成功的短暂反馈。点击后直接添加，不进入二级详情。异步准备期间防止同一请求重复提交。

## 容器与背景选择

容器分为花瓶和花束。面板默认打开当前容器所属分类，当前容器显示选中状态。切换完成后关闭面板，布局计算完全由 Store 完成。

背景分为纯色和场景。面板默认打开当前背景所属分类，切换后保持打开以便比较。背景加载失败时保留原背景，不产生不完整状态。

## 首次素材准备 Modal

每次 App 运行期间第一次进入工作台时显示阻塞式 `StudioMaterialPrepareModal`：

1. 等待登录状态准备完成；
2. 获取云端素材目录；
3. 按目录中的文件 hash 校验本地缓存；
4. 有效缓存直接读取；
5. 缓存缺失、文件被系统清理或 hash 不一致时重新下载；
6. 全部素材准备完成后进入工作台。

同一次 App 运行期间再次进入，完整内存状态仍然有效时不重复显示。若缓存失效或目录发生变化，则再次显示。

Modal 面向用户保持简单：

- 展示进度条；
- 使用“正在准备花材，请稍候”等简洁文案；
- 不展示文件总数、已处理数量、缓存命中、下载数量、hash 或校验细节；
- 不提供关闭按钮；
- 失败时展示友好错误和“重新加载”按钮；
- 重试只处理尚未成功的素材；
- 完成后关闭 Modal 并初始化工作台。

内部可以维护确定进度所需的数据，但这些实现细节不得直接展示给用户。

## 数据流

### 添加花材

```text
FlowerMaterialPicker
→ 请求 materialId
→ flowerCatalogStore 准备素材
→ artworkStore.addMaterial(material)
→ 更新本地最近使用
→ 选中新实例并打开调整面板
```

素材准备完成前不插入占位实例。加载失败时作品保持不变。

### 编辑花材

```text
FlowerInstance / MaterialAdjustPanel
→ 发出编辑意图
→ artworkStore action
→ 纯函数计算合法变换
→ 更新作品
→ FlowerWorkspace 重新渲染
```

坐标和几何规则集中在纯函数中，包括屏幕坐标转换、容器落点范围、花材包围盒和变换约束。

### 保存作品

```text
creationSession
→ artworkStore.snapshot()
→ 校验结构和素材引用
→ 保存草稿或云端作品
```

保存校验不限制花材数量。

## 校验与异常处理

作品读取校验至少包括：

- ID 和素材 ID 类型正确；
- 坐标、角度、高度和缩放为有限数字；
- 颜色值合法；
- 容器类型为 `vase` 或 `bouquet`；
- 花材分组为 `main`、`filler` 或 `foliage`；
- 容器布局只引用作品中存在的实例。

不校验花材数量，也不读取或写入任何版本字段。

异常规则：

- 花材加载失败不改变作品；
- 容器加载失败保留原容器和布局；
- 背景加载失败保留原背景；
- 已有作品引用缺失素材时展示明确错误，不静默替换；
- 页面隐藏、面板切换或保存前结束正在进行的编辑事务。

## 云端与数据库变更

若实现需要调整云对象、云函数、数据库 schema 或索引，直接采用新模型：

- 不读取旧作品结构；
- 不保留旧字段回退；
- 不编写迁移脚本；
- 不双写新旧结构；
- 不保留旧接口；
- 草稿、作品、每日花束和 JSON 导入同步切换新结构；
- 云端身份校验和所有查询、更新、删除条件继续包含服务端身份；
- 业务集合继续禁止客户端直接读写；
- 不自动删除历史数据库记录。

## 预计调整范围

核心范围包括：

- `src/models/artwork.ts`；
- `src/stores/artworkStore.ts`；
- `src/stores/flowerStudioStore.ts`；
- `src/stores/flowerStudioLayoutStore.ts` 或其替代 composable；
- `src/stores/flowerCatalogStore.ts`；
- `src/utils/flower/artwork-history.ts`；
- `src/utils/flower/arrangement.cjs` 及其类型声明；
- 工作台、花材、花器、选中控件和渲染组件；
- 工作台页面和各选择、调整面板；
- 草稿、作品、预览、详情、卡片、每日花束、JSON 导入和图片导出；
- 必要的云函数、云对象、数据库 schema 和索引。

不修改第三方模块、生成声明或依赖。

## 验收标准

1. 同一作品在不同尺寸手机上保持一致构图；
2. 短屏不会裁掉完整工作台或长花枝；
3. 触摸位置准确映射到逻辑画布；
4. 花朵与花茎始终作为一个实例移动和变换；
5. 花材不会脱离当前容器的有效瓶口；
6. 花瓶和花束恢复各自上次布局；
7. 连续切换容器不会累积改变花材高度；
8. 花材支持位置、高度、大小、镜像、颜色、复制、前移一层、后移一层和删除；
9. 添加和复制花材没有数量限制；
10. 花材支持最近、主花、配花和叶材分类以及名称搜索；
11. 一次连续拖动或滑杆操作只产生一条撤销记录；
12. 素材加载失败不会破坏当前作品；
13. 预览、保存和导出与编辑画面的图层和构图一致；
14. App 运行期间首次进入工作台会完成素材检查和准备，并展示简洁进度 Modal；
15. Modal 不向用户展示文件、缓存、下载或 hash 等技术细节；
16. 作品数据不包含设备状态、UI 状态、历史记录或任何版本字段；
17. 新云端和数据库结构不包含历史数据兼容分支。
