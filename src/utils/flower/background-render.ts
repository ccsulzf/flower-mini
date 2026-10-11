import type { BackgroundGeometry, CachedMaterial } from '@/models/material'
import type { VaseName } from '@/models/artwork'
import { vasePlacement } from './material-render'
import { studioMetrics } from './arrangement.cjs'

// 背景坐标换算到画板；整体平移花器和花枝，保持各枝的瓶口关系。
export function backgroundOffset(background: CachedMaterial | undefined, vase: CachedMaterial | undefined, name: VaseName): number {
  if (background?.category !== 'background') return 0
  const geometry = background.geometry as BackgroundGeometry
  if (geometry.surfaceY === undefined) return 0
  const bottom = vase ? vasePlacement(vase).y + vasePlacement(vase).height : name === '花束' ? 915 : 905
  return geometry.surfaceY * studioMetrics.height / geometry.height - bottom
}
