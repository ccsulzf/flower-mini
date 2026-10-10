const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const { createLoader } = require('./helpers/load-ts.cjs')
const rows = require('../uniCloud-alipay/cloudfunctions/flower-catalog/catalog.json')
function cloudObject(identity) {
  const module = { exports: {} }
  const fixtures = [{ id: 'rose', name: '玫瑰', assets: { flower: { fileId: 'cloud:flower', hash: 'a'.repeat(40) } } }]
  vm.runInNewContext(fs.readFileSync('uniCloud-alipay/cloudfunctions/flower-catalog/index.obj.js', 'utf8'), {
    module, uniCloud: { database: () => ({ collection: name => { assert.equal(name, 'flower-material-assets'); return { orderBy: () => ({ skip: () => ({ limit: () => ({ get: async () => ({ data: fixtures.map(row => ({ ...row })) }) }) }) }) } } }), getTempFileURL: async () => ({ fileList: [{ fileID: 'cloud:flower', tempFileURL: 'https://test/flower' }] }) }, require: () => ({ createInstance: () => ({ checkToken: async () => identity || { errCode: 1 } }) })
  })
  module.exports.getUniIdToken = () => 'token'
  return module.exports
}
test('云目录拒绝未登录；查询档案集合，返回文件下载地址且不污染原数据', async () => {
  await assert.rejects(cloudObject(null)._before(), error => error.errCode === 'AUTH_REQUIRED')
  const cloud = cloudObject({ errCode: 0, uid: 'server-user' }); await cloud._before()
  const result = await cloud.list(); assert.equal(result.version, 2)
  assert.equal(result.items[0].assets.flower.url, 'https://test/flower')
  result.items[0].name = 'changed'; assert.equal((await cloud.list()).items[0].name, '玫瑰')
})
test('客户端解析云目录，拒绝未知花材、重复数据和非法尺寸', () => {
  const parse = createLoader().load('src/utils/flower/catalog.ts').parseFlowerCatalog
  assert.equal(parse({ version: 1, items: rows }).length, 6)
  for (const items of [[{ ...rows[0], kind: 'unknown' }], [rows[0], rows[0]], [{ ...rows[0], height: NaN }]]) {
    assert.throws(() => parse({ version: 1, items }), /无效/)
  }
})
test('store 等待登录，再调用鉴权云对象；重复点击不重复请求，失败可重试', async () => {
  let calls = 0, release, fail = false
  const loader = createLoader({ uniCloud: { importObject: (name, options) => {
    assert.equal(name, 'flower-catalog'); assert.equal(options.customUI, true)
    return { list: async () => { calls++; if (fail) throw { errMsg: '云对象未部署' }; await new Promise(resolve => { release = resolve }); return { version: 1, items: rows } } }
  } } })
  const auth = loader.load('src/utils/appAuth.ts')
  const store = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  const work = store.load()
  assert.equal(store.load(), work)
  assert.equal(calls, 0)
  auth.markAppAuthReady()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 1)
  release(); await work
  assert.equal(store.loaded, true); assert.equal(store.items.length, 6)
  fail = true; await store.load()
  assert.equal(store.loaded, true); assert.equal(store.items.length, 6)
  assert.match(store.error, /未部署/)
  fail = false; const retry = store.load()
  await new Promise(resolve => setImmediate(resolve))
  release(); await retry
  assert.equal(store.loaded, true)
})

test('启动预加载合并请求，暂时失败自动重试，完成后不重复读取目录', async () => {
  let calls = 0
  const loader = createLoader({ uniCloud: { importObject: () => ({ list: async () => {
    calls++; if (calls === 1) throw new Error('temporary failure')
    return { version: 2, items: [] }
  } }) } })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  const work = store.preload()
  assert.equal(store.preload(), work)
  await work
  assert.equal(calls, 2)
  assert.equal(store.ready, true)
  assert.equal(store.preparing, false)
  assert.equal(store.error, '')
  await store.preload()
  assert.equal(calls, 2)
})
