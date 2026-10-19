const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const { createLoader } = require('./helpers/load-ts.cjs')

const cloudFunctionDir = path.resolve('uniCloud-alipay/cloudfunctions/flower-render-test')
const revision = '0123456789abcdef'

function loadCloudObject(wasm, options = {}) {
  const cloudModule = { exports: {} }
  const cloudRequire = (name) => {
    if (name === 'auth')
      return async () => ({ uid: 'test-user' })
    if (name === '@resvg/resvg-wasm')
      return wasm
    if (name === 'node:fs')
      return options.fs || fs
    return require(name)
  }
  cloudRequire.resolve = name => require.resolve(name, { paths: [cloudFunctionDir] })
  vm.runInNewContext(fs.readFileSync(path.join(cloudFunctionDir, 'index.obj.js'), 'utf8'), {
    module: cloudModule,
    exports: cloudModule.exports,
    require: cloudRequire,
    Buffer,
    Date,
    fs: options.fs || fs,
    uniCloud: options.uniCloud,
  })
  return cloudModule.exports
}

function complexArtworkSvg() {
  const loader = createLoader()
  const { createComplexRenderTestArtwork, renderTestArtworkSvg } = loader.load('src/utils/flower/render-test-svg.ts')
  const { parseArtwork } = loader.load('src/utils/flower/artwork.ts')
  const baseMaterial = { introduction: '', flowerMeaning: '', version: 1, updatedAt: 0, revision }
  const flowerMaterials = [
    { ...baseMaterial, id: 'daisy', category: 'flower', name: '雏菊', group: 'filler', colors: [{ name: '奶油黄', value: '#f1e5bd' }, { name: '粉红', value: '#d78979' }], geometry: { width: 110, flowerHeight: 110, stemHeight: 260, connectionY: 102 }, assets: {} },
    { ...baseMaterial, id: 'rose', category: 'flower', name: '玫瑰', group: 'main', colors: [{ name: '深红', value: '#b82b36' }, { name: '浅粉', value: '#d77b83' }], geometry: { width: 110, flowerHeight: 110, stemHeight: 260, connectionY: 101 }, assets: {} },
    { ...baseMaterial, id: 'tulip', category: 'flower', name: '郁金香', group: 'main', colors: [{ name: '象牙白', value: '#f4f0e6' }, { name: '粉红', value: '#d78979' }], geometry: { width: 110, flowerHeight: 110, stemHeight: 260, connectionY: 93 }, assets: {} },
    { ...baseMaterial, id: 'leaf', category: 'flower', name: '叶材', group: 'foliage', colors: [{ name: '灰绿', value: '#849c81' }], geometry: { width: 110, flowerHeight: 110, stemHeight: 260, connectionY: 55 }, assets: {} },
  ]
  const vase = { ...baseMaterial, id: 'ceramic-vase', category: 'vase', name: '陶瓶', group: 'main', colors: [], geometry: { width: 200, height: 220, mouthX: 100, mouthY: 80, mouthWidth: 90 }, assets: {} }
  const background = { ...baseMaterial, id: 'room-background', category: 'background', name: '室内桌面', group: 'main', colors: [], geometry: { width: 698, height: 1000, surfaceY: 820 }, assets: {} }
  const artwork = parseArtwork(JSON.stringify(createComplexRenderTestArtwork([...flowerMaterials, vase, background])))
  const prepared = new Map()
  for (const material of flowerMaterials) {
    const flower = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110"><circle cx="55" cy="55" r="38" fill="__COLOR__"/></svg>`
    const stem = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 260"><path d="M55 0C55 76 55 180 55 260" fill="none" stroke="#73835c" stroke-width="4"/></svg>'
    const foliage = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 260"><path d="M55 0C55 76 55 180 55 260" fill="none" stroke="#849c81" stroke-width="3"/><ellipse cx="35" cy="90" rx="25" ry="10" fill="__COLOR__"/></svg>'
    prepared.set(material.id, {
      ...material,
      sources: material.group === 'foliage' ? { foliage } : { flower, stemWithoutLeaves: stem, stemWithLeaves: stem },
      paths: {},
    })
  }
  prepared.set(vase.id, {
    ...vase,
    sources: { vase: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220"><path d="M35 10H165L190 210H10Z" fill="#d7cbb6"/></svg>' },
    paths: {},
  })
  prepared.set(background.id, {
    ...background,
    sources: { background: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 698 1000"><rect width="698" height="820" fill="#eee7db"/><rect y="820" width="698" height="180" fill="#c4a27e"/></svg>' },
    paths: {},
  })
  return { artwork, prepared, svg: renderTestArtworkSvg(artwork, (id, materialRevision) => prepared.get(id)?.revision === materialRevision ? prepared.get(id) : undefined) }
}

const complex = complexArtworkSvg()

test('客户端先将作品 JSON 与本地素材组装成完整 SVG', () => {
  const { artwork, svg } = complex
  assert.equal(artwork.stems.length, 64)
  assert.equal(new Set(artwork.stems.map(stem => stem.materialId)).size, 4)
  assert.ok(new Set(artwork.stems.map(stem => stem.kind)).size >= 4)
  assert.ok(new Set(artwork.stems.map(stem => stem.color)).size >= 3)
  assert.ok(new Set(artwork.stems.map(stem => stem.stemHeight)).size >= 20)
  assert.ok(new Set(artwork.stems.map(stem => stem.angle)).size >= 12)
  assert.ok(new Set(artwork.stems.map(stem => stem.flowerScale)).size >= 12)
  assert.ok(artwork.stems.some(stem => stem.mirrored))
  assert.ok(artwork.stems.some(stem => stem.leafMode === 'with'))
  assert.ok(artwork.stems.some(stem => stem.kind === 'leaf'))
  assert.equal(artwork.vaseMaterialId, 'ceramic-vase')
  assert.equal(artwork.backgroundMaterialId, 'room-background')
  assert.match(svg, /width="698" height="1000" viewBox="0 0 698 1000"/)
  assert.equal((svg.match(/<g transform="translate\(\d+ 680\) rotate\(/g) || []).length, artwork.stems.length)
})

test('云端按作品素材版本从 flower-material-assets 和 fileId 获取 SVG 后渲染', async () => {
  let submittedSvg = ''
  const fileContents = new Map()
  const records = new Map()
  const downloads = []
  for (const [id, material] of complex.prepared) {
    const assets = {}
    for (const [part, source] of Object.entries(material.sources)) {
      const fileId = `cloud://env-test/flower-materials/${id}/${part}.svg`
      assets[part] = { fileId }
      fileContents.set(fileId, source)
    }
    records.set(id, { ...material, assets })
  }
  const cloudApi = {
    database: () => ({
      collection: name => {
        assert.equal(name, 'flower-material-assets')
        return { doc: id => ({ get: async () => ({ data: records.has(id) ? [records.get(id)] : [] }) }) }
      },
    }),
    downloadFile: async ({ fileID }) => {
      downloads.push(fileID)
      return { fileContent: Buffer.from(fileContents.get(fileID), 'utf8') }
    },
  }
  class TestResvg {
    constructor(svg) { submittedSvg = svg }
    render() {
      return { width: 698, height: 1000, asPng: () => Buffer.from('png'), free() {} }
    }
    free() {}
  }
  const object = loadCloudObject({ initWasm: async () => {}, Resvg: TestResvg }, { uniCloud: cloudApi })
  const context = { getUniIdToken() {} }
  await object._before.call(context)

  const result = await object.renderArtwork.call(context, { artwork: complex.artwork })
  assert.equal(result.width, 698)
  assert.equal(result.height, 1000)
  const referencedMaterials = new Set([
    ...complex.artwork.stems.map(stem => `${stem.materialId}:${stem.materialRevision}`),
    `${complex.artwork.vaseMaterialId}:${complex.artwork.vaseMaterialRevision}`,
    `${complex.artwork.backgroundMaterialId}:${complex.artwork.backgroundMaterialRevision}`,
  ])
  assert.equal(result.assetCount, referencedMaterials.size)
  assert.ok(downloads.length > 0)
  assert.ok(downloads.every(fileId => fileId.startsWith('cloud://env-test/flower-materials/')))
  assert.match(submittedSvg, /width="698" height="1000"/)
  assert.match(submittedSvg, /translate\(\d+ 680\) rotate\(/)
  assert.match(submittedSvg, /<circle[^>]*fill="#/)
  assert.match(submittedSvg, /#eee7db/)
  assert.doesNotMatch(submittedSvg, /__COLOR__/)
  const staleArtwork = structuredClone(complex.artwork)
  staleArtwork.stems[0].materialRevision = 'f'.repeat(16)
  await assert.rejects(object.renderArtwork.call(context, { artwork: staleArtwork }), /不存在或版本已变化/)
})

test('云存储下载未返回 fileContent 时报告素材下载失败', async () => {
  const material = complex.prepared.get('daisy')
  const record = {
    ...material,
    assets: { flower: { fileId: 'cloud://env-test/flower-materials/daisy/flower.svg' } },
  }
  const object = loadCloudObject({ initWasm: async () => {}, Resvg: class {} }, {
    uniCloud: {
      database: () => ({
        collection: () => ({ doc: () => ({ get: async () => ({ data: [record] }) }) }),
      }),
      downloadFile: async () => ({ requestId: 'download-request' }),
    },
  })
  await object._before.call({ getUniIdToken() {} })
  const artwork = {
    version: 2,
    vase: '陶瓶',
    background: 'warm',
    stems: [{ id: 1, x: 350, angle: 0, flowerScale: 1, stemHeight: 300, color: '#f1e5bd', materialId: 'daisy', materialRevision: revision }],
  }
  await assert.rejects(object.renderArtwork.call({}, { artwork }), /雏菊的云文件下载失败/)
})

test('云端 WASM 直接栅格化客户端准备的完整 SVG', async (context) => {
  let resvgPath
  try {
    resvgPath = require.resolve('@resvg/resvg-wasm', { paths: [cloudFunctionDir] })
  }
  catch {
    context.skip('安装 flower-render-test 云函数依赖后执行 PNG 栅格化集成测试')
    return
  }

  const wasm = require(resvgPath)
  const object = loadCloudObject(wasm)
  const ctx = { getUniIdToken() {} }
  await object._before.call(ctx)

  const result = await object.render.call(ctx, { svg: complex.svg })
  const png = Buffer.from(result.pngBase64, 'base64')

  assert.equal(result.width, 698)
  assert.equal(result.height, 1000)
  assert.equal(result.renderMs >= 0, true)
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(result.pngBytes, png.length)
  assert.equal(png.readUInt32BE(16), 698)
  assert.equal(png.readUInt32BE(20), 1000)

  const secondObject = loadCloudObject(wasm)
  const secondContext = { getUniIdToken() {} }
  await secondObject._before.call(secondContext)
  const secondResult = await secondObject.render.call(secondContext, { svg: complex.svg })
  assert.equal(secondResult.width, 698)
  assert.equal(secondResult.height, 1000)
  assert.equal(Buffer.from(secondResult.pngBase64, 'base64').subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
})

test('云端 SVG 入口拒绝外部资源、主动内容和非目标尺寸', async () => {
  const cloudModule = { exports: {} }
  const fakeResvg = function () {}
  fakeResvg.prototype.render = function () { throw new Error('不应启动图像解析') }
  const cloudRequire = (name) => {
    if (name === 'auth')
      return async () => ({ uid: 'test-user' })
    if (name === '@resvg/resvg-wasm')
      return { initWasm: async () => {}, Resvg: fakeResvg }
    if (name === 'node:fs')
      return { readFileSync: () => Buffer.from('wasm') }
    return require(name)
  }
  cloudRequire.resolve = () => '/tmp/mock-wasm'
  const cloudModulePath = path.join(cloudFunctionDir, 'index.obj.js')
  vm.runInNewContext(fs.readFileSync(cloudModulePath, 'utf8'), {
    module: cloudModule,
    exports: cloudModule.exports,
    require: cloudRequire,
    Buffer,
    Date,
    fs: { readFileSync: () => Buffer.from('wasm') },
  })
  const ctx = { getUniIdToken() {} }
  await cloudModule.exports._before.call(ctx)

  await assert.rejects(cloudModule.exports.render.call(ctx, { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000"><script>alert(1)</script></svg>' }), /SVG 无效/)
  await assert.rejects(cloudModule.exports.render.call(ctx, { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000"><image href="https:\/\/example.com/a.svg"/></svg>' }), /SVG 无效/)
  await assert.rejects(cloudModule.exports.render.call(ctx, { svg: complex.svg.replace('width="698"', 'width="100"') }), /SVG 无效/)
})

test('云端 SVG 入口允许超过 1 MiB 的作品并拒绝超过上限的输入', async () => {
  let renderedSvg = ''
  class CaptureResvg {
    constructor(svg) { renderedSvg = svg }
    render() {
      return { width: 698, height: 1000, asPng: () => Buffer.from('png'), free() {} }
    }
    free() {}
  }
  const object = loadCloudObject({ initWasm: async () => {}, Resvg: CaptureResvg })
  const context = { getUniIdToken() {} }
  await object._before.call(context)

  const largeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000">${' '.repeat(1024 * 1024 + 1)}</svg>`
  const result = await object.render.call(context, { svg: largeSvg })
  assert.equal(renderedSvg, largeSvg)
  assert.equal(result.width, 698)
  assert.equal(result.height, 1000)

  const oversizedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000">${' '.repeat(8 * 1024 * 1024)}</svg>`
  await assert.rejects(object.render.call(context, { svg: oversizedSvg }), /SVG 无效/)
})
