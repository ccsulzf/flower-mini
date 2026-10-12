const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');
test('花卡保留原图比例，长祝福换行、署名靠右，超长拒绝', async () => { const draw = [], ctx = new Proxy({ measureText: t => ({ width: Array.from(t).length * 24 }) }, { get: (o, k) => k in o ? o[k] : k === 'draw' ? (_, cb) => cb() : (...args) => draw.push([k, ...args]) }); const render = createLoader().load('src/utils/flower/render-flower-card.ts').renderFlowerCard; const size = await render(ctx, '/art.png', { blessing: '花'.repeat(120), signature: '小花' }); assert.ok(size.height > 1200); assert.ok(draw.some(row => row[0] === 'drawImage' && row[4] === 698 && row[5] === 1000)); assert.ok(draw.filter(row => row[0] === 'fillText').length > 4); assert.ok(draw.some(row => row[0] === 'setTextAlign' && row[1] === 'right')); await assert.rejects(render(ctx, '/art.png', { blessing: '花'.repeat(121), signature: '' })); });
test('原图和花卡使用不同分享路径，缩略图是小尺寸，失效回调不更新', async () => { const requests = [], shared = [], ctx = new Proxy({ measureText: t => ({ width: t.length * 24 }) }, { get: (o, k) => k in o ? o[k] : k === 'createLinearGradient' ? () => ({ addColorStop() { } }) : k === 'draw' ? (_, cb) => cb() : () => { } }); const loader = createLoader({ uni: { createCanvasContext: () => ctx, getImageInfo: a => a.success({ path: a.src }), canvasToTempFilePath: a => requests.push(a) }, wx: { canIUse: () => true, showShareImageMenu: a => shared.push(a.path) } }); const store = loader.load('src/stores/artworkStore.ts').useArtworkStore(), images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(store.snapshot); images.imagePath.value = '/art.png'; const job = images.exportCard({ blessing: '祝福', signature: '' }); await new Promise(r => setImmediate(r)); requests[0].success({ tempFilePath: '/card.png' }); assert.equal(await job, true); images.shareImage('card'); images.shareImage(); assert.deepEqual(shared, ['/card.png', '/art.png']); const thumbnail = images.exportThumbnail(); await new Promise(r => setImmediate(r)); assert.equal(requests[1].destWidth, 349); assert.equal(requests[1].destHeight, 500); images.invalidate(); requests[1].success({ tempFilePath: '/thumb.png' }); await assert.rejects(thumbnail); assert.equal(images.cardImagePath.value, ''); });
test('新花卡文字取代正在生成的旧花卡，不发布旧结果', async () => { const requests = [], ctx = new Proxy({ measureText: t => ({ width: t.length * 24 }) }, { get: (o, k) => k in o ? o[k] : k === 'draw' ? (_, cb) => cb() : () => { } }); const loader = createLoader({ uni: { createCanvasContext: () => ctx, canvasToTempFilePath: a => requests.push(a) } }); const images = loader.load('src/hooks/useArtworkImage.ts').useArtworkImage(() => ({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })); images.imagePath.value = '/art.png'; const old = images.exportCard({ blessing: '旧祝福', signature: '' }); await new Promise(r => setImmediate(r)); const next = images.exportCard({ blessing: '新祝福', signature: '' }); requests[0].success({ tempFilePath: '/old.png' }); assert.equal(await old, false); await new Promise(r => setImmediate(r)); assert.equal(images.cardImagePath.value, ''); requests[1].success({ tempFilePath: '/new.png' }); assert.equal(await next, true); assert.equal(images.cardImagePath.value, '/new.png'); });
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

test('参考贺卡布局显示送给、三行祝福和署名，拒绝第四行及自动换行溢出', async () => {
  const calls = []
  const ctx = new Proxy({ measureText: value => ({ width: Array.from(value).length * 26 }) }, { get: (target, key) => key in target ? target[key] : key === 'draw' ? (_, callback) => callback() : (...args) => calls.push([key, ...args]) })
  const render = createLoader().load('src/utils/flower/render-flower-card.ts').renderFlowerCard
  const size = await render(ctx, '/art.png', { recipient: '亲爱的你', blessing: '愿你开心\n愿你自由\n愿你有花开', signature: '小花' })
  assert.equal(size.height, 1260)
  assert.ok(calls.some(row => row[0] === 'fillText' && row[1] === '送给 亲爱的你'))
  assert.ok(calls.some(row => row[0] === 'fillText' && row[1] === '小花'))
  await assert.rejects(render(ctx, '/art.png', { recipient: '', blessing: '一\n二\n三\n四', signature: '' }), /最多三行/)
  await assert.rejects(render(ctx, '/art.png', { recipient: '', blessing: '花'.repeat(70), signature: '' }), /最多三行/)
  await assert.rejects(render(ctx, '/art.png', { recipient: '你'.repeat(25), blessing: '', signature: '' }), /24字/)
  await render(ctx, '/art.png', { recipient: '', blessing: '', signature: '' })
})
