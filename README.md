# uni-cloud-demo

从租房项目提取的 uni-app / Vue 3 / TypeScript 模板。默认客户端是**微信小程序**，后端使用 **支付宝 uniCloud**。不是支付宝小程序登录模板。

## 包含内容

- 微信登录、已有 Token 校验、登录失败重试和登录就绪等待。
- 备忘录新增、分页列表、编辑、删除；云对象按当前用户隔离，校验输入。
- `src/layouts/default.vue` 和 `Feedback`，包含成功、警告、错误三种展示效果。
- Pinia、UnoCSS 主题及语义样式、uni-helper 页面/布局/自动导入、通用 `AGENTS.md`。
- uni-id-pages 及现有配套 uni_modules，保留第三方代码以便后续扩展登录。

Feedback 用于展示通用操作提示。原租房业务、地图、通勤、签到和配置云对象已移除。依赖版本和锁文件沿用源项目以降低版本漂移，尚未做依赖裁剪；没有复制 node_modules。

## 首次配置

### Demo 模式（默认）

默认不启用 uniCloud：首页不会发起登录请求，备忘录使用本地存储，适合直接预览和演示。也可以显式使用 `.env.demo`：

```sh
pnpm dev:demo
```

### 云端模式

完成下面的云空间和登录配置后，使用 `.env.cloud` 开启真实云端能力：

```sh
pnpm dev:cloud
```

云端模式通过 `VITE_ENABLE_UNICLOUD=true` 开启；未开启时不会调用 `uniCloud.importObject`。

1. 在 `manifest.config.ts` 填入自己的 DCloud 应用 `appid` 和 `mp-weixin.appid`。
2. 用 HBuilderX 打开本项目，为 `uniCloud-alipay` 关联你自己的支付宝云服务空间。
3. 将下面文件复制为同目录的 `config.json`，填入自己的微信 AppID/AppSecret，并为 passwordSecret、tokenSecret 设置独立随机值：

   `src/uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center/uni-id/config.example.json`

   `config.json` 已加入忽略列表。示例值不能用于运行。微信 AppID 必须与 manifest 一致。
4. 在 HBuilderX 上传 uni_modules 中 `uni-config-center`、`uni-id-common`、`uni-captcha`、`uni-open-bridge-common`、`uni-cloud-s2s` 公共模块及 `uni-id-pages/uniCloud/cloudfunctions/uni-id-co` 云对象，上传时安装其云端依赖。
5. 上传 `uniCloud-alipay/cloudfunctions/common/auth` 公共模块及 `token`、`memo` 云对象。它们的 file 依赖指向本项目模块，需随依赖一起上传。
6. 上传 uni-id-pages 配套数据库 schema/index、`src/uni_modules/uni-open-bridge-common/uniCloud/database/opendb-open-data.schema.json`（微信登录保存 session key 使用），以及 `uniCloud-alipay/database/demo-memos.schema.json` 和对应 index。不要导入其他项目的用户或业务数据。
7. 在配置好依赖的开发环境中启动微信小程序，使用微信开发者工具导入 `dist/dev/mp-weixin`。

本模板没有附带云空间绑定、生产凭证或真实用户数据。首次运行前必须完成上面配置。

## 开发命令

安装依赖由开发者主动执行：`pnpm install`（项目固定 pnpm 9.15.4）。Agent 未经授权不得安装或修复依赖。

```sh
pnpm dev:mp-weixin
pnpm build:mp-weixin
pnpm type-check
pnpm lint
```

`pnpm dev` / `pnpm build` 同样默认微信小程序。开发和构建的 pre 脚本生成最小 pages.json，随后由页面插件发现首页。自动声明也由插件生成，首次 type-check 前需先完成一次开发编译。

无需安装依赖的云对象行为测试：

```sh
node --test tests/*.test.cjs
```

测试使用内存数据库替身验证输入、CRUD 和用户隔离；不连接云空间，不覆盖真实 uni-id、微信登录、云数据库语义或小程序渲染。

## 代码入口

- `src/utils/appAuth.ts`：登录初始化、Token 校验、等待登录完成。
- `src/pages/index/index-page.vue`：登录状态及反馈演示，首页不请求备忘录数据。
- `src/pages/memo/memo-page.vue`：独立 CRUD 示例页，暂不在首页提供入口。需要时通过 `uni.navigateTo({ url: '/pages/memo/memo-page' })` 打开。
- `src/hooks/useFeedback.ts`：触发反馈，默认文案已通用化。
- `src/stores/feedbackStore.ts`：仅保存最近一次反馈事件。
- `uniCloud-alipay/cloudfunctions/memo/index.obj.js`：鉴权、验证和服务端 CRUD。
- `AGENTS.md`：通用 Agent 开发约束。

## 云端验收

使用自己的配置进行一次完整验证：首次登录、重启复用 Token、Token 失效后重新登录；新增、刷新、编辑和删除备忘录；两个不同微信用户之间的数据不可见；模拟网络失败后重试；超过 20 条记录的加载更多；三种 Feedback 效果。

后续可按实际项目加入用户资料页、退出登录或其他平台登录，目前不预置这些业务。
