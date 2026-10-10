const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const test = require('node:test')
function load(result) {
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync('uniCloud-alipay/cloudfunctions/token/index.obj.js', 'utf8'), { module, require: name => {
    assert.equal(name, 'uni-id-common')
    return { createInstance: () => ({ checkToken: async token => { assert.equal(token, 'client-token'); return result } }) }
  } })
  return module.exports.checkToken
}
test('服务端校验 Token 并将续期信息按标准 newToken 返回', async () => {
  const check = load({ code: 0, errCode: 0, token: 'renewed', tokenExpired: 2000000000000 })
  const result = await check.call({ getUniIdToken: () => 'client-token' })
  assert.equal(result.valid, true)
  assert.equal(result.newToken.token, 'renewed')
  assert.equal(result.newToken.tokenExpired, 2000000000000)
})
test('无 Token 和失效 Token 返回未登录，不伪造续期 Token', async () => {
  const check = load({ errCode: 'uni-id-token-expired' })
  assert.equal((await check.call({ getUniIdToken: () => '' })).valid, false)
  const failed = await check.call({ getUniIdToken: () => 'client-token' })
  assert.equal(failed.valid, false)
  assert.equal(failed.newToken, undefined)
})
