const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');
test('默认花器初始化不产生撤销历史，用户切换花器可以撤销', () => {
  const loader = createLoader()
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const materials = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.filter(item => item.category === 'vase')
  store.initialize({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })
  store.setVaseMaterial(materials[0], false)
  assert.equal(store.canUndo, false)
  store.setVaseMaterial(materials[1])
  assert.equal(store.canUndo, true)
  store.undo()
  assert.equal(store.vaseMaterialId, materials[0].id)
})
test('完成跳转完成作品页，插花页保持编辑；贺卡只在完成填写后提交文字', async () => {
  const routes = [], emitted = []
  const loader = createLoader({ uni: { getStorageSync: () => '', removeStorageSync() {}, setStorageSync() {}, navigateTo: value => { routes.push(value); value.success?.({ eventChannel: { emit: (...args) => emitted.push(args) } }) } } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('a'); page.pageReady.value = true; page.store.vaseMaterialId = 'vase'
  page.finish()
  assert.equal(routes[0].url, '/pages/flower-complete/flower-complete-page')
  assert.equal(page.session.view.value, 'edit')
  assert.equal(emitted[0][0], 'artwork')
  const card = loader.setup('src/pages/flower-card/flower-card-page.vue')
  const exported = []
  card.images.exportCard = async value => { exported.push(value); card.images.cardImagePath.value = '/card.png'; return true }
  card.text.value = { recipient: '朋友', blessing: '祝福', signature: '小花' }
  assert.deepEqual(exported, [])
  card.applyEditor()
  assert.equal(card.showEditor.value, false)
  await card.preview()
  assert.equal(card.renderedKey.value, card.contentKey.value)
  assert.equal(page.session.card.value.blessing, '')
  assert.equal(card.text.value.recipient, '朋友')
  assert.equal(JSON.stringify(exported), JSON.stringify([{ blessing: '祝福', signature: '小花', recipient: '朋友' }]))
  page.session.dispose()
})
test('结束创作后迟到的花材下载不能插入新作品', async () => { const loader = createLoader({ uni: { getStorageSync: () => '', removeStorageSync() { }, setStorageSync() { } } }); const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.session.initialize('a'); page.pageReady.value = true; page.catalog.load = async () => { }; page.catalog.preload = async () => { }; const material = { id: 'test-flower', revision: 'a'.repeat(16), category: 'flower', name: '测试花', colors: [{ value: '#abcdef' }] }; page.catalog.materials = [material]; let release; page.catalog.ensure = () => new Promise(r => { release = r; }); const adding = page.addCloudMaterial(material.id); page.endCreation(); release(material); await adding; assert.equal(page.stems.value.length, 0); assert.equal(page.session.dirty.value, false); page.session.dispose(); });
test('添加花材后选中新花材并提供短时添加反馈', async () => {
  const loader = createLoader({ uni: { getStorageSync: () => '', removeStorageSync() {}, setStorageSync() {} } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const material = { id: 'feedback-flower', revision: 'b'.repeat(16), category: 'flower', group: 'main', name: '反馈花', colors: [{ value: '#abcdef' }] }
  page.session.initialize('a'); page.pageReady.value = true; page.catalog.materials = [material]; page.catalog.ensure = async () => material
  await page.addCloudMaterial(material.id)
  assert.equal(page.selected.value.materialId, material.id)
  assert.equal(page.addedMaterialId.value, material.id)
  page.endCreation(); page.session.dispose()
})
test('完成页和作品详情使用一致的主次操作层级', () => {
  const fs = require('node:fs')
  const source = fs.readFileSync('src/pages/flower-detail/flower-detail-page.vue', 'utf8')
  const complete = fs.readFileSync('src/pages/flower-complete/flower-complete-page.vue', 'utf8')
  assert.match(source, /@click="images\.shareImage\(\)"/)
  assert.match(source, /修改作品信息/)
  assert.match(source, /<uni-forms class="metadata-form"/)
  assert.equal((source.match(/<uni-easyinput\b/g) || []).length, 2)
  assert.doesNotMatch(source, /<input\b|<textarea\b/)
  assert.match(source, /detail-top-actions[\s\S]*编辑[\s\S]*分享[\s\S]*贺卡/)
  assert.doesNotMatch(source, /images\.saveImage|保存到相册|detail-footer|继续编辑|制作贺卡|app-primary-btn|app-secondary-btn/)
  assert.match(source, /class="detail-heading" @click="editMetadata"/)
  assert.ok(source.indexOf('class="detail-artwork"') < source.indexOf('class="detail-heading"'))
  assert.equal((source.match(/<view class="detail-action-group/g) || []).length, 2)
  assert.match(source, /disableScroll: true/)
  assert.match(source, /\.detail-page \{[^}]*overflow: hidden;/)
  assert.match(source, /\.detail-artwork \{[^}]*flex: 1 1 0;[^}]*margin: 8rpx 0 12rpx;/)
  assert.doesNotMatch(source, /\.detail-artwork \{[^}]*max-height:/)
  assert.match(source, /\.detail-description \{[^}]*-webkit-line-clamp: 2;/)
  assert.match(source, /\.detail-top-actions \{[^}]*justify-content: space-between;/)
  assert.match(complete, /editingExisting \? '保存修改' : '保存作品'/)
  assert.match(complete, /detail-footer[\s\S]*safe-area-inset-bottom/)
  assert.doesNotMatch(source, /showActionSheet|删除作品|已保存到我的作品|云端/)
})
test('实际页面等待登录后自动恢复本地作品，隐藏保存且返回不重复恢复', async () => { const lifecycle = { onLoad: [], onShow: [], onHide: [], onUnload: [] }, map = new Map(); const loader = createLoader({ lifecycle, uni: { getStorageSync: k => map.get(k), setStorageSync: (k, v) => map.set(k, v), removeStorageSync: k => map.delete(k) }, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } }); const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(m => m.id === 'ceramic-vase'); const art = { version: 2, vase: '陶瓶', vaseMaterialId: vase.id, vaseMaterialRevision: vase.revision, background: 'sage', stems: [] }; loader.load('src/utils/flower/creation-storage.ts').writeDraft('alice', { version: 1, artwork: art, card: { blessing: '继续', signature: '' }, updatedAt: 1 }); const before = [...map.values()][0], page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.catalog.materials = [vase]; page.catalog.prepared[`${vase.id}:${vase.revision}`] = vase; page.catalog.load = async () => { }; page.catalog.preload = async () => { }; page.catalog.ensure = async () => vase; lifecycle.onLoad[0]({}); assert.equal(page.pageReady.value, false); assert.equal(page.vaseMaterialId.value, undefined); loader.load('src/utils/appAuth.ts').markAppAuthReady(); await page.bootstrap(); assert.equal(page.pendingDraft.value, null); assert.equal(page.vaseMaterialId.value, vase.id); assert.equal([...map.values()][0], before); assert.equal(page.background.value, 'sage'); assert.equal(page.session.card.value.blessing, '继续'); page.store.addFlower('rose'); assert.equal(page.session.dirty.value, true); lifecycle.onHide[0](); assert.equal(JSON.parse([...map.values()][0]).artwork.stems.length, 1); lifecycle.onShow[0](); await page.bootstrap(); assert.equal(page.pendingDraft.value, null); assert.equal(page.stems.value.length, 1); lifecycle.onUnload[0](); });
test('完成作品云端保存成功跳转详情并清缓存，保存失败保留草稿', async () => {
  const records = new Map(), destinations = [], routes = []
  let editor
  const loader = createLoader({ eventChannel: { emit: (event, work) => { if (event === 'saved') editor.session.saved(work) } }, uni: { getStorageSync: key => records.get(key), setStorageSync: (key, value) => records.set(key, value), removeStorageSync: key => records.delete(key), reLaunch: value => destinations.push(value.url), navigateTo: value => routes.push(value) }, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } })
  editor = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  editor.session.initialize('alice'); editor.pageReady.value = true; editor.store.addFlower('rose'); editor.session.flushDraft()
  const prior = [...records.values()][0]
  const page = loader.setup('src/pages/flower-complete/flower-complete-page.vue')
  page.draft.value = editor.session.snapshot(); page.owner.value = 'alice'; page.images.exportThumbnail = async () => '/thumb.png'
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  works.save = async () => { throw Error('保存失败') }
  await page.save(); assert.equal([...records.values()][0], prior); assert.equal(destinations.length, 0)
  works.save = async input => ({ id: 'a'.repeat(32), revision: 1, title: input.title, description: input.description, draft: page.draft.value })
  await page.save(); assert.equal(records.size, 0); assert.deepEqual(destinations, [`/pages/flower-detail/flower-detail-page?workId=${'a'.repeat(32)}`])
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

test('贺卡编辑时保留当前预览，完成填写后才更新内容', async () => {
  const loader = createLoader()
  const card = loader.setup('src/pages/flower-card/flower-card-page.vue')
  card.loading.value = false
  card.draft.value = { card: { blessing: '', signature: '' } }
  await new Promise(resolve => setTimeout(resolve, 0))
  card.text.value = { recipient: ' 朋友 ', blessing: ' 愿你开心 ', signature: ' 小花 ' }
  const rendered = []
  card.images.exportCard = async value => { rendered.push(value); card.images.cardImagePath.value = `/card-${rendered.length}.png`; return true }
  card.applyEditor()
  await card.preview()
  assert.equal(card.canExport.value, true)
  assert.equal(card.previewPath.value, '/card-1.png')
  card.openEditor()
  card.text.value.blessing = '新的祝福'
  assert.equal(card.contentKey.value, JSON.stringify(['朋友', '愿你开心', '小花']))
  assert.equal(card.canExport.value, true)
  assert.equal(rendered.length, 1)
  card.cancelEditor()
  assert.equal(card.text.value.blessing, '愿你开心')
  card.openEditor()
  card.text.value.blessing = '新的祝福'
  card.applyEditor()
  assert.equal(card.canExport.value, false)
  assert.equal(card.previewPath.value, '/card-1.png')
  await card.preview()
  assert.equal(card.previewPath.value, '/card-2.png')
  assert.equal(rendered.length, 2)
})

test('贺卡预览在图片加载失败时显示重试入口，祝福显示120字计数', () => {
  const fs = require('node:fs')
  const source = fs.readFileSync('src/pages/flower-card/flower-card-page.vue', 'utf8')
  assert.match(source, /<uni-forms\b/)
  assert.equal((source.match(/<uni-easyinput\b/g) || []).length, 3)
  assert.doesNotMatch(source, /<input\b|<textarea\b/)
  assert.match(source, /:maxlength="120"/)
  assert.match(source, /最多120字/)
  assert.match(source, /\{\{ blessingCount \}\}\/120/)
  assert.match(source, /@error="onPreviewImageError"/)
  assert.match(source, /重新生成预览/)
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

test('完成编辑更新原作品并保留名字和介绍', async () => {
  const inputs = [], destinations = []
  const loader = createLoader({ uni: { reLaunch: value => destinations.push(value.url), removeStorageSync() {} }, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } })
  const page = loader.setup('src/pages/flower-complete/flower-complete-page.vue')
  const id = 'a'.repeat(32)
  const artwork = loader.load('src/stores/artworkStore.ts').useArtworkStore().snapshot()
  page.draft.value = { version: 1, artwork, card: { blessing: '', signature: '' }, updatedAt: 1, workId: id, workRevision: 3 }
  page.owner.value = 'alice'
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  works.get = async () => ({ title: '春日花意', description: '一束花' })
  works.save = async input => { inputs.push(input); return { id, revision: 4, title: input.title, description: input.description, draft: { ...input.draft, workId: id, workRevision: 4 } } }
  page.images.exportThumbnail = async () => '/thumb.png'
  assert.equal(page.editingExisting.value, true)
  await page.save()
  assert.equal(inputs[0].title, '春日花意')
  assert.equal(inputs[0].description, '一束花')
  assert.equal(inputs[0].workId, id)
  assert.equal(inputs[0].expectedRevision, 3)
  assert.equal(typeof page.saveAsNew, 'undefined')
  assert.deepEqual(destinations, [`/pages/flower-detail/flower-detail-page?workId=${id}`])
})

test('详情信息保存会更新名字、介绍和作品版本', async () => {
  const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } })
  const detail = loader.setup('src/pages/flower-detail/flower-detail-page.vue')
  const id = 'a'.repeat(32)
  detail.draft.value = { version: 1, artwork: loader.load('src/stores/artworkStore.ts').useArtworkStore().snapshot(), card: { blessing: '', signature: '' }, updatedAt: 1, workId: id, workRevision: 2 }
  detail.title.value = '旧名字'
  detail.description.value = '旧介绍'
  detail.owner.value = 'alice'
  detail.images.exportThumbnail = async () => '/thumb.png'
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  let input
  works.save = async value => {
    input = value
    return { id, revision: 3, title: value.title, description: value.description, thumbnailUrl: '/new-thumb.png', draft: { ...value.draft, workId: id, workRevision: 3 } }
  }
  detail.editMetadata()
  detail.editTitle.value = '新名字'
  detail.editDescription.value = '新介绍'
  await detail.saveMetadata()
  assert.equal(input.title, '新名字')
  assert.equal(input.description, '新介绍')
  assert.equal(input.expectedRevision, 2)
  assert.equal(detail.title.value, '新名字')
  assert.equal(detail.description.value, '新介绍')
  assert.equal(detail.draft.value.workRevision, 3)
  assert.equal(detail.showMetadataEditor.value, false)
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
