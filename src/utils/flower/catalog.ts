import type { FlowerMaterial } from '@/models/flower-material'
import { flowerCatalog } from '@/config/flower-materials'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseFlowerCatalog(value: unknown): FlowerMaterial[] {
  if (!record(value) || !Array.isArray(value.items) || value.items.length > 100)
    throw new Error('云端花材目录格式不正确')
  const kinds = new Set<string>()
  return value.items.map((item): FlowerMaterial => {
    if (!record(item) || typeof item.kind !== 'string' || kinds.has(item.kind)
      || !flowerCatalog.some(local => local.kind === item.kind)
      || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 40
      || !['main', 'filler', 'foliage'].includes(String(item.group))
      || typeof item.color !== 'string' || !/^#[\da-f]{6}$/i.test(item.color)
      || typeof item.height !== 'number' || !Number.isFinite(item.height) || item.height < 120 || item.height > 620
      || typeof item.size !== 'number' || !Number.isFinite(item.size) || item.size < 0.5 || item.size > 2)
      throw new Error('云端花材数据无效')
    kinds.add(item.kind)
    return { kind: item.kind as FlowerMaterial['kind'], name: item.name.trim(), group: item.group as FlowerMaterial['group'],
      color: item.color, height: item.height, size: item.size }
  })
}
