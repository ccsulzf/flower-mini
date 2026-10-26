const resolveAuth = require('auth')

const works = () => uniCloud.database().collection('flower-works')
const dailyFlowers = () => uniCloud.database().collection('daily-flower')
const MAX_BATCH_SIZE = 50
const DELETE_CHUNK_SIZE = 50

function fail(errMsg) {
  throw { errCode: 'INVALID_ARGUMENT', errMsg }
}

function success(data) {
  return { code: 0, data }
}

function pagination(input = {}) {
  const page = input.page === undefined ? 1 : input.page
  const pageSize = input.pageSize === undefined ? 20 : input.pageSize
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000
    || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50)
    fail('分页参数无效')
  return { page, pageSize }
}

function ids(input) {
  if (!Array.isArray(input) || !input.length || input.length > MAX_BATCH_SIZE
    || input.some(id => typeof id !== 'string' || !id || id.length > 128)
    || new Set(input).size !== input.length)
    fail('请选择 1 至 50 条不重复的记录')
  return input
}

async function cleanup(fileIDs) {
  const unique = [...new Set(fileIDs.filter(id => typeof id === 'string' && id.startsWith('cloud://')))]
  if (!unique.length)
    return 0
  try {
    await uniCloud.deleteFile({ fileList: unique })
    return 0
  }
  catch (error) {
    console.error('作品运维文件清理失败', error)
    return unique.length
  }
}

async function removeRows(collection, filter, fileField) {
  const selected = await collection().where(filter).field({ [fileField]: true }).limit(MAX_BATCH_SIZE).get()
  const rows = selected.data || []
  if (!rows.length)
    return { deleted: 0, cleanupWarnings: 0 }
  const rowIDs = rows.map(row => row._id)
  const command = uniCloud.database().command
  const result = await collection().where({ ...filter, _id: command.in(rowIDs) }).remove()
  const deleted = result.deleted || 0
  const cleanupWarnings = await cleanup(rows.map(row => row[fileField]))
  return { deleted, cleanupWarnings }
}

async function removeAllRows(collection, filter, fileField) {
  let deleted = 0
  let cleanupWarnings = 0
  while (true) {
    const selected = await collection().where(filter).field({ [fileField]: true }).limit(DELETE_CHUNK_SIZE).get()
    const rows = selected.data || []
    if (!rows.length)
      return { deleted, cleanupWarnings }
    const rowIDs = rows.map(row => row._id)
    const command = uniCloud.database().command
    const result = await collection().where({ ...filter, _id: command.in(rowIDs) }).remove()
    const removed = result.deleted || 0
    if (!removed)
      throw { errCode: 'DELETE_FAILED', errMsg: '删除没有生效，请稍后重试' }
    deleted += removed
    cleanupWarnings += await cleanup(rows.map(row => row[fileField]))
  }
}

module.exports = {
  async _before() {
    const auth = await resolveAuth(this)
    if (!auth?.uid)
      throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后使用作品运维' }
    this.auth = auth
  },

  _after(error, result) {
    if (error)
      throw error
    if (this.auth.newToken)
      result.newToken = this.auth.newToken
    return result
  },

  async listWorks(input = {}) {
    const { page, pageSize } = pagination(input)
    const result = await works().where({ user_id: this.auth.uid })
      .field({ title: true, description: true, createdAt: true, updatedAt: true })
      .orderBy('updatedAt', 'desc').orderBy('_id', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize + 1).get()
    return success({ items: result.data.slice(0, pageSize).map(row => ({ id: row._id, title: row.title, description: row.description || '', createdAt: row.createdAt, updatedAt: row.updatedAt })), hasMore: result.data.length > pageSize })
  },

  async listDailyFlowers(input = {}) {
    const { page, pageSize } = pagination(input)
    const result = await dailyFlowers()
      .field({ date: true, description: true, createdAt: true, updatedAt: true })
      .orderBy('date', 'desc').orderBy('_id', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize + 1).get()
    return success({ items: result.data.slice(0, pageSize).map(row => ({ id: row._id, date: row.date, description: row.description, createdAt: row.createdAt, updatedAt: row.updatedAt })), hasMore: result.data.length > pageSize })
  },

  async removeWorks(input = {}) {
    return success(await removeRows(works, { user_id: this.auth.uid, _id: uniCloud.database().command.in(ids(input.ids)) }, 'thumbnailFileId'))
  },

  async removeAllWorks() {
    return success(await removeAllRows(works, { user_id: this.auth.uid }, 'thumbnailFileId'))
  },

  async removeDailyFlowers(input = {}) {
    return success(await removeRows(dailyFlowers, { _id: uniCloud.database().command.in(ids(input.ids)) }, 'imageFileId'))
  },

  async removeAllDailyFlowers() {
    return success(await removeAllRows(dailyFlowers, {}, 'imageFileId'))
  },
}
