export type FlowerKind = 'daisy' | 'poppy' | 'leaf' | 'chrysanthemum' | 'rose' | 'tulip'
// 保留 vase 字段兼容已有 JSON，花束也作为一种作品形式。
export type VaseName = '陶瓶' | '玻璃瓶' | '圆花器' | '花束'
// 单枝花材：x/y 是瓶口固定点，stemHeight 是花心到固定点的距离（rpx），flowerScale 只缩放花头。
export interface Stem { id: number, kind: FlowerKind, x: number, y: number, angle: number, flowerScale: number, stemHeight: number, color: string, materialId?: string, materialRevision?: string, leafMode?: 'with' | 'without' }
// JSON 仅保存创作数据；选中状态、拖动状态、临时导出图片不属于作品。
// version 用于后续新增字段时识别旧格式并做迁移。
export interface Artwork {
  version: 2
  vase: VaseName
  vaseMaterialId?: string
  vaseMaterialRevision?: string
  background: 'warm' | 'sage' | 'cocoa'
  stems: Stem[]
}

export interface StudioTouchEvent { touches: { clientX: number, clientY: number }[] }
