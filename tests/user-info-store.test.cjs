const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')

test('用户信息 store 只维护 uid，并等待认证初始化后读取当前身份', async () => {
  let uid = 'alice'
  const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid }) } })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/stores/userInfoStore.ts').useUserInfoStore()
  assert.equal(await store.requireUid(), 'alice')
  assert.equal(store.uid, 'alice')
  assert.equal(store.isLoggedIn, true)
  assert.equal(Object.keys(store.$state).sort().join(','), 'loading,uid')
  uid = 'bob'
  assert.equal(await store.refresh(), 'bob')
  assert.equal(store.uid, 'bob')
})

test('用户信息 store 对未登录状态显式报错', async () => {
  const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid: '' }) } })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/stores/userInfoStore.ts').useUserInfoStore()
  await assert.rejects(store.requireUid('请先登录后查看作品'), /请先登录后查看作品/)
})
