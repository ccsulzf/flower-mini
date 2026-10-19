const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')

function loadCloudResponse() {
  return createLoader().load('src/api/cloud-response.ts')
}

test('只解包 code 0 且显式包含 data 的标准响应', () => {
  const { unwrapCloudResponse } = loadCloudResponse()
  assert.deepEqual(unwrapCloudResponse({ code: 0, data: { ok: true } }), { ok: true })
  assert.equal(unwrapCloudResponse({ code: 0, data: null }), null)
  assert.equal(unwrapCloudResponse({ code: 0, data: undefined }), undefined)
  assert.throws(() => unwrapCloudResponse({ code: 0 }), /响应数据无效/)
  assert.throws(() => unwrapCloudResponse({ items: [] }), /响应协议无效/)
})

test('云端错误转换后保留稳定错误码和用户消息', () => {
  const { CloudApiError, toCloudApiError } = loadCloudResponse()
  const cause = { errCode: 'AUTH_REQUIRED', errMsg: '登录已失效' }
  const error = toCloudApiError(cause)
  assert.equal(error instanceof CloudApiError, true)
  assert.equal(error.code, 'AUTH_REQUIRED')
  assert.equal(error.message, '登录已失效')
  assert.equal(error.cause, cause)
})

function cloudClientFixture(handler) {
  const calls = { waits: 0, logins: [], imports: [], methods: 0 }
  const loader = createLoader({
    modules: {
      '@/utils/appAuth': {
        waitForAppAuthReady: async () => { calls.waits++ },
        initializeAppAuth: async force => { calls.logins.push(force) },
      },
    },
    uniCloud: {
      importObject: (name, config) => {
        calls.imports.push({ name, config })
        return {
          fetch: async (payload) => {
            calls.methods++
            return handler({ attempt: calls.methods, payload })
          },
        }
      },
    },
  })
  return { calls, callCloud: loader.load('src/api/cloud-client.ts').callCloud }
}

test('公共读取不等待鉴权并统一使用 customUI', async () => {
  const fixture = cloudClientFixture(({ payload }) => ({ code: 0, data: payload }))
  const result = await fixture.callCloud({
    object: 'flower-daily', method: 'fetch', auth: 'public', operation: 'read', payload: { date: '2026-10-19' },
  })
  assert.deepEqual(result, { date: '2026-10-19' })
  assert.equal(fixture.calls.waits, 0)
  assert.equal(fixture.calls.imports.length, 1)
  assert.equal(fixture.calls.imports[0].name, 'flower-daily')
  assert.equal(fixture.calls.imports[0].config.customUI, true)
})

test('登录读取遇到 AUTH_REQUIRED 只强制登录并重试一次', async () => {
  const fixture = cloudClientFixture(({ attempt }) => {
    if (attempt === 1) throw { errCode: 'AUTH_REQUIRED', errMsg: '登录失效' }
    return { code: 0, data: 'ok' }
  })
  assert.equal(await fixture.callCloud({
    object: 'flower-works', method: 'fetch', auth: 'authenticated', operation: 'read', payload: {},
  }), 'ok')
  assert.equal(fixture.calls.waits, 1)
  assert.deepEqual(fixture.calls.logins, [true])
  assert.equal(fixture.calls.methods, 2)
})

test('写请求遇到 AUTH_REQUIRED 不自动重试', async () => {
  const fixture = cloudClientFixture(() => { throw { errCode: 'AUTH_REQUIRED', errMsg: '登录失效' } })
  await assert.rejects(fixture.callCloud({
    object: 'flower-works', method: 'fetch', auth: 'authenticated', operation: 'write', payload: {},
  }), error => error.code === 'AUTH_REQUIRED')
  assert.deepEqual(fixture.calls.logins, [])
  assert.equal(fixture.calls.methods, 1)
})

test('不存在的云对象方法被转换为 CloudApiError', async () => {
  const loader = createLoader({
    modules: { '@/utils/appAuth': { waitForAppAuthReady: async () => {}, initializeAppAuth: async () => {} } },
    uniCloud: { importObject: () => ({}) },
  })
  const { callCloud } = loader.load('src/api/cloud-client.ts')
  await assert.rejects(callCloud({
    object: 'flower-daily', method: 'missing', auth: 'public', operation: 'read', payload: {},
  }), error => error.code === 'CLIENT_METHOD_MISSING')
})
