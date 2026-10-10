import type { Artwork } from '@/utils/flower/artwork'

// 后方高花先绘制，前方低花后绘制；瓶口坐标保持在现有导入范围内。
const example: Artwork = {
  version: 2,
  vase: '陶瓶',
  background: 'warm',
  stems: [
    { id: 1, kind: 'daisy', x: 340, y: 747, angle: -13, flowerScale: 0.95, stemHeight: 445, color: '#f1e5bd' },
    { id: 2, kind: 'tulip', x: 355, y: 747, angle: 8, flowerScale: 1.1, stemHeight: 450, color: '#f4f0e6' },
    { id: 3, kind: 'daisy', x: 362, y: 747, angle: 26, flowerScale: 0.95, stemHeight: 405, color: '#f1e5bd' },
    { id: 4, kind: 'tulip', x: 338, y: 747, angle: -35, flowerScale: 1.1, stemHeight: 365, color: '#f4f0e6' },
    { id: 5, kind: 'rose', x: 340, y: 747, angle: -23, flowerScale: 1.2, stemHeight: 350, color: '#b82b36' },
    { id: 6, kind: 'rose', x: 350, y: 747, angle: 0, flowerScale: 1.25, stemHeight: 380, color: '#d77b83' },
    { id: 7, kind: 'rose', x: 360, y: 747, angle: 18, flowerScale: 1.2, stemHeight: 345, color: '#b82b36' },
    { id: 8, kind: 'tulip', x: 362, y: 747, angle: 39, flowerScale: 1.1, stemHeight: 335, color: '#f4f0e6' },
    { id: 9, kind: 'daisy', x: 338, y: 747, angle: -42, flowerScale: 1, stemHeight: 265, color: '#f1e5bd' },
    { id: 10, kind: 'rose', x: 345, y: 747, angle: -15, flowerScale: 1.15, stemHeight: 255, color: '#d77b83' },
    { id: 11, kind: 'tulip', x: 355, y: 747, angle: 10, flowerScale: 1.15, stemHeight: 245, color: '#f4f0e6' },
    { id: 12, kind: 'daisy', x: 362, y: 747, angle: 36, flowerScale: 1, stemHeight: 260, color: '#f1e5bd' },
  ],
}

export const exampleJson = JSON.stringify(example, null, 2)
