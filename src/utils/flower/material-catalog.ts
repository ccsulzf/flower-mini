import type { UploadedMaterial, FlowerGeometry, VaseGeometry, BackgroundGeometry, SvgPart } from '@/models/material'
const idPattern = /^[a-z][a-z0-9-]{0,63}$/
function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function positive(value: unknown, max = 2000): value is number { return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max }
export function defaultFlowerGeometry(id: string): FlowerGeometry | undefined {
  const connectionY = ({ rose: 101, tulip: 93, daisy: 102 } as Record<string, number>)[id]
  return connectionY ? { width: 110, flowerHeight: 110, stemHeight: 260, connectionY } : undefined
}
export function materialParts(row: { category?: string, group?: string }): SvgPart[] { return row.category === 'background' ? ['background'] : row.category === 'vase' ? ['vase'] : row.category === 'bouquet' ? ['bouquet'] : row.group === 'foliage' ? ['foliage'] : ['flower', 'stemWithoutLeaves'] }
export function normalizeMaterial(value: unknown): UploadedMaterial {
  if (!object(value) || typeof value.id !== 'string' || !idPattern.test(value.id) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 40
    || typeof value.introduction !== 'string' || value.introduction.length > 2000 || !object(value.assets)) throw new Error('云端素材档案无效')
  const category = value.category === undefined ? 'flower' : value.category
  if (category !== 'flower' && category !== 'vase' && category !== 'bouquet' && category !== 'background') throw new Error('素材类型无效')
  const geometry = value.geometry || (category === 'flower' ? defaultFlowerGeometry(value.id) : undefined)
  if (!object(geometry) || !positive(geometry.width)) throw new Error(`${value.name}：素材几何信息缺失或无效`)
  if (category === 'flower') {
    if (!positive(geometry.flowerHeight) || !positive(geometry.stemHeight) || !positive(geometry.connectionY) || geometry.connectionY > geometry.flowerHeight) throw new Error('花材几何信息无效')
    if (!['main', 'filler', 'foliage'].includes(String(value.group)) || typeof value.flowerMeaning !== 'string' || value.flowerMeaning.length > 500
      || !Array.isArray(value.colors) || !value.colors.length || value.colors.length > 20 || value.colors.some(color => !object(color) || typeof color.name !== 'string' || !color.name.trim() || color.name.length > 20 || typeof color.value !== 'string' || !/^#[a-f\d]{6}$/i.test(color.value))) throw new Error('花材信息无效')
  } else if (category === 'background') {
    if (!positive(geometry.height) || (geometry.surfaceY !== undefined && (typeof geometry.surfaceY !== 'number' || !Number.isFinite(geometry.surfaceY) || geometry.surfaceY < 0 || geometry.surfaceY > geometry.height))) throw new Error('背景几何信息无效')
  } else {
    if (!positive(geometry.height) || !positive(geometry.mouthWidth) || geometry.mouthWidth > geometry.width || typeof geometry.mouthX !== 'number' || typeof geometry.mouthY !== 'number'
      || !Number.isFinite(geometry.mouthX) || !Number.isFinite(geometry.mouthY) || geometry.mouthX < geometry.mouthWidth / 2 || geometry.mouthX > geometry.width - geometry.mouthWidth / 2 || geometry.mouthY < 0 || geometry.mouthY >= geometry.height) throw new Error('花瓶几何信息无效')
  }
  const parts = materialParts({ category, group: String(value.group) })
  const assets: UploadedMaterial['assets'] = {}
  for (const key of parts) {
    const file = value.assets[key]
    if (!object(file) || typeof file.fileId !== 'string' || !file.fileId || file.fileId.length > 1024 || typeof file.hash !== 'string' || !/^[a-f\d]{40}$/.test(file.hash)
      || (file.url !== undefined && (typeof file.url !== 'string' || !/^https:\/\//.test(file.url)))) throw new Error('素材文件信息无效')
    assets[key] = { fileId: file.fileId, hash: file.hash, ...(file.url ? { url: String(file.url) } : {}) }
  }
  return { id: value.id, category, name: value.name, introduction: value.introduction, flowerMeaning: category === 'flower' ? String(value.flowerMeaning) : '', group: category === 'flower' ? value.group as UploadedMaterial['group'] : 'main', colors: category === 'flower' ? value.colors as UploadedMaterial['colors'] : [], geometry: geometry as unknown as FlowerGeometry | VaseGeometry | BackgroundGeometry, assets, updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0 }
}
export function parseMaterialCatalog(value: unknown): UploadedMaterial[] {
  if (!object(value) || !Array.isArray(value.items) || value.items.length > 10000) throw new Error('素材目录格式无效')
  const items = value.items.map(normalizeMaterial)
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('素材标识重复')
  return items
}
