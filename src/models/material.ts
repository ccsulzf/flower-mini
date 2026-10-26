export type MaterialGroup = 'main' | 'filler' | 'foliage'
export type BackgroundKind = 'solid' | 'scene'
export type SvgPart = 'flower' | 'stemWithoutLeaves' | 'foliage' | 'vase' | 'bouquet' | 'background'
export interface FlowerGeometry { width: number, flowerHeight: number, stemHeight: number, connectionY: number }
export interface VaseGeometry { width: number, height: number, mouthX: number, mouthY: number, mouthWidth: number }
export interface BackgroundGeometry { width: number, height: number, surfaceY?: number }
export interface MaterialMetadata {
  id: string
  category?: 'flower' | 'vase' | 'bouquet' | 'background'
  backgroundKind?: BackgroundKind
  name: string
  introduction: string
  flowerMeaning: string
  group: MaterialGroup
  colors: { name: string, value: string }[]
  geometry?: FlowerGeometry | VaseGeometry | BackgroundGeometry
}
export interface MaterialDraft extends MaterialMetadata { sources: Partial<Record<SvgPart, string>> }
export interface UploadedMaterial extends MaterialMetadata {
  assets: Partial<Record<SvgPart, { fileId: string, hash: string, url?: string }>>
  updatedAt: number
}
export interface CachedMaterial extends UploadedMaterial {
  sources: Partial<Record<SvgPart, string>>
  paths: Partial<Record<SvgPart, string>>
}
