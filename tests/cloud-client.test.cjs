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
