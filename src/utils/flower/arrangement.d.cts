import type { MaterialTransform, Point } from '@/models/artwork'

export interface MaterialHeadGeometry { width: number, flowerHeight: number }
export interface MouthBounds { left: number, right: number, y: number }
export interface VisualBounds { left: number, right: number, top: number, bottom: number }
export const studioMetrics: { width: number, height: number, minMaterialHeight: number, maxMaterialHeight: number, operableMargin: number }
export function materialHeadPoint(transform: MaterialTransform): Point
export function materialVisualBounds(transform: MaterialTransform, geometry?: Partial<MaterialHeadGeometry>): VisualBounds
export function maxMaterialHeight(transform: MaterialTransform): number
export function constrainMaterialTransform(transform: MaterialTransform, geometry: Partial<MaterialHeadGeometry> | undefined, mouthBounds: MouthBounds): MaterialTransform
