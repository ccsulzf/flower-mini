# 本地花材档案

Codex 生成素材后先保存到这里，每个素材使用独立目录。重新编译开发版后，管理页自动识别档案；左侧分类，右侧列表，点击查看详细卡片。只点击上传按钮时才写入云端。本目录随开发管理分包排除在正式包之外。

```text
assets/my-flower/
  material.json
  flower.svg
  stemWithLeaves.svg
  stemWithoutLeaves.svg
```

叶材（group 为 foliage）使用 `foliage.svg` 替代上述三份 SVG。每份 SVG 自带正确的 viewBox，不强制统一大小。预览分别展示原文件，不再做试插拼接。花朵颜色可用 `__COLOR__` 占位；茎叶保持自己的固定颜色。

material.json 示例：

```json
{
  "id": "my-flower",
  "name": "我的花材",
  "introduction": "简单介绍",
  "flowerMeaning": "花语",
  "group": "main",
  "colors": [{ "name": "粉色", "value": "#d78979" }],
  "version": 1
}
```

- id 是唯一稳定标识，使用小写字母开头，允许小写字母、数字、连字符，最多64位；新增品种不需要改代码。
- group 为 main（主花）、filler（配花）、foliage（叶材）。
- 名字最多40字、介绍2000字、花语500字；颜色1–20种，颜色名最多20字，颜色值必须为六位十六进制。
- SVG 最大64K字符，使用完整 svg 根元素，不含外链、脚本、事件属性等。建议生成简洁的自包含 SVG。
- version 为正整数。修改信息或任意 SVG 会自动改变内容 revision；提升 version 便于人工识别。
- 不完整、无效或 id 重复的档案会在页面报告错误，不会出现在可上传列表。

示例的花语是常见表达，颜色间可能有不同寓意，可在档案中进一步说明。示例花朵和带叶花茎复制自工作台原素材，去叶版本只保留茎线，原工作台 SVG 未改动。

## 云端

上传 `flower-material-admin` 云对象与 `flower-material-assets.schema.json`。自己的 uni-id 用户须有 admin 角色，权限由管理接口读取当前数据库角色。档案保存在 flower-material-assets 集合，文件在 flower-materials/<id>/ 下；它与现有工作台的 flower-materials 旧目录集合分开，本阶段不改变编辑器渲染。

本地浏览不需要云端。点击“检查上传状态”成功后，根据 id 与 revision 显示未上传、已上传、有更新；检查前显示待检查，读取失败不会把未知状态当成未上传。上传不会因选择颜色或打开卡片自动发生。若文件已上传但数据库写入失败，不标记成功，可重试；当前不自动清理这种未关联的云端文件。

“全部上传”覆盖全部分类，自动跳过云端相同 revision 的素材，逐项显示进度。单项失败不影响后续上传，结束后可只重试失败项；读取云端状态失败时保留原失败列表。上传和删除期间禁止重复操作。

详情中的“删除云端素材”须确认，只删除对应云端档案，本地素材和云文件保留，可重新上传。新增删除接口需重新上传部署 `flower-material-admin` 云对象后使用。

## 花瓶与工作台消费

花瓶目录使用 `category: "vase"`，只需介绍与 `vase.svg`。geometry 提供 width、height（工作台显示 rpx）、mouthX、mouthY、mouthWidth（同一坐标系）；瓶口中心会对齐工作台 (350,747)。参考 ceramic-vase 示例。

花材 geometry 提供 width、flowerHeight、stemHeight、connectionY；花朵和花茎 SVG 须有 viewBox，花茎中轴与顶端连接花朵。已有 rose/tulip/daisy 自动补默认几何；新 ID 必须提供几何。工作台将宽度归一到110rpx，按连接点拼接，并保留作品里的素材 ID 与 revision。

完成图片直接绘制缓存 SVG 的基本图形和路径。生成素材请使用 path/circle/ellipse/rect/line/polygon/polyline/g/svg，translate/scale/rotate，纯色或 userSpaceOnUse 线性渐变。滤镜、mask、clip-path、CSS style、渐变变换、渐变描边、stop-opacity、objectBoundingBox 渐变、evenodd 和虚线暂不支持，导出会报错；不要生成依赖这些特性的正式素材。

## 常见插花素材第一批

新增 24 种简化插画素材：

- 主花：牡丹、芍药、康乃馨、百合、非洲菊、向日葵、洋桔梗、大丽花。
- 配花：满天星、勿忘我（补血草）、小苍兰、黄莺草、洋甘菊、蕾丝花、千日红、金鱼草。
- 叶材：尤加利、银叶菊、龟背竹、文竹、散尾葵、剑叶、常春藤、雪柳。

主花与配花均包含独立花朵、带叶花茎、去叶花茎；叶材包含完整叶枝。叶材也使用 `__COLOR__` 控制主色。每个档案含显式几何、多种颜色、介绍和象征表达。它们是方便创作的风格化示意，花语不是唯一或固定解释。

整批试插总览：`docs/material-previews/common-flower-materials.html`，可用浏览器打开。当前仅保存本地，须在开发版管理页预览并主动上传后才进入用户素材目录。

## FORi 风格精细化样稿

参考 https://fori-flower-studio.com/ 的自然植物轮廓、柔和明暗与纸张折面，独立重绘第一批 7 个档案：玫瑰、洋桔梗、向日葵、满天星、尤加利、磨砂陶瓷花瓶、米白雾面花束包装（保留 `frosted-wrap` 标识）。第一批风格确认后，继续重绘其余 35 个档案；现有 42 个档案全部为 version 2 及以上（方形花瓶重绘后为 version 3），包含主花 10、配花 9、叶材 8、花瓶 9、花束包装 6。

新版保留原有文件接口及换色占位，使用现有 Canvas 支持的基本路径、透明度和 userSpaceOnUse 线性渐变。玫瑰、郁金香、小雏菊补充显式几何，其余档案保留连接点和瓶口几何。牡丹与芍药使用宽卷瓣，康乃馨保留细碎瓣缘，大丽花使用尖瓣；配花保留各自的分枝与花序，叶材保留品种叶形。玻璃瓶增加边缘反光和底部厚度，暖白陶瓷花瓶增加柔和明暗，包装增加折面和束口。

完整目录为 `docs/material-previews/refined-flower-catalog.html`，按五类展示全部 42 个档案，支持换色，并可展开本轮 35 个档案的原版对比。第一批 7 个样稿的对比仍保留在 `docs/material-previews/refined-flower-samples.html`。旧总览是原版静态快照，查看重绘后的素材请使用这两个新页面。

样稿仅在本地保存，未自动上传云端；需在开发版素材管理页查看并上传后，才会进入用户目录。离线绘制检查不能替代微信小程序中的视觉检查及云端联调。

## 主花扩充

在已确认精细化风格的基础上，参考 FORi 主花目录新增 12 种：金丝菊、拉丝非洲菊、单瓣洋桔梗、乒乓菊、洋牡丹、重瓣菊、针垫花、帝王花、棉花、绣球花、红掌、鹤望兰。每种均包含独立花朵、带叶和去叶花茎、明确连接几何、多种配色及介绍；新增档案从 version 1 开始。鹤望兰的侧向花头在 x=29 接入花茎，花茎底端仍归到 x=55。

当前总数为 54 个档案：主花 22、配花 9、叶材 8、花瓶 9、花束包装 6。完整目录仍为 `docs/material-previews/refined-flower-catalog.html`；本轮新增专页为 `docs/material-previews/additional-main-flowers.html`。仅保存本地，未自动上传云端。

## 大陆常用名称与简介

已移除本地罂粟档案及预览卡片。全目录 54 个档案的名称和简介采用中国大陆花材常用表达，说明花形、叶形和搭配用途；勿忘我标注为补血草。修改后的档案提升 version，内容 revision 自动更新，须手动上传后才更新云端目录。稳定 ID 保留，旧作品兼容渲染不变。

名称参考：[洋牡丹／花毛茛](https://lyj.hunan.gov.cn/lyj/tslm_71206/lykp/syjs/201512/t20151227_2609872.html)、[红掌](https://yllhj.beijing.gov.cn/ztxx/bjhx/bzhz/201712/t20171220_759319.shtml)、[鹤望兰](https://lyj.hunan.gov.cn/tslm_71206/lykp/syjs/201512/t20151227_2616206.html)、[拉丝非洲菊](https://www.yunhuayuan.net/newsdetail_lsfzj.htm)、[补血草与勿忘我商品名](https://dgcg.dg.gov.cn/zwy/kxjy/201301/00f9959c85e3494eab03a4a94fe192cd.shtml)。

## 常见花材补充

新增 10 种：主花为马蹄莲、大花蕙兰；配花为紫罗兰、飞燕草、风铃草、六出花（水仙百合）、松虫草、落新妇；叶材与枝材为肾蕨、银柳。银柳沿用 foliage 分类，固定木质枝色，换色仅影响绒毛芽。紫罗兰指切花紫罗兰，不是非洲堇。

当前共 64 个档案：主花 24、配花 15、叶材与枝材 10、花瓶 9、花束包装 6。新增花材提供独立花头、带叶花茎和去叶花茎；全部有几何信息、多种配色和大陆常用名称简介。落新妇采用紧凑的独立小花路径，保持单份 SVG 在 64K 字符限制内。

新增专页：`docs/material-previews/additional-common-materials.html`；完整目录已同步更新。仅保存本地，重新编译开发版后可在素材管理中使用“全部上传”上传新增档案。新增候选依据切花标准、鲜切花产区资料及切叶切枝分类；本轮未能通过网络工具获取 FORi 页面，延续此前已确认的插画表达。

## 花束敞口渲染

工作台和图片导出将花束拆成后纸、花枝、前纸三层。原包装 SVG 作为后层，前层按原有纸色生成两侧敞开的折面与束口，花茎在中间露出并收拢。兼容已上传的单份 bouquet.svg，无需重新上传；旧档案的中部 mouthY 在渲染时改按下方束口定位。组合检查页为 `docs/material-previews/open-bouquet-layout.html`，素材管理中的单独包装原图仍保留。

## 花材精调与品种扩充（2026-10-11）

工作台统一使用去叶花茎（独立叶材仍可添加），素材原始带叶版本保留在管理预览中。新增花材默认有轻微角度；浮动工具栏支持每次 1 度的角度微调、4rpx 高度微调、2% 大小微调及左右镜像。镜像随作品 JSON、复制和撤销保留；图片导出使用同样的变换。上一枝／下一枝可遍历重叠花材；作品上限为 48 枝。

目录先显示，下载在后台继续进行；选择花材时只等待所选素材，避免后台下载阻塞整个面板。缩略图按 ID 与 revision 缓存编码结果，刷新目录可重新准备新增版本。此改动未经过实机网络测速。

本轮新增蝴蝶兰、银莲花、鸢尾、荷花、多头玫瑰、文心兰、石斛兰、红豆果（金丝桃果实），当前共 72 个档案：主花 28、配花 19、叶材 10、花瓶 9、花束 6。花材共 57 种。新增预览为 `docs/material-previews/additional-flower-varieties.html`；重新编译后须在素材管理上传，才会出现在用户目录。

形态资料参考：北京市园林绿化局“特殊洋兰”（https://yllhj.beijing.gov.cn/ztxx/jhgm/202403/t20240301_3577869.shtml）、上海市农业农村委员会“花卉新优品种介绍”（https://nyncw.sh.gov.cn/nyjs/20190122/0009-112895.html）。

## 自然弯曲花茎

47 种主花和配花的 `stemWithoutLeaves.svg` 已重绘中段曲线并提升版本。郁金香、马蹄莲等采用较明显的左弯；非洲菊、洋桔梗等采用右弯；粗壮花材采用轻弧线。保持原花头连接点（鹤望兰 x=29，其余 x=55）及茎底 (55,260)，不会靠旋转整枝模拟弯曲。镜像后弯曲方向随整枝反转。

`stem-curves.ts` 仅对已知格式的近直线旧花茎做兼容处理，已绘制的明显曲线保持原样；工作台与 Canvas 导出共享处理。重新编译即可使旧云端直茎呈现弧度，上传新版本后云端原图也同步更新。带叶原始档案保留，工作台继续统一使用去叶版本。组合检查页：`docs/material-previews/curved-flower-stems.html`。

## 背景素材

工作台背景分为纯色和场景。纯色内置暖白、浅绿、浅灰、淡粉、浅杏、可可棕；场景首批提供米白纸纹、浅灰麻纹、淡粉纸纹、暖白墙与木桌、浅绿墙与石台、窗边柔光。场景沿用素材管理的全部上传、单独上传、单个删除与版本缓存。

背景档案使用 `category: "background"`，文件为 `background.svg`，geometry 为 width、height 与可选 surfaceY（背景坐标中的花瓶底部落点）。当前背景尺寸为 698 × 1000；桌面场景 surfaceY 为 910，纸纹无需设置。编辑与 Canvas 导出都先绘制背景，再按同一偏移绘制花瓶与花枝。作品 JSON 保存 backgroundMaterialId/backgroundMaterialRevision，切换纯色清除场景引用，支持撤销。

启用前需部署 `flower-material-admin` 云对象及 `flower-material-assets.schema.json`，再通过开发版素材管理上传六种场景；正式客户端不包含管理素材原文件。场景预览：`docs/material-previews/background-materials.html`。

## 容器往返布局恢复

作品按容器 ID 与 revision 保存各枝的落点、角度、高度及大小（containerLayouts）。再次选择同一容器恢复它上次的布局；颜色、镜像、图层顺序、新增与删除仍共享当前花材列表。首次切入花束才按包装形式调整高度，首次从花束转到新花瓶会展开并调整新花枝；反复切回已经使用过的容器不再累积缩短。布局记忆随撤销、重做和作品 JSON 保存，并做独立参数校验。
