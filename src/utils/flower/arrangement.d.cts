export interface StemPosition { x: number, y: number, angle: number, stemHeight: number }
export const studioMetrics: { width: number, height: number, minStemHeight: number, maxStemHeight: number, headMargin: number }
export function maxStemHeight(position: StemPosition): number
export function constrainStem(position: StemPosition): StemPosition
export function moveStem(origin: StemPosition, delta: { x: number, y: number }, unit: number, mouth?: { left: number, right: number }): StemPosition
