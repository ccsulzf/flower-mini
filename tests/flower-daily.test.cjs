const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const vm = require('node:vm')
const dailyFlower = require('../uniCloud-alipay/cloudfunctions/common/daily-flower')
const { createLoader } = require('./helpers/load-ts.cjs')

const source = fs.readFileSync('uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js', 'utf8')

function setupCloud(options = {}) {
  const record = options.record || null
  const module = { exports: {} }
  let requestedFileIDs = []
  const rows = options.records || (record ? [record] : [])
  vm.runInNewContext(source, {
    module,
    Date: options.Date || Date,
    require: (name) => {
      if (name === 'daily-flower')
        return dailyFlower
      throw new Error(`Unexpected dependency ${name}`)
    },
    uniCloud: {
      database: () => ({
        command: { lte: value => ({ lte: value }) },
        collection: (name) => {
          assert.equal(name, 'daily-flower')
          return {
            doc: (date) => {
              assert.match(date, /^\d{4}-\d{2}-\d{2}$/)
              const matched = record || rows.find(item => item._id === date)
              return { get: async () => ({ data: matched ? [matched] : [] }) }
            },
            where: (filter) => {
              const today = options.date || '2026-10-14'
              assert.equal(filter._id.lte, today)
              let skip = 0
              let limit = rows.length
              const query = {
                orderBy: () => query,
                skip: (value) => { skip = value; return query },
                limit: (value) => { limit = value; return query },
                get: async () => ({
                  data: rows
                    .filter(item => item._id <= today)
                    .sort((a, b) => b._id.localeCompare(a._id))
                    .slice(skip, skip + limit),
                }),
              }
              return query
            },
          }
        },
      }),
      getTempFileURL: async ({ fileList }) => {
        requestedFileIDs = fileList
        return { fileList: fileList.map(fileID => ({ fileID, tempFileURL: 'https://example.com/daily-flower.png' })) }
      },
    },
  })
  const cloud = module.exports
  return { cloud, requestedFileIDs: () => requestedFileIDs }
}

function sampleRecord(overrides = {}) {
  return {
    _id: '2026-10-14',
    date: '2026-10-14',
    description: '秋日花束',
    artwork: {
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
    },
    imageFileId: 'cloud://space/daily-flower/2026-10-14/flower.png',
    updatedBy: 'private-user-id',
    ...overrides,
  }
}

test('每日花束读取接口公开可读，不要求登录', async () => {
  const publicUser = setupCloud({ record: sampleRecord() })
  const result = await publicUser.cloud.getByDate({ date: '2026-10-14' })
  assert.equal(result.code, 0)
  assert.equal(result.data.flower.description, '秋日花束')
  assert.equal(result.data.flower.imageUrl, 'https://example.com/daily-flower.png')
  assert.equal(result.data.flower.updatedBy, undefined)
  assert.equal(publicUser.requestedFileIDs().join(','), sampleRecord().imageFileId)
})

test('按日期读取花束 JSON 不请求图片 URL', async () => {
  const publicUser = setupCloud({ record: sampleRecord() })
  const result = await publicUser.cloud.getArtwork({ date: '2026-10-14' })
  assert.equal(result.code, 0)
  assert.equal(result.data.flower.description, '秋日花束')
  assert.equal(result.data.flower.artwork.stems.length, 1)
  assert.deepEqual(publicUser.requestedFileIDs(), [])
  assert.equal((await setupCloud().cloud.getArtwork({ date: '2026-10-14' })).data.flower, null)
})

test('今日花束未发布返回空结果，坏记录和查询日期被拒绝', async () => {
  const empty = setupCloud()
  assert.equal((await empty.cloud.getByDate({ date: '2026-10-14' })).data.flower, null)

  const badDate = setupCloud()
  await assert.rejects(badDate.cloud.getByDate({ date: '2026-02-30' }), error => error.errCode === 'INVALID_DAILY_FLOWER')

  const badImage = setupCloud({ record: sampleRecord({ imageFileId: 'cloud://space/other/flower.png' }) })
  await assert.rejects(badImage.cloud.getByDate({ date: '2026-10-14' }), error => error.errCode === 'INVALID_DAILY_FLOWER')
})

test('历史列表只返回今天及以前的公开花束，并支持分页', async () => {
  const newest = sampleRecord()
  const older = sampleRecord({
    _id: '2026-10-13',
    date: '2026-10-13',
    imageFileId: 'cloud://space/daily-flower/2026-10-13/flower.png',
  })
  const future = sampleRecord({
    _id: '2026-10-15',
    date: '2026-10-15',
    imageFileId: 'cloud://space/daily-flower/2026-10-15/flower.png',
  })
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-14T03:00:00.000Z'])) }
  }
  const { cloud } = setupCloud({ records: [older, future, newest], date: '2026-10-14', Date: FixedDate })
  const first = (await cloud.listHistory({ page: 1, pageSize: 1 })).data
  assert.deepEqual(first.items.map(item => item.date), ['2026-10-14'])
  assert.equal(first.hasMore, true)
  assert.equal(first.items[0].description, newest.description)
  assert.equal(first.items[0].artwork, undefined)
  assert.equal(first.items[0].imageFileId, undefined)

  const second = (await cloud.listHistory({ page: 2, pageSize: 1 })).data
  assert.deepEqual(second.items.map(item => item.date), ['2026-10-13'])
  assert.equal(second.hasMore, false)

  const exact = (await cloud.listHistory({ date: '2026-10-13' })).data
  assert.equal(exact.items.length, 1)
  assert.equal(exact.items[0].date, '2026-10-13')
  assert.equal(exact.hasMore, false)
  const futureExact = (await cloud.listHistory({ date: '2026-10-15' })).data
  assert.equal(futureExact.items.length, 0)
})

test('历史列表拒绝无效分页参数和损坏记录', async () => {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-14T03:00:00.000Z'])) }
  }
  const { cloud } = setupCloud({ records: [sampleRecord()], date: '2026-10-14', Date: FixedDate })
  await assert.rejects(cloud.listHistory({ page: 0, pageSize: 20 }), error => error.errCode === 'INVALID_DAILY_FLOWER')

  const bad = setupCloud({ records: [sampleRecord({ _id: '2026-10-13' })], date: '2026-10-14', Date: FixedDate })
  await assert.rejects(bad.cloud.listHistory({}), error => error.errCode === 'INVALID_DAILY_FLOWER')
})

test('历史列表忽略客户端 today，以 Asia/Shanghai 服务端日期限制未来数据', async () => {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-18T16:30:00.000Z'])) }
  }
  const today = sampleRecord({
    _id: '2026-10-19',
    date: '2026-10-19',
    imageFileId: 'cloud://space/daily-flower/2026-10-19/flower.png',
  })
  const future = sampleRecord({
    _id: '2026-10-20',
    date: '2026-10-20',
    imageFileId: 'cloud://space/daily-flower/2026-10-20/flower.png',
  })
  const { cloud } = setupCloud({ records: [future, today], date: '2026-10-19', Date: FixedDate })
  const result = await cloud.listHistory({ today: '2999-12-31', page: 1, pageSize: 20 })
  assert.equal(result.code, 0)
  assert.deepEqual(result.data.items.map(item => item.date), ['2026-10-19'])
})

test('每日花束历史页按云端摘要加载，不要求列表项包含 artwork', async () => {
  const loader = createLoader({
    uniCloud: {
      importObject: name => {
        assert.equal(name, 'flower-daily')
        return {
          listHistory: async ({ today }) => ({
            items: [{ date: today, description: '秋日花束' }],
            hasMore: false,
          }),
        }
      },
    },
  })
  const store = loader.load('src/stores/dailyFlowerStore.ts').useDailyFlowerStore()

  await store.loadHistory(true)

  assert.deepEqual(JSON.parse(JSON.stringify(store.historyItems)), [
    { date: store.historyItems[0].date, description: '秋日花束' },
  ])
  assert.equal(store.historyError, '')
  assert.equal(store.historyHasMore, false)
})
