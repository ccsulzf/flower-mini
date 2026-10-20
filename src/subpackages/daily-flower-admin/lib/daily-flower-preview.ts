import type { Artwork } from '@/models/artwork'
import type { UploadedMaterial } from '@/models/material'

export function attachCloudMaterials(artwork: Artwork, materials: UploadedMaterial[]): Artwork {
  function requireMaterial(id: string | undefined, categories: UploadedMaterial['category'][], label: string) {
    if (!id)
      throw new Error(`${label}缺少云端素材 ID`)
    if (!materials.some(item => item.id === id && categories.includes(item.category)))
      throw new Error(`云端找不到${label}素材 ${id}`)
  }
  for (const stem of artwork.stems)
    requireMaterial(stem.materialId, ['flower'], '花材')
  requireMaterial(artwork.vaseMaterialId, ['vase', 'bouquet'], '花器')
  if (artwork.backgroundMaterialId)
    requireMaterial(artwork.backgroundMaterialId, ['background'], '背景')
  return artwork
}
