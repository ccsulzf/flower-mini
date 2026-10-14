import type { Artwork, FlowerKind } from '@/models/artwork'
import type { UploadedMaterial } from '@/models/material'

export interface DailyFlowerMaterialManifest {
  version: number
  flowers: Partial<Record<FlowerKind, string[]>>
  vases: string[]
  backgrounds: string[]
}

function findAvailableMaterial(ids: string[], category: UploadedMaterial['category'], materials: UploadedMaterial[]) {
  for (const id of ids) {
    const material = materials.find(item => item.id === id && item.category === category)
    if (material)
      return material
  }
}

export function attachCloudMaterials(
  artwork: Artwork,
  materials: UploadedMaterial[],
  manifest: DailyFlowerMaterialManifest,
): Artwork {
  if (manifest.version !== 1)
    throw new Error('本地每日花束物料 JSON 版本不支持')

  const stems = artwork.stems.map((stem) => {
    const candidates = manifest.flowers[stem.kind] || []
    if (stem.materialId && !candidates.includes(stem.materialId))
      throw new Error(`花材 ${stem.materialId} 不在本地物料清单的 ${stem.kind} 候选中`)
    const preferred = stem.materialId
      ? [stem.materialId, ...candidates.filter(id => id !== stem.materialId)]
      : candidates
    const material = findAvailableMaterial(preferred, 'flower', materials)
    if (!material)
      throw new Error(`云端没有本地物料清单中可用于 ${stem.kind} 的花材（${candidates.join('、') || '未配置候选物料'}）`)
    return { ...stem, materialId: material.id, materialRevision: material.revision }
  })

  if (artwork.vaseMaterialId && !manifest.vases.includes(artwork.vaseMaterialId)) {
    throw new Error(`花器 ${artwork.vaseMaterialId} 不在本地物料清单中`)
  }
  const vaseCandidates = artwork.vaseMaterialId
    ? [artwork.vaseMaterialId, ...manifest.vases.filter(id => id !== artwork.vaseMaterialId)]
    : manifest.vases
  const vase = findAvailableMaterial(vaseCandidates, 'vase', materials)
  if (!vase)
    throw new Error(`云端没有本地物料清单中的花器素材（${manifest.vases.join('、') || '未配置候选物料'}）`)

  if (artwork.backgroundMaterialId && !manifest.backgrounds.includes(artwork.backgroundMaterialId)) {
    throw new Error(`背景 ${artwork.backgroundMaterialId} 不在本地物料清单中`)
  }
  const backgroundCandidates = artwork.backgroundMaterialId
    ? [artwork.backgroundMaterialId, ...manifest.backgrounds.filter(id => id !== artwork.backgroundMaterialId)]
    : manifest.backgrounds
  const background = findAvailableMaterial(backgroundCandidates, 'background', materials)
  if (!background)
    throw new Error(`云端没有本地物料清单中的背景素材（${manifest.backgrounds.join('、') || '未配置候选物料'}）`)

  return {
    ...artwork,
    stems,
    vaseMaterialId: vase.id,
    vaseMaterialRevision: vase.revision,
    backgroundMaterialId: background.id,
    backgroundMaterialRevision: background.revision,
  }
}
