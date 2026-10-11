import { defaultFlowerGeometry, materialParts, normalizeMaterial } from '@/utils/flower/material-catalog'
import type { MaterialDraft, MaterialMetadata, SvgPart, UploadedMaterial } from './types'
export const svgParts: { key: SvgPart, name: string }[] = [
  { key: 'flower', name: '花朵' }, { key: 'stemWithLeaves', name: '带叶花茎' },
  { key: 'stemWithoutLeaves', name: '去叶花茎' }, { key: 'foliage', name: '叶枝' }, { key: 'vase', name: '花瓶' }, { key: 'bouquet', name: '花束包装' }, { key: 'background', name: '背景' },
]
export function revisionOf(value: unknown): string {
  const text = JSON.stringify(value)
  let first = 2166136261, second = 5381
  for (let i = 0; i < text.length; i++) { first = Math.imul(first ^ text.charCodeAt(i), 16777619); second = Math.imul(second, 33) ^ text.charCodeAt(i) }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}
export function collectLocalMaterials(files: Record<string, string>): { items: MaterialDraft[], errors: string[] } {
  const items: MaterialDraft[] = [], errors: string[] = []
  for (const [path, source] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.endsWith('/material.json')) continue
    try {
      const metadata = JSON.parse(source) as MaterialMetadata
      const category = metadata.category || 'flower'
      const geometry = metadata.geometry || (category === 'flower' ? defaultFlowerGeometry(metadata.id) : undefined)
      const keys = materialParts({ category, group: metadata.group })
      const normalizedMetadata = normalizeMaterial({ ...metadata, category, geometry, revision: '0'.repeat(16),
        assets: Object.fromEntries(keys.map(key => [key, { fileId: 'local', hash: '0'.repeat(40) }])) })
      if (items.some(item => item.id === metadata.id)) throw new Error('素材标识重复')
      const directory = path.slice(0, -'material.json'.length)
      const sources: Partial<Record<SvgPart, string>> = {}
      for (const key of keys) {
        const svg = files[`${directory}${key}.svg`]
        if (!svg || svg.length > 65536 || !/^\s*<svg\b/.test(svg) || !/<\/svg>\s*$/.test(svg) || /<script|<foreignObject|\bon\w+\s*=|\bhref\s*=|<!DOCTYPE|<!ENTITY/i.test(svg)) throw new Error(`${key}.svg 缺失或无效`)
        sources[key] = svg
      }
      const normalized: MaterialMetadata = { id: normalizedMetadata.id, category, name: normalizedMetadata.name, introduction: normalizedMetadata.introduction, flowerMeaning: normalizedMetadata.flowerMeaning, group: normalizedMetadata.group, colors: normalizedMetadata.colors, version: normalizedMetadata.version, geometry }
      items.push({ ...normalized, sources, revision: revisionOf({ ...normalized, sources }) })
    } catch (error) { errors.push(`${path}：${error instanceof Error ? error.message : '档案无法读取'}`) }
  }
  return { items, errors }
}
export function uploadStatus(local: MaterialDraft, remote: UploadedMaterial[] | null) {
  if (remote === null) return '待检查'
  const row = remote.find(item => item.id === local.id)
  return !row ? '未上传' : row.revision === local.revision ? '已上传' : '有更新'
}
export function localPreviewSource(svg: string, color: string) {
  const source = svg.replace(/__COLOR__/g, /^#[\da-f]{6}$/i.test(color) ? color : '#f1e5bd')
  const encoded = encodeURIComponent(source).replace(/%([\dA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
  const bytes = Uint8Array.from(encoded, char => char.charCodeAt(0))
  return `data:image/svg+xml;base64,${uni.arrayBufferToBase64(bytes.buffer)}`
}
