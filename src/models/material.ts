export type MaterialGroup = 'main' | 'filler' | 'foliage'
export type SvgPart = 'flower' | 'stemWithLeaves' | 'stemWithoutLeaves' | 'foliage' | 'vase' | 'bouquet'
export interface FlowerGeometry { width: number, flowerHeight: number, stemHeight: number, connectionY: number }
export interface VaseGeometry { width: number, height: number, mouthX: number, mouthY: number, mouthWidth: number }
export interface MaterialMetadata {
  id: string
  category?: 'flower' | 'vase' | 'bouquet'
  name: string
  introduction: string
  flowerMeaning: string
  group: MaterialGroup
  colors: { name: string, value: string }[]
  version: number
  geometry?: FlowerGeometry | VaseGeometry
}
export interface MaterialDraft extends MaterialMetadata { sources: Partial<Record<SvgPart, string>>, revision: string }
export interface UploadedMaterial extends MaterialMetadata {
  revision: string
  assets: Partial<Record<SvgPart, { fileId: string, hash: string, url?: string }>>
  updatedAt: number
}
export interface CachedMaterial extends UploadedMaterial {
  sources: Partial<Record<SvgPart, string>>
  paths: Partial<Record<SvgPart, string>>
}
