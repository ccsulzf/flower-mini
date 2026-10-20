export type FlowerKind = 'daisy' | 'poppy' | 'leaf' | 'chrysanthemum' | 'rose' | 'tulip'
// 保留 vase 字段兼容已有 JSON，花束也作为一种作品形式。
export type VaseName = '陶瓶' | '玻璃瓶' | '圆花器' | '花束'
// 单枝花材：x/y 是瓶口落点（拖动时 x 可在瓶口内跟随），stemHeight 是花心到固定点的距离（rpx），flowerScale 只缩放花头。
export interface Stem { id: number, kind: FlowerKind, x: number, y: number, angle: number, flowerScale: number, stemHeight: number, color: string, materialId?: string, mirrored?: boolean }
export type ContainerStemLayout = Pick<Stem, 'id' | 'x' | 'angle' | 'stemHeight' | 'flowerScale'>
// JSON 仅保存创作数据；选中状态、拖动状态、临时导出图片不属于作品。
export interface Artwork {
  vase: VaseName
  vaseMaterialId?: string
  background: 'warm' | 'sage' | 'cocoa' | 'mist' | 'blush' | 'sand'
  backgroundMaterialId?: string
  containerLayouts?: Record<string, ContainerStemLayout[]>
  stems: Stem[]
}

export interface StudioTouchEvent { touches: { clientX: number, clientY: number }[] }
