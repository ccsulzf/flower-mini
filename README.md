# flower mini

一个以鲜花创作为主题的 uni-app 微信小程序，使用 Vue 3、TypeScript、Vite、Pinia 和 UnoCSS。

## 项目功能

- 启动页：全屏插花工作室，立即显示空花瓶；登录后可恢复本账号的临时创作。
- 花草工作室：选择花材，拖动调整位置和角度，设置颜色、花器、背景和图层，支持复制、删除及撤销。
- 完成作品：将新作品保存到云端，或更新正在编辑的作品，并进入作品详情。
- 我的作品：云端保存作品、名字、介绍、花卡文字及缩略图；详情支持相册保存、图片分享、继续编辑、制作贺卡和修改作品信息。
- JSON 预览：独立页面导入作品数据生成花束，不影响工作室的编辑作品。

鲜花创作在客户端完成。项目保留 uni-id 登录基础，默认微信小程序客户端，后端使用支付宝 uniCloud；客户端平台与云服务商是独立的配置。

## uniCloud 配置

应用启动时连接 uniCloud，校验已有 Token 或使用微信 `code` 调用 `uni-id-co.loginByWeixin`。登录成功保存 Token 和过期时间，Token 失效时重新登录；工作室登录失败时可以重试，辅助页面保留登录状态与开发管理入口。并发初始化只执行一次，业务云数据加载前通过 `waitForAppAuthReady()` 等待登录完成。

1. 在 `manifest.config.ts` 中配置 DCloud 应用 AppID 和微信小程序 AppID。
2. 用 HBuilderX 打开项目，将 `uniCloud-alipay` 关联到自己的支付宝云服务空间。
3. 将 `src/uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center/uni-id/config.example.json` 复制为同目录下的 `config.json`，填入自己的微信登录配置和随机密钥。
4. 上传公共模块、`uni-id-co` 和 `token` 云对象；`token` 依赖 `uni-id-common` 公共模块。
5. 使用微信开发者工具导入构建后的 `dist/dev/mp-weixin`。

服务空间关联后，仍需在该空间上传 `uni-id-co`、更新后的 `token` 云对象及其公共模块，并按 uni-id-pages 的数据库目录初始化用户相关集合和索引。微信 AppID、AppSecret 与 uni-id 配置须使用本项目自己的值。Token 校验会以标准 `newToken` 返回续期信息供客户端 SDK 保存。离线测试不替代真实云端登录联调。

鲜花作品在客户端编辑；“保存作品”通过鉴权云对象保存到支付宝 uniCloud，“保存图片”单独保存到手机相册。本地仅保留按账号隔离的临时恢复草稿。真实配置、云空间绑定文件、私有环境变量和密钥不提交到仓库。

## 常用命令

```sh
# 微信小程序开发
pnpm dev:mp-weixin

# 构建
pnpm build:mp-weixin

# 类型检查和代码检查
pnpm type-check
pnpm lint

# 离线测试
node --test tests/*.test.cjs
```

Agent 执行包管理器命令前须遵守 `AGENTS.md` 的授权约束。离线测试验证素材连接、作品编辑历史、布局和图片生成状态，不等同于真实小程序渲染、图片导出或云端登录联调。

## 代码入口

- `src/pages/index/index-page.vue`：辅助入口和登录状态（在工作室长按标题进入）。
- `src/pages/flower-studio/flower-studio-page.vue`：工作室页面及临时面板交互。
- `src/pages/flower-studio/components/`：工作室工具、恢复提示、作品预览与花卡组件。
- `src/pages/flower-works/flower-works-page.vue`：云端作品列表。
- `src/stores/flowerWorksStore.ts`：云端作品分页、读取、保存和删除。
- `src/hooks/useFlowerCreationSession.ts`：临时草稿与会话生命周期。
- `src/pages/flower-json/`：独立 JSON 花束预览。
- `src/components/flower/`：共用画板、花材、花瓶和花束组件。
- `src/models/artwork.ts`、`src/config/flower-materials.ts`：作品类型、素材目录及默认作品。
- `src/stores/artworkStore.ts`：作品编辑、选择、撤销重做和拖动事务。
- `src/hooks/`：工作室布局、触摸拖动与图片生成、保存、分享。
- `src/utils/flower/`：作品解析、坐标约束、SVG 拼接、Canvas 绘制和历史快照。
- `src/utils/flower/svg/`：SVG 花材源文件。
- `src/styles/flower-studio.scss`：共用工作室样式变量。
- `src/static/flower/`：鲜花图片素材。
- `src/utils/appAuth.ts`：登录初始化、Token 校验和登录就绪等待。
- `uniCloud-alipay/cloudfunctions/token/index.obj.js`：Token 校验云对象。
- `tests/flower-svg.test.cjs`：鲜花素材及组件离线测试。

完成预览使用离屏 Canvas 生成 1396 × 2000 PNG，不包含工具栏和选中圈。本地内置素材沿用 Canvas 近似绘制；云素材使用缓存 SVG 的路径和基本图形直接绘制，不再替换为内置造型。不支持的 SVG 特性明确报错，生成约定见本地素材目录 README。相册权限、微信图片分享菜单和真机渲染仍需在微信开发者工具及真机验证；不支持直接分享的平台可先保存图片。

## 开发版素材管理

`src/subpackages/material-admin/` 是开发专用分包，辅助页面仅在开发环境显示“素材管理”，工作室长按标题可进入辅助页面。正式构建不注册该分包，并在生成页面时移除旧 pages.json 中残留的管理路由。

管理页显示云端素材列表并支持确认后删除。访问需要在云控制台给自己的 uni-id 用户设置 `role: ["admin"]`；管理接口会读取该账号当前数据库角色。

档案保存在独立的 `flower-material-assets` 集合，数据库禁止客户端直接读写，云对象校验管理员身份。现有 `flower-catalog` 和旧内置作品继续可用；工作台的云端选材读取 flower-material-assets，下载校验后保存持久文件，再使用真实 SVG 渲染。再次选择命中本地缓存，面板显示下载/命中数量。

上传域名、云存储权限及 SVG 在真实小程序中的显示需运行验证。离线测试覆盖目录解析、分类、上传关联、服务端权限与正式构建配置，不替代正式包检查和云端联调。

## 每日花束用户端

用户端启动后按本地日期公开读取 `flower-daily.getByDate`，浏览每日花束和历史列表无需登录。当天记录不存在、云端读取失败或图片不可用时不显示弹窗；成功读取后下载并缓存发布图片，支持直接分享图片或打开现有贺卡页合成贺卡。关闭、分享或进入贺卡后会记录当天已关闭状态，次日再检查新花束。复制为个人作品时仍需登录。发布和用户端公开读取分别由 `flower-daily-admin` 与 `flower-daily` 云对象提供；上线前部署 `flower-daily`、`common/daily-flower`，并确保 `daily-flower` 集合已创建且客户端无直接读写权限。

工作台顶部「今日」入口打开每日花束列表，按日期倒序查看今日及历史发布内容，也可按具体日期筛选。点击列表卡片进入只读详情页，详情仅提供复制操作；复制会创建一份当前用户自己的作品并返回工作台打开，官方记录不能直接编辑。列表通过已部署的 `flower-daily.listHistory` 读取，部署更新后的 `flower-daily` 云对象后才能使用。

## 云端作品部署与流程

本次新增代码需要部署后才能真实使用云端保存：

1. 上传 `common/auth` 公共模块及其 `uni-id-common` 依赖，再上传 `flower-works` 云对象。
2. 初始化 `flower-works.schema.json` 和 `flower-works.index.json`。支付宝云索引已声明字符串/long 类型；集合禁止客户端直接读写。
3. 重新运行项目构建，让路由插件生成工作室首页与“我的作品”路由。不要手改生成声明或 `pages.json`。
4. 用同一账号在两台设备验证保存、打开与继续编辑，并检查相册授权、分享与安全区。

当前客户端保存作品只发送作品 JSON、标题和介绍，不上传图片。详情原图由 `flower-render` 根据作品 ID 从服务端读取作品 JSON，再按素材 ID 读取云存储 SVG 并生成 PNG，随后直接上传到云存储作品固定路径 `flower-works/{用户哈希}/{作品 ID}/artwork.png`。服务端按登录 uid 校验作品归属，更新和删除都直接按作品 ID 执行。制作贺卡时复用已下载的作品 PNG，在本地 Canvas 上叠加收件人、祝福和署名并导出；贺卡合成图片不上传云端。

打开详情使用独立编辑状态，未选择“继续编辑”前不写本地草稿。恢复提示未处理或草稿读取失败时不会覆盖旧缓存；可重新读取或明确重新开始。原图分享可以跳过花卡；取消编辑不修改已提交文字。结束创作不删除云端作品或素材缓存。

云端上传接口和支付宝索引配置分别依据 [DCloud 云存储文档](https://doc.dcloud.net.cn/uniCloud/storage/dev.html) 与 [索引文档](https://doc.dcloud.net.cn/uniCloud/db-index.html)。已获授权完成微信正式构建验证（使用 pnpm 9.15.4，CHOKIDAR_USEPOLLING=1），产物位于 dist/build/mp-weixin。工作室为启动页，我的作品在主包，正式包不含素材管理分包，Feedback 全局挂载保留。本次未部署云端或进行真机操作；离线测试和构建不代表云端联调通过。
