const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');
test('默认花器初始化不产生撤销历史，用户切换花器可以撤销', () => {
  const loader = createLoader()
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const materials = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.filter(item => item.category === 'vase')
  store.initialize({ vase: '陶瓶', background: 'warm', stems: [] })
  store.setVaseMaterial(materials[0], false)
  assert.equal(store.canUndo, false)
  store.setVaseMaterial(materials[1])
  assert.equal(store.canUndo, true)
  store.undo()
  assert.equal(store.vaseMaterialId, materials[0].id)
})
test('新作点击完成作品后直接保存并进入详情；贺卡只在完成填写后提交文字', async () => {
  const records = new Map(), routes = [], inputs = [], stemsAtNavigation = []
  let page
  const loader = createLoader({
    uni: {
      getStorageSync: key => records.get(key),
      removeStorageSync: key => records.delete(key),
      setStorageSync: (key, value) => records.set(key, value),
      navigateTo: (value) => { routes.push(value); stemsAtNavigation.push(page.stems.value.length); value.success?.() },
      showToast() {},
    },
    uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) },
  })
  page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.id === 'ceramic-vase')
  page.session.initialize('alice')
  page.pageReady.value = true
  page.userInfo.uid = 'alice'
  page.store.setVaseMaterial(vase, false)
  page.store.addFlower('rose')
  page.catalog.materials = [vase]
  page.catalog.ensure = async () => vase
  const works = page.works
  let failSave = true
  works.save = async input => {
    inputs.push(input)
    if (failSave)
      throw new Error('保存失败，请重试')
    return { id: 'a'.repeat(32), ...input, draft: { ...input.draft, workId: 'a'.repeat(32)} }
  }
  await page.finish()
  assert.equal(routes.length, 0)
  assert.equal(records.size, 1)
  assert.equal(page.finishing.value, false)
  failSave = false
  await page.finish()
  assert.equal(inputs.length, 2)
  assert.match(inputs[0].title, /^花意 \d+月\d+日 \d{2}:\d{2}$/)
  assert.equal(inputs[0].description, '')
  assert.equal(inputs[0].workId, undefined)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].url, `/pages/flower-detail/flower-detail-page?workId=${'a'.repeat(32)}`)
  assert.equal(stemsAtNavigation[0], 1)
  assert.equal(page.session.readonly.value, false)
  assert.equal(page.session.workId.value, undefined)
  assert.equal(page.stems.value.length, 0)
  assert.equal(page.session.card.value.blessing, '')
  assert.equal(records.size, 0)
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

test('工作室 UI store 管理互斥面板并在重置时清空瞬时状态', () => {
  const studio = createLoader().load('src/stores/flowerStudioStore.ts').useFlowerStudioStore()
  studio.toggleTab('flowers')
  assert.equal(studio.activeTab, 'flowers')
  assert.equal(studio.showFlowerTools, false)
  studio.openFlowerTools()
  assert.equal(studio.activeTab, null)
  assert.equal(studio.showFlowerTools, true)
  studio.toolsColorsOpen = true
  studio.toggleTab('vases')
  assert.equal(studio.activeTab, 'vases')
  assert.equal(studio.showFlowerTools, false)
  assert.equal(studio.toolsColorsOpen, false)
  studio.pageReady = true
  studio.startupError = '加载失败'
  studio.addedMaterialId = 'rose'
  studio.reset()
  assert.equal(studio.pageReady, false)
  assert.equal(studio.startupError, '')
  assert.equal(studio.activePanel, null)
  assert.equal(studio.addedMaterialId, '')
})

test('完成编辑直接更新后台并进入详情，不经过完成作品页', async () => {
  const records = new Map(), routes = [], inputs = []
  const loader = createLoader({
    uni: {
      getStorageSync: key => records.get(key),
      setStorageSync: (key, value) => records.set(key, value),
      removeStorageSync: key => records.delete(key),
      navigateTo: (value) => { routes.push(value); value.success?.() },
      showToast() {},
    },
    uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) },
  })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const id = 'a'.repeat(32)
  page.session.initialize('alice')
  page.userInfo.uid = 'alice'
  const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.id === 'ceramic-vase')
  page.store.setVaseMaterial(vase, false)
  page.session.openWork({
    id,
        title: '春日花意',
    description: '一束花',
    createdAt: 1,
    updatedAt: 1,
    draft: { artwork: page.store.snapshot(), card: { blessing: '', signature: '' }, updatedAt: 1 },
  })
  page.session.editWork()
  assert.equal(page.session.workId.value, id)
  page.catalog.materials = [vase]
  page.catalog.ensure = async () => vase
  const works = page.works
  works.get = async () => ({ title: '春日花意', description: '一束花' })
  works.save = async input => {
    inputs.push(input)
    return { id, ...input, draft: { ...input.draft, workId: id} }
  }

  await page.finish()

  assert.equal(inputs[0].title, '春日花意')
  assert.equal(inputs[0].description, '一束花')
  assert.equal(inputs[0].workId, id)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].url, `/pages/flower-detail/flower-detail-page?workId=${id}`)
  assert.equal(page.session.readonly.value, false)
  assert.equal(page.session.workId.value, undefined)
  assert.equal(page.stems.value.length, 0)
  page.session.dispose()
})
test('主动离开有改动的作品时可保存后进入我的作品并清除本地草稿', async () => {
  const records = new Map(), routes = [], modals = []
  const loader = createLoader({
    uni: {
      getStorageSync: key => records.get(key),
      setStorageSync: (key, value) => records.set(key, value),
      removeStorageSync: key => records.delete(key),
      showModal: value => modals.push(value),
      navigateTo: value => routes.push(value),
      showToast() {},
    },
    uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) },
  })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.id === 'ceramic-vase')
  page.session.initialize('alice')
  page.userInfo.uid = 'alice'
  page.pageReady.value = true
  page.store.setVaseMaterial(vase, false)
  page.store.addFlower('rose')
  page.catalog.ensure = async () => vase
  let savedInput
  page.works.save = async input => {
    savedInput = input
    return { id: 'b'.repeat(32)}
  }

  page.openWorks()
  assert.equal(modals.length, 1)
  assert.equal(routes.length, 0)
  assert.equal(modals[0].confirmText, '保存作品')
  assert.equal(modals[0].cancelText, '放弃离开')
  assert.ok([...modals[0].confirmText].length <= 4)
  assert.ok([...modals[0].cancelText].length <= 4)
  await modals[0].success({ confirm: true })

  assert.equal(savedInput.draft.artwork.stems.length, 1)
  assert.equal(routes[0].url, '/pages/flower-works/flower-works-page')
  assert.equal(records.size, 0)
  assert.equal(page.session.hasUnsavedChanges.value, false)
  page.session.dispose()
})
test('主动离开选择放弃时清除本地草稿且不保存云端', async () => {
  const records = new Map(), routes = [], modals = []
  const loader = createLoader({
    uni: {
      getStorageSync: key => records.get(key),
      setStorageSync: (key, value) => records.set(key, value),
      removeStorageSync: key => records.delete(key),
      showModal: value => modals.push(value),
      navigateTo: value => routes.push(value),
      showToast() {},
    },
  })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('alice')
  page.pageReady.value = true
  page.store.addFlower('rose')
  page.session.flushDraft()
  let saveCount = 0
  page.works.save = async () => { saveCount++; throw new Error('不应保存') }

  page.openWorks()
  await modals[0].success({ confirm: false, cancel: true })

  assert.equal(saveCount, 0)
  assert.equal(routes[0].url, '/pages/flower-works/flower-works-page')
  assert.equal(records.size, 0)
  assert.equal(page.stems.value.length, 0)
  page.session.dispose()
})
test('空白作品直接离开时不弹保存，只有真实编辑才拦截', async () => {
  const records = new Map(), routes = [], modals = []
  const loader = createLoader({
    uni: {
      getStorageSync: key => records.get(key),
      setStorageSync: (key, value) => records.set(key, value),
      removeStorageSync: key => records.delete(key),
      showModal: value => modals.push(value),
      navigateTo: value => routes.push(value),
      showToast() {},
    },
  })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('alice')
  page.pageReady.value = true

  page.openWorks()

  assert.equal(modals.length, 0)
  assert.equal(routes[0].url, '/pages/flower-works/flower-works-page')
  page.session.dispose()
})
test('点击我的作品时按真实改动状态确认离开，不依赖系统返回事件', async () => {
  const records = new Map(), routes = [], modals = []
  const loader = createLoader({
    uni: {
      getStorageSync: key => records.get(key),
      setStorageSync: (key, value) => records.set(key, value),
      removeStorageSync: key => records.delete(key),
      showModal: value => modals.push(value),
      navigateTo: value => routes.push(value),
      showToast() {},
    },
  })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('alice')
  page.pageReady.value = true
  page.store.addFlower('rose')
  page.openWorks()
  assert.equal(modals.length, 1)
  assert.equal(routes.length, 0)
  await modals[0].success({ confirm: false, cancel: true })
  assert.equal(routes[0].url, '/pages/flower-works/flower-works-page')
  assert.equal(records.size, 0)
  page.session.dispose()
})
test('容器素材准备期间点击我的作品仍显示提示，放弃后阻止迟到的素材改动', async () => {
  const routes = [], modals = []
  const loader = createLoader({
    uni: {
      getStorageSync: () => '',
      setStorageSync() {},
      removeStorageSync() {},
      showModal: value => modals.push(value),
      navigateTo: value => routes.push(value),
      showToast() {},
    },
  })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.category === 'vase')
  page.session.initialize('alice')
  page.pageReady.value = true
  page.catalog.materials = [vase]
  let resolveMaterial
  page.catalog.ensure = () => new Promise(resolve => { resolveMaterial = resolve })
  const adding = page.addCloudMaterial(vase.id)
  assert.equal(page.addingMaterial.value, true)

  page.openWorks()
  assert.equal(modals.length, 1)
  assert.equal(routes.length, 0)
  await modals[0].success({ confirm: false, cancel: true })
  resolveMaterial(vase)
  await adding

  assert.equal(routes[0].url, '/pages/flower-works/flower-works-page')
  assert.equal(page.vaseMaterialId.value, undefined)
  page.session.dispose()
})
test('结束创作后迟到的花材下载不能插入新作品', async () => { const loader = createLoader({ uni: { getStorageSync: () => '', removeStorageSync() { }, setStorageSync() { } } }); const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.session.initialize('a'); page.pageReady.value = true; page.catalog.load = async () => { }; page.catalog.preload = async () => { }; const material = { id: 'test-flower', category: 'flower', name: '测试花', colors: [{ value: '#abcdef' }] }; page.catalog.materials = [material]; let release; page.catalog.ensure = () => new Promise(r => { release = r; }); const adding = page.addCloudMaterial(material.id); page.endCreation(); release(material); await adding; assert.equal(page.stems.value.length, 0); assert.equal(page.session.dirty.value, false); page.session.dispose(); });
test('添加花材后选中新花材并提供短时添加反馈', async () => {
  const loader = createLoader({ uni: { getStorageSync: () => '', removeStorageSync() {}, setStorageSync() {} } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const material = { id: 'feedback-flower', category: 'flower', group: 'main', name: '反馈花', colors: [{ value: '#abcdef' }] }
  page.session.initialize('a'); page.pageReady.value = true; page.catalog.materials = [material]; page.catalog.ensure = async () => material
  await page.addCloudMaterial(material.id)
  assert.equal(page.store.selected.materialId, material.id)
  assert.equal(page.addedMaterialId.value, material.id)
  page.endCreation(); page.session.dispose()
})
test('作品详情使用一致的主次操作层级，创作流程移除完成页', () => {
  const fs = require('node:fs')
  const source = fs.readFileSync('src/pages/flower-detail/flower-detail-page.vue', 'utf8')
  const studioHeader = fs.readFileSync('src/pages/flower-studio/components/studio-header.vue', 'utf8')
  assert.match(source, /@click="shareArtwork"/)
  assert.match(source, /@click="saveArtwork"/)
  assert.match(source, /修改作品信息/)
  assert.match(source, /<uni-forms class="metadata-form"/)
  assert.equal((source.match(/<uni-easyinput\b/g) || []).length, 2)
  assert.doesNotMatch(source, /<input\b|<textarea\b/)
  assert.match(source, /detail-top-actions[\s\S]*编辑[\s\S]*分享[\s\S]*贺卡/)
  assert.doesNotMatch(source, /detail-footer|继续编辑|制作贺卡|app-primary-btn|app-secondary-btn/)
  assert.match(source, /class="detail-heading" @click="editMetadata"/)
  assert.ok(source.indexOf('class="detail-artwork"') < source.indexOf('class="detail-heading"'))
  assert.equal((source.match(/<view class="detail-action-group/g) || []).length, 2)
  assert.match(source, /disableScroll: true/)
  assert.match(source, /\.detail-page \{[^}]*overflow: hidden;/)
  assert.match(source, /\.detail-artwork \{[^}]*flex: 1 1 0;[^}]*margin: 8rpx 0 12rpx;/)
  assert.doesNotMatch(source, /\.detail-artwork \{[^}]*max-height:/)
  assert.match(source, /\.detail-description \{[^}]*-webkit-line-clamp: 2;/)
  assert.match(source, /\.detail-top-actions \{[^}]*justify-content: space-between;/)
  assert.doesNotMatch(source, /showActionSheet|删除作品|已保存到我的作品|云端/)
  assert.equal(fs.existsSync('src/pages/flower-complete/flower-complete-page.vue'), false)
  assert.doesNotMatch(fs.readFileSync('src/pages.json', 'utf8'), /flower-complete-page/)
  assert.match(studioHeader, /finishing \? '正在完成' : '完成作品'/)
  assert.match(studioHeader, /finish-flower/)
  assert.match(studioHeader, /finish-sparkle/)
})
test('工作室不显示无需用户处理的账号连接状态提示', () => {
  const fs = require('node:fs')
  const source = fs.readFileSync('src/pages/flower-studio/flower-studio-page.vue', 'utf8')
  assert.doesNotMatch(source, /startup-note|正在连接账号与素材/)
})
test('实际页面等待登录后自动恢复本地作品，隐藏保存且返回不重复恢复', async () => { const lifecycle = { onLoad: [], onShow: [], onHide: [], onUnload: [] }, map = new Map(); const loader = createLoader({ lifecycle, uni: { getStorageSync: k => map.get(k), setStorageSync: (k, v) => map.set(k, v), removeStorageSync: k => map.delete(k) }, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } }); const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(m => m.id === 'ceramic-vase'); const art = { vase: '陶瓶', vaseMaterialId: vase.id, background: 'sage', stems: [] }; loader.load('src/utils/flower/creation-storage.ts').writeDraft('alice', { artwork: art, card: { blessing: '继续', signature: '' }, updatedAt: 1 }); const before = [...map.values()][0], page = loader.setup('src/pages/flower-studio/flower-studio-page.vue'); page.catalog.materials = [vase]; page.catalog.prepared[vase.id] = vase; page.catalog.load = async () => { }; page.catalog.preload = async () => { }; page.catalog.ensure = async () => vase; lifecycle.onLoad[0]({}); assert.equal(page.pageReady.value, false); assert.equal(page.vaseMaterialId.value, undefined); loader.load('src/utils/appAuth.ts').markAppAuthReady(); await page.bootstrap(); assert.equal(page.pendingDraft.value, null); assert.equal(page.vaseMaterialId.value, vase.id); assert.equal([...map.values()][0], before); assert.equal(page.background.value, 'sage'); assert.equal(page.session.card.value.blessing, '继续'); page.store.addFlower('rose'); assert.equal(page.session.dirty.value, true); lifecycle.onHide[0](); assert.equal(JSON.parse([...map.values()][0]).artwork.stems.length, 1); lifecycle.onShow[0](); await page.bootstrap(); assert.equal(page.pendingDraft.value, null); assert.equal(page.stems.value.length, 1); lifecycle.onUnload[0](); });
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
  assert.doesNotMatch(source, /preview-spinner|previewUpdating|正在生成贺卡预览|正在加载预览/)
})

test('贺卡复用作品图片并在本地 canvas 合成后预览、保存和分享', () => {
  const fs = require('node:fs')
  const source = fs.readFileSync('src/pages/flower-card/flower-card-page.vue', 'utf8')
  assert.match(source, /<image[\s\S]*?:src="previewImageSource"/)
  assert.match(source, /images\.exportCard\(greeting,[\s\S]*?renderFlowerCard\(artworkPath, card\)/)
  assert.match(source, /canvas-id="flower-card-canvas"/)
  assert.match(source, /images\.saveImage\('card'\)/)
  assert.match(source, /images\.shareImage\('card'\)/)
  assert.doesNotMatch(source, /FlowerArtworkPreview/)
})

test('作品列表可进入详情或直接编辑，详情编辑与贺卡入口使用作品编号', () => {
  const routes = [], lifecycle = { onLoad: [] }
  const loader = createLoader({ lifecycle, uni: { navigateTo: value => routes.push(value) } })
  const works = loader.setup('src/pages/flower-works/flower-works-page.vue')
  const id = 'a'.repeat(32)
  works.open({ id })
  assert.equal(routes[0].url, `/pages/flower-detail/flower-detail-page?workId=${id}`)
  works.edit({ id })
  assert.equal(routes[1].url, `/pages/flower-studio/flower-studio-page?workId=${id}&edit=1`)
  const detail = loader.setup('src/pages/flower-detail/flower-detail-page.vue')
  lifecycle.onLoad[0]({})
  assert.equal(detail.error.value, '请选择已保存的作品')
  assert.equal(detail.loading.value, false)
  detail.draft.value = { workId: id }
  detail.edit(); detail.makeCard()
  assert.equal(routes[2].url, `/pages/flower-studio/flower-studio-page?workId=${id}&edit=1`)
  assert.equal(routes[3].url, `/pages/flower-card/flower-card-page?workId=${id}`)
  assert.equal(typeof detail.save, 'undefined')
})

test('作品列表封面直接渲染花束组件，不依赖后台图片', () => {
  const fs = require('node:fs')
  const source = fs.readFileSync('src/pages/flower-works/flower-works-page.vue', 'utf8')
  assert.match(source, /<FlowerArtworkPreview\b/)
  assert.doesNotMatch(source, /work\.thumbnailUrl/)
})

test('进入作品详情不生成图片，进入贺卡时再按需生成', async () => {
  const lifecycle = { onLoad: [] }
  const loader = createLoader({ lifecycle, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const artworkStore = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  artworkStore.initialize({ vase: '陶瓶', background: 'warm', stems: [] })
  const artwork = artworkStore.snapshot()
  const id = 'a'.repeat(32)
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  works.get = async () => ({
    id,
    title: '春日花意',
    description: '',
        createdAt: 1,
    updatedAt: 1,
    draft: { artwork, card: { blessing: '', signature: '' }, updatedAt: 1, workId: id},
  })
  const catalog = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  catalog.loaded = true
  const page = loader.setup('src/pages/flower-card/flower-card-page.vue')
  let rerenders = 0
  page.images.exportImage = async () => { rerenders++; return true }
  lifecycle.onLoad[0]({ workId: id })
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(page.images.imagePath.value, '')
  assert.equal(rerenders, 0)
})

test('作品详情准备数据但不下载缩略图或生成展示图片', async () => {
  const lifecycle = { onLoad: [] }, downloads = []
  const loader = createLoader({
    lifecycle,
    uni: { downloadFile: options => { downloads.push(options); options.success({ statusCode: 200, tempFilePath: '/tmp/saved-thumbnail.png' }) } },
    uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) },
  })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const artworkStore = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  artworkStore.initialize({ vase: '陶瓶', background: 'warm', stems: [] })
  const artwork = artworkStore.snapshot()
  const id = 'a'.repeat(32)
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  works.get = async () => ({
    id,
    title: '春日花意',
    description: '',
        createdAt: 1,
    updatedAt: 1,
    draft: { artwork, card: { blessing: '', signature: '' }, updatedAt: 1, workId: id},
  })
  const catalog = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  catalog.loaded = true
  const detail = loader.setup('src/pages/flower-detail/flower-detail-page.vue')
  let rerenders = 0
  detail.images.exportImage = async () => { rerenders++; return true }
  lifecycle.onLoad[0]({ workId: id })
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(downloads.length, 0)
  assert.equal(detail.images.imagePath.value, '')
  assert.equal(rerenders, 0)
})

test('详情信息保存会更新名字和介绍', async () => {
  const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }) } })
  const detail = loader.setup('src/pages/flower-detail/flower-detail-page.vue')
  const id = 'a'.repeat(32)
  detail.draft.value = { artwork: loader.load('src/stores/artworkStore.ts').useArtworkStore().snapshot(), card: { blessing: '', signature: '' }, updatedAt: 1, workId: id}
  detail.title.value = '旧名字'
  detail.description.value = '旧介绍'
  detail.images.exportImage = async () => { throw new Error('Metadata save must not render') }
  const works = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  let input
  works.save = async value => {
    input = value
    return { id, title: value.title, description: value.description, thumbnailUrl: '/new-thumb.png', draft: { ...value.draft, workId: id} }
  }
  detail.editMetadata()
  detail.editTitle.value = '新名字'
  detail.editDescription.value = '新介绍'
  await detail.saveMetadata()
  assert.equal(input.title, '新名字')
  assert.equal(input.description, '新介绍')
  assert.equal(detail.title.value, '新名字')
  assert.equal(detail.description.value, '新介绍')
  assert.equal(detail.images.imagePath.value, '')
  assert.equal(detail.showMetadataEditor.value, false)
})

test('新创作与恢复的编辑草稿共用完成作品操作并保留各自作品身份', () => {
  const loader = createLoader({ uni: { getStorageSync: () => '', setStorageSync() {}, removeStorageSync() {} } })
  const page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  page.session.initialize('alice')
  assert.equal(page.session.workId.value, undefined)
  page.session.pendingDraft.value = { artwork: page.store.snapshot(), card: { blessing: '', signature: '' }, updatedAt: 1, workId: 'a'.repeat(32)}
  page.session.continueDraft()
  assert.equal(page.session.workId.value, 'a'.repeat(32))
  page.session.restart()
  assert.equal(page.session.workId.value, undefined)
  page.session.dispose()
})
