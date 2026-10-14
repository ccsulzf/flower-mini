const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')
const flush = () => new Promise(resolve => setImmediate(resolve))

function fixture(options = {}) {
  const requests = [], saved = [], shared = [], previews = [], notices = [], removedFiles = []
  let imageNumber = 0, shouldFail = Boolean(options.renderFailure)
  const loader = createLoader({
    uni: {
      saveImageToPhotosAlbum: args => saved.push(args),
      previewImage: args => previews.push(args),
      showToast: args => notices.push(args.title),
    },
    uniCloud: {
      importObject: () => ({
        renderWork: input => new Promise((resolve, reject) => {
          const height = 1000
          requests.push({
            input,
            succeed: () => resolve({ width: 698, height, pngBase64: Buffer.from(`image-${++imageNumber}`).toString('base64') }),
            fail: reject,
          })
          if (shouldFail) {
            shouldFail = false
            requests.at(-1).fail(new Error('cloud render failed'))
          }
        }),
      }),
    },
    wx: options.wx === false ? undefined : {
      env: { USER_DATA_PATH: '/user' },
      getFileSystemManager: () => ({
        writeFile: args => args.success(),
        unlink: args => removedFiles.push(args.filePath),
      }),
      canIUse: () => options.supported !== false,
      showShareImageMenu: args => shared.push(args),
    },
  })
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(store.snapshot, () => 'work:abcdef', () => ({ id: 'a'.repeat(32), revision: 1 }))
  return { loader, store, images, requests, saved, shared, previews, notices, removedFiles }
}

test('图片生成期间不重复导出，捕获当前快照，结果可保存预览和分享', async () => {
  const f = fixture(), initial = f.store.snapshot()
  f.images.saveImage(); f.images.shareImage()
  assert.equal(f.saved.length + f.shared.length, 0)
  const work = f.images.exportImage()
  assert.equal(await f.images.exportImage(), false)
  await flush()
  assert.equal(f.requests.length, 1)
  assert.equal(JSON.stringify(f.requests[0].input), JSON.stringify({ workId: 'a'.repeat(32), expectedRevision: 1 }))
  f.requests[0].succeed()
  assert.equal(await work, true)
  const artworkPath = f.images.imagePath.value
  assert.match(artworkPath, /^\/user\/flower-cloud-.*\.png$/)
  f.images.saveImage(); f.images.shareImage(); f.images.previewImage()
  assert.equal(f.saved[0].filePath, artworkPath)
  assert.equal(f.shared[0].path, artworkPath)
  assert.deepEqual(Array.from(f.previews[0].urls), [artworkPath])
  assert.deepEqual(f.store.snapshot(), initial)
  const cached = await f.images.exportImage()
  assert.equal(cached, true)
  assert.equal(f.images.imagePath.value, artworkPath)
  assert.equal(f.requests.length, 1)
  f.store.setBackground('sage')
  const next = f.images.exportImage()
  await flush()
  f.requests[1].succeed()
  await next
  assert.match(f.images.imagePath.value, /^\/user\/flower-cloud-.*\.png$/)
  f.store.setBackground(initial.background)
  const restored = await f.images.exportImage()
  assert.equal(restored, true)
  assert.equal(f.images.imagePath.value, artworkPath)
  assert.equal(f.requests.length, 2)
})

test('关闭并重新完成后旧云端回调不覆盖新请求状态', async () => {
  for (const fails of [false, true]) {
    const f = fixture()
    const old = f.images.exportImage()
    await flush()
    f.images.invalidate()
    const current = f.images.exportImage()
    assert.equal(f.requests.length, 2)
    if (fails) f.requests[0].fail(new Error('old failure'))
    else f.requests[0].succeed()
    assert.equal(await old, false)
    assert.equal(f.images.imagePath.value, '')
    assert.equal(f.images.imageError.value, '')
    assert.equal(f.images.exportingImage.value, true)
    f.requests[1].succeed()
    assert.equal(await current, true)
    assert.match(f.images.imagePath.value, /^\/user\/flower-cloud-.*\.png$/)
    assert.equal(f.removedFiles.length, fails ? 0 : 1)
  }
})

test('素材与导出失败显示错误，重试能恢复；关闭后不保留旧结果', async () => {
  const f = fixture({ renderFailure: true })
  const first = f.images.exportImage()
  assert.equal(await first, false)
  assert.equal(f.requests.length, 1)
  assert.match(f.images.imageError.value, /重试/)
  assert.equal(f.images.exportingImage.value, false)
  const retry = f.images.exportImage()
  assert.equal(f.images.imageError.value, '')
  await flush()
  f.requests[1].succeed()
  assert.equal(await retry, true)
  f.images.invalidate()
  assert.equal(f.images.imagePath.value, '')
})

test('不同页面实例复用相同作品的图片缓存', async () => {
  const f = fixture()
  const first = f.images.exportImage()
  f.requests[0].succeed()
  assert.equal(await first, true)
  const cachedPath = f.images.imagePath.value
  f.images.invalidate()
  const anotherPage = f.loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(f.store.snapshot, () => 'work:abcdef', () => ({ id: 'a'.repeat(32), revision: 1 }))
  assert.equal(await anotherPage.exportImage(), true)
  assert.equal(anotherPage.imagePath.value, cachedPath)
  assert.match(anotherPage.imagePath.value, /^\/user\/flower-cloud-.*\.png$/)
  assert.equal(f.requests.length, 1)
})

test('平台能力、取消与相册权限错误正确处理，不真实分享图片', async () => {
  for (const options of [{ wx: false }, { supported: false }]) {
    const f = fixture(options)
    f.images.imagePath.value = '/picture.png'
    f.images.shareImage()
    assert.equal(f.shared.length, 0)
    assert.match(f.notices[0], /保存后分享/)
  }
  const f = fixture()
  f.images.imagePath.value = '/picture.png'
  f.images.saveImage(); f.saved[0].fail({ errMsg: 'save:fail cancel' })
  f.images.shareImage(); f.shared[0].fail({ errMsg: 'share:fail cancel' })
  assert.equal(f.notices.length, 0)
  f.saved[0].fail({ errMsg: 'save:fail auth deny' })
  assert.match(f.notices[0], /相册权限/)
})

test('新工作台从空作品开始，未加载目录花瓶时不能导出内置花瓶', () => {
  const f = fixture(), page = f.loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  assert.equal(page.stems.value.length, 0)
  page.finish()
  assert.equal(page.finishing.value, false)
  assert.equal(f.requests.length, 0)
  assert.equal(f.notices.at(-1), '花瓶正在准备，请稍后再完成')
})
