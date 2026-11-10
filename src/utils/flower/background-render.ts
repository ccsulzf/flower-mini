import type { BackgroundGeometry, CachedMaterial } from '@/models/material'
import { studioMetrics } from './arrangement.cjs'
import { vasePlacement } from './material-render'

// 同一套背景用于画布、目录缩略图与图片导出，也兼容已有云素材。
export function backgroundSceneSource(material: CachedMaterial): string {
  const source = material.sources.background || ''
  if (material.category !== 'background' || !source)
    throw new Error('背景素材不可用')
  return source
}

// 背景坐标换算到画板；整体平移花器和花枝，保持各枝的瓶口关系。
export function backgroundOffset(background: CachedMaterial | undefined, container: CachedMaterial | undefined): number {
  if (background?.category !== 'background')
    return 0
  const geometry = background.geometry as BackgroundGeometry
  if (geometry.surfaceY === undefined)
    return 0
  if (!container || (container.category !== 'vase' && container.category !== 'bouquet'))
    return 0
  const placement = vasePlacement(container)
  const bottom = placement.y + placement.height
  return geometry.surfaceY * studioMetrics.height / geometry.height - bottom
}
