import type { CachedMaterial } from '@/models/material'
import cream from './assets/wrap-cream.svg?raw'
import kraft from './assets/wrap-kraft.svg?raw'
import sage from './assets/wrap-sage.svg?raw'
import rose from './assets/wrap-rose.svg?raw'
import lavender from './assets/wrap-lavender.svg?raw'
import ivory from './assets/wrap-ivory.svg?raw'

export const wrappingMaterials: CachedMaterial[] = [
  { id: 'demo-wrap-cream', name: '奶油叠纸', source: cream, color: '#e7dcc7' },
  { id: 'demo-wrap-kraft', name: '牛皮卷包', source: kraft, color: '#c4a17b' },
  { id: 'demo-wrap-sage', name: '绿意侧卷', source: sage, color: '#b7c4ae' },
  { id: 'demo-wrap-rose', name: '豆沙柔纸', source: rose, color: '#cfaaa5' },
  { id: 'demo-wrap-lavender', name: '雾紫错层', source: lavender, color: '#c4bbce' },
  { id: 'demo-wrap-ivory', name: '杏色窄束', source: ivory, color: '#e1c5a6' },
].map(({ id, name, source, color }) => ({
  id, name, category: 'bouquet', group: 'main', introduction: '手作花束包装', flowerMeaning: '',
  colors: [{ name: '原色', value: color }],
  geometry: { width: 698, height: 1000, mouthX: 350, mouthY: 747, mouthWidth: 12 },
  assets: {}, paths: {}, updatedAt: 0, sources: { bouquet: source },
}))
