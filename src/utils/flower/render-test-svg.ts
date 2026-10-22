import type { Artwork, MaterialInstance } from '@/models/artwork'
import type { UploadedMaterial } from '@/models/material'
import { renderArtworkSvg } from './artwork-svg'

export function createComplexRenderTestArtwork(materials: UploadedMaterial[]): Artwork {
  const flowers = materials.filter(material => material.category === 'flower')
  if (!flowers.length)
    throw new Error('素材库中没有可用于当前作品格式的云端花材')

  const selected = flowers
  const positions = [310, 318, 326, 334, 342, 350, 358, 366, 374, 382, 390, 386, 378, 370, 362, 354]
  const angles = [-48, -42, -36, -30, -24, -18, -12, -6, 0, 6, 12, 18, 24, 30, 36, 42]
  const heightOffsets = [-40, 5, 30, -15, 45, -25, 15, -5, 35, -35, 10, 50, -20, 25, -10, 40]
  const scales = [0.78, 0.92, 1.08, 1.24, 0.86, 1.16, 1.3, 0.98, 1.22, 0.82, 1.12, 0.9, 1.28, 1.02, 0.88, 1.18]
  const instances: MaterialInstance[] = Array.from({ length: 64 }, (_, index) => {
    const layer = Math.floor(index / positions.length)
    const position = index % positions.length
    const material = selected[(position * 5 + layer * 2) % selected.length]
    const palette = material.colors.length ? material.colors : [{ name: material.name, value: '#f4f0e6' }]
    const height = Math.max(220, Math.min(590, 300 + layer * 125 + heightOffsets[(position + layer * 3) % heightOffsets.length]))
    return {
      id: index + 1,
      materialId: material.id,
      group: material.group || 'main',
      color: palette[Math.floor((position + layer * 5) / 2) % palette.length].value,
      transform: {
        anchor: { x: positions[(position + layer * 3) % positions.length], y: 747 },
        angle: angles[(position + layer * 5) % angles.length],
        scale: scales[(position * 3 + layer * 5) % scales.length],
        height,
        mirrored: index % 4 === 1 || index % 4 === 2,
      },
    }
  })
  const vase = materials.find(material => material.category === 'vase' || material.category === 'bouquet')
  const background = materials.find(material => material.category === 'background')
  if (!vase || !background)
    throw new Error('素材库缺少云端花器或背景')
  return {
    background: { materialId: background.id },
    container: { materialId: vase.id, type: vase.category },
    materials: instances,
    containerLayouts: {},
  }
}

export const renderTestArtworkSvg = renderArtworkSvg
