const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')

test('花材面板独立筛选主花、配花和叶材，添加状态来自工作室', () => {
  const loader = createLoader()
  const catalog = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  catalog.materials = [
    { id: 'rose', category: 'flower', group: 'main' },
    { id: 'filler', category: 'flower', group: 'filler' },
    { id: 'leaf', category: 'flower', group: 'foliage' },
    { id: 'vase', category: 'vase' },
  ]
  const panel = loader.setup('src/pages/flower-studio/components/studio-flower-panel.vue')
  assert.equal(panel.visibleFlowers.value[0].id, 'rose')
  panel.activeGroup.value = 'foliage'
  assert.equal(panel.visibleFlowers.value.length, 1)
  assert.equal(panel.visibleFlowers.value[0].id, 'leaf')
  const studio = loader.load('src/stores/flowerStudioStore.ts').useFlowerStudioStore()
  studio.addingMaterial = true
  assert.equal(panel.adding.value, true)
})

test('容器面板独立切换花瓶与花束，不混入花材或背景', () => {
  const loader = createLoader()
  const catalog = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  catalog.materials = [{ id: 'vase', category: 'vase' }, { id: 'wrap', category: 'bouquet' }, { id: 'scene', category: 'background' }]
  const panel = loader.setup('src/pages/flower-studio/components/studio-container-panel.vue')
  assert.equal(panel.visibleContainers.value[0].id, 'vase')
  panel.activeContainer.value = 'bouquet'
  assert.equal(panel.visibleContainers.value.length, 1)
  assert.equal(panel.visibleContainers.value[0].id, 'wrap')
})

test('背景面板依据作品恢复场景分类，场景筛选随目录更新', () => {
  const loader = createLoader()
  const artwork = loader.load('src/stores/artworkStore.ts').useCreationArtworkStore()
  artwork.backgroundMaterialId = 'scene'
  const catalog = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  catalog.materials = [{ id: 'flower', category: 'flower' }, { id: 'scene', category: 'background' }]
  const panel = loader.setup('src/pages/flower-studio/components/studio-background-panel.vue')
  assert.equal(panel.activeBackground.value, 'scene')
  assert.equal(panel.sceneBackgrounds.value.length, 1)
  assert.equal(panel.sceneBackgrounds.value[0].id, 'scene')
  catalog.materials = [...catalog.materials, { id: 'next-scene', category: 'background' }]
  assert.equal(panel.sceneBackgrounds.value.length, 2)
  panel.activeBackground.value = 'solid'
  assert.equal(artwork.backgroundMaterialId, 'scene')
})
