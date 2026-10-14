const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const cloudFunctionDir = path.resolve('uniCloud-alipay/cloudfunctions/flower-render')
const sharedRuntimeDir = path.resolve('uniCloud-alipay/cloudfunctions/flower-render-test')

function loadCloudObject(options = {}) {
  let rendererOptions, renderCount = 0, initCount = 0, freedImage = false, freedRenderer = false
  class Resvg {
    constructor(svg, config) {
      rendererOptions = config
      this.svg = svg
    }

    render() {
      renderCount++
      return {
        width: 698,
        height: Number(this.svg.match(/\bheight="(\d+)"/)[1]),
        asPng: () => Buffer.from('png'),
        free: () => { freedImage = true },
      }
    }

    free() {
      freedRenderer = true
    }
  }
  const cloudModule = { exports: {} }
  const cloudRequire = (name) => {
    if (name === 'auth')
      return async () => options.auth === false ? {} : { uid: 'test-user', newToken: 'refreshed-token' }
    if (name === '@resvg/resvg-wasm')
      return options.wasm || { initWasm: async () => { initCount++ }, Resvg }
    if (name === 'node:fs')
      return options.fs || { readFileSync: () => Buffer.from('wasm') }
    if (name === '../common/daily-flower')
      return require(path.resolve(cloudFunctionDir, '../common/daily-flower'))
    return require(name)
  }
  cloudRequire.resolve = name => options.wasmPath || '/tmp/mock-wasm'
  vm.runInNewContext(fs.readFileSync(path.join(cloudFunctionDir, 'index.obj.js'), 'utf8'), {
    module: cloudModule,
    exports: cloudModule.exports,
    require: cloudRequire,
    Buffer,
    Date,
    fs: options.fs || { readFileSync: () => Buffer.from('wasm') },
    uniCloud: options.uniCloud,
  })
  return {
    object: cloudModule.exports,
    metrics: () => ({ rendererOptions, renderCount, initCount, freedImage, freedRenderer }),
  }
}

const svg = height => `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="${height}"><rect width="698" height="${height}" fill="#fff"/></svg>`

test('正式云渲染对象要求登录并回传 PNG', async () => {
  const { object, metrics } = loadCloudObject()
  const context = { getUniIdToken() {} }
  await object._before.call(context)
  const rendered = await object.render.call(context, { svg: svg(1000) })
  const result = object._after.call(context, null, rendered)
  assert.equal(result.width, 698)
  assert.equal(result.height, 1000)
  assert.equal(Buffer.from(result.pngBase64, 'base64').toString(), 'png')
  assert.equal(result.newToken, 'refreshed-token')
  assert.equal(metrics().renderCount, 1)
  assert.equal(metrics().initCount, 1)
  assert.equal(metrics().rendererOptions.font.loadSystemFonts, true)
  assert.equal(metrics().freedImage, true)
  assert.equal(metrics().freedRenderer, true)
})

test('每日花束云渲染仅允许管理员调用', async () => {
  let roles = []
  const uniCloud = {
    database: () => ({
      collection: (name) => {
        assert.equal(name, 'uni-id-users')
        return { doc: () => ({ field: () => ({ get: async () => ({ data: [{ role: roles }] }) }) }) }
      },
    }),
  }
  const { object, metrics } = loadCloudObject({ uniCloud })
  const context = { getUniIdToken() {} }
  await object._before.call(context)
  const artwork = {
    version: 2,
    vase: '陶瓶',
    background: 'warm',
    stems: [{ id: 1, kind: 'rose', x: 350, y: 747, angle: 0, flowerScale: 1, stemHeight: 260, color: '#d85f70' }],
  }
  await assert.rejects(object.renderDailyArtwork.call(context, { artwork }), (error) => error.errCode === 'ADMIN_REQUIRED')
  assert.equal(metrics().renderCount, 0)
  roles = ['admin']
  const result = await object.renderDailyArtwork.call(context, { artwork: {
    ...artwork,
  } })
  assert.equal(result.width, 698)
  assert.equal(result.height, 1000)
  assert.equal(Buffer.from(result.pngBase64, 'base64').toString(), 'png')
  assert.equal(metrics().renderCount, 1)
})

test('未登录与无效 SVG 在启动 WASM 之前被拒绝', async () => {
  const unauthenticated = loadCloudObject({ auth: false })
  await assert.rejects(unauthenticated.object._before.call({ getUniIdToken() {} }), error => error.errCode === 'AUTH_REQUIRED')

  const { object, metrics } = loadCloudObject()
  await object._before.call({ getUniIdToken() {} })
  for (const invalid of [
    '<svg width="698" height="1000"><script>alert(1)</script></svg>',
    '<svg width="698" height="1000"><image href="https://example.org/image.png"/></svg>',
    svg(999),
    svg(2001),
    `${svg(1000)}${'x'.repeat(1024 * 1024)}`,
  ]) {
    await assert.rejects(object.render.call({}, { svg: invalid }), /SVG 无效/)
  }
  assert.equal(metrics().initCount, 0)
  assert.equal(metrics().renderCount, 0)
})

test('正式云函数只凭作品 ID 读取归属用户的作品并生成作品图片', async () => {
  const savedWork = {
    _id: 'a'.repeat(32),
    user_id: 'test-user',
    revision: 3,
    artwork: {
      version: 2,
      vase: '陶瓶',
      background: 'warm',
      stems: Array.from({ length: 65 }, (_, id) => ({
        id: id + 1,
        kind: 'rose',
        x: 350,
        angle: 0,
        flowerScale: 1,
        stemHeight: 300,
        color: '#b82b36',
      })),
    },
  }
  const queries = []
  const cloud = {
    database: () => ({
      collection: name => {
        assert.equal(name, 'flower-works')
        return {
          where: filter => ({
            limit: count => ({
              get: async () => {
                queries.push({ filter, count })
                return { data: [savedWork] }
              },
            }),
          }),
        }
      },
    }),
  }
  let latestSvg = ''
  class CaptureResvg {
    constructor(svg) { latestSvg = svg }
    render() {
      const height = Number(latestSvg.match(/\bheight="(\d+)"/)[1])
      return { width: 698, height, asPng: () => Buffer.from('png'), free() {} }
    }
    free() {}
  }
  const { object } = loadCloudObject({ uniCloud: cloud, wasm: { initWasm: async () => {}, Resvg: CaptureResvg } })
  const context = { getUniIdToken() {} }
  await object._before.call(context)

  const artworkResult = await object.renderWork.call(context, { workId: savedWork._id, expectedRevision: 3 })
  assert.equal(artworkResult.width, 698)
  assert.equal(artworkResult.height, 1000)
  assert.match(latestSvg, /width="698" height="1000"/)
  assert.equal((latestSvg.match(/<g transform="translate\(350 747\)/g) || []).length, 65)
  assert.equal(JSON.stringify(queries[0]), JSON.stringify({ filter: { _id: savedWork._id, user_id: 'test-user' }, count: 1 }))

  await assert.rejects(object.renderWork.call(context, { workId: savedWork._id, expectedRevision: 2 }), error => error.errCode === 'WORK_CONFLICT')
})

test('正式云函数按作品素材 ID 和版本读取 fileId 中的 SVG', async () => {
  const workId = 'b'.repeat(32)
  const materialId = 'daisy'
  const materialRevision = '0123456789abcdef'
  const assetIds = {
    flower: 'cloud://env-test/flower-materials/daisy/flower.svg',
    stemWithoutLeaves: 'cloud://env-test/flower-materials/daisy/stem.svg',
  }
  const sources = {
    flower: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110"><circle cx="55" cy="55" r="30" fill="__COLOR__"/></svg>',
    stemWithoutLeaves: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 260"><path d="M55 0V260" stroke="#73835c" stroke-width="4"/></svg>',
  }
  const downloadedIds = []
  let assembledSvg = ''
  const cloud = {
    database: () => ({
      collection: name => {
        const collection = {
          doc: id => ({
            get: async () => ({ data: [{ id, name: '小雏菊', revision: materialRevision, category: 'flower', group: 'filler', geometry: { width: 110, flowerHeight: 110, connectionY: 102 }, assets: Object.fromEntries(Object.entries(assetIds).map(([part, fileId]) => [part, { fileId }])) }] }),
          }),
          where: () => ({
            limit: () => ({
              get: async () => ({ data: [{ _id: workId, user_id: 'test-user', revision: 1, artwork: { version: 2, vase: '陶瓶', background: 'warm', stems: [{ id: 1, kind: 'daisy', x: 350, angle: 0, flowerScale: 1, stemHeight: 300, color: '#f1e5bd', materialId, materialRevision, leafMode: 'without' }] } }] }),
            }),
          }),
        }
        assert.ok(['flower-works', 'flower-material-assets'].includes(name))
        return collection
      },
    }),
    downloadFile: async ({ fileID }) => {
      downloadedIds.push(fileID)
      const part = Object.keys(assetIds).find(key => assetIds[key] === fileID)
      return { fileContent: Buffer.from(sources[part]) }
    },
  }
  class CaptureResvg {
    constructor(svg) { assembledSvg = svg }
    render() { return { width: 698, height: 1000, asPng: () => Buffer.from('png'), free() {} } }
    free() {}
  }
  const { object } = loadCloudObject({ uniCloud: cloud, wasm: { initWasm: async () => {}, Resvg: CaptureResvg } })
  const context = { getUniIdToken() {} }
  await object._before.call(context)
  await object.renderWork.call(context, { workId, expectedRevision: 1 })
  assert.equal(JSON.stringify(downloadedIds.sort()), JSON.stringify(Object.values(assetIds).sort()))
  assert.match(assembledSvg, /<circle[^>]*fill="#f1e5bd"/)
  assert.match(assembledSvg, /#73835c/)
  assert.match(assembledSvg, /<svg x="0" y="[^"]+" width="110" height="[^"]+" viewBox="0 0 110 260"/)
  assert.match(assembledSvg, /<svg x="0" y="0" width="110" height="110" viewBox="0 0 110 110"/)
})

test('正式云渲染按花束背层、花枝、花束前层顺序绘制并对齐背景桌面', async () => {
  const workId = 'c'.repeat(32)
  const flowerRevision = '0123456789abcdef'
  const wrapRevision = '1123456789abcdef'
  const sceneRevision = '2123456789abcdef'
  const records = {
    daisy: {
      id: 'daisy', name: '雏菊', revision: flowerRevision, category: 'flower', group: 'filler',
      geometry: { width: 110, flowerHeight: 110, connectionY: 100 },
      assets: {
        flower: { fileId: 'cloud://test/daisy.svg' },
        stemWithoutLeaves: { fileId: 'cloud://test/daisy-stem.svg' },
      },
    },
    'ivory-korean-wrap': {
      id: 'ivory-korean-wrap', name: '韩式包装', revision: wrapRevision, category: 'bouquet',
      geometry: { width: 340, height: 430, mouthX: 170, mouthY: 347, mouthWidth: 120 },
      assets: { bouquet: { fileId: 'cloud://test/wrap.svg' } },
    },
    'scene-ivory-table': {
      id: 'scene-ivory-table', name: '桌面', revision: sceneRevision, category: 'background',
      geometry: { width: 698, height: 1000, surfaceY: 910 },
      assets: { background: { fileId: 'cloud://test/scene.svg' } },
    },
  }
  const sources = {
    'cloud://test/daisy.svg': '<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="24" fill="__COLOR__"/></svg>',
    'cloud://test/daisy-stem.svg': '<svg viewBox="0 0 110 260"><path d="M55 0C55 76 55 180 55 260" stroke="#73835c"/></svg>',
    'cloud://test/wrap.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 430"><defs><linearGradient id="wrap"><stop stop-color="#eee"/></linearGradient></defs><!-- bouquet-back:start --><g id="back-layer"><path d="M0 0H10"/></g><!-- bouquet-back:end --><!-- bouquet-front:start --><g id="front-layer"><path d="M0 0H10"/></g><!-- bouquet-front:end --></svg>',
    'cloud://test/scene.svg': '<svg viewBox="0 0 698 1000"><rect width="698" height="1000" fill="#fff"/></svg>',
  }
  const artwork = {
    version: 2,
    vase: '花束',
    vaseMaterialId: 'ivory-korean-wrap',
    vaseMaterialRevision: wrapRevision,
    background: 'warm',
    backgroundMaterialId: 'scene-ivory-table',
    backgroundMaterialRevision: sceneRevision,
    stems: [{ id: 1, kind: 'daisy', x: 350, angle: 0, flowerScale: 1, stemHeight: 300, color: '#f1e5bd', materialId: 'daisy', materialRevision: flowerRevision, leafMode: 'without' }],
  }
  let assembledSvg = ''
  const cloud = {
    database: () => ({
      collection: name => ({
        doc: id => ({ get: async () => ({ data: [records[id]] }) }),
        where: () => ({ limit: () => ({ get: async () => ({ data: [{ _id: workId, user_id: 'test-user', revision: 1, artwork }] }) }) }),
      }),
    }),
    downloadFile: async ({ fileID }) => ({ fileContent: Buffer.from(sources[fileID]) }),
  }
  class CaptureResvg {
    constructor(svg) { assembledSvg = svg }
    render() { return { width: 698, height: 1000, asPng: () => Buffer.from('png'), free() {} } }
    free() {}
  }
  const { object } = loadCloudObject({ uniCloud: cloud, wasm: { initWasm: async () => {}, Resvg: CaptureResvg } })
  const context = { getUniIdToken() {} }
  await object._before.call(context)
  await object.renderWork.call(context, { workId, expectedRevision: 1 })
  const back = assembledSvg.indexOf('id="back-layer"')
  const flower = assembledSvg.indexOf('fill="#f1e5bd"')
  const front = assembledSvg.indexOf('id="front-layer"')
  assert.ok(back >= 0 && back < flower && flower < front)
  assert.match(assembledSvg, /translate\(0 -10\)/)
  assert.match(assembledSvg, /translate\(350 747\)/)
  assert.match(assembledSvg, /studio-background:v2/)
})

test('正式云函数用 Resvg 输出有效 PNG', async (context) => {
  let resvgPath
  try {
    resvgPath = require.resolve('@resvg/resvg-wasm', { paths: [sharedRuntimeDir] })
  }
  catch {
    context.skip('安装渲染云函数依赖后执行 PNG 栅格化集成测试')
    return
  }
  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm', { paths: [sharedRuntimeDir] })
  const { object } = loadCloudObject({ wasm: require(resvgPath), wasmPath, fs })
  const auth = { getUniIdToken() {} }
  await object._before.call(auth)
  const output = await object.render.call(auth, {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000"><rect width="698" height="1000" fill="#fff"/><text x="40" y="80" font-size="28">愿你花开</text></svg>',
  })
  const png = Buffer.from(output.pngBase64, 'base64')
  assert.equal(output.width, 698)
  assert.equal(output.height, 1000)
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), 698)
  assert.equal(png.readUInt32BE(20), 1000)
})
