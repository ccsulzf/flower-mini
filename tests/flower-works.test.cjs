const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');
test('作品保存只提交作品数据，不为后台缩略图读取或生成图片', async () => { const calls = [], id = 'a'.repeat(32); let revision = 0; const draft = { version: 1, artwork: { version: 2, vase: '陶瓶', background: 'warm', stems: [] }, card: { blessing: '', signature: '' }, updatedAt: 1 }; const cloud = { list: async (input) => { calls.push(['list', input]); return { items: [], hasMore: false }; }, save: async (input) => { calls.push(['save', input]); return { id, title: input.title, description: input.description, revision: ++revision, draft: { ...draft, workId: id, workRevision: revision }, updatedAt: 1, createdAt: 1 }; }, remove: async (input) => calls.push(['remove', input]) }; const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }), importObject: (name, options) => { assert.equal(name, 'flower-works'); assert.equal(options.customUI, true); return cloud; } }, wx: { getFileSystemManager: () => ({ readFile: () => { throw new Error('Should not read an image') } }) } }); const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore(); const pending = store.load(); await new Promise(r => setImmediate(r)); assert.equal(calls.length, 0); loader.load('src/utils/appAuth.ts').markAppAuthReady(); await pending; const first = await store.save({ draft, title: '花', description: '介绍' }); await store.save({ draft, title: '改名', description: '新介绍', workId: first.id, expectedRevision: first.revision }); assert.equal(calls.at(-1)[1].description, '新介绍'); assert.ok(!('thumbnailBase64' in calls.at(-1)[1])); assert.equal(store.items.length, 1); assert.equal(calls.at(-1)[1].id, id); assert.equal(calls.at(-1)[1].expectedRevision, 1); assert.ok(!('uid' in calls.at(-1)[1])); await store.remove(id, 2); assert.equal(store.items.length, 0); });

test('作品 store 不会将 uniCloud 云对象当作 thenable Promise 返回', async () => {
  let thenCalls = 0
  const cloud = {
    then(_resolve, reject) {
      thenCalls++
      reject(new Error('Method[then] was not found'))
    },
    async list() {
      return { items: [], hasMore: false }
    },
  }
  const loader = createLoader({
    uniCloud: {
      getCurrentUserInfo: () => ({ uid: 'alice' }),
      importObject: () => cloud,
    },
  })

  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()

  await store.load(true)

  assert.equal(thenCalls, 0)
  assert.equal(store.error, '')
  assert.deepEqual(Array.from(store.items), [])
})

test('删除作品成功后清除作品图与贺卡图缓存，删除失败时保留缓存', async () => {
  const id = 'a'.repeat(32)
  const scope = `work:${id}`
  const removedFiles = []
  let fail = true
  const loader = createLoader({
    uniCloud: {
      getCurrentUserInfo: () => ({ uid: 'alice' }),
      importObject: () => ({
        async remove() {
          if (fail)
            throw new Error('删除失败')
        },
      }),
    },
    wx: {
      env: { USER_DATA_PATH: '/user' },
      getFileSystemManager: () => ({ unlink: args => removedFiles.push(args.filePath) }),
    },
  })
  const cache = loader.load('src/utils/flower/image-cache.ts')
  cache.writeImageCache(`${scope}:artwork:signature`, '/user/flower-cloud-art.png')
  cache.writeImageCache(`${scope}:card:signature`, '/user/flower-cloud-card.png')
  cache.writeImageCache('work:other:artwork:signature', '/user/flower-cloud-other.png')
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()

  await assert.rejects(store.remove(id, 1), /删除失败/)
  assert.equal(cache.readImageCache(`${scope}:artwork:signature`), '/user/flower-cloud-art.png')
  fail = false
  await store.remove(id, 1)
  assert.deepEqual(removedFiles.sort(), ['/user/flower-cloud-art.png', '/user/flower-cloud-card.png'])
  assert.equal(cache.readImageCache(`${scope}:card:signature`), '')
  assert.equal(cache.readImageCache(`${scope}:artwork:signature`), '')
  assert.equal(cache.readImageCache('work:other:artwork:signature'), '/user/flower-cloud-other.png')
})

test('作品列表分页去重排序，重载清空分页，失败可重试', async () => {
  let failed = false
  const calls = []
  const draft = { version: 1, artwork: { version: 2, vase: '陶瓶', background: 'warm', stems: [] }, card: { blessing: '', signature: '' }, updatedAt: 1 }
  const row = (id, time) => ({ id: id.repeat(32), title: '花', revision: 1, createdAt: 1, updatedAt: time, thumbnailFileId: '', draft })
  const cloud = { async list(input) {
    calls.push(input)
    if (failed)
      throw { errMsg: '网络失败' }
    return input.page === 1 ? { items: [row('c', 3), row('a', 5)], hasMore: true }
      : { items: [row('a', 5), row('d', 1)], hasMore: false }
  } }
  const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }), importObject: () => cloud } })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
  await store.load(true)
  await store.load()
  assert.deepEqual(Array.from(store.items, r => r.id[0]), ['a', 'c', 'd'])
  assert.deepEqual(calls.map(r => r.page), [1, 2])
  await store.load(true)
  assert.equal(calls.at(-1).page, 1)
  assert.deepEqual(Array.from(store.items, r => r.id[0]), ['a', 'c'])
  failed = true
  await store.load(true)
  assert.match(store.error, /网络失败/)
  assert.equal(store.items.length, 2)
  failed = false
  await store.load(true)
  assert.equal(store.error, '')
})

test('列表复制只复制作品数据，不依赖缩略图下载', async () => {
    const calls = []
    const draft = { version: 1, artwork: { version: 2, vase: '陶瓶', background: 'sage', stems: [] }, card: { blessing: '你好', signature: '小花' }, updatedAt: 1 }
    const original = { id: 'a'.repeat(32), title: '花'.repeat(40), revision: 3, draft, thumbnailFileId: 'old.png', thumbnailUrl: 'https://example.com/old.png', createdAt: 1, updatedAt: 1 }
    const cloud = { get: async () => original, save: async input => { calls.push(input); return { ...original, id: 'b'.repeat(32), title: input.title, revision: 1, createdAt: 2, updatedAt: 2 } } }
    const loader = createLoader({ uni: { downloadFile: () => { throw new Error('Should not download an image') } }, uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }), importObject: () => cloud }, wx: { getFileSystemManager: () => ({ readFile: () => { throw new Error('Should not read an image') } }) } })
    loader.load('src/utils/appAuth.ts').markAppAuthReady()
    const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
    await store.get(original.id)
    store.items = [original]
    const copied = await store.duplicate(original.id)
    assert.notEqual(copied.id, original.id)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].id, undefined)
    assert.equal(calls[0].expectedRevision, undefined)
    assert.equal(calls[0].title.length, 40)
    assert.ok(calls[0].title.endsWith(' 副本'))
    assert.equal(calls[0].artwork.background, 'sage')
    assert.equal(calls[0].card.blessing, '你好')
    assert.deepEqual(Array.from(store.items, row => row.id[0]), ['b', 'a'])
    assert.equal(store.items[1].revision, 3)
    assert.equal(store.saving, false)
})
