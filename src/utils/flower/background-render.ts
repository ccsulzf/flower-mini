import type { VaseName } from '@/models/artwork'
import type { BackgroundGeometry, CachedMaterial } from '@/models/material'
import { studioMetrics } from './arrangement.cjs'
import { vasePlacement } from './material-render'

// 同一套背景用于画布、目录缩略图与图片导出，也兼容已有云素材。
export function backgroundSceneSource(material: CachedMaterial): string {
  const source = material.sources.background || ''
  if (source.includes('studio-background:v2'))
    return source
  const marker = '<!-- studio-background:v2 -->'
  if (material.id === 'scene-ivory-table') {
    const grain = Array.from({ length: 12 }, (_, i) => `<path d="M0 ${835 + i * 14} C150 ${825 + i * 14} 380 ${850 + i * 14} 698 ${832 + i * 14}" fill="none" stroke="#9e7957" stroke-width="2" opacity="0.35"/>`).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 698 1000">${marker}<rect width="698" height="1000" fill="#eee7db"/><path d="M0 0 H698 V820 H0Z" fill="#f4efe5"/><path d="M0 0 H130 V820 H0Z" fill="#dcd2c2" opacity="0.45"/><path d="M130 0 V820" stroke="#c5b7a2" stroke-width="3"/><path d="M140 0 V820" stroke="#fffaf0" stroke-width="3"/><path d="M698 160 L430 250 L540 820 H698Z" fill="#fffaf0" opacity="0.65"/><rect y="820" width="698" height="180" fill="#c4a27e"/><path d="M0 820 H698" stroke="#a68462" stroke-width="5"/>${grain}<path d="M0 890 H698 M248 820 L230 1000" fill="none" stroke="#8e6d50" stroke-width="2" opacity="0.38"/></svg>`
  }
  if (material.id === 'scene-sage-table') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 698 1000">${marker}<rect width="698" height="1000" fill="#d5dfcc"/><path d="M0 0 H160 V820 H0Z" fill="#b9c9af" opacity="0.65"/><path d="M160 0 V820 M170 0 V820" stroke="#9daf92" stroke-width="2" opacity="0.55"/><path d="M170 560 H698 M170 570 H698" stroke="#9daf92" stroke-width="2" opacity="0.35"/><path d="M530 0 H698 V820 H630Z" fill="#eef1e4" opacity="0.7"/><rect y="820" width="698" height="180" fill="#b9baad"/><path d="M0 820 H698" stroke="#898e7d" stroke-width="5"/><path d="M0 860 C150 895 200 820 365 872 S590 890 698 850 M0 955 C160 925 290 994 480 950 S620 926 698 950" fill="none" stroke="#e5e6da" stroke-width="4" opacity="0.6"/><path d="M0 935 C200 902 320 976 698 914" fill="none" stroke="#929787" stroke-width="2" opacity="0.5"/></svg>`
  }
  if (['paper-ivory', 'paper-blush', 'paper-linen'].includes(material.id)) {
    const texture = source.replace(/stroke-width="0\.[57]"/g, 'stroke-width="1.8"')
      .replace(/opacity="0\.(?:11|16)"/g, 'opacity="0.38"')
      .replace(/l(\d+) (-?\d+)/g, (_, x: string, y: string) => `l${Number(x) * 3} ${Number(y) * 3}`)
    const folds = '<path d="M0 120 Q260 80 698 140 M0 860 Q350 890 698 845" fill="none" stroke="#b6a894" stroke-width="3" opacity="0.16"/>'
    return texture.replace('</svg>', `${marker}${folds}</svg>`)
  }
  return source
}

// 背景坐标换算到画板；整体平移花器和花枝，保持各枝的瓶口关系。
export function backgroundOffset(background: CachedMaterial | undefined, vase: CachedMaterial | undefined, name: VaseName): number {
  if (background?.category !== 'background')
    return 0
  const geometry = background.geometry as BackgroundGeometry
  if (geometry.surfaceY === undefined)
    return 0
  const bottom = vase ? vasePlacement(vase).y + vasePlacement(vase).height : name === '花束' ? 915 : 905
  const surfaceY = ['scene-ivory-table', 'scene-sage-table'].includes(background.id) ? 820 : geometry.surfaceY
  return surfaceY * studioMetrics.height / geometry.height - bottom
}
