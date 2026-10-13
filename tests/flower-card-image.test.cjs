const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');
test('花卡保留原图比例，长祝福换行、署名靠右，超长拒绝', async () => { const draw = [], ctx = new Proxy({ measureText: t => ({ width: Array.from(t).length * 24 }) }, { get: (o, k) => k in o ? o[k] : k === 'draw' ? (_, cb) => cb() : (...args) => draw.push([k, ...args]) }); const render = createLoader().load('src/utils/flower/render-flower-card.ts').renderFlowerCard; const size = await render(ctx, '/art.png', { blessing: '花'.repeat(120), signature: '小花' }); assert.ok(size.height > 1200); assert.ok(draw.some(row => row[0] === 'drawImage' && row[4] === 698 && row[5] === 1000)); assert.ok(draw.filter(row => row[0] === 'fillText').length > 4); assert.ok(draw.some(row => row[0] === 'setTextAlign' && row[1] === 'right')); await assert.rejects(render(ctx, '/art.png', { blessing: '花'.repeat(121), signature: '' })); });
test('作品图由云端生成，贺卡使用 canvas 导出并按内容复用缓存', async () => {
  const requests = [], shared = [], renderedCards = [], loader = createLoader({
    uniCloud: { importObject: () => ({ render: ({ svg }) => new Promise(resolve => requests.push({ svg, resolve: () => {
      const height = Number(svg.match(/^\s*<svg\b[^>]*\bheight=["'](\d+)["']/)?.[1])
      resolve({ width: 698, height, pngBase64: 'cG5n' })
    } })) }) },
    wx: {
      env: { USER_DATA_PATH: '/user' },
      getFileSystemManager: () => ({ writeFile: args => args.success() }),
      canIUse: () => true,
      showShareImageMenu: args => shared.push(args.path),
    },
  })
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(store.snapshot)
  const artwork = images.exportImage()
  requests[0].resolve()
  assert.equal(await artwork, true)
  assert.match(requests[0].svg, /height="1000"/)
  const greeting = { blessing: '祝福', signature: '' }
  const render = async () => {
    renderedCards.push(greeting)
    return '/card-canvas.png'
  }
  const job = images.exportCard(greeting, render)
  assert.equal(requests.length, 1)
  assert.equal(await job, true)
  assert.deepEqual(renderedCards, [greeting])
  assert.equal(images.cardImagePath.value, '/card-canvas.png')
  assert.equal(await images.exportCard(greeting, render), true)
  assert.deepEqual(renderedCards, [greeting])
  assert.equal(requests.length, 1)
  images.shareImage('card')
  images.shareImage()
  assert.deepEqual(shared, [images.cardImagePath.value, images.imagePath.value])
})
test('新花卡文字取代正在 canvas 导出的旧花卡，不发布旧结果', async () => {
  const requests = []
  const loader = createLoader({
    uniCloud: { importObject: () => ({ render: ({ svg }) => new Promise((resolve, reject) => requests.push({ svg, resolve, reject })) }) },
    wx: { env: { USER_DATA_PATH: '/user' }, getFileSystemManager: () => ({ writeFile: args => args.success(), unlink() {} }) },
  })
  const images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(() => ({ version: 2, vase: '陶瓶', background: 'warm', stems: [] }))
  const old = images.exportCard({ blessing: '旧祝福', signature: '' }, () => new Promise(resolve => requests.push({ resolve })))
  assert.equal(requests.length, 1)
  const next = images.exportCard({ blessing: '新祝福', signature: '' }, () => new Promise(resolve => requests.push({ resolve })))
  requests[0].resolve('/user/flower-cloud-old.png')
  assert.equal(await old, false)
  assert.equal(images.cardImagePath.value, '')
  requests[1].resolve('/user/flower-cloud-new.png')
  assert.equal(await next, true)
  assert.equal(images.cardImagePath.value, '/user/flower-cloud-new.png')
})
test('只有署名、只有祝福和多段换行均可绘制，长文本不被固定画布截断', async () => {
    const loader = createLoader(), render = loader.load('src/utils/flower/render-flower-card.ts').renderFlowerCard;
    for (const text of [{ blessing: '', signature: '小花' }, { blessing: '愿你开心', signature: '' }, { blessing: '花\n'.repeat(60), signature: '署名' }]) {
        const calls = [], sizes = [];
        const ctx = new Proxy({ measureText: value => ({ width: value.length * 26 }) }, { get: (target, key) => key in target ? target[key] : key === 'draw' ? (_, callback) => callback() : (...args) => calls.push([key, ...args]) });
        const size = await render(ctx, '/art.png', text, async height => { sizes.push(height); });
        assert.equal(sizes[0], size.height);
        assert.ok(calls.filter(row => row[0] === 'fillText').every(row => row[3] < size.height));
        if (text.signature) assert.ok(calls.some(row => row[0] === 'fillText' && row[1] === text.signature));
        if (text.blessing.length === 120) assert.ok(size.height > 1800);
    }
});

test('贺卡展示送给、署名，120字祝福自动换行，拒绝超长文字', async () => {
  const calls = []
  const ctx = new Proxy({ measureText: value => ({ width: Array.from(value).length * 26 }) }, { get: (target, key) => key in target ? target[key] : key === 'draw' ? (_, callback) => callback() : (...args) => calls.push([key, ...args]) })
  const render = createLoader().load('src/utils/flower/render-flower-card.ts').renderFlowerCard
  const size = await render(ctx, '/art.png', { recipient: '亲爱的你', blessing: '愿你开心\n愿你自由\n愿你有花开', signature: '小花' })
  assert.ok(size.height >= 1260)
  assert.ok(calls.some(row => row[0] === 'fillText' && row[1] === '送给 亲爱的你'))
  assert.ok(calls.some(row => row[0] === 'fillText' && row[1] === '小花'))
  const fullLength = await render(ctx, '/art.png', { recipient: '', blessing: '花'.repeat(120), signature: '小花' })
  assert.ok(fullLength.height > size.height)
  await assert.rejects(render(ctx, '/art.png', { recipient: '', blessing: '花'.repeat(121), signature: '' }))
  await assert.rejects(render(ctx, '/art.png', { recipient: '你'.repeat(25), blessing: '', signature: '' }), /24字/)
  await render(ctx, '/art.png', { recipient: '', blessing: '', signature: '' })
})
