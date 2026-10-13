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
