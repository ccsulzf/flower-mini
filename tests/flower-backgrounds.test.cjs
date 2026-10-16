const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')
const scene = { id: 'paper-ivory', category: 'background', name: '米白纸纹', introduction: '纸纹背景', version: 1, revision: 'a'.repeat(16), geometry: { width: 698, height: 1000, surfaceY: 910 }, assets: { background: { fileId: 'cloud://paper', hash: 'b'.repeat(40) } }, sources: { background: '<svg viewBox="0 0 698 1000"><rect width="698" height="1000" fill="#eeeeee"/></svg>' }, paths: {} }
test('背景档案校验尺寸和桌面高度，并保持单份背景资产', () => {
  const loader = createLoader(), { normalizeMaterial, materialParts } = loader.load('src/utils/flower/material-catalog.ts')
  const record = normalizeMaterial(scene)
  assert.equal(record.category, 'background')
  assert.equal(record.geometry.surfaceY, 910)
  assert.deepEqual(Array.from(materialParts(record)), ['background'])
  assert.throws(() => normalizeMaterial({ ...scene, geometry: { ...scene.geometry, surfaceY: 1001 } }))
})
test('场景选择、纯色切换、撤销及 JSON 恢复保留背景引用', () => {
  const loader = createLoader(), store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const parse = loader.load('src/utils/flower/artwork.ts').parseArtwork
  store.setBackgroundMaterial(scene)
  const restored = parse(JSON.stringify(store.snapshot()))
  assert.equal(restored.backgroundMaterialId, scene.id)
  assert.equal(restored.backgroundMaterialRevision, scene.revision)
  store.setBackground('mist')
  assert.equal(store.backgroundMaterialId, undefined)
  assert.equal(store.background, 'mist')
  store.undo()
  assert.equal(store.backgroundMaterialId, scene.id)
  assert.throws(() => parse(JSON.stringify({ ...restored, backgroundMaterialRevision: 'broken' })))
})
test('背景包含六个纯色和十四个可上传场景，桌面落点随花瓶底部对齐', () => {
  const loader = createLoader()
  assert.equal(loader.load('src/config/flower-materials.ts').backgroundOptions.length, 6)
  const catalog = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog
  assert.equal(catalog.errors.length, 0)
  assert.equal(catalog.items.filter(item => item.category === 'background').length, 14)
  const { backgroundOffset } = loader.load('src/utils/flower/background-render.ts')
  const vase = catalog.items.find(item => item.category === 'vase')
  const placement = loader.load('src/utils/flower/material-render.ts').vasePlacement(vase)
  assert.equal(backgroundOffset(scene, vase, '陶瓶') + placement.y + placement.height, 910)
  assert.equal(backgroundOffset({ ...scene, geometry: { width: 698, height: 1000 } }, vase, '陶瓶'), 0)
})

test('背景选择保持面板打开，不添加花枝；编辑和导出使用相同背景和桌面偏移', async () => {
  const loader = createLoader(), page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.pageReady.value = true
  const items = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  const vase = { ...items.find(item => item.category === 'vase'), assets: {}, paths: {} }
  page.catalog.materials = [scene, vase]
  page.catalog.prepared[`${scene.id}:${scene.revision}`] = scene
  page.catalog.prepared[`${vase.id}:${vase.revision}`] = vase
  page.catalog.ensure = async id => id === scene.id ? scene : vase
  page.store.setVaseMaterial(vase)
  page.activeTab.value = 'backgrounds'
  await page.addCloudMaterial(scene.id)
  assert.equal(page.activeTab.value, 'backgrounds')
  assert.equal(page.stems.value.length, 0)
  assert.equal(page.backgroundMaterialId.value, scene.id)
  const board = loader.setup('src/components/flower/flower-board.vue', { stems: [], vase: '陶瓶', selectedId: null, vaseMaterialId: vase.id, vaseMaterialRevision: vase.revision, backgroundMaterialId: scene.id, backgroundMaterialRevision: scene.revision })
  assert.ok(Buffer.from(board.backgroundSource.value.split(',')[1], 'base64').toString().includes('#eeeeee'))
  assert.equal(board.arrangementOffset.value, loader.load('src/utils/flower/background-render.ts').backgroundOffset(scene, vase, '陶瓶'))
  const calls = [], ctx = new Proxy({}, { get: (_, method) => (...args) => {
    calls.push([method, args])
    if (method === 'createLinearGradient') return { addColorStop() {} }
    if (method === 'draw') args[1]()
  } })
  await loader.load('src/utils/flower/render-artwork.ts').renderArtwork(ctx, page.store.snapshot())
  const backgroundIndex = calls.findIndex(([method, args]) => method === 'setFillStyle' && args[0] === '#eeeeee')
  const moveIndex = calls.findIndex(([method, args]) => method === 'translate' && args[0] === 0 && args[1] === board.arrangementOffset.value)
  assert.ok(backgroundIndex >= 0 && moveIndex > backgroundIndex)
})
test('纯色只改变作品画板，不修改系统导航配色', () => {
  const changes = []
  const loader = createLoader({ uni: { setNavigationBarColor: value => changes.push(value) } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.store.setBackground('cocoa')
  page.store.setBackground('blush')
  assert.equal(changes.length, 0)
  const board = loader.setup('src/components/flower/flower-board.vue', { background: 'cocoa', stems: [], vase: '陶瓶', selectedId: null })
  assert.equal(board.boardColor.value, loader.load('src/utils/flower/artwork.ts').artworkBackground('cocoa'))
})
test('背景增强同时适用于旧云素材，纹理可见且木桌石台有明确桌面', () => {
  const loader = createLoader(), render = loader.load('src/utils/flower/background-render.ts')
  const catalog = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog
  for (const id of ['paper-ivory', 'paper-blush', 'paper-linen', 'scene-ivory-table', 'scene-sage-table']) {
    const material = catalog.items.find(item => item.id === id)
    const source = render.backgroundSceneSource(material)
    assert.ok(source.includes('studio-background:v2'))
    assert.equal(render.backgroundSceneSource({ ...material, sources: { background: source } }), source)
  }
  const vase = catalog.items.find(item => item.category === 'vase')
  const placement = loader.load('src/utils/flower/material-render.ts').vasePlacement(vase)
  assert.equal(render.backgroundOffset(catalog.items.find(item => item.id === 'scene-ivory-table'), vase, '陶瓶') + placement.y + placement.height, 820)
})
