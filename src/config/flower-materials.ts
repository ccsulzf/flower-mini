import type { Artwork, FlowerKind, VaseName } from '@/models/artwork'

export const vaseOptions: VaseName[] = ['陶瓶', '玻璃瓶', '圆花器', '花束']
export const flowerGroups = [{ value: 'main', name: '主花' }, { value: 'filler', name: '配花' }, { value: 'foliage', name: '叶材' }] as const
export const flowerCatalog: { kind: FlowerKind, name: string, color: string, group: 'main' | 'filler' | 'foliage', height: number, size: number }[] = [
  { kind: 'chrysanthemum', group: 'main', height: 410, size: 1.3, name: '金丝菊', color: '#e1b94f' },
  { kind: 'rose', group: 'main', height: 500, size: 1.2, name: '玫瑰', color: '#b82b36' },
  { kind: 'tulip', group: 'main', height: 470, size: 1.35, name: '郁金香', color: '#f4f0e6' },
  { kind: 'daisy', group: 'filler', height: 350, size: 1, name: '小雏菊', color: '#f1e5bd' },
  { kind: 'poppy', group: 'main', height: 420, size: 1.15, name: '虞美人', color: '#d78979' },
  { kind: 'leaf', group: 'foliage', height: 440, size: 1.1, name: '尤加利', color: '#849c81' },
]
export const flowerColors = ['#e1b94f', '#b82b36', '#f4f0e6', '#b394db', '#d78979', '#849c81']
export const backgroundOptions: { value: Artwork['background'], name: string, color: string }[] = [
  { value: 'cocoa', name: '可可棕', color: '#3c2f28' },
  { value: 'warm', name: '暖白', color: '#f6f3eb' },
  { value: 'sage', name: '浅绿', color: '#dce3d5' },
  { value: 'mist', name: '浅灰', color: '#e7e8e5' },
  { value: 'blush', name: '淡粉', color: '#f0e1df' },
  { value: 'sand', name: '浅杏', color: '#e9dfcc' },
]

export function createDefaultArtwork(): Artwork {
  return { vase: '陶瓶', background: 'warm', stems: [
    { id: 1, kind: 'daisy', x: 338, y: 747, angle: -24, flowerScale: 1, stemHeight: 410, color: '#f1e5bd' },
    { id: 2, kind: 'rose', x: 350, y: 747, angle: -5, flowerScale: 1.2, stemHeight: 530, color: '#b82b36' },
    { id: 3, kind: 'tulip', x: 362, y: 747, angle: 25, flowerScale: 1.35, stemHeight: 450, color: '#f4f0e6' },
  ] }
}
