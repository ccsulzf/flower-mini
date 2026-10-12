const test = require('node:test'), assert = require('node:assert/strict'), { createLoader } = require('./helpers/load-ts.cjs');
test('作品 store 等待鉴权，保存使用缩略图并连续更新同一编号', async () => { const calls = [], id = 'a'.repeat(32); let revision = 0; const draft = { version: 1, artwork: { version: 2, vase: '陶瓶', background: 'warm', stems: [] }, card: { blessing: '', signature: '' }, updatedAt: 1 }; const cloud = { list: async (input) => { calls.push(['list', input]); return { items: [], hasMore: false }; }, save: async (input) => { calls.push(['save', input]); return { id, title: input.title, revision: ++revision, draft: { ...draft, workId: id, workRevision: revision }, thumbnailFileId: 'file', updatedAt: 1, createdAt: 1 }; }, remove: async (input) => calls.push(['remove', input]) }; const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid: 'alice' }), importObject: (name, options) => { assert.equal(name, 'flower-works'); assert.equal(options.customUI, true); return cloud; } }, wx: { getFileSystemManager: () => ({ readFile: a => a.success({ data: 'pngbase64' }) }) } }); const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore(); const pending = store.load(); await new Promise(r => setImmediate(r)); assert.equal(calls.length, 0); loader.load('src/utils/appAuth.ts').markAppAuthReady(); await pending; const first = await store.save({ draft, title: '花', imagePath: '/small.png' }); await store.save({ draft, title: '改名', imagePath: '/small.png', workId: first.id, expectedRevision: first.revision }); assert.equal(store.items.length, 1); assert.equal(calls.at(-1)[1].id, id); assert.equal(calls.at(-1)[1].expectedRevision, 1); assert.ok(!('uid' in calls.at(-1)[1])); await store.remove(id, 2); assert.equal(store.items.length, 0); });
test('列表分页去重排序，切换账号后清掉旧列表，失败可重试', async () => {
    let uid = 'a', failed = false;
    const calls = [], draft = { version: 1, artwork: { version: 2, vase: '陶瓶', background: 'warm', stems: [] }, card: { blessing: '', signature: '' }, updatedAt: 1 };
    const row = (id, time) => ({ id: id.repeat(32), title: '花', revision: 1, createdAt: 1, updatedAt: time, thumbnailFileId: '', draft });
    const cloud = { async list(input) {
            calls.push({ ...input, owner: uid });
            if (failed)
                throw { errMsg: '网络失败' };
            return uid === 'b' ? { items: [row('b', 20)], hasMore: false }
                : input.page === 1 ? { items: [row('c', 3), row('a', 5)], hasMore: true }
                    : { items: [row('a', 5), row('d', 1)], hasMore: false };
        } };
    const loader = createLoader({ uniCloud: { getCurrentUserInfo: () => ({ uid }), importObject: () => cloud } });
    loader.load('src/utils/appAuth.ts').markAppAuthReady();
    const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore();
    await store.load(true);
    await store.load();
    assert.deepEqual(Array.from(store.items, r => r.id[0]), ['a', 'c', 'd']);
    assert.deepEqual(calls.map(r => r.page), [1, 2]);
    uid = 'b';
    await store.load(true);
    assert.deepEqual(Array.from(store.items, r => r.id[0]), ['b']);
    failed = true;
    await store.load(true);
    assert.match(store.error, /网络失败/);
    assert.equal(store.items.length, 1);
    failed = false;
    await store.load(true);
    assert.equal(store.error, '');
});

test('列表复制保存新编号并保留原作，图片失败或账号切换时不创建副本', async () => {
  for (const mode of ['success', 'download-failure', 'account-change']) {
    let uid = 'alice'
    const calls = []
    const draft = { version: 1, artwork: { version: 2, vase: '陶瓶', background: 'sage', stems: [] }, card: { blessing: '你好', signature: '小花' }, updatedAt: 1 }
    const original = { id: 'a'.repeat(32), title: '花'.repeat(40), revision: 3, draft, thumbnailFileId: 'old.png', thumbnailUrl: 'https://example.com/old.png', createdAt: 1, updatedAt: 1 }
    const cloud = { get: async () => original, save: async input => { calls.push(input); return { ...original, id: 'b'.repeat(32), title: input.title, revision: 1, createdAt: 2, updatedAt: 2 } } }
    const loader = createLoader({ uni: { downloadFile: value => { if (mode === 'download-failure') value.fail(Error('图片失败')); else { if (mode === 'account-change') uid = 'bob'; value.success({ statusCode: 200, tempFilePath: '/old.png' }) } } }, uniCloud: { getCurrentUserInfo: () => ({ uid }), importObject: () => cloud }, wx: { getFileSystemManager: () => ({ readFile: value => value.success({ data: 'base64-image' }) }) } })
    loader.load('src/utils/appAuth.ts').markAppAuthReady()
    const store = loader.load('src/stores/flowerWorksStore.ts').useFlowerWorksStore()
    // 先建立账号上下文，再放入列表中的原作品。
    await store.get(original.id)
    store.items = [original]
    if (mode === 'success') {
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
    }
    else {
      await assert.rejects(store.duplicate(original.id))
      assert.equal(calls.length, 0)
      assert.equal(store.items.length, 1)
    }
    assert.equal(store.saving, false)
  }
})
