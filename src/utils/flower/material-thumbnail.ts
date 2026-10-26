import type { CachedMaterial } from '@/models/material'
import { cloudPlantSvg, svgImageSource } from './material-render'

interface MaterialThumbnailOptions {
  color?: string
  mirrored?: boolean
}

const thumbnailCache = new Map<string, string>()

export function materialThumbnailSource(material: CachedMaterial | undefined, options: MaterialThumbnailOptions = {}) {
  if (!material || material.category !== 'flower')
    return ''
  const color = options.color || material.colors[0]?.value || '#f4f0e6'
  const mirrored = Boolean(options.mirrored)
  const key = `${material.id}:${material.updatedAt}:${color}:${mirrored ? 'mirrored' : 'normal'}`
  const cached = thumbnailCache.get(key)
  if (cached)
    return cached
  const result = svgImageSource(cloudPlantSvg(material, {
    color,
    transform: { anchor: { x: 55, y: 285 }, angle: 0, height: 230, scale: 1, mirrored },
  }))
  thumbnailCache.set(key, result)
  return result
}
