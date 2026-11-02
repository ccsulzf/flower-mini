# 每日花束创作标准

每次准备新的每日花束前先读本文，并对照最近已发布/已准备的花束，减少反复沟通和连续撞款。目标不是只填满枝数，而是让用户一眼看到有明确的花艺设计、丰富的层次和惊喜感。

## 创作目标

- 花束要有体量感，至少 40 枝花材；枝数是下限，不是丰富度的替代指标。
- 设计应像一束完整花艺：主花、次主花、配花、叶材各有职责，数量和视觉面积有主次，不要让同一种配花铺满整个花面。
- 花头要有明确的高低、前后、疏密和宽度变化。形成饱满、自然的整体轮廓，避免一把直立长枝、窄高扇形、整齐等距排布或随意散落。
- 花色应协调，建议围绕 2–3 个主色建立冷暖和明度关系，再用少量浅色/中性色过渡。避免高饱和互补色平均铺满，或某个强烈颜色/花型压倒其他主花。
- 花器和背景应参与设计。根据花色、花型和情绪选择衬托场景，不要默认连续使用同一背景；背景需帮助突出花束而非抢焦点。
- 花瓶口要建立清楚的插入关系：陶瓷花瓶使用低饱和灰绿色内腔，玻璃瓶使用更轻的半透明冷灰绿色；保留花瓶材质色的前沿来遮住花茎底部，后沿弱化，避免完整深色圆环让花茎像贴在瓶身上。
- 当日、季节、节假日和特殊事件可以成为灵感，但不是固定花材清单。节日意象可通过色彩、线条、花器、命名或少量点睛花材体现，不要每逢重阳都让菊花成为主角。
- 与上一日相比，至少主动改变主要花材组合、主色关系、花器/背景、轮廓或构图中的数项；不能只改描述或颜色值。

## 本地素材参考

每日创作前先查阅 `docs/daily-flowers/today-bouquet-reference.json`，按本地实际可用素材选材。该索引含主花 35 种、配花 33 种、叶材 25 种、花瓶 9 件和背景 20 件。以 JSON 中的素材 ID 为准；颜色值是素材支持的选项，不代表每束都要全部使用。

花束包装暂不纳入可选素材；包装素材恢复前，成稿容器使用花瓶。

### 主花（35）

- 朱顶红 (`amaryllis`)：红色 `#cc736e`、粉色 `#d6a0a5`、白色 `#eee7da`
- 银莲花 (`anemone`)：奶白 `#e9e3d8`、淡紫 `#b8a4c9`、玫红 `#c87592`
- 红掌 (`anthurium`)：朱红 `#c96d63`、柔粉 `#ce9ca7`、奶白 `#e5e2d1`、青绿 `#a4b792`
- 鹤望兰 (`bird-of-paradise`)：暖橙 `#dba05a`、浅金 `#e1bc77`、珊瑚 `#d28e72`
- 马蹄莲 (`calla-lily`)：奶白 `#eee8db`、淡粉 `#d9a4ad`、香槟 `#ddc59b`
- 康乃馨 (`carnation`)：粉色 `#d898a4`、红色 `#b94b55`、奶白 `#eee5d7`
- 铁线莲 (`clematis`)：淡紫 `#a296c3`、蓝紫 `#7f87b7`、奶白 `#e8e3d8`
- 鸡冠花 (`cockscomb`)：红色 `#c16b7f`、橘色 `#d6936c`、黄色 `#d9be78`
- 棉花 (`cotton`)：奶白 `#f0e9da`、浅米 `#e4d9c3`、灰白 `#deded3`
- 大花蕙兰 (`cymbidium`)：浅绿 `#b9c498`、粉色 `#d6a4af`、奶黄 `#e2cc96`
- 大丽花 (`dahlia`)：酒红 `#a95868`、豆沙 `#c98c9a`、杏色 `#ddb38e`
- 拉丝非洲菊 (`feather-gerbera`)：柔粉 `#d28da6`、杏橙 `#dfad79`、奶白 `#eee4d3`
- 金丝菊 (`firework-chrysanthemum`)：琥珀 `#bd8b43`、浅金 `#d8b76c`、铜橘 `#b7744b`
- 栀子花 (`gardenia`)：白色 `#f0eadb`、奶黄 `#e9dfbc`
- 非洲菊 (`gerbera`)：橘色 `#dc9360`、粉色 `#d7889b`、黄色 `#e1bf62`
- 剑兰 (`gladiolus`)：粉色 `#d498a3`、白色 `#eee6d6`、橘色 `#d8987b`
- 芍药 (`herbaceous-peony`)：浅粉 `#e2a2ac`、珊瑚 `#dc8a7c`、奶白 `#f3e9de`
- 风信子 (`hyacinth`)：淡紫 `#b5a4c8`、粉色 `#d7a4b3`、白色 `#eee8da`
- 绣球花 (`hydrangea`)：淡蓝 `#9eafc9`、淡紫 `#b1a0c3`、柔粉 `#cca0b2`、浅绿 `#b9c29c`
- 鸢尾 (`iris`)：蓝紫 `#9a9bc9`、浅紫 `#b6a9cc`、奶白 `#e6e1d7`
- 帝王花 (`king-protea`)：烟粉 `#bc9098`、浅粉 `#d2b1b6`、奶白 `#e3ddcb`
- 百合 (`lily`)：奶白 `#f2eddf`、浅粉 `#dfb0b8`、杏色 `#e4b38f`
- 洋桔梗 (`lisianthus`)：奶白 `#efe8da`、淡紫 `#b5a2cb`、浅粉 `#ddb0b8`
- 荷花 (`lotus`)：浅粉 `#d8a2ae`、奶白 `#ece3d8`、玫粉 `#c982a0`
- 牡丹 (`peony`)：豆沙粉 `#d38c9a`、奶白 `#f2e8db`、深红 `#b83b50`
- 重瓣菊 (`peony-chrysanthemum`)：紫粉 `#bc8ba7`、柔粉 `#d3a4b5`、奶白 `#e9e4d7`
- 蝴蝶兰 (`phalaenopsis`)：奶白 `#eae6dd`、浅粉 `#d6a7bf`、浅紫 `#bba6c9`
- 针垫花 (`pincushion`)：暖橘 `#d39555`、金黄 `#d9b561`、珊瑚 `#c87e67`
- 乒乓菊 (`ping-pong-chrysanthemum`)：浅绿 `#b4c091`、金黄 `#d9bd6f`、奶白 `#eae4d5`
- 洋牡丹 (`ranunculus`)：杏粉 `#d9a397`、奶白 `#ece5d7`、暖橘 `#d49a69`
- 玫瑰 (`rose`)：珊瑚红 `#ed6965`、深红 `#b82b36`、粉色 `#ce7e8b`、奶白 `#f4f0e6`
- 单瓣洋桔梗 (`single-lisianthus`)：淡紫 `#b1a0c9`、奶白 `#eee9dc`、浅粉 `#d5a4b6`
- 向日葵 (`sunflower`)：金黄 `#dfb64c`、浅黄 `#e8d082`、暖橘 `#d79a53`
- 郁金香 (`tulip`)：奶白 `#f4f0e6`、粉色 `#d78979`、紫色 `#b394db`
- 百日菊 (`zinnia`)：橘色 `#d98f6c`、粉色 `#cf8e9a`、黄色 `#dfc47c`

### 配花（33）

- 金合欢 (`acacia`)：金黄 `#d8bd6b`、浅黄 `#e2cf8d`
- 六出花（水仙百合） (`alstroemeria`)：蜜桃 `#dfaa91`、粉色 `#d4a0b0`、淡黄 `#ddcc9a`
- 落新妇 (`astilbe`)：浅粉 `#d8a9b5`、奶白 `#e5ded1`、玫红 `#b77591`
- 蓝星花 (`blue-star`)：雾蓝 `#9ab8c8`、浅蓝 `#b7cdd6`、奶白 `#ece8dd`
- 兔尾草 (`bunny-tail`)：麦白 `#d9cdb1`、浅棕 `#bba788`、浅粉 `#ceb1b2`
- 风铃草 (`campanula`)：浅紫 `#b0a1c6`、粉色 `#d6a5b9`、奶白 `#eae5dd`
- 洋甘菊 (`chamomile`)：奶白 `#f0e9da`、浅黄 `#e8dbac`
- 樱花 (`cherry-blossom`)：浅粉 `#e6bcc4`、白色 `#eee5dc`
- 海棠花 (`crabapple-blossom`)：粉色 `#d49aa7`、浅粉 `#e6c2c7`、白色 `#eee7dc`
- 小雏菊 (`daisy`)：奶黄 `#f1e5bd`、白色 `#f4f0e6`、金黄 `#e1b94f`
- 飞燕草 (`delphinium`)：蓝色 `#88a8cc`、淡紫 `#b5a7ca`、奶白 `#e8e4dc`
- 石斛兰 (`dendrobium`)：浅紫 `#baa1c5`、粉色 `#d0a1b5`、奶白 `#e8e2d8`
- 尤加利果 (`eucalyptus-pods`)：灰绿 `#a3ad96`、银灰 `#b7b8a9`、棕绿 `#a8997f`
- 小苍兰 (`freesia`)：浅黄 `#e4ca83`、奶白 `#f1e8d8`、淡紫 `#b5a0c8`
- 千日红 (`globe-amaranth`)：玫紫 `#b16b97`、粉色 `#d59aaf`、奶白 `#ece2d8`
- 满天星 (`gypsophila`)：奶白 `#f1eade`、浅粉 `#e2b6bf`
- 红豆果 (`hypericum`)：红色 `#bb7b79`、粉色 `#cfa0a4`、浅绿 `#a5b58b`
- 茉莉花 (`jasmine`)：白色 `#f1ecde`、奶黄 `#e8dfbf`
- 袋鼠爪 (`kangaroo-paw`)：砖红 `#b77e68`、暖黄 `#cbb56e`、浅绿 `#a1af7c`
- 铃兰 (`lily-of-the-valley`)：白色 `#f1ecdf`、淡粉 `#e5cbd0`
- 文心兰 (`oncidium`)：金黄 `#d8bb6c`、浅黄 `#e0ce96`、铜橙 `#cda077`
- 桃花 (`peach-blossom`)：粉色 `#dca6b1`、浅粉 `#ebc8cc`
- 蕾丝花 (`queen-annes-lace`)：奶白 `#eee9de`、浅绿 `#d6ddba`
- 松虫草 (`scabiosa`)：灰紫 `#aea0bd`、酒红 `#98596b`、奶白 `#e7e0d6`
- 金鱼草 (`snapdragon`)：浅粉 `#dfa8b1`、杏色 `#dfb690`、奶白 `#eee5d7`
- 雪果 (`snowberry`)：奶白 `#e9e5da`、浅粉 `#d9b3ba`、浅绿 `#b8c5a0`
- 黄莺草 (`solidago`)：金黄 `#d8b653`、浅黄 `#e5cd7a`
- 多头玫瑰 (`spray-rose`)：浅粉 `#d2a0ac`、奶白 `#e8decf`、蜜桃 `#d6aa90`
- 勿忘我（补血草） (`statice`)：淡紫 `#af91c2`、浅粉 `#d29bad`、奶白 `#eee5d9`
- 紫罗兰 (`stock`)：淡紫 `#b3a1c3`、粉色 `#daa9bd`、奶白 `#ece6dd`
- 香豌豆 (`sweet-pea`)：浅粉 `#dba9ba`、淡紫 `#b8a2c8`、奶白 `#ede6db`
- 澳洲蜡梅 (`waxflower`)：浅粉 `#d5a0b0`、奶白 `#eee7db`、玫粉 `#bd809e`
- 腊梅 (`wintersweet`)：黄色 `#ddc57e`、浅黄 `#e8d8a8`

### 叶材（25）

- 散尾葵 (`areca-palm`)：草绿 `#839c70`、深绿 `#6e8864`
- 文竹 (`asparagus-fern`)：浅绿 `#9daa7c`、草绿 `#80956c`
- 天门冬 (`asparagus-sprengeri`)：绿色 `#91a67c`、深绿 `#738e66`
- 竹叶 (`bamboo-leaf`)：绿色 `#a0b383`、浅绿 `#bac797`
- 芭蕉叶 (`banana-leaf`)：绿色 `#91a578`、深绿 `#718d68`
- 肾蕨 (`boston-fern`)：草绿 `#8ca078`、深绿 `#718f72`
- 山茶叶 (`camellia-leaf`)：深绿 `#819779`、绿色 `#9aab89`
- 银叶菊 (`dusty-miller`)：银灰绿 `#b4c0b1`、灰绿 `#9ead9b`
- 尤加利 (`eucalyptus`)：灰绿 `#91a795`、鼠尾草 `#a7b49c`
- 八角金盘 (`fatsia`)：绿色 `#91a87e`、深绿 `#7e9875`
- 喷泉草 (`fountain-grass`)：麦色 `#c3b290`、灰绿 `#a5af91`、浅褐 `#ae9987`
- 栀子叶 (`gardenia-leaf`)：绿色 `#8fa57b`、浅绿 `#adbc91`
- 常春藤 (`ivy`)：草绿 `#8b9e75`、深绿 `#728d69`
- 富贵竹 (`lucky-bamboo`)：绿色 `#9fb77f`、浅绿 `#b9c990`
- 米兰叶 (`milan-leaf`)：绿色 `#9aad7e`、浅绿 `#b4c595`
- 龟背竹 (`monstera`)：墨绿 `#68856b`、草绿 `#829c73`
- 南天竹 (`nandina`)：绿色 `#a0b18a`、红褐色 `#b78f7e`
- 橄榄叶 (`olive-leaf`)：灰绿 `#a8b39b`、绿色 `#94a686`
- 春羽 (`philodendron`)：绿色 `#91a67b`、深绿 `#7d9572`
- 红叶石楠 (`photinia`)：红褐色 `#be9182`、浅褐色 `#c9aa8b`、绿色 `#a2ae88`
- 马醉木 (`pieris`)：绿色 `#9eb08b`、浅绿 `#b6c39a`
- 蓬莱松 (`plumosa-pine`)：绿色 `#94aa7a`、浅绿 `#b0c28f`
- 银柳 (`pussy-willow`)：银灰 `#d8d5cc`、暖白 `#e5dfd3`
- 雪柳 (`spirea`)：嫩绿 `#a4b48c`、灰绿 `#8b9e7d`
- 剑叶 (`sword-leaf`)：草绿 `#899d70`、深绿 `#728762`

### 花瓶（9）

- 暖白陶瓷花瓶 (`ceramic-vase`)
- 细口玻璃瓶 (`glass-bud-vase`)
- 透明直筒瓶 (`glass-cylinder`)
- 长颈陶瓷花瓶 (`long-neck-vase`)
- 矮圆花瓶 (`low-round-bowl`)
- 磨砂陶瓷花瓶 (`matte-ceramic-vase`)
- 竖纹陶瓷花瓶 (`ribbed-ceramic-vase`)
- 圆肚陶瓷花瓶 (`round-ceramic-vase`)
- 方形花瓶 (`square-vase`)

### 背景（20）

- 赤陶拱廊 (`paper-blush`)（scene）
- 奶油无缝棚 (`paper-ivory`)（scene）
- 燕麦亚麻 (`paper-linen`)（scene）
- 小猫花店 (`scene-cat-florist`)（scene）
- 猫咪偷看 (`scene-cat-peek`)（scene）
- 柯基探头 (`scene-corgi-peek`)（scene）
- 猫咪晒太阳 (`scene-ivory-table`)（scene）
- 午夜画廊 (`scene-midnight-gallery`)（scene）
- 小狗午睡 (`scene-puppy-nap`)（scene）
- 雨天小窗 (`scene-rainy-cat`)（scene）
- 雨天等你 (`scene-rainy-puppy`)（scene）
- 雾蓝展台 (`scene-sage-table`)（scene）
- 柴犬等花 (`scene-shiba-flower`)（scene）
- 日光石台 (`scene-window-table`)（scene）
- 淡粉 (`solid-blush`)（solid）
- 可可棕 (`solid-cocoa`)（solid）
- 浅灰 (`solid-mist`)（solid）
- 浅绿 (`solid-sage`)（solid）
- 浅杏 (`solid-sand`)（solid）
- 暖白 (`solid-warm`)（solid）

## 设计与复核步骤

1. **先看日期和前作**：确认本地日期、节气/节日背景，以及最近一日的主花材、配色、背景和轮廓。明确本次要避开的重复点。
2. **先定一个花艺构思**：用一句话描述用户看到的主视觉，例如丰盛的花园式螺旋、横向展开的自然花面、单侧垂落的瀑布形等。构思需要能从实际构图中看出来，而不只是文案。
3. **分配花材角色**：选择有层次且可用的主花、次主花、配花和叶材。至少 40 枝，主花要形成成组的视觉焦点；配花负责过渡、填隙和节奏，不要因重复花枝数量多就误认为种类丰富。
4. **建立配色和背景**：先检查本地物料色卡与背景候选，再选主色、辅助色、提亮色和叶色。背景应服务于本次主题，并与前作形成区分。
5. **安排三维层次感**：花头坐标需要覆盖有意义的水平宽度和垂直高度；让长枝、主花、填充花和叶材分别处在不同深度/高度，形成有疏密的整体轮廓。避免把所有主花都压在同一高度或集中成一块。
7. **打开维护页看真实预览**：检查整束比例、花头是否重叠、主次是否清楚、花材颜色是否落在素材真实渲染色域内，以及花器/背景是否协调。数据检查和离线测试不能代替视觉预览。
8. **按预览迭代后再发布**：若用户反馈“散”“单调”“撞色”或“不像花艺”，优先重做构图/花材比例/配色/背景，不要只改文案。发布前由用户确认。
