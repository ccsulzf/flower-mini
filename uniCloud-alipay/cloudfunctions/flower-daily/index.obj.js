const dailyFlower = require('daily-flower')

function invalid(message) {
  throw { errCode: 'INVALID_DAILY_FLOWER', errMsg: message }
}

function publicRecord(record, date) {
  const description = dailyFlower.validateDescription(record.description)
  const artwork = dailyFlower.validateArtwork(record.artwork)
  if (record._id !== date || record.date !== date || typeof record.imageFileId !== 'string'
    || !record.imageFileId.startsWith('cloud://')
    || !record.imageFileId.includes(`/daily-flower/${date}/`)
    || record.imageFileId.length > 1024) {
    invalid('今日花束记录或图片无效')
  }
  return { date, description, artwork, imageFileId: record.imageFileId }
}

function publicSummary(record, date) {
  const description = dailyFlower.validateDescription(record.description)
  if (record._id !== date || record.date !== date || typeof record.imageFileId !== 'string'
    || !record.imageFileId.startsWith('cloud://')
    || !record.imageFileId.includes(`/daily-flower/${date}/`)
    || record.imageFileId.length > 1024) {
    invalid('每日花束记录或图片无效')
  }
  return { date, description }
}

module.exports = {
  async getByDate(input = {}) {
    const date = dailyFlower.validateDate(input.date)
    const result = await uniCloud.database().collection('daily-flower').doc(date).get()
    const record = result.data?.[0]
    if (!record)
      return { flower: null }

    const flower = publicRecord(record, date)

    const urls = await uniCloud.getTempFileURL({ fileList: [flower.imageFileId] })
    const image = urls.fileList?.find(item => item.fileID === flower.imageFileId)
    if (!image || typeof image.tempFileURL !== 'string' || !/^https:\/\//.test(image.tempFileURL))
      throw { errCode: 'DAILY_FLOWER_IMAGE_UNAVAILABLE', errMsg: '今日花束图片暂不可用' }

    return { flower: { ...flower, imageUrl: image.tempFileURL } }
  },

  async getArtwork(input = {}) {
    const date = dailyFlower.validateDate(input.date)
    const result = await uniCloud.database().collection('daily-flower').doc(date).get()
    const record = result.data?.[0]
    if (!record)
      return { flower: null }
    const flower = publicRecord(record, date)
    return { flower: { date, description: flower.description, artwork: flower.artwork } }
  },

  async listHistory(input = {}) {
    const today = dailyFlower.validateDate(input.today)
    const selectedDate = input.date === undefined ? '' : dailyFlower.validateDate(input.date)
    const page = input.page === undefined ? 1 : input.page
    const pageSize = input.pageSize === undefined ? 20 : input.pageSize
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000
      || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      invalid('历史花束分页参数无效')
    }

    const db = uniCloud.database()
    if (selectedDate) {
      if (selectedDate > today)
        return { items: [], hasMore: false }
      const result = await db.collection('daily-flower').doc(selectedDate).get()
      const record = result.data?.[0]
      return { items: record ? [publicSummary(record, selectedDate)] : [], hasMore: false }
    }

    const result = await db.collection('daily-flower')
      .where({ _id: db.command.lte(today) })
      .orderBy('_id', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize + 1)
      .get()
    const rows = result.data.slice(0, pageSize).map((record) => {
      const date = dailyFlower.validateDate(record.date)
      if (date > today)
        invalid('历史花束日期无效')
      return publicSummary(record, date)
    })
    if (rows.some(row => row.date > today))
      invalid('历史花束日期无效')
    return { items: rows, hasMore: result.data.length > pageSize }
  },
}
