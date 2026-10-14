# 每日插花维护

这个分包只在开发环境注册，不会进入正式小程序包。首页的「每日插花维护」入口也仅在开发环境显示。

## 本地 JSON 格式

每日花束由项目维护者准备为 `assets/daily-flower.json`，本地候选物料维护在 `assets/daily-flower-materials.json`。物料清单列出本地素材库里的 ID 候选；页面预览时会与实时云端目录取交集，只为确实存在于云端的花材、花器和背景补入当前 revision 并加载素材。云端缺少所需物料时会列出缺少的候选 ID 并阻止预览/发布，不会回退到内置绘制。

新增花材时，先在本地物料 JSON 中把花材 ID 加入对应花型候选，再确认该 ID 已上传到云端；每日花束 JSON 可继续使用 `artwork` 的现有作品格式，素材 ID 和 revision 由页面按实时云端目录绑定。

## 发布流程

1. 登录有 `admin` 角色的账号。
2. 将准备好的 JSON 保存到 `assets/daily-flower.json`，在首页开发入口打开维护页面，等待 JSON 与云端素材加载并预览。
3. 预览花束、日期和描述。
4. 确认发布后，云端渲染器生成 698 × 1000 PNG；图片以带唯一版本路径的文件上传，云对象验证图片和花束数据后写入 `daily-flower` 集合。
5. 同一日期再次发布会覆盖文档并删除旧图片；如果云存储清理失败，页面会显示警告。

新增云对象 `flower-daily-admin`、更新 `flower-render` 的管理端渲染方法，并部署 `uniCloud-alipay/database/daily-flower.schema.json` 后，管理端才能完成云端发布。
