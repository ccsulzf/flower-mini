import type { Artwork, MaterialGroup, MaterialInstance } from '@/utils/flower/artwork'

function material(id: number, materialId: string, group: MaterialGroup, x: number, angle: number, scale: number, height: number, color: string): MaterialInstance {
  return { id, materialId, group, color, transform: { anchor: { x, y: 747 }, angle, height, scale, mirrored: false } }
}

// 后方高花先绘制，前方低花后绘制；瓶口坐标保持在现有导入范围内。
const example: Artwork = {
  background: { materialId: 'paper-linen' },
  container: { materialId: 'matte-ceramic-vase', type: 'vase' },
  materials: [
    material(1, 'daisy', 'filler', 340, -13, 0.95, 445, '#f1e5bd'),
    material(2, 'tulip', 'main', 355, 8, 1.1, 450, '#f4f0e6'),
    material(3, 'daisy', 'filler', 362, 26, 0.95, 405, '#f1e5bd'),
    material(4, 'tulip', 'main', 338, -35, 1.1, 365, '#f4f0e6'),
    material(5, 'rose', 'main', 340, -23, 1.2, 350, '#b82b36'),
    material(6, 'rose', 'main', 350, 0, 1.25, 380, '#d77b83'),
    material(7, 'rose', 'main', 360, 18, 1.2, 345, '#b82b36'),
    material(8, 'tulip', 'main', 362, 39, 1.1, 335, '#f4f0e6'),
    material(9, 'daisy', 'filler', 338, -42, 1, 265, '#f1e5bd'),
    material(10, 'rose', 'main', 345, -15, 1.15, 255, '#d77b83'),
    material(11, 'tulip', 'main', 355, 10, 1.15, 245, '#f4f0e6'),
    material(12, 'daisy', 'filler', 362, 36, 1, 260, '#f1e5bd'),
  ],
  containerLayouts: {},
}

export const exampleJson = JSON.stringify(example, null, 2)
