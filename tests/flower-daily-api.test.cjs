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
