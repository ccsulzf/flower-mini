import type { Artwork, MaterialInstance } from '@/models/artwork'
import { parseArtwork } from '@/utils/flower/artwork'
import { exampleJson } from '@/pages/flower-json/example'

// 同一批花叶供优化前后对比；示例故意包含局部拥挤、偏向右侧及高低接近。
export function createComplexArtwork(): Artwork {
  const value = parseArtwork(exampleJson)
  const flowers = value.materials
  const angles = [-22, -18, -7, -4, 0, 3, 6, 9, 12, 15]
  const materials: MaterialInstance[] = Array.from({ length: 30 }, (_, index) => ({
    ...flowers[index % flowers.length],
    id: index + 1,
    transform: {
      anchor: { x: 340 + index % 5 * 5, y: 747 },
      angle: angles[index % angles.length],
      height: 325 + Math.floor(index / 10) * 65 + index % 3 * 8,
      scale: 0.85 + index % 4 * 0.1,
      mirrored: index % 3 === 0,
    },
  }))
  const foliage = [
    { materialId: 'eucalyptus', color: '#91a795' },
    { materialId: 'asparagus-fern', color: '#9daa7c' },
    { materialId: 'boston-fern', color: '#8ca078' },
  ]
  for (let index = 0; index < 10; index++) {
    materials.push({
      id: 31 + index, ...foliage[index % foliage.length], group: 'foliage',
      transform: {
        anchor: { x: 342 + index % 4 * 5, y: 747 },
        angle: 10 + index % 5 * 5,
        height: 350 + index % 3 * 25,
        scale: 0.9 + index % 3 * 0.1,
        mirrored: index % 2 === 0,
      },
    })
  }
  return { ...value, materials, containerLayouts: {} }
}
