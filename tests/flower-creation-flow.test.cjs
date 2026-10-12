const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');
test('完成跳转完成作品页，插花页保持编辑；贺卡页独立预览且不修改作品', async () => {
  const routes = [], emitted = []
  const loader = createLoader({ uni: { getStorageSync: () => '', removeStorageSync() {}, setStorageSync() {}, navigateTo: value => { routes.push(value); value.success?.({ eventChannel: { emit: (...args) => emitted.push(args) } }) } } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('a'); page.pageReady.value = true; page.store.vaseMaterialId = 'vase'
  page.finish()
  assert.equal(routes[0].url, '/pages/flower-complete/flower-complete-page')
  assert.equal(page.session.view.value, 'edit')
  assert.equal(emitted[0][0], 'artwork')
  const card = loader.setup('src/pages/flower-card/flower-card-page.vue')
  card.images.exportCard = async () => true
  card.text.value = { recipient: '朋友', blessing: '祝福', signature: '小花' }
  await card.preview()
  assert.equal(card.renderedKey.value, card.contentKey.value)
  assert.equal(page.session.card.value.blessing, '')
  assert.equal(card.text.value.recipient, '朋友')
  page.session.dispose()
})
test('结束创作后迟到的花材下载不能插入新作品', async () => { const loader = createLoader({ uni: { getStorageSync: () => '', removeStorageSync() { }, setStorageSync() { } } }); const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.session.initialize('a'); page.pageReady.value = true; page.catalog.load = async () => { }; page.catalog.preload = async () => { }; const material = { id: 'test-flower', revision: 'a'.repeat(16), category: 'flower', name: '测试花', colors: [{ value: '#abcdef' }] }; page.catalog.materials = [material]; let release; page.catalog.ensure = () => new Promise(r => { release = r; }); const adding = page.addCloudMaterial(material.id); page.endCreation(); release(material); await adding; assert.equal(page.stems.value.length, 0); assert.equal(page.session.dirty.value, false); page.session.dispose(); });
test('作品详情直接保存到相册，不提供更多菜单或删除入口', () => {
  const fs = require('node:fs')
  const source = fs.readFileSync('src/pages/flower-detail/flower-detail-page.vue', 'utf8')
  assert.match(source, /保存到相册/)
  assert.match(source, /@click="images.saveImage\(\)"/)
  assert.doesNotMatch(source, /showActionSheet|删除作品|已保存到我的作品|云端/)
})
test('实际页面等待登录后自动恢复本地作品，隐藏保存且返回不重复恢复', async () => { const lifecycle = { onLoad: [], onShow: [], onHide: [], onUnload: [] }, map = new Map(); const loader = createLoader({ lifecycle, uni: { getStorageSync: k => map.get(k), setStorageSync: (k, v) => map.set(k, v), removeStorageSync: k => map.delete(k) }, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } }); const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(m => m.id === 'ceramic-vase'); const art = { version: 2, vase: '陶瓶', vaseMaterialId: vase.id, vaseMaterialRevision: vase.revision, background: 'sage', stems: [] }; loader.load('src/utils/flower/creation-storage.ts').writeDraft('alice', { version: 1, artwork: art, card: { blessing: '继续', signature: '' }, updatedAt: 1 }); const before = [...map.values()][0], page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.catalog.materials = [vase]; page.catalog.prepared[`${vase.id}:${vase.revision}`] = vase; page.catalog.load = async () => { }; page.catalog.preload = async () => { }; page.catalog.ensure = async () => vase; lifecycle.onLoad[0]({}); assert.equal(page.pageReady.value, false); assert.equal(page.vaseMaterialId.value, undefined); loader.load('src/utils/appAuth.ts').markAppAuthReady(); await page.bootstrap(); assert.equal(page.pendingDraft.value, null); assert.equal(page.vaseMaterialId.value, vase.id); assert.equal([...map.values()][0], before); assert.equal(page.background.value, 'sage'); assert.equal(page.session.card.value.blessing, '继续'); page.store.addFlower('rose'); assert.equal(page.session.dirty.value, true); lifecycle.onHide[0](); assert.equal(JSON.parse([...map.values()][0]).artwork.stems.length, 1); lifecycle.onShow[0](); await page.bootstrap(); assert.equal(page.pendingDraft.value, null); assert.equal(page.stems.value.length, 1); lifecycle.onUnload[0](); });
test('详情云端保存成功停止插花草稿写入并清缓存，保存失败保留草稿', async () => {
  const records = new Map(), destinations = [], routes = []
  let editor
  const loader = createLoader({ eventChannel: { emit: (event, work) => { if (event === 'saved') editor.session.saved(work) } }, uni: { getStorageSync: key => records.get(key), setStorageSync: (key, value) => records.set(key, value), removeStorageSync: key => records.delete(key), reLaunch: value => destinations.push(value.url), navigateTo: value => routes.push(value) }, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } })
  editor = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  editor.session.initialize('alice'); editor.pageReady.value = true; editor.store.addFlower('rose'); editor.session.flushDraft()
  const prior = [...records.values()][0]
  const detail = loader.setup('src/pages/flower-complete/flower-complete-page.vue')
  detail.draft.value = editor.session.snapshot(); detail.owner.value = 'alice'; detail.images.exportThumbnail = async () => '/thumb.png'
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  works.save = async () => { throw Error('保存失败') }
  await detail.save(); assert.equal([...records.values()][0], prior); assert.equal(destinations.length, 0)
  works.save = async () => ({ id: 'a'.repeat(32), revision: 1, title: '作品', draft: detail.draft.value })
  await detail.save(); assert.equal(records.size, 0); assert.deepEqual(destinations, ['/pages/flower-works/flower-works-page'])
  editor.session.markEdited(); editor.session.dispose(); assert.equal(records.size, 0)
})
test('已加载目录时进入工作室不等待重复网络请求', async () => {
  const loader = createLoader({ uni: { getStorageSync: () => '' } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('alice')
  page.catalog.loaded = true
  let reloads = 0
  page.catalog.load = async () => { reloads++ }
  page.catalog.preload = async () => {}
  await page.loadMaterials()
  assert.equal(reloads, 0)
  page.session.dispose()
})

test('贺卡实时预览忽略首尾空格，改字后禁用旧图导出并保留预览', async () => {
  const loader = createLoader()
  const card = loader.setup('src/pages/flower-card/flower-card-page.vue')
  card.loading.value = false
  card.text.value = { recipient: ' 朋友 ', blessing: ' 愿你开心 ', signature: ' 小花 ' }
  card.images.exportCard = async () => { card.images.cardImagePath.value = '/card.png'; return true }
  await card.preview()
  assert.equal(card.canExport.value, true)
  assert.equal(card.previewPath.value, '/card.png')
  card.text.value.blessing = '新的祝福'
  assert.equal(card.canExport.value, false)
  assert.equal(card.previewPath.value, '/card.png')
})

test('作品列表只进入已保存详情，详情编辑与贺卡入口使用作品编号', () => {
  const routes = [], lifecycle = { onLoad: [] }
  const loader = createLoader({ lifecycle, uni: { navigateTo: value => routes.push(value) } })
  const works = loader.setup('src/pages/flower-works/flower-works-page.vue')
  const id = 'a'.repeat(32)
  works.open({ id })
  assert.equal(routes[0].url, `/pages/flower-detail/flower-detail-page?workId=${id}`)
  const detail = loader.setup('src/pages/flower-detail/flower-detail-page.vue')
  lifecycle.onLoad[0]({})
  assert.equal(detail.error.value, '请选择已保存的作品')
  assert.equal(detail.loading.value, false)
  detail.draft.value = { workId: id }
  detail.edit(); detail.makeCard()
  assert.equal(routes[1].url, `/pages/flower-studio/flower-studio-page?workId=${id}&edit=1`)
  assert.equal(routes[2].url, `/pages/flower-card/flower-card-page?workId=${id}`)
  assert.equal(typeof detail.save, 'undefined')
})

test('编辑作品保存更新原编号和名称，保存页不提供另存入口', async () => {
  const inputs = []
  const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } })
  const page = loader.setup('src/pages/flower-complete/flower-complete-page.vue')
  const id = 'a'.repeat(32)
  const artwork = loader.load('src/stores/artworkStore.ts').useArtworkStore().snapshot()
  page.draft.value = { version: 1, artwork, card: { blessing: '', signature: '' }, updatedAt: 1, workId: id, workRevision: 3 }
  page.owner.value = 'alice'
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  works.items = [{ id, title: '春日花意' }]
  works.save = async input => { inputs.push(input); throw Error('测试停止写入') }
  page.images.exportThumbnail = async () => '/thumb.png'
  assert.equal(page.editingExisting.value, true)
  await page.requestSave()
  assert.equal(page.workName.value, '春日花意')
  await page.save()
  assert.equal(inputs[0].workId, id)
  assert.equal(inputs[0].expectedRevision, 3)
  assert.equal(typeof page.saveAsNew, 'undefined')
  assert.equal(page.draft.value.workId, id)
})

test('新创作与恢复的编辑草稿使用各自身份显示完成或保存', () => {
  const loader = createLoader({ uni: { getStorageSync: () => '', setStorageSync() {}, removeStorageSync() {} } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('alice')
  assert.equal(page.editingExisting.value, false)
  page.session.pendingDraft.value = { version: 1, artwork: page.store.snapshot(), card: { blessing: '', signature: '' }, updatedAt: 1, workId: 'a'.repeat(32), workRevision: 2 }
  page.session.continueDraft()
  assert.equal(page.editingExisting.value, true)
  page.session.restart()
  assert.equal(page.editingExisting.value, false)
  page.session.dispose()
})
