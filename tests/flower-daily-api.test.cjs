const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')

const artwork = {
  version: 2,
  vase: '陶瓶',
  background: 'sage',
  stems: [{
    id: 1,
    kind: 'rose',
    x: 350,
    y: 747,
    angle: 0,
    flowerScale: 1,
    stemHeight: 260,
    color: '#b82b36',
  }],
}

function record(overrides = {}) {
  return {
    date: '2026-10-19',
    description: '秋日花束',
    artwork,
    imageFileId: 'cloud://space/daily-flower/2026-10-19/flower.png',
    imageUrl: 'https://example.com/flower.png',
    ...overrides,
  }
}

function fixture(resolver) {
  const calls = []
  const loader = createLoader({
    modules: {
      '@/api/cloud-client': {
        callCloud: async options => {
          calls.push(options)
          return resolver(options)
        },
      },
    },
  })
  return { api: loader.load('src/api/flower-daily.ts'), calls }
}

test('按日期读取并验证每日花束记录', async () => {
  const { api, calls } = fixture(() => ({ flower: record() }))
  const result = await api.getDailyFlowerByDate('2026-10-19')
  assert.equal(result.date, '2026-10-19')
  assert.equal(result.description, '秋日花束')
  assert.equal(result.artwork.stems.length, 1)
  assert.equal(result.imageUrl, 'https://example.com/flower.png')
  assert.equal(calls[0].auth, 'public')
  assert.equal(calls[0].operation, 'read')
})

test('云端 flower 为 null 时返回 null', async () => {
  const { api } = fixture(() => ({ flower: null }))
  assert.equal(await api.getDailyFlowerByDate('2026-10-19'), null)
  assert.equal(await api.getDailyFlowerArtwork('2026-10-19'), null)
})

test('拒绝日期不一致、非 HTTPS 图片和损坏 artwork', async () => {
  const mismatched = fixture(() => ({ flower: record({ date: '2026-10-18' }) }))
  await assert.rejects(mismatched.api.getDailyFlowerByDate('2026-10-19'), /记录无效/)

  const insecure = fixture(() => ({ flower: record({ imageUrl: 'http://example.com/flower.png' }) }))
  await assert.rejects(insecure.api.getDailyFlowerByDate('2026-10-19'), /记录无效/)

  const broken = fixture(() => ({ flower: record({ artwork: { version: 2, stems: [] } }) }))
  await assert.rejects(broken.api.getDailyFlowerByDate('2026-10-19'))
})

test('历史 API 验证分页结果且不发送客户端日期上限', async () => {
  const { api, calls } = fixture(() => ({
    items: [{ date: '2026-10-19', description: '秋日花束' }],
    hasMore: false,
  }))
  const page = await api.listDailyFlowerHistory({ page: 2, pageSize: 20, date: '2026-10-19' })
  assert.equal(page.items[0].date, '2026-10-19')
  assert.equal(page.hasMore, false)
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)), { page: 2, pageSize: 20, date: '2026-10-19' })
  assert.equal('today' in calls[0].payload, false)
  assert.equal('beforeOrOn' in calls[0].payload, false)
})

test('历史 API 拒绝重复日期和损坏摘要', async () => {
  const duplicate = fixture(() => ({
    items: [
      { date: '2026-10-19', description: '第一束' },
      { date: '2026-10-19', description: '第二束' },
    ],
    hasMore: false,
  }))
  await assert.rejects(duplicate.api.listDailyFlowerHistory({ page: 1, pageSize: 20 }), /重复/)

  const broken = fixture(() => ({ items: [{ date: 'not-a-date', description: '' }], hasMore: false }))
  await assert.rejects(broken.api.listDailyFlowerHistory({ page: 1, pageSize: 20 }))
})

function imageCacheFixture(options = {}) {
  const storage = new Map(options.cached ? [[`daily-flower-image:v1:${options.cached.date}`, options.cached.value]] : [])
  const calls = { downloads: 0, saves: 0 }
  const uni = {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    downloadFile: ({ success, fail }) => {
      calls.downloads++
      if (options.downloadFailures && calls.downloads <= options.downloadFailures) return fail(new Error('network'))
      success({ statusCode: options.statusCode ?? 200, tempFilePath: '/tmp/download.png' })
    },
    saveFile: ({ success }) => {
      calls.saves++
      success({ savedFilePath: '/saved/flower.png' })
    },
  }
  const wx = options.withFileSystem === false
    ? undefined
    : { getFileSystemManager: () => ({ getFileInfo: ({ success, fail }) => options.fileExists ? success({}) : fail(new Error('missing')) }) }
  const loader = createLoader({ uni, wx })
  return {
    calls,
    storage,
    resolve: loader.load('src/utils/flower/daily-flower-image-cache.ts').resolveDailyFlowerImage,
  }
}

test('有效持久文件直接命中且不下载', async () => {
  const value = record()
  const fixture = imageCacheFixture({
    cached: { date: value.date, value: { imageFileId: value.imageFileId, imagePath: '/saved/cached.png' } },
    fileExists: true,
  })
  assert.equal(await fixture.resolve(value), '/saved/cached.png')
  assert.equal(fixture.calls.downloads, 0)
})

test('缓存路径对应文件已丢失时重新下载并保存', async () => {
  const value = record()
  const fixture = imageCacheFixture({
    cached: { date: value.date, value: { imageFileId: value.imageFileId, imagePath: '/saved/missing.png' } },
    fileExists: false,
  })
  assert.equal(await fixture.resolve(value), '/saved/flower.png')
  assert.equal(fixture.calls.downloads, 1)
  assert.equal(fixture.calls.saves, 1)
  assert.equal(fixture.storage.get(`daily-flower-image:v1:${value.date}`).imagePath, '/saved/flower.png')
})

test('下载最多尝试两次并拒绝非 200 响应', async () => {
  const failed = imageCacheFixture({ downloadFailures: 2 })
  await assert.rejects(failed.resolve(record()), /network/)
  assert.equal(failed.calls.downloads, 2)

  const badStatus = imageCacheFixture({ statusCode: 503 })
  await assert.rejects(badStatus.resolve(record()), /今日花束图片下载失败/)
  assert.equal(badStatus.calls.downloads <= 2, true)
  assert.equal(badStatus.calls.saves, 0)
})

test('文件系统 API 不存在时缓存视为未命中', async () => {
  const value = record()
  const fixture = imageCacheFixture({
    cached: { date: value.date, value: { imageFileId: value.imageFileId, imagePath: '/saved/cached.png' } },
    withFileSystem: false,
  })
  assert.equal(await fixture.resolve(value), '/saved/flower.png')
  assert.equal(fixture.calls.downloads, 1)
})
