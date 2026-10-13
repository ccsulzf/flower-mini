import type { Artwork, FlowerKind, Stem, VaseName } from '@/models/artwork'
import { backgroundOptions, flowerCatalog, vaseOptions } from '@/config/flower-materials'
import { constrainStem, studioMetrics } from './arrangement.cjs'
export type { Artwork, FlowerKind, Stem, VaseName } from '@/models/artwork'
export { backgroundOptions, flowerCatalog, flowerColors, flowerGroups, vaseOptions } from '@/config/flower-materials'

export function artworkBackground(background: Artwork['background']) {
  return backgroundOptions.find(option => option.value === background)!.color
}
// 菊花花瓣使用同一套确定性参数，编辑画面和 Canvas 导出保持一致。
export function chrysanthemumRay(index: number) {
  return { angle: index * 137.508, length: 48 + (index * 17 % 42), width: index % 3 === 0 ? 2.5 : 2 }
}

// 花瓶底部位置相同，圆花器更矮，因此瓶口固定点也更低。
export function anchorY(vase: VaseName) { return vase === '圆花器' ? 777 : 747 }

// 编辑器与图片导出共用素材选择，避免花茎弯曲方向和叶片位置不一致。
export function curveFor(stem: Stem) {
  // 使用预绘制的连续曲线图片，避免小程序中短线段拼接的锯齿和接缝。
  const bends = [-42, -28, -14, 14, 28, 42]
  // 倾斜越大，花茎反向弯曲越明显；不同枝花加一点左右差异。
  const desired = -stem.angle * 0.45 + (stem.id % 2 ? 12 : -12)
  const bend = bends.reduce((nearest, candidate) =>
    Math.abs(candidate - desired) < Math.abs(nearest - desired) ? candidate : nearest)
  return {
    // 包内素材必须用根路径，不能相对于 pages/flower-studio 查找。
    image: `/static/flower/stem-${bend}.png`,
    // 取三次贝塞尔曲线 t=0.44 处的横坐标，让侧叶贴在花茎上。
    leafLeft: 55 + 3 * (1 - 0.44) * 0.44 * bend,
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function finite(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}
// 导入数据先按 unknown 校验，再构造白名单字段；校验失败不会替换页面作品。
export function parseArtwork(text: string): Artwork {
  if (text.length > 65536) throw new Error('作品文件过大')
  let data: unknown
  try {
    data = JSON.parse(text)
    // 支持复制来的 JSON 字符串（外层引号及转义），只解包一层。
    if (typeof data === 'string') data = JSON.parse(data)
  }
  catch {
    throw new Error('JSON 语法错误，请检查引号、逗号和括号')
  }
  if (!record(data) || (data.version !== 1 && data.version !== 2) || !vaseOptions.includes(data.vase as VaseName)
    || !backgroundOptions.some(option => option.value === data.background) || !Array.isArray(data.stems))
    throw new Error('作品格式或版本不支持')
  const validReference = (id: unknown, revision: unknown) => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id) && typeof revision === 'string' && /^[a-f\d]{16}$/.test(revision)
  if ((data.vaseMaterialId !== undefined || data.vaseMaterialRevision !== undefined) && !validReference(data.vaseMaterialId, data.vaseMaterialRevision)) throw new Error('花瓶素材引用无效')
  if ((data.backgroundMaterialId !== undefined || data.backgroundMaterialRevision !== undefined) && !validReference(data.backgroundMaterialId, data.backgroundMaterialRevision)) throw new Error('背景素材引用无效')
  const containerLayouts: Artwork['containerLayouts'] = {}
  if (data.containerLayouts !== undefined) {
    if (!record(data.containerLayouts) || Object.keys(data.containerLayouts).length > 64) throw new Error('容器布局记录无效')
    for (const [key, layout] of Object.entries(data.containerLayouts)) {
      if (!/^(?:[a-z][a-z0-9-]{0,63}:[a-f\d]{16}|builtin:(?:陶瓶|玻璃瓶|圆花器|花束))$/.test(key) || !Array.isArray(layout)) throw new Error('容器布局记录无效')
      const layoutIds = new Set<number>()
      containerLayouts[key] = layout.map(row => {
        if (!record(row) || !finite(row.id, 1, Number.MAX_SAFE_INTEGER) || !Number.isInteger(row.id) || layoutIds.has(row.id)
          || !finite(row.x, 0, studioMetrics.width) || !finite(row.angle, -65, 65) || !finite(row.stemHeight, studioMetrics.minStemHeight, studioMetrics.maxStemHeight) || !finite(row.flowerScale, .65, 1.35)) throw new Error('容器布局记录无效')
        layoutIds.add(row.id)
        return { id: row.id, x: row.x, angle: row.angle, stemHeight: row.stemHeight, flowerScale: row.flowerScale }
      })
    }
  }
  const vase = data.vase as VaseName
  // 重复 ID 会破坏 Vue 列表键与花材选择，必须拒绝。
  const ids = new Set<number>()
  const stems = data.stems.map((value): Stem => {
    if (!record(value) || !finite(value.id, 1, Number.MAX_SAFE_INTEGER) || !Number.isInteger(value.id) || ids.has(value.id)
      || !flowerCatalog.some(flower => flower.kind === value.kind) || !finite(value.x, 0, studioMetrics.width)
      || !finite(value.y, 0, studioMetrics.height) || !finite(value.angle, -65, 65)
      || typeof value.color !== 'string' || !/^#[\da-f]{6}$/i.test(value.color))
      throw new Error('作品中的花材数据无效')
    // v1 的整枝缩放拆成两个参数，迁移后保持原花头大小和花心位置。
    const flowerScale = data.version === 1 ? value.scale : value.flowerScale
    const stemHeight = data.version === 1 && typeof value.scale === 'number' ? 205 * value.scale : value.stemHeight
    if (!finite(flowerScale, 0.65, 1.35) || !finite(stemHeight, studioMetrics.minStemHeight, studioMetrics.maxStemHeight))
      throw new Error('花朵大小或花枝高度无效')
    if ((value.materialId !== undefined || value.materialRevision !== undefined) && (!validReference(value.materialId, value.materialRevision) || (value.leafMode !== undefined && !['with', 'without'].includes(String(value.leafMode))))) throw new Error('花材素材引用无效')
    if (value.mirrored !== undefined && typeof value.mirrored !== 'boolean') throw new Error('花材镜像参数无效')
    ids.add(value.id)
    // 横坐标收拢到瓶口，纵坐标按花器重设，兼容外部 JSON 并保证花茎插在瓶口。
    const x = data.vaseMaterialId ? value.x : Math.max(338, Math.min(362, value.x))
    return { ...(value.materialId ? { materialId: String(value.materialId), materialRevision: String(value.materialRevision), leafMode: (value.leafMode || 'without') as 'with' | 'without' } : {}), ...(value.mirrored ? { mirrored: true } : {}), id: value.id, kind: value.kind as FlowerKind, flowerScale, color: value.color, ...constrainStem({ x, y: anchorY(vase), angle: value.angle, stemHeight }) }
  })
  return { version: 2, vase, ...(data.vaseMaterialId ? { vaseMaterialId: String(data.vaseMaterialId), vaseMaterialRevision: String(data.vaseMaterialRevision) } : {}), ...(Object.keys(containerLayouts).length ? { containerLayouts } : {}), background: data.background as Artwork['background'], ...(data.backgroundMaterialId ? { backgroundMaterialId: String(data.backgroundMaterialId), backgroundMaterialRevision: String(data.backgroundMaterialRevision) } : {}), stems }
}
