const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');

test('新作或改动作品生成作品图，未改动时复用作品图并在本地合成贺卡', async () => {
  const requests = [], shared = [], loader = createLoader({
    uniCloud: { importObject: () => ({ renderWork: input => new Promise(resolve => requests.push({ input, resolve: () => resolve({ width: 698, height: 1000, pngBase64: 'cG5n' }) })) }) },
    wx: { env: { USER_DATA_PATH: '/user' }, getFileSystemManager: () => ({ writeFile: args => args.success() }), canIUse: () => true, showShareImageMenu: args => shared.push(args.path) },
  })
  const store = loader.load('src/stores/artworkStore.ts').useArtworkStore()
  const images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(store.snapshot, () => 'work:abcdef', () => ({ id: 'a'.repeat(32), revision: 2 }))
  const greeting = { recipient: '朋友', blessing: '祝福', signature: '' }, compositions = []
  const first = images.exportCard(greeting, async (artworkPath, card) => { compositions.push({ artworkPath, card }); return '/user/card.png' })
  requests[0].resolve()
  assert.equal(await first, true)
  assert.equal(JSON.stringify(requests[0].input), JSON.stringify({ workId: 'a'.repeat(32), expectedRevision: 2 }))
  assert.equal(JSON.stringify(compositions), JSON.stringify([{ artworkPath: images.imagePath.value, card: greeting }]))
  assert.equal(await images.exportCard(greeting, async () => '/user/unexpected.png'), true)
  assert.equal(requests.length, 1)
  assert.equal(compositions.length, 1)
  store.setBackground('sage')
  const changed = images.exportCard({ ...greeting, blessing: '新祝福' }, async () => '/user/changed-card.png')
  requests[1].resolve()
  assert.equal(await changed, true)
  assert.equal(requests.length, 2)
  assert.ok(requests.every(request => !('kind' in request.input) && !('card' in request.input)))
  images.shareImage('card'); images.shareImage()
  assert.deepEqual(shared, [images.cardImagePath.value, images.imagePath.value])
})

test('新花卡文字取代正在本地合成的旧贺卡，不发布旧结果', async () => {
  const requests = [], compositions = []
  const loader = createLoader({
    uniCloud: { importObject: () => ({ renderWork: input => new Promise((resolve, reject) => requests.push({ input, resolve, reject })) }) },
    wx: { env: { USER_DATA_PATH: '/user' }, getFileSystemManager: () => ({ writeFile: args => args.success(), unlink() {} }) },
  })
  const images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(() => ({ version: 2, vase: '陶瓶', background: 'warm', stems: [] }), () => 'work:abcdef', () => ({ id: 'b'.repeat(32), revision: 1 }))
  const old = images.exportCard({ recipient: '', blessing: '旧祝福', signature: '' }, () => new Promise(resolve => compositions.push({ text: 'old', resolve })))
  requests[0].resolve({ width: 698, height: 1000, pngBase64: 'YXJ0' })
  await new Promise(resolve => setImmediate(resolve))
  const next = images.exportCard({ recipient: '', blessing: '新祝福', signature: '' }, () => new Promise(resolve => compositions.push({ text: 'new', resolve })))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(requests.length, 1)
  compositions[0].resolve('/user/old.png')
  assert.equal(await old, false)
  assert.equal(images.cardImagePath.value, '')
  compositions[1].resolve('/user/new.png')
  assert.equal(await next, true)
  assert.equal(images.cardImagePath.value, '/user/new.png')
})

test('贺卡 canvas 将作品图与文字绘制后只导出本地文件', async () => {
  const calls = []
  const loader = createLoader({
    uni: {
      createCanvasContext: id => { calls.push(['createCanvasContext', id]); return new Proxy({}, { get: (_, key) => key === 'draw' ? (_reserve, complete) => { calls.push(['draw']); complete() } : (...args) => calls.push([key, ...args]) }) },
      canvasToTempFilePath: options => { calls.push(['canvasToTempFilePath', options.canvasId, options.width, options.height]); options.success({ tempFilePath: '/user/card.png' }) },
    },
    uniCloud: { importObject: () => { throw new Error('本地贺卡合成不应调用云端') } },
  })
  const result = await loader.load('src/utils/flower/render-flower-card.ts').renderFlowerCard('/user/artwork.png', { recipient: '朋友', blessing: '祝你开心', signature: '小花' })
  assert.equal(result, '/user/card.png')
  assert.ok(calls.some(([method, path]) => method === 'drawImage' && path === '/user/artwork.png'))
  assert.ok(calls.some(([method, text]) => method === 'fillText' && text === '送给 朋友'))
  assert.ok(calls.some(([method, text]) => method === 'fillText' && text === '祝你开心'))
  assert.ok(calls.some(([method, text]) => method === 'fillText' && text === '小花'))
  assert.ok(calls.some(([method, id, width, height]) => method === 'canvasToTempFilePath' && id === 'flower-card-canvas' && width === 698 && height === 1260))
})

test('编辑贺卡后再次渲染会重置正文左对齐状态', async () => {
  let textAlign = 'left', render = 0
  const textCalls = []
  const context = new Proxy({}, {
    get: (_, key) => {
      if (key === 'setTextAlign')
        return value => { textAlign = value }
      if (key === 'fillText')
        return value => textCalls.push({ render, value, textAlign })
      if (key === 'draw')
        return (_reserve, complete) => complete()
      return () => {}
    },
  })
  const loader = createLoader({
    uni: {
      createCanvasContext: () => { render++; return context },
      canvasToTempFilePath: options => options.success({ tempFilePath: `/user/card-${render}.png` }),
    },
  })
  const { renderFlowerCard } = loader.load('src/utils/flower/render-flower-card.ts')
  await renderFlowerCard('/user/artwork.png', { recipient: '亲爱的你', blessing: '花开', signature: '小李' })
  await renderFlowerCard('/user/artwork.png', { recipient: '亲爱的你', blessing: '花开\n常在', signature: '小李' })
  const secondBody = textCalls.filter(call => call.render === 2 && call.value !== '小李')
  assert.deepEqual(secondBody.map(call => call.textAlign), ['left', 'left', 'left'])
})
