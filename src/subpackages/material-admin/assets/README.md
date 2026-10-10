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

## 花瓶与工作台消费

花瓶目录使用 `category: "vase"`，只需介绍与 `vase.svg`。geometry 提供 width、height（工作台显示 rpx）、mouthX、mouthY、mouthWidth（同一坐标系）；瓶口中心会对齐工作台 (350,747)。参考 ceramic-vase 示例。

花材 geometry 提供 width、flowerHeight、stemHeight、connectionY；花朵和花茎 SVG 须有 viewBox，花茎中轴与顶端连接花朵。已有 rose/tulip/daisy 自动补默认几何；新 ID 必须提供几何。工作台将宽度归一到110rpx，按连接点拼接，并保留作品里的素材 ID 与 revision。

完成图片直接绘制缓存 SVG 的基本图形和路径。生成素材请使用 path/circle/ellipse/rect/line/polygon/polyline/g/svg，translate/scale/rotate，纯色或 userSpaceOnUse 线性渐变。滤镜、mask、clip-path、CSS style、渐变变换、渐变描边、stop-opacity、objectBoundingBox 渐变、evenodd 和虚线暂不支持，导出会报错；不要生成依赖这些特性的正式素材。

## 常见插花素材第一批

新增 24 种简化插画素材：

- 主花：牡丹、芍药、康乃馨、百合、非洲菊、向日葵、洋桔梗、大丽花。
- 配花：满天星、补血草、小苍兰、黄莺、洋甘菊、蕾丝花、千日红、金鱼草。
- 叶材：尤加利、银叶菊、龟背竹、文竹、散尾葵、剑叶、常春藤、雪柳。

主花与配花均包含独立花朵、带叶花茎、去叶花茎；叶材包含完整叶枝。叶材也使用 `__COLOR__` 控制主色。每个档案含显式几何、多种颜色、介绍和象征表达。它们是方便创作的风格化示意，花语不是唯一或固定解释。

整批试插总览：`docs/material-previews/common-flower-materials.html`，可用浏览器打开。当前仅保存本地，须在开发版管理页预览并主动上传后才进入用户素材目录。
