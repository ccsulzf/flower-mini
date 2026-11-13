import type { MaterialInstance, MaterialTransform } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
export interface BouquetBoundary { left: number, right: number, openingY: number, points: number[][] }
export function bouquetBoundary(material: CachedMaterial): BouquetBoundary | null
export function fitBouquetTransform(transform: MaterialTransform, material: CachedMaterial, container: CachedMaterial): MaterialTransform
export function fitBouquetInstance(instance: MaterialInstance, material: CachedMaterial, container: CachedMaterial): MaterialInstance
