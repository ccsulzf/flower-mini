const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')

function fixture(options = {}) {
  const storage = new Map(options.token ? [['uni_id_token', options.token]] : [])
  let loginCount = 0, tokenCount = 0
  const calls = []
  const auth = createLoader({ uni: {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    login: async args => { calls.push(args); if (options.codeError) throw options.codeError; return { code: options.noCode ? '' : 'wechat-code' } },
  }, uniCloud: { importObject: (name, config) => {
    assert.equal(config.customUI, true)
    if (name === 'token') return { checkToken: async () => { tokenCount++; return { valid: options.valid === true } } }
    assert.equal(name, 'uni-id-co')
    return { loginByWeixin: async ({ code }) => {
      loginCount++; assert.equal(code, 'wechat-code')
      if (options.error) throw options.error
      return options.result || { errCode: 0, newToken: { token: 'fresh-token', tokenExpired: 2000000000000 } }
    } }
  } } }).load('src/utils/appAuth.ts')
  return { auth, storage, calls, counts: () => ({ loginCount, tokenCount }) }
}

test('首次微信登录明确选择微信，保存 Token，并发调用只登录一次', async () => {
  const f = fixture()
  const one = f.auth.initializeAppAuth(), two = f.auth.initializeAppAuth()
  assert.equal(one, two)
  assert.equal((await one).hasNewLogin, true)
  await f.auth.waitForAppAuthReady()
  assert.equal(f.calls[0].provider, 'weixin')
  assert.equal(f.storage.get('uni_id_token'), 'fresh-token')
  assert.equal(f.storage.get('uni_id_token_expired'), 2000000000000)
  assert.equal(f.counts().loginCount, 1)
})

test('有效 Token 复用，失效 Token 重登，强制重试重新微信登录', async () => {
  const valid = fixture({ token: 'old', valid: true })
  assert.equal((await valid.auth.initializeAppAuth()).hasNewLogin, false)
  assert.deepEqual(valid.counts(), { loginCount: 0, tokenCount: 1 })
  await valid.auth.initializeAppAuth(true)
  assert.equal(valid.counts().loginCount, 1)
  const expired = fixture({ token: 'old' })
  assert.equal((await expired.auth.initializeAppAuth()).hasNewLogin, true)
  assert.equal(expired.storage.get('uni_id_token'), 'fresh-token')
})

test('微信凭证缺失、业务错误和无 Token 返回均不能标为已登录', async () => {
  for (const options of [{ noCode: true }, { result: { errCode: 'uni-id-error', errMsg: '微信配置未完成' } }, { result: { errCode: 0 } }, { error: { errCode: 'config-error', errMsg: '服务端配置错误' } }]) {
    const f = fixture(options)
    await assert.rejects(f.auth.initializeAppAuth())
    await assert.rejects(f.auth.waitForAppAuthReady())
    assert.equal(f.storage.has('uni_id_token'), false)
  }
  const f = fixture({ error: { errMsg: '服务端配置错误' } })
  await assert.rejects(f.auth.initializeAppAuth(), /服务端配置错误/)
})

test('启动前等待登录就绪不会丢失等待者，失败后可以重试', { timeout: 1000 }, async () => {
  const f = fixture()
  const ready = f.auth.waitForAppAuthReady()
  await f.auth.initializeAppAuth()
  await ready
  const options = { codeError: { errMsg: '微信登录失败' } }, failed = fixture(options)
  await assert.rejects(failed.auth.initializeAppAuth(), /微信登录失败/)
  options.codeError = null
  await failed.auth.initializeAppAuth(true)
  await failed.auth.waitForAppAuthReady()
})
