const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')
const flush = () => new Promise(resolve => setImmediate(resolve))

function fixture(options = {}) {
  const requests = [], saved = [], shared = [], previews = [], notices = []
  const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : key === 'draw' ? (_, callback) => callback() : () => {} })
  const loader = createLoader({
    uni: {
      createCanvasContext: () => ctx,
      getImageInfo: args => options.loadFailure ? args.fail({ errMsg: 'load failed' }) : args.success({ path: args.src }),
      canvasToTempFilePath: args => requests.push(args),
      saveImageToPhotosAlbum: args => saved.push(args),
      previewImage: args => previews.push(args),
      showToast: args => notices.push(args.title),
    },
    wx: options.wx === false ? undefined : { canIUse: () => options.supported !== false, showShareImageMenu: args => shared.push(args) },
  })
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(store.snapshot)
  return { loader, store, images, requests, saved, shared, previews, notices }
}

test('图片生成期间不重复导出，捕获当前快照，结果可保存预览和分享', async () => {
  const f = fixture(), initial = f.store.snapshot()
  f.images.saveImage(); f.images.shareImage()
  assert.equal(f.saved.length + f.shared.length, 0)
  const work = f.images.exportImage()
  assert.equal(await f.images.exportImage(), false)
  await flush()
  assert.equal(f.requests.length, 1)
  assert.equal(f.requests[0].destWidth, 1396)
  assert.equal(f.requests[0].destHeight, 2000)
  f.requests[0].success({ tempFilePath: '/first.png' })
  assert.equal(await work, true)
  f.images.saveImage(); f.images.shareImage(); f.images.previewImage()
  assert.equal(f.saved[0].filePath, '/first.png')
  assert.equal(f.shared[0].path, '/first.png')
  assert.deepEqual(Array.from(f.previews[0].urls), ['/first.png'])
  assert.deepEqual(f.store.snapshot(), initial)
  const next = f.images.exportImage()
  assert.equal(f.images.imagePath.value, '')
  await flush()
  f.requests[1].success({ tempFilePath: '/second.png' })
  await next
  assert.equal(f.images.imagePath.value, '/second.png')
})

test('关闭并重新完成后旧回调不覆盖状态，单个 Canvas 串行绘制', async () => {
  for (const fails of [false, true]) {
    const f = fixture()
    const old = f.images.exportImage()
    await flush()
    f.images.invalidate()
    const current = f.images.exportImage()
    await flush()
    assert.equal(f.requests.length, 1, '旧 Canvas 导出未结束，不能开始新绘制')
    if (fails) f.requests[0].fail({ errMsg: 'old failure' })
    else f.requests[0].success({ tempFilePath: '/old.png' })
    assert.equal(await old, false)
    await flush()
    assert.equal(f.images.imagePath.value, '')
    assert.equal(f.images.imageError.value, '')
    assert.equal(f.images.exportingImage.value, true)
    f.requests[1].success({ tempFilePath: '/current.png' })
    assert.equal(await current, true)
    assert.equal(f.images.imagePath.value, '/current.png')
  }
})

test('素材与导出失败显示错误，重试能恢复；关闭后不保留旧结果', async () => {
  const missing = fixture({ loadFailure: true })
  assert.equal(await missing.images.exportImage(), false)
  assert.equal(missing.requests.length, 0)
  assert.match(missing.images.imageError.value, /重试/)
  const f = fixture(), first = f.images.exportImage()
  await flush()
  f.requests[0].fail({ errMsg: 'canvas error' })
  assert.equal(await first, false)
  assert.equal(f.images.exportingImage.value, false)
  const retry = f.images.exportImage()
  assert.equal(f.images.imageError.value, '')
  await flush()
  f.requests[1].success({ tempFilePath: '/retry.png' })
  assert.equal(await retry, true)
  f.images.invalidate()
  assert.equal(f.images.imagePath.value, '')
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
  assert.equal(page.showFinish.value, false)
  assert.equal(f.requests.length, 0)
  assert.equal(f.notices.at(-1), '请先选择花瓶或包装')
})
