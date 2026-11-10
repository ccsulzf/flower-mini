export type ContainerType = 'vase' | 'bouquet'
export type MaterialGroup = 'main' | 'filler' | 'foliage'

export interface Point { x: number, y: number }
export interface BackgroundSelection { materialId: string }
export interface ContainerSelection { materialId: string, type: ContainerType }
export interface MaterialTransform { anchor: Point, angle: number, height: number, scale: number, mirrored: boolean }
export interface MaterialInstance { id: number, materialId: string, group: MaterialGroup, color: string, transform: MaterialTransform }
export interface MaterialLayout { materialInstanceId: number, anchor: Point, angle: number, height: number, scale: number }

// 作品只保存创作数据；选中、面板、加载、设备布局和撤销历史均不属于作品。
export interface Artwork {
  background: BackgroundSelection
  container: ContainerSelection
  materials: MaterialInstance[]
  containerLayouts: Record<string, MaterialLayout[]>
}

export interface StudioTouchEvent { touches: { clientX: number, clientY: number }[] }
