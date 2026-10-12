const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')
function fixture() {
  const loader = createLoader(), store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const items = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  return { loader, store, vase: items.find(i=>i.id==='ceramic-vase'), narrow: items.find(i=>i.id==='glass-bud-vase'), bouquet: items.find(i=>i.id==='kraft-wrap'), alternate: items.find(i=>i.id==='ivory-korean-wrap') }
}
const shape = store => store.stems.map(({id,x,angle,stemHeight,flowerScale})=>({id,x,angle,stemHeight,flowerScale}))
test('花瓶与花束各自记住布局，多次往返不改变高度大小；编辑内容仍共享', () => {
  const {store,vase,bouquet}=fixture()
  store.setVaseMaterial(vase)
  const original=JSON.stringify(shape(store))
  store.setVaseMaterial(bouquet)
  store.select(store.stems[0].id);store.adjustSelected('height', -15);store.adjustSelected('size', .1);store.setColor('#abcdef')
  const wrapped=JSON.stringify(shape(store))
  for(let i=0;i<4;i++) {
    store.setVaseMaterial(vase);assert.equal(JSON.stringify(shape(store)),original)
    assert.equal(store.stems[0].color,'#abcdef')
    store.setVaseMaterial(bouquet);assert.equal(JSON.stringify(shape(store)),wrapped)
  }
})
test('窄瓶和不同包装的落点分别记忆，新增花材和删除不会被恢复成旧列表', () => {
  const {store,vase,narrow,bouquet,alternate}=fixture()
  store.setVaseMaterial(vase);const wide=JSON.stringify(shape(store))
  store.setVaseMaterial(narrow);store.setVaseMaterial(vase);assert.equal(JSON.stringify(shape(store)),wide)
  store.setVaseMaterial(bouquet);const first=JSON.stringify(shape(store))
  store.setVaseMaterial(alternate);store.select(store.stems[0].id);store.adjustSelected('height',10)
  store.setVaseMaterial(bouquet);assert.equal(JSON.stringify(shape(store)),first)
  store.addFlower('rose');const added=store.stems.at(-1).id
  store.select(store.stems[0].id);const deleted=store.selectedId;store.removeSelected()
  store.setVaseMaterial(vase)
  assert.ok(store.stems.some(s=>s.id===added));assert.ok(!store.stems.some(s=>s.id===deleted))
})
test('撤销重做恢复布局记忆，不受后续切换污染', () => {
  const {store,vase,bouquet}=fixture()
  store.setVaseMaterial(vase);const initial=JSON.stringify(shape(store))
  store.setVaseMaterial(bouquet);const wrapped=JSON.stringify(shape(store))
  store.setVaseMaterial(vase);assert.equal(JSON.stringify(shape(store)),initial)
  store.undo();assert.equal(JSON.stringify(shape(store)),wrapped)
  store.redo();assert.equal(JSON.stringify(shape(store)),initial)
  store.setVaseMaterial(bouquet);assert.equal(JSON.stringify(shape(store)),wrapped)
})

test('作品恢复保留布局记忆，非法布局参数被拒绝，历史快照深拷贝', () => {
  const {loader,store,vase,bouquet}=fixture()
  store.setVaseMaterial(vase);const initial=JSON.stringify(shape(store))
  store.setVaseMaterial(bouquet)
  const json = JSON.stringify(store.snapshot())
  const {parseArtwork}=loader.load('src/utils/flower/artwork.ts')
  store.initialize(parseArtwork(json));store.setVaseMaterial(vase)
  assert.equal(JSON.stringify(shape(store)),initial)
  const bad=JSON.parse(json);const key=Object.keys(bad.containerLayouts)[0]
  bad.containerLayouts[key][0].stemHeight=-1
  assert.throws(()=>parseArtwork(JSON.stringify(bad)),/布局/)
  const history = new (loader.load('src/utils/flower/artwork-history.ts').ArtworkHistory)()
  const snapshot=JSON.parse(json);history.remember(snapshot)
  snapshot.containerLayouts[key][0].stemHeight=120
  assert.notEqual(history.undo(snapshot).containerLayouts[key][0].stemHeight,120)
})
test('首次切换花束时花头高于包装上沿，切回花瓶仍恢复原布局', () => {
  const { loader, store, vase, bouquet } = fixture()
  store.setVaseMaterial(vase)
  const original = JSON.stringify(shape(store))
  store.setVaseMaterial(bouquet)
  const placement = loader.load('src/utils/flower/material-render.ts').vasePlacement(bouquet)
  for (const stem of store.stems.filter(s => s.kind !== 'leaf')) {
    const headY = 747 - Math.cos(stem.angle * Math.PI / 180) * (stem.stemHeight + 55) * stem.flowerScale
    assert.ok(headY < placement.y - 20, '花头应明显露出包装上沿')
  }
  store.setVaseMaterial(vase)
  assert.equal(JSON.stringify(shape(store)), original)
})
