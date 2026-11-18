const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const root = path.resolve(__dirname, '../../uniCloud-alipay/cloudfunctions/flower-generate')
const quota = require(path.join(root, 'quota.js'))

function createServer({ failure, invalid = false, used = 0 } = {}) {
  const owner = require('node:crypto').createHash('sha256').update('user').digest('hex')
  const day = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const slots = Array.from({ length: used }, (_, i) => ({ _id: `${owner}_${day}_${i + 1}` }))
  let requests = 0
  const collection = {
    orderBy() { return this }, skip() { return this }, limit() { return this },
    where(query) { return { limit() { return this }, async get() {
      return { data: query._id ? slots.filter(item => item._id === query._id) : slots }
    } } },
    async get() { return { data: [{ category: 'background' }, { category: 'vase' }, { category: 'flower' }] } },
    async add(record) {
      if (slots.some(item => item._id === record._id)) throw new Error('duplicate')
      slots.push(record)
    },
  }
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'index.obj.js'), 'utf8'), {
    module, process: { env: { DEEPSEEK_API_KEY: 'test' } }, console: { warn() {} },
    require(name) {
      if (name === 'auth') return async () => ({ uid: 'user' })
      if (name === './quota') return quota
      if (name === './generation') return {
        parsePrompt: () => '一束花', parseRecentBackgroundIds: () => [], describeCatalog: records => records,
        instructions: '', buildArtwork() {
          if (invalid) throw Object.assign(new Error('invalid catalog ID'), { code: 'MODEL_CATALOG_INVALID' })
          return { artwork: { materials: [{ materialId: 'rose' }] } }
        },
      }
      throw new Error(name)
    },
    uniCloud: { database: () => ({ collection: () => collection }), httpclient: { async request() {
      requests++
      if (failure) throw new Error('timeout')
      return { status: 200, data: { choices: [{ finish_reason: 'stop', message: { content: '{}' } }] } }
    } } },
  })
  return { api: module.exports, slots, get requests() { return requests } }
}

for (const options of [{ failure: true }, { invalid: true }]) {
  test(`failed generation does not consume quota: ${JSON.stringify(options)}`, async () => {
    const state = createServer(options)
    await assert.rejects(state.api.generate.call({ auth: { uid: 'user' } }, {}))
    assert.equal(state.slots.length, 0)
  })
}
test('successful generation consumes one quota slot', async () => {
  const state = createServer()
  const result = await state.api.generate.call({ auth: { uid: 'user' } }, {})
  assert.equal(result.code, 0)
  assert.equal(state.slots.length, 1)
})
test('exhausted quota rejects before requesting the model', async () => {
  const state = createServer({ used: 3 })
  await assert.rejects(state.api.generate.call({ auth: { uid: 'user' } }, {}), error => error.errCode === 'DAILY_LIMIT_REACHED')
  assert.equal(state.requests, 0)
})

const ts = require('typescript')
function client(failure) {
  const module = { exports: {} }
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/api/flower-generate.ts'), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module, exports: module.exports, Error,
    require: () => ({ callCloud: async () => { throw failure } }),
  })
  return module.exports
}
test('generation hides infrastructure errors from users', async () => {
  await assert.rejects(client(new Error('云函数执行失败')).generateFlower('花'),
    error => !error.message.includes('云函数') && error.message.includes('稍后重试'))
})
test('generation preserves the daily limit explanation', async () => {
  const failure = Object.assign(new Error('今日额度已用完'), { code: 'DAILY_LIMIT_REACHED' })
  await assert.rejects(client(failure).generateFlower('花'), error => error === failure)
})

test('concurrent successful generations cannot exceed the last daily slot', async () => {
  const state = createServer({ used: 2 })
  const context = { auth: { uid: 'user' } }
  const results = await Promise.allSettled([
    state.api.generate.call(context, {}), state.api.generate.call(context, {}),
  ])
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1)
  assert.equal(results.find(item => item.status === 'rejected').reason.errCode, 'DAILY_LIMIT_REACHED')
  assert.equal(state.slots.length, 3)
})
