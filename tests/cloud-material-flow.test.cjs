const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')
const fs = require('node:fs')
function legacy() {
  const draft = createLoader().load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(row => row.id === 'rose')
  const assets = Object.fromEntries(Object.keys(draft.sources).map(key => [key, { fileId: `cloud:${key}`, hash: 'a'.repeat(40), url: `https://test/${key}` }]))
  const record = { ...draft, assets }; delete record.geometry; return record
}
test('旧玫瑰档案补几何；未知花材缺几何拒绝；花瓶瓶口不能越界', () => {
  const { normalizeMaterial } = createLoader().load('src/utils/flower/material-catalog.ts')
  const rose = normalizeMaterial(legacy())
  assert.equal(rose.category, 'flower'); assert.equal(rose.geometry.connectionY, 101)
  assert.throws(() => normalizeMaterial({ ...legacy(), id: 'new-flower' }), /几何/)
  assert.throws(() => normalizeMaterial({ id: 'vase', category: 'vase', name: '瓶', introduction: '', version: 1, revision: 'a'.repeat(16), assets: { vase: { fileId: 'cloud:v', hash: 'a'.repeat(40) } }, geometry: { width: 140, height: 170, mouthX: 70, mouthY: 180, mouthWidth: 80 } }), /几何/)
})
test('首次下载、再次命中持久缓存，损坏文件重新下载', async () => {
  const crypto = require('node:crypto')
  const source = fs.readFileSync('src/utils/flower/svg/rose-bloom.svg', 'utf8')
  const hash = crypto.createHash('sha1').update(source).digest('hex')
  const files = new Map(), storage = new Map(); let downloads = 0
  const loader = createLoader({ wx: { getFileSystemManager: () => ({ getFileInfo: o => files.has(o.filePath) ? o.success({ digest: crypto.createHash('sha1').update(files.get(o.filePath)).digest('hex') }) : o.fail(new Error('missing')), readFile: o => o.success({ data: files.get(o.filePath) }) }) }, uni: {
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: key => storage.delete(key),
    downloadFile: o => { downloads++; files.set('/temp', source); o.success({ statusCode: 200, tempFilePath: '/temp' }) }, saveFile: o => { files.set('/saved', files.get(o.tempFilePath)); o.success({ savedFilePath: '/saved' }) },
  } })
  const prepare = loader.load('src/utils/flower/material-cache.ts').prepareMaterial
  const record = { id: 'rose', revision: 'a'.repeat(16), assets: { flower: { hash, fileId: 'cloud:flower', url: 'https://test/flower' } } }
  assert.equal((await prepare(record)).downloaded, 1)
  assert.equal((await prepare(record)).cached, 1); assert.equal(downloads, 1)
  files.delete('/saved'); assert.equal((await prepare(record)).downloaded, 1)
  assert.equal(downloads, 2)
})
test('工作室只在花瓶画布显示统一素材加载状态', () => {
  const loader = createLoader()
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const studio = loader.load('src/stores/flowerStudioStore.ts').useFlowerStudioStore()
  const source = fs.readFileSync('src/pages/flower-studio/components/studio-material-status.vue', 'utf8')
  page.catalog.loading = true
  assert.equal(studio.materialsLoading, true)
  page.catalog.loading = false
  page.catalog.preparing = true
  assert.equal(studio.materialsLoading, true)
  page.catalog.preparing = false
  page.catalog.downloading = 1
  assert.equal(studio.materialsLoading, true)
  page.catalog.downloading = 0
  page.catalog.error = 'Network unavailable'
  assert.equal(studio.materialsLoading, false)
  assert.match(source, /class="canvas-material-overlay"/)
  assert.match(source, /\.canvas-material-overlay\s*\{[^}]*pointer-events:\s*none/s)
  assert.match(source, /\.materials-loading-card\s*\{[^}]*pointer-events:\s*auto/s)
  assert.doesNotMatch(source, /@touchmove\.stop\.prevent/)
  assert.doesNotMatch(source, /class="materials-loading-overlay"/)
  assert.match(source, /v-if="loading"/)
  assert.doesNotMatch(source, /素材加载失败|materialsError|error|@retry/)
  assert.doesNotMatch(fs.readFileSync('src/components/flower/flower-stem.vue', 'utf8'), /素材加载失败/)
  assert.doesNotMatch(fs.readFileSync('src/components/flower/flower-vase.vue', 'utf8'), /容器素材不可用/)
})
test('云素材及花瓶引用在复制、切换、撤销和重做中保留，切回内置时清除引用', () => {
  const loader = createLoader(), store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const normalize = loader.load('src/utils/flower/material-catalog.ts').normalizeMaterial
  const material = { ...normalize(legacy()), sources: createLoader().load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(row => row.id === 'rose').sources, paths: {} }
  const id = store.addMaterial(material); store.select(id); store.toggleLeaves()
  assert.equal(store.selected.leafMode, 'with')
  const cloned = store.duplicateSelected(); assert.ok(cloned); assert.equal(store.stems.at(-1).materialRevision, material.revision)
  const vase = { category: 'vase', id: 'vase', revision: 'b'.repeat(16), sources: { vase: '<svg />' }, geometry: { width: 140, height: 170, mouthX: 70, mouthY: 8, mouthWidth: 110 } }
  store.setVaseMaterial(vase); assert.equal(store.snapshot().vaseMaterialId, 'vase')
  store.setVase('陶瓶'); assert.equal(store.snapshot().vaseMaterialId, undefined)
  store.undo(); assert.equal(store.snapshot().vaseMaterialId, 'vase')
  store.redo(); assert.equal(store.snapshot().vaseMaterialId, undefined)
})
test('连续添加99枝相同花材时默认姿态保持充分分散', () => {
  const loader = createLoader(), store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const material = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(row => row.id === 'rose')
  store.initialize({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })
  for (let index = 0; index < 99; index++)
    store.addMaterial(material)
  const poses = store.stems.map(stem => `${stem.x.toFixed(2)}:${stem.angle.toFixed(2)}:${stem.stemHeight.toFixed(2)}`)
  const headCells = store.stems.map((stem) => {
    const radians = stem.angle * Math.PI / 180
    return `${Math.round((stem.x + Math.sin(radians) * stem.stemHeight) / 12)}:${Math.round((stem.y - Math.cos(radians) * stem.stemHeight) / 12)}`
  })
  assert.ok(new Set(poses).size >= 90)
  assert.ok(new Set(headCells).size >= 80)
  assert.ok(new Set(store.stems.map(stem => stem.angle.toFixed(2))).size >= 20)
  assert.ok(new Set(store.stems.map(stem => stem.stemHeight.toFixed(2))).size >= 20)
})
test('下载的 SVG 按几何拼装；Canvas 直接绘制同一来源，未知图形拒绝导出', () => {
  const loader = createLoader(), files = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  const { cloudPlantSvg } = loader.load('src/utils/flower/material-render.ts')
  const { drawSvg } = loader.load('src/utils/flower/svg-canvas.ts')
  const methods = [], ctx = new Proxy({}, { get: (_, method) => (...args) => { methods.push([method, args]); if (method === 'createLinearGradient') return { addColorStop() {} } } })
  for (const draft of files) {
    const source = draft.category !== 'flower' ? (draft.sources.vase || draft.sources.bouquet || draft.sources.background) : cloudPlantSvg({ ...draft, category: 'flower' }, { color: '#abcdef', stemHeight: 410, leafMode: 'without' })
    drawSvg(ctx, source, 110, 465)
  }
  assert.ok(methods.some(([method]) => method === 'bezierCurveTo'))
  assert.ok(methods.some(([method, args]) => method === 'setFillStyle' && args[0] === '#abcdef'))
  assert.throws(() => drawSvg(ctx, '<svg viewBox="0 0 100 100"><image href="x" /></svg>', 100, 100), /暂不支持/)
  const endpoints = []
  const arcContext = new Proxy({}, { get: (_, method) => (...args) => { if (method === 'bezierCurveTo') endpoints.push(args.slice(4)); } })
  drawSvg(arcContext, '<svg viewBox="0 0 100 100"><path d="M10 50A40 30 0 0 1 90 50" fill="none" stroke="#000" /></svg>', 100, 100)
  assert.ok(Math.abs(endpoints.at(-1)[0] - 90) < 1e-8); assert.ok(Math.abs(endpoints.at(-1)[1] - 50) < 1e-8)
})

test('导出花材时按比例降低 SVG 描边不透明度', () => {
  const { drawSvg } = createLoader().load('src/utils/flower/svg-canvas.ts')
  const alphas = []
  const ctx = new Proxy({}, { get: (_, method) => (...args) => { if (method === 'setGlobalAlpha') alphas.push(args[0]) } })
  const source = '<svg viewBox="0 0 100 100"><g opacity=".5"><path d="M0 0L100 100" fill="none" stroke="#333" stroke-opacity=".8" /></g></svg>'
  drawSvg(ctx, source, 100, 100, 0.25)
  assert.equal(alphas.at(-1), 0.1)
})

test('切换窄瓶口只移动花枝底端，保留高度和角度；不支持的渐变明确拒绝', () => {
  const loader = createLoader(), store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  store.stems[0].x = 362; store.stems[0].angle = -65; store.stems[0].stemHeight = 275
  store.setVaseMaterial({ category: 'vase', id: 'narrow-vase', revision: 'a'.repeat(16), sources: { vase: '<svg />' }, geometry: { width: 140, height: 170, mouthX: 70, mouthY: 8, mouthWidth: 10 } })
  assert.equal(store.stems[0].x, 351); assert.equal(store.stems[0].stemHeight, 275); assert.equal(store.stems[0].angle, -65)
  const drawSvg = loader.load('src/utils/flower/svg-canvas.ts').drawSvg
  const ctx = new Proxy({}, { get: () => () => {} })
  assert.throws(() => drawSvg(ctx, '<svg viewBox="0 0 110 110"><defs><linearGradient id="g"><stop offset="0" stop-color="#000" /></linearGradient></defs><rect x="40" y="30" width="20" height="10" fill="url(#g)" /></svg>', 110, 110), /userSpaceOnUse/)
})

test('扩充后的花材档案完整，主花 35 种，叶材颜色可用于工作台', () => {
  const loader = createLoader()
  const catalog = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog
  assert.equal(catalog.errors.length, 0)
  const additions = catalog.items.filter(item => item.category === 'flower' && !['rose', 'tulip', 'daisy'].includes(item.id))
  assert.equal(catalog.items.filter(item => item.category === 'flower' && item.group === 'main').length, 35)
  assert.equal(additions.filter(item => item.group === 'filler').length, 32)
  assert.equal(additions.filter(item => item.group === 'foliage').length, 25)
  const { cloudPlantSvg } = loader.load('src/utils/flower/material-render.ts')
  for (const item of additions) {
    assert.ok(item.introduction && item.flowerMeaning && item.geometry && item.colors.length > 1)
    if (item.group === 'foliage') {
      const source = cloudPlantSvg(item, { color: '#abcdef', stemHeight: 410 })
      assert.ok(source.includes('#abcdef'))
      assert.ok(!source.includes('__COLOR__'))
    } else {
      assert.ok(item.sources.flower && item.sources.stemWithLeaves && item.sources.stemWithoutLeaves)
      assert.notEqual(item.sources.stemWithLeaves, item.sources.stemWithoutLeaves)
    }
  }
})

test('花束包装独立分类、上传文件和束口几何可被解析及工作台消费', () => {
  const loader = createLoader(), catalog = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog
  assert.equal(catalog.errors.length, 0)
  assert.equal(catalog.items.filter(row => row.category === 'vase').length, 9)
  const wrappers = catalog.items.filter(row => row.category === 'bouquet')
  assert.equal(wrappers.length, 6)
  const normalize = loader.load('src/utils/flower/material-catalog.ts').normalizeMaterial
  const { vasePlacement } = loader.load('src/utils/flower/material-render.ts')
  const { bouquetLayers } = loader.load('src/utils/flower/material-render.ts')
  const { drawSvg } = loader.load('src/utils/flower/svg-canvas.ts')
  const ctx = new Proxy({}, { get: (_, method) => method === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} })
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const page = loader.setup('src/subpackages/material-admin/material-admin-page.vue')
  page.group.value = 'bouquet'
  assert.equal(page.materials.value.length, 6)
  for (const item of wrappers) {
    const material = { ...normalize({ ...item, assets: { bouquet: { fileId: 'cloud:wrap', hash: 'a'.repeat(40) } } }), sources: item.sources, paths: {} }
    const position = vasePlacement(material)
    assert.equal(position.x + item.geometry.mouthX, 350)
    assert.equal(position.y + item.geometry.mouthY, 747)
    assert.equal(position.mouthRight - position.mouthLeft, 24)
    const layers = bouquetLayers(material)
    assert.ok(!layers.back.includes('bouquet-front:start'))
    assert.ok(!layers.front.includes('bouquet-back:start'))
    assert.notEqual(layers.front, layers.back)
    drawSvg(ctx, layers.back, position.width, position.height)
    drawSvg(ctx, layers.front, position.width, position.height)
    store.setVaseMaterial(material)
    assert.equal(store.vase, '花束')
    assert.equal(store.snapshot().vaseMaterialId, item.id)
    page.open(item)
    assert.equal(page.wholePreview.value, null)
  }
})
