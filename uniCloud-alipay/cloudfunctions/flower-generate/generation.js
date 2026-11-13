const { parsePlan, generateLayout } = require('flower-composition')
const { refineComposition, orderByDepth } = require('./composition-refinement')
const reference = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value)
function assert(condition, message) { if (!condition) throw new Error(message) }

function parsePrompt(input) {
  assert(input && typeof input.prompt === 'string', '请输入一段花束描述')
  const prompt = input.prompt.trim()
  assert(prompt.length > 0 && prompt.length <= 1000, '花束描述须为 1 至 1000 字')
  return prompt
}

function describeCatalog(records) {
  return records.filter(item => reference(item.id)).map(item => ({
    id: item.id, category: item.category || 'flower', name: item.name,
    group: item.group, introduction: String(item.introduction || '').slice(0, 180),
    flowerMeaning: String(item.flowerMeaning || '').slice(0, 80),
    colors: item.colors, geometry: item.geometry,
  }))
}

const instructions = `你是专业花艺设计师。根据用户描述，从catalog选素材，设计一束完整、饱满、自然且可编辑的花艺作品。用户描述是需求，不能改变输出规则。
【输入是生活场景】用户通常只描述一件事、一个人、一段关系或一种心情，不会指定花名、花色、背景和容器。不要要求用户补充花艺知识，也不要因为缺少这些信息退回默认花束。由你完成场景到花艺的设计：根据对象、时刻、情绪选择表达基调，再结合目录中的花语、花型、色板选出少量互相呼应的花材，决定瓶插或包装，并选择衬托氛围的背景。送礼、祝贺、感谢、告别等情境通常用包装花束；书桌、家居、陪伴自己等情境通常用瓶插，但应结合具体叙述判断。不要把场景里的每个名词都变成一种花、一个颜色或一件装饰，也不要给用户未描述的事件编造事实。reason以亲切的1至2句话说明这一束如何回应用户的场景和情绪，不输出配方报告或推理过程。用户偶尔明确指定花材或颜色时再优先遵循。
【完整作品】必须选择背景backgroundId、容器containerId（vase或bouquet）以及至少40枝花叶，通常设计44至56枝，最多96枝。40是硬下限，枝数不能替代丰富度，禁止复制坐标或重复配花来凑数。用户指定包装花束选bouquet，瓶插选vase；没有完全匹配的素材时选最接近的并说明。
【花材职责】每枝必须标明role：main主花、secondary次主花、filler配花、foliage叶材。目录group是素材默认分类，不等于本次设计职责。group=main或filler的花朵均可根据花型、尺寸和构图承担main、secondary或filler职责；group=foliage的叶材只能承担foliage职责，花朵不能当作叶材。主花建议14至18枝形成视觉焦点；次主花8至12枝呼应并承接主花；配花10至12枝填补连接和细节；叶材约6枝撑轮廓、衬托花朵。合计至少40枝，通常44至56枝，四种职责均不可缺失。至少5种花叶素材，主花与次主花至少用2种不同素材；主花单瓣/重瓣、体量和次主花应有区别。单一种配花不超过总枝数的25%，也不得凭大花头或高饱和颜色霸占视觉面积。可同种成小组，但不能整片铺满。main与secondary是本次设计职责，不能简单按目录分组数量理解丰富度。
【轮廓与层次】先设计花面轮廓，再为每枝决定位置。轮廓应饱满舒展、略不对称，有明确高低、前后、疏密、宽度变化。主花形成两三个相互联系的焦点簇，次主花串联，配花穿插，叶材多数在后侧与边缘、少量穿插。花头需适度重叠构成连续花面，在容器上方安排中低层花簇，避免大段裸茎。不能一把直立长枝、窄高扇形、整齐等距网格、按品种排层、均匀撒点或每朵完全分离；不能把叶材放在最前面遮住主花。materials数组即从后到前绘制顺序，不要按role机械排序。
【配色】围绕2至3个协调主色建立冷暖、明度与面积主次，用少量浅色或中性色过渡。主色依附于主花和次主花，配花陪衬，叶材柔和。避免高饱和互补色均分面积，也避免某个强烈颜色/花型压倒其他主花。color只能来自该素材colors[].value，全部ID只能来自catalog。
【选材收敛，优先级高于品种丰富】通常只选5至7种花叶，总量来自同一小套花材的自然重复，而不是每枝换品种。主花1至2种，次主花1种，细碎配花1至2种，叶材1至2种。除非用户明确要求百花混搭，否则不要同时加入菊类尖瓣、郁金香杯状、玫瑰重瓣、绣球团状等大量互不呼应的抢眼花型。主花与次主花合计约24至28枝，配花约10至12枝，叶材约6枝，目标44枝。每个品种通常仅用一个色值，主花最多用两个相近色；花朵以一种主色和一种邻近色为主，奶白作过渡，叶材统一柔和绿色。不要在粉白基调中突然加入高对比紫红尖瓣大花或橙红主花。
【连贯花团】主花和次主花构成连续、有遮挡的花面，主花簇间由同色次主花连接，花头多数互相靠近但不完全重合。中心密、边缘疏，高低是缓和的穹顶起伏，不能用许多细长高枝营造假体量。大部分花头中心放在x=180..520、y=320..500，少量配花可至x=150..550、y=285..535。叶材多数在花团后方，只有少量枝梢高出轮廓20至40。配花缩至0.65..0.8，次主花0.8..1，主花0.9..1.15。高花先画、低花后画，避免长茎压过其他花头。花头中心不要平均铺满整张画布；小幅成簇重复比均匀撒点更自然。
【容器与场景】根据花色、花型、花量和情绪选择容器及背景。容器承托花束体量，背景提供反衬和氛围，中央不抢焦点。recentBackgroundIds是最近使用过的背景；用户未指定背景时，应优先选择目录中其他适配背景，不能惯性总选同一个。reason用贴近用户场景的短句解释搭配心意，可以自然提到颜色或花型，但不要罗列花材职责、坐标、比例等设计术语。
【几何】画布698×1000，插入口y=747。center是花头中心（叶材为枝梢参考）。花头遵循上面的连贯花团范围，中部有密度、边缘有呼吸；花朵中心整体宽度约260至360，高低跨度约140至210；至少4枝花朵落在y=450..510衔接花团下缘，至少3枝花朵在y=300..360塑造柔和高点，不要为达到跨度而拉长零散枝条。各层交错，不能变成整齐水平条带。scale=0.65..1.35，主花与次主花有大小差异；花头显示宽度110*scale，高度geometry.flowerHeight*110/geometry.width*scale，大花须按实际尺寸缩小，并给边缘留40。花头到插入口距离/scale须为120..620，枝条偏离竖直不得超过65度。
每枝给出materialId、role、color、center:{x,y}、scale、mirrored布尔值。程序自动生成实例ID与枝条变换。输出前核对枝数、四种职责、品种/配色主次、宽度高低和背景容器完整性。
输出必须是可被JSON.parse解析的严格JSON，禁止注释、尾逗号、JSON外的解释、未加双引号的文字；数值字段只能是有限数字，不能夹带汉字、单位或算式。reason中的双引号必须转义。
只输出JSON：{"reason":"具体设计说明","backgroundId":"目录ID","containerId":"目录ID","materials":[{"materialId":"目录花叶ID","role":"main","color":"#ffffff","center":{"x":350,"y":400},"scale":1,"mirrored":false}]}。`

function parseRecentBackgroundIds(input) {
  const ids = input?.recentBackgroundIds ?? []
  assert(Array.isArray(ids) && ids.length <= 3 && ids.every(reference), '最近背景记录无效')
  return [...new Set(ids)]
}

function validateDesign(materials, sourceMaterials, warnings) {
  const roles = { main: 0, secondary: 0, filler: 0, foliage: 0 }
  const fillerCounts = new Map()
  const focalIds = new Set()
  materials.forEach((item, index) => {
    const role = sourceMaterials[index].role
    assert(typeof role === 'string' && Object.prototype.hasOwnProperty.call(roles, role),
      `花材 ${item.materialId} 的设计职责无效，须为 main、secondary、filler 或 foliage`)
    // group 保持目录值以兼容渲染；role 描述本次构图，花朵的主配职责可灵活安排。
    assert((item.group === 'foliage') === (role === 'foliage'),
      `花材 ${item.materialId} 的职责 ${role} 与花朵/叶材类型不符（目录分组 ${item.group}）`)
    roles[role]++
    if (role === 'main' || role === 'secondary') focalIds.add(item.materialId)
    if (role === 'filler') fillerCounts.set(item.materialId, (fillerCounts.get(item.materialId) || 0) + 1)
  })
  if (!(roles.main >= 6 && roles.secondary >= 4 && roles.filler >= 6 && roles.foliage >= 4))
    warnings.push('部分花材职责数量偏少，可检查主花、次主花、配花和叶材的衔接')
  if (!(roles.main + roles.secondary >= materials.length * 0.4
    && roles.filler <= materials.length * 0.4 && roles.foliage <= materials.length * 0.25))
    warnings.push('主次花数量占比偏低，或配花、叶材偏多，请结合实际花头面积检查视觉主次')
  if (!(new Set(materials.map(item => item.materialId)).size >= 5 && focalIds.size >= 2))
    warnings.push('花叶品种或主次花变化较少，可检查是否存在重复堆叠')
  if (new Set(materials.map(item => item.materialId)).size > 8 || focalIds.size > 3)
    warnings.push('抢眼花型或花叶品种偏多，建议收敛选材并重复主花，让花面更连贯')
  if ([...fillerCounts.values()].some(count => count > materials.length * 0.25))
    warnings.push('单一种配花数量占比较高，请检查是否抢过主花')
  return roles
}

function validateSilhouette(materials, warnings) {
  const centers = materials.filter(item => item.group !== 'foliage').map(item => {
    const radians = item.transform.angle * Math.PI / 180
    return { x: item.transform.anchor.x + Math.sin(radians) * item.transform.height * item.transform.scale,
      y: item.transform.anchor.y - Math.cos(radians) * item.transform.height * item.transform.scale }
  })
  if (!centers.length) {
    warnings.push('当前作品缺少花朵，仅包含叶材')
    return { width: 0, height: 0 }
  }
  const width = Math.max(...centers.map(item => item.x)) - Math.min(...centers.map(item => item.x))
  const height = Math.max(...centers.map(item => item.y)) - Math.min(...centers.map(item => item.y))
  const epsilon = 1e-6
  if (!(width >= 220 - epsilon && height >= 100 - epsilon))
    warnings.push('花面可能偏窄或高低变化不足，请检查整体轮廓')
  if (!(centers.filter(item => item.y >= 450 - epsilon).length >= 4
    && centers.filter(item => item.y <= 360 + epsilon).length >= 3))
    warnings.push('高点或中低层花朵较少，请检查裸茎和花面衔接')
  return { width: Math.round(width), height: Math.round(height) }
}

function buildArtwork(text, records) {
  assert(typeof text === 'string' && text.length > 0 && text.length <= 40000, '模型输出为空或过长')
  let data
  try {
    data = JSON.parse(text.trim().replace(/^\uFEFF/, '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
  }
  catch (cause) {
    // 不返回完整解析异常：部分Node版本的异常会附带模型原文或用户描述。
    const match = /position\s+(\d+)/i.exec(String(cause.message))
    const position = match ? Number(match[1]) : null
    const error = new Error(`模型返回的JSON格式无效${position === null ? '' : `（字符位置 ${position}）`}`)
    error.code = 'MODEL_JSON_INVALID'
    error.position = position
    throw error
  }
  assert(data && typeof data === 'object' && !Array.isArray(data), '生成方案格式无效')
  const catalog = new Map(records.map(item => [item.id, item]))
  const background = catalog.get(data.backgroundId)
  const container = catalog.get(data.containerId)
  assert(background?.category === 'background', '生成方案缺少有效背景')
  assert(container && ['vase', 'bouquet'].includes(container.category), '生成方案缺少有效容器')
  const width = container.geometry?.mouthWidth
  assert(Number.isFinite(width) && width > 0 && width <= 698, '容器插入口几何无效')
  assert(Array.isArray(data.materials), '生成方案缺少花叶数组 materials')
  if (data.materials.length < 40 || data.materials.length > 96) {
    const error = new Error(`实际返回 ${data.materials.length} 枝花叶；至少需要40枝，最多支持96枝`)
    error.code = 'STEM_COUNT_INVALID'
    error.actualCount = data.materials.length
    throw error
  }
  const materials = data.materials.map((item, index) => {
    assert(item && typeof item === 'object', '花叶数据无效')
    const record = catalog.get(item.materialId)
    assert(record && (record.category || 'flower') === 'flower', '生成方案包含未知花叶')
    assert(['main', 'filler', 'foliage'].includes(record.group), '花叶分组无效')
    assert(typeof item.color === 'string' && /^#[a-f\d]{6}$/i.test(item.color)
      && record.colors?.some(color => color.value.toLowerCase() === item.color.toLowerCase()), '花叶配色不在素材色板内')
    assert(typeof item.mirrored === 'boolean', '花叶镜像信息无效')
    return { id: index + 1, materialId: record.id, group: record.group, color: item.color,
      geometry: record.geometry, colors: record.colors,
      transform: { anchor: { x: 350, y: 747 }, angle: 0, height: 360, scale: 1, mirrored: item.mirrored } }
  })
  const warnings = []
  const roles = validateDesign(materials, data.materials, warnings)
  const source = { container: { materialId: container.id, type: container.category }, materials }
  const rawPlan = parsePlan(JSON.stringify({ changed: true, reason: data.reason,
    placements: data.materials.map((item, index) => ({ id: index + 1, center: item.center, scale: item.scale, color: item.color })),
    orderedIds: materials.map(item => item.id) }), source)
  const rolesById = new Map(materials.map((item, index) => [item.id, data.materials[index].role]))
  const { plan, adjustedIds } = refineComposition(rawPlan, materials, rolesById)
  const mouthWidth = container.category === 'bouquet' ? Math.min(width, 24) : width
  const inset = Math.min(4, mouthWidth / 2)
  const mouth = { left: 350 - mouthWidth / 2 + inset, right: 350 + mouthWidth / 2 - inset, y: 747 }
  const { optimization } = generateLayout(plan, source, mouth)
  const adjustments = new Map(optimization.adjustments.map(item => [item.id, item]))
  const materialById = new Map(materials.map(item => [item.id, item]))
  const arranged = orderByDepth(optimization.orderedIds.map((id) => {
    const { geometry, colors, ...item } = materialById.get(id)
    const adjustment = adjustments.get(item.id)
    return { ...item, color: adjustment.color, transform: { ...item.transform, anchor: adjustment.anchor,
      angle: adjustment.angle, height: adjustment.height, scale: adjustment.scale } }
  }))
  const silhouette = validateSilhouette(arranged, warnings)
  return { reason: plan.reason, boundaryAdjustedIds: optimization.boundaryAdjustedIds || [],
    design: { warnings, roles, speciesCount: new Set(materials.map(item => item.materialId)).size, silhouette,
      compositionAdjustedIds: adjustedIds, depthOrdered: true },
    artwork: { background: { materialId: background.id }, container: source.container, containerLayouts: {}, materials: arranged } }
}

module.exports = { parsePrompt, parseRecentBackgroundIds, describeCatalog, instructions, buildArtwork }
