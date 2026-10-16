const uniID = require('uni-id-common')
const dailyFlower = require('daily-flower')

function collection() {
  return uniCloud.database().collection('daily-flower')
}

async function cleanup(fileID) {
  if (!fileID)
    return true
  try {
    await uniCloud.deleteFile({ fileList: [fileID] })
    return true
  }
  catch (error) {
    console.error('每日花束图片清理失败', error)
    return false
  }
}

function validateImage(fileID, fileContent) {
  if (typeof fileID !== 'string' || !fileID.startsWith('cloud://') || fileID.length > 1024
    || !Buffer.isBuffer(fileContent) || fileContent.length < 24 || fileContent.length > 12 * 1024 * 1024
    || fileContent.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || ![[698, 1000], [1396, 2000]].some(([width, height]) =>
      fileContent.readUInt32BE(16) === width && fileContent.readUInt32BE(20) === height)) {
    throw { errCode: 'INVALID_DAILY_FLOWER_IMAGE', errMsg: '花束图片无效，请重新生成后发布' }
  }
}

module.exports = {
  async _before() {
    const auth = await uniID.createInstance({ context: this }).checkToken(this.getUniIdToken())
    if (auth.errCode !== 0 || typeof auth.uid !== 'string' || !auth.uid)
      throw { errCode: 'AUTH_REQUIRED', errMsg: '登录已失效，请重新登录' }
    const user = await uniCloud.database().collection('uni-id-users')
      .doc(auth.uid).field({ role: true }).get()
    const roles = user.data?.[0]?.role
    if (!Array.isArray(roles) || !roles.includes('admin'))
      throw { errCode: 'ADMIN_REQUIRED', errMsg: '此账号没有每日插花维护权限' }
    this.auth = { uid: auth.uid }
  },

  async publish(input = {}) {
    const date = dailyFlower.validateDate(input.date)
    const description = dailyFlower.validateDescription(input.description)
    const artwork = dailyFlower.validateArtwork(input.artwork)
    if (typeof input.imageFileId !== 'string' || !input.imageFileId.startsWith('cloud://')
      || !input.imageFileId.includes(`/daily-flower/${date}/`) || input.imageFileId.length > 1024)
      throw { errCode: 'INVALID_DAILY_FLOWER_IMAGE', errMsg: '花束图片文件无效' }

    let saved = false
    try {
      const image = await uniCloud.downloadFile({ fileID: input.imageFileId })
      validateImage(input.imageFileId, image?.fileContent)

      const records = collection()
      const previous = await records.doc(date).get()
      const old = previous.data?.[0]
      const now = Date.now()
      const row = {
        _id: date,
        date,
        description,
        artwork,
        imageFileId: input.imageFileId,
        updatedBy: this.auth.uid,
        updatedAt: now,
        createdAt: old?.createdAt || now,
      }
      if (old) {
        const { _id, createdAt, ...changes } = row
        await records.doc(date).update(changes)
      }
      else {
        await records.add(row)
      }
      saved = true

      const oldImageRemoved = old?.imageFileId === input.imageFileId
        ? true
        : await cleanup(old?.imageFileId)
      return {
        ok: true,
        updated: !!old,
        imageCleanupWarning: !oldImageRemoved,
      }
    }
    catch (error) {
      if (!saved)
        await cleanup(input.imageFileId)
      throw error
    }
  },
}
