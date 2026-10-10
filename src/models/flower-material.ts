import type { FlowerKind } from '@/models/artwork'

export interface FlowerMaterial {
  kind: FlowerKind
  name: string
  group: 'main' | 'filler' | 'foliage'
  color: string
  height: number
  size: number
}
