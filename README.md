# wishPiece mini

一个以“愿望碎片”为主题的 uni-app 微信小程序实验项目。

项目最初希望把一些轻量的愿望、想法和生活记录，放进一个更有画面感的首页里：用户可以登录，看到首页内容，并通过拼图式的视觉表达浏览和承载这些碎片。同时，项目也保留了一个相对完整的备忘录 CRUD 示例，用来验证登录、数据隔离和云端能力。

## 项目做什么

当前项目主要包含两部分：

- 首页：展示登录状态、登录初始化、登录失败重试和全局 Feedback 反馈提示。
- 备忘录页面：支持新增、分页加载、编辑和删除；云端模式下按用户隔离数据，Demo 模式下使用本地存储。
- 愿望拼图页面：尝试用图片、碎片和拼图式布局呈现内容，是项目最初的核心探索方向。

项目默认面向微信小程序客户端，后端示例使用支付宝 uniCloud。两者是独立的概念：客户端是微信小程序，云服务商是支付宝云。

## 当前状态

项目目前处于“可运行的实验版本”，暂时不再继续迭代核心交互。

这不是因为技术链路无法实现，而是因为首页拼图这个方向始终没有找到足够满意的方案：

- 拼图需要有明显的视觉吸引力，但不能让用户看不懂内容和操作方式。
- 碎片数量增加后，布局容易变得拥挤，信息层级也不容易保持稳定。
- 如果过度依赖动画和装饰，首页会更像一次视觉展示，而不是一个真正高效的入口。
- 如果把交互规则做得太明确，又容易失去“拼图”和“愿望碎片”本身的趣味性。

在没有找到更自然的内容组织方式之前，继续往首页叠加功能，收益并不高。因此目前保留现有实现，作为一次关于小程序首页表达、登录状态和云端 CRUD 的探索记录。

## 技术栈

- uni-app
- Vue 3 + TypeScript
- Vite
- Pinia
- UnoCSS
- uni-helper
- uni-id / uni-id-pages
- 支付宝 uniCloud 云对象
- 微信小程序客户端

## 运行模式

### Demo 模式

默认使用 Demo 模式，不连接 uniCloud：首页不会发起真实登录请求，备忘录使用本地存储，适合直接预览和演示。

```sh
pnpm install
pnpm dev:demo
```

### 云端模式

完成自己的 DCloud、微信小程序和支付宝 uniCloud 配置后，可以启用云端模式：

```sh
pnpm dev:cloud
```

云端模式需要：

1. 在 `manifest.config.ts` 中配置 DCloud 应用 AppID 和微信小程序 AppID。
2. 用 HBuilderX 打开项目，并将 `uniCloud-alipay` 关联到自己的支付宝云服务空间。
3. 将 `src/uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center/uni-id/config.example.json` 复制为同目录下的 `config.json`，填入自己的微信登录配置和随机密钥。
4. 按项目中的云端结构上传公共模块、`uni-id-co`、`auth`、`token` 和 `memo` 云对象，以及对应数据库 schema/index。
5. 使用微信开发者工具导入构建后的 `dist/dev/mp-weixin`。

真实配置、云空间绑定文件和用户数据不会提交到仓库；`.env`、云空间信息和敏感配置也已加入忽略列表。

## 常用命令

```sh
# 微信小程序开发
pnpm dev:mp-weixin

# Demo / 云端开发
pnpm dev:demo
pnpm dev:cloud

# 构建
pnpm build:mp-weixin

# 类型检查和代码检查
pnpm type-check
pnpm lint

# 不依赖云空间的离线测试
node --test tests/*.test.cjs
```

离线测试使用内存数据库替身，主要验证云对象的输入校验、CRUD 和用户隔离；它不等同于真实云端联调，也不覆盖微信登录、支付宝云数据库和小程序渲染行为。

## 代码入口

- `src/pages/index/index-page.vue`：首页、登录状态和 Feedback 演示。
- `src/pages/wish-puzzle/wish-puzzle-page.vue`：愿望拼图页面。
- `src/pages/memo/memo-page.vue`：备忘录 CRUD 页面。
- `src/utils/appAuth.ts`：登录初始化、Token 校验和登录就绪等待。
- `src/utils/localMemo.ts`：Demo 模式下的本地备忘录存储。
- `uniCloud-alipay/cloudfunctions/memo/index.obj.js`：备忘录云对象，负责鉴权、输入校验和数据操作。
- `tests/`：不连接云空间的离线行为测试。

## 后续可能方向

如果重新启动这个项目，优先级可能不是继续增加首页功能，而是先重新定义“拼图”在产品中的角色，例如：

- 将拼图从首页主导航降级为一种可选的浏览视图。
- 把愿望拆成更明确的卡片、时间线或空间地图，再保留拼图作为视觉层。
- 先验证少量内容下的阅读和创建流程，再决定是否扩大布局自由度。
- 把“好看”与“好用”拆成两个独立的页面或模式，避免一个首页同时承担所有目标。

目前仓库保留这次探索的完整代码，方便继续实验或作为 uni-app、uniCloud、登录和备忘录 CRUD 的参考。
