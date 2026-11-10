import type { Artwork, ContainerType, MaterialGroup, MaterialInstance, MaterialLayout, MaterialTransform, Point } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { studioMetrics } from './arrangement.cjs'

export type { Artwork, BackgroundSelection, ContainerSelection, ContainerType, MaterialGroup, MaterialInstance, MaterialLayout, MaterialTransform, Point } from '@/models/artwork'
export const flowerGroups = [{ value: 'main', name: '主花' }, { value: 'filler', name: '配花' }, { value: 'foliage', name: '叶材' }] as const
const containerTypes: ReadonlySet<ContainerType> = new Set(['vase', 'bouquet'])
const materialGroups: ReadonlySet<MaterialGroup> = new Set(['main', 'filler', 'foliage'])
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function finite(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max }
function validReference(value: unknown): value is string { return typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value) }
function parsePoint(value: unknown, message: string): Point {
  if (!record(value) || !finite(value.x, 0, studioMetrics.width) || !finite(value.y, 0, studioMetrics.height)) throw new Error(message)
  return { x: value.x, y: value.y }
}
function parseTransform(value: unknown): MaterialTransform {
  if (!record(value) || !finite(value.angle, -65, 65) || !finite(value.height, studioMetrics.minMaterialHeight, studioMetrics.maxMaterialHeight) || !finite(value.scale, 0.65, 1.35) || typeof value.mirrored !== 'boolean') throw new Error('作品中的花材变换无效')
  return { anchor: parsePoint(value.anchor, '作品中的花材落点无效'), angle: value.angle, height: value.height, scale: value.scale, mirrored: value.mirrored }
}
function parseMaterial(value: unknown, ids: Set<number>): MaterialInstance {
  if (!record(value) || !Number.isSafeInteger(value.id) || !finite(value.id, 1, Number.MAX_SAFE_INTEGER) || ids.has(value.id) || !validReference(value.materialId) || !materialGroups.has(value.group as MaterialGroup) || typeof value.color !== 'string' || !/^#[\da-f]{6}$/i.test(value.color)) throw new Error('作品中的花材数据无效')
  ids.add(value.id)
  return { id: value.id, materialId: value.materialId, group: value.group as MaterialGroup, color: value.color, transform: parseTransform(value.transform) }
}
function parseLayout(value: unknown, materialIds: Set<number>): MaterialLayout {
  if (!record(value) || !Number.isSafeInteger(value.materialInstanceId) || !finite(value.materialInstanceId, 1, Number.MAX_SAFE_INTEGER) || !materialIds.has(value.materialInstanceId) || !finite(value.angle, -65, 65) || !finite(value.height, studioMetrics.minMaterialHeight, studioMetrics.maxMaterialHeight) || !finite(value.scale, 0.65, 1.35)) throw new Error('容器布局记录无效')
  return { materialInstanceId: value.materialInstanceId, anchor: parsePoint(value.anchor, '容器布局落点无效'), angle: value.angle, height: value.height, scale: value.scale }
}
export function createCatalogArtwork(container: CachedMaterial, background: CachedMaterial): Artwork {
  if ((container.category !== 'vase' && container.category !== 'bouquet') || !validReference(container.id)) throw new Error('花器素材不可用')
  if (background.category !== 'background' || !validReference(background.id)) throw new Error('背景素材不可用')
  return { background: { materialId: background.id }, container: { materialId: container.id, type: container.category }, materials: [], containerLayouts: {} }
}
// 导入只接受当前结构；旧作品、旧草稿和旧 JSON 不做兼容或迁移。
export function parseArtwork(text: string): Artwork {
  if (text.length > 65536) throw new Error('作品文件过大')
  let data: unknown
  try { data = JSON.parse(text); if (typeof data === 'string') data = JSON.parse(data) }
  catch { throw new Error('JSON 语法错误，请检查引号、逗号和括号') }
  if (!record(data) || !record(data.background) || !validReference(data.background.materialId) || !record(data.container) || !validReference(data.container.materialId) || !containerTypes.has(data.container.type as ContainerType) || !Array.isArray(data.materials) || !record(data.containerLayouts)) throw new Error('作品格式不支持')
  const ids = new Set<number>()
  const materials = data.materials.map(value => parseMaterial(value, ids))
  const containerLayouts: Record<string, MaterialLayout[]> = {}
  for (const [containerId, value] of Object.entries(data.containerLayouts)) {
    if (!validReference(containerId) || !Array.isArray(value)) throw new Error('容器布局记录无效')
    const layoutIds = new Set<number>()
    containerLayouts[containerId] = value.map((row) => {
      const layout = parseLayout(row, ids)
      if (layoutIds.has(layout.materialInstanceId)) throw new Error('容器布局包含重复花材')
      layoutIds.add(layout.materialInstanceId)
      return layout
    })
  }
  return { background: { materialId: data.background.materialId }, container: { materialId: data.container.materialId, type: data.container.type as ContainerType }, materials, containerLayouts }
}
export function chrysanthemumRay(index: number) { return { angle: index * 137.508, length: 48 + (index * 17 % 42), width: index % 3 === 0 ? 2.5 : 2 } }
