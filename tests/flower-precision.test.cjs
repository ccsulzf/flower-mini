const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')

function fixture() {
  const loader = createLoader()
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  store.select(store.stems[0].id)
  return { loader, store }
}
test('精调角度、高度和大小遵守边界，能逐步撤销，不产生无效历史', () => {
  const { store } = fixture(), original = { ...store.selected }
  store.adjustSelected('angle', 1)
  assert.equal(store.selected.angle, original.angle + 1)
  store.adjustSelected('height', -4)
  assert.equal(store.selected.stemHeight, original.stemHeight - 4)
  store.adjustSelected('size', .02)
  assert.equal(store.selected.flowerScale, Math.round((original.flowerScale + .02) * 100) / 100)
  store.undo(); store.undo(); store.undo()
  assert.equal(JSON.stringify(store.stems[0]), JSON.stringify(original))
  store.select(original.id); store.adjustSelected('angle', 999)
  assert.equal(store.selected.angle, 65)
  store.adjustSelected('size', -999)
  assert.equal(store.selected.flowerScale, .65)
})
test('镜像在复制、撤销和 JSON 保存中保留，非法镜像字段拒绝', () => {
  const { loader, store } = fixture()
  store.mirrorSelected()
  assert.equal(store.selected.mirrored, true)
  const clone = store.duplicateSelected()
  assert.equal(store.stems.find(row => row.id === clone).mirrored, true)
  const { parseArtwork } = loader.load('src/utils/flower/artwork.ts')
  const snapshot = store.snapshot()
  assert.equal(parseArtwork(JSON.stringify(snapshot)).stems[0].mirrored, true)
  snapshot.stems[0].mirrored = 'yes'
  assert.throws(() => parseArtwork(JSON.stringify(snapshot)), /镜像/)
  store.undo(); store.undo()
  assert.equal(store.stems[0].mirrored, undefined)
})
test('重叠花材按上一枝和下一枝循环选择，不修改作品历史', () => {
  const { store } = fixture(), ids = store.stems.map(row => row.id)
  store.selectAdjacent('previous'); assert.equal(store.selectedId, ids.at(-1))
  store.selectAdjacent('next'); assert.equal(store.selectedId, ids[0])
  assert.equal(store.canUndo, false)
})
test('位置滑杆让花茎自然摆动而不是沿水平轨道平移，连续调整只需撤销一次', () => {
  const { store } = fixture()
  const original = { ...store.selected }
  const bounds = store.selectedControlBounds
  assert.equal(bounds.heightMin, 120)

  store.beginSelectedControl()
  store.updateSelectedControl('position', 30)
  assert.equal(store.selected.angle, 30)
  assert.equal(store.selected.stemHeight, original.stemHeight)
  const landing = store.stemLandingBounds()
  assert.ok(store.selected.x >= landing.left && store.selected.x <= landing.right)
  const movedBounds = store.selectedControlBounds
  store.updateSelectedControl('height', movedBounds.heightMax + 100)
  store.endStemEdit()

  assert.equal(store.selected.stemHeight, movedBounds.heightMax)
  store.undo()
  assert.equal(JSON.stringify(store.stems[0]), JSON.stringify(original))
  assert.equal(store.canUndo, false)
})
test('位置滑杆边界随枝长收敛，不会在两端突然截短花茎', () => {
  const { store } = fixture()
  const originalHeight = store.selected.stemHeight
  const { positionMin, positionMax } = store.selectedControlBounds

  store.beginSelectedControl()
  store.updateSelectedControl('position', positionMax)
  assert.ok(positionMax < 65)
  assert.ok(Math.abs(store.selected.stemHeight - originalHeight) < 0.001)
  store.endStemEdit()

  store.undo()
  store.select(store.stems[0].id)
  store.beginSelectedControl()
  store.updateSelectedControl('position', positionMin)
  assert.ok(positionMin > -65)
  assert.ok(Math.abs(store.selected.stemHeight - originalHeight) < 0.001)
})
test('位置和高度滑杆把连续拖动作为一次编辑发送', () => {
  const events = []
  const loader = createLoader({ emit: (...event) => events.push(event) })
  const stem = { id: 1, kind: 'leaf', x: 350, y: 747, angle: 30, stemHeight: 200, flowerScale: 1, color: '#69805e' }
  const tools = loader.setup('src/pages/flower-studio/components/studio-flower-tools.vue', {
    stem, colorsOpen: false, canMoveBack: false, canMoveFront: false,
    controlBounds: { positionMin: 300, positionMax: 400, heightMin: 120, heightMax: 620 },
  })

  assert.equal(tools.positionValue.value, 30)
  tools.beginControl()
  tools.changeControl('position', { detail: { value: 376 } })
  tools.changeControl('height', { detail: { value: 412 } })
  tools.endControl()

  assert.equal(JSON.stringify(events), JSON.stringify([
    ['controlStart'], ['control', 'position', 376], ['control', 'height', 412], ['controlEnd'],
  ]))
})
test('旧作品带叶设置在工作台强制去叶，镜像不改变花枝旋转', () => {
  const { loader } = fixture()
  const material = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(row => row.id === 'bird-of-paradise')
  const catalog = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  catalog.prepared[`${material.id}:${material.revision}`] = material
  const stem = { id: 1, kind: 'rose', x: 350, y: 747, angle: 12, stemHeight: 300, flowerScale: 1, color: '#abcdef', materialId: material.id, materialRevision: material.revision, leafMode: 'with', mirrored: true }
  const state = loader.setup('src/components/flower/flower-stem.vue', { stem, anchor: 747, selected: true })
  const decoded = Buffer.from(state.cloudSource.value.split(',')[1], 'base64').toString('utf8')
  const leaf = material.sources.stemWithLeaves.match(/<path d="([^"]+)"[^>]*fill="(?!none")[^"]+"/)
  assert.ok(leaf)
  assert.ok(!decoded.includes(`d="${leaf[1]}"`))
  assert.ok(state.flowerInstanceStyle.value.includes('scale(-1, 1)'))
  assert.ok(state.studioStemStyle.value.includes('rotate(12deg)'))
})

test('后台下载不阻止选择已知花材，同一次等待不重复添加', async () => {
  const loader = createLoader(), page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.pageReady.value = true
  const material = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(row => row.id === 'rose')
  page.catalog.materials = [material]; page.catalog.downloading = 3
  let release
  page.catalog.ensure = () => new Promise(resolve => { release = () => resolve(material) })
  page.activeTab.value = 'flowers'
  const work = page.addCloudMaterial(material.id)
  assert.equal(page.addingMaterial.value, true)
  await page.addCloudMaterial(material.id)
  release(); await work
  assert.equal(page.stems.value.length, 1)
  assert.equal(page.activeTab.value, 'flowers')
  assert.equal(page.stems.value[0].leafMode, 'without')
  assert.equal(page.addingMaterial.value, false)
})

test('花瓶新增花枝分散落点，切换花瓶会展开集中落点，花束仍收拢且能撤销', () => {
  const { loader, store } = fixture()
  const items = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  const flower = items.find(item => item.id === 'rose')
  const vase = items.find(item => item.category === 'vase')
  const bouquet = items.find(item => item.category === 'bouquet')
  store.clearArtwork()
  for (let i = 0; i < 5; i++) store.addMaterial(flower)
  assert.equal(new Set(store.stems.map(stem => stem.x)).size, 5)
  store.stems.forEach(stem => { stem.x = 350 })
  store.setVaseMaterial(vase)
  const placement = loader.load('src/utils/flower/material-render.ts').vasePlacement(vase)
  assert.equal(new Set(store.stems.map(stem => stem.x)).size, 5)
  assert.ok(store.stems.every(stem => stem.x > placement.mouthLeft && stem.x < placement.mouthRight))
  store.undo()
  assert.ok(store.stems.every(stem => stem.x === 350))
  store.setVaseMaterial(bouquet)
  assert.ok(store.stems.every(stem => Math.abs(stem.x - 350) <= 8))
})
