const uniID = require('uni-id-common')
module.exports = {
  async _before() {
    const result = await uniID.createInstance({ context: this }).checkToken(this.getUniIdToken())
    if (result.errCode !== 0 || !result.uid) throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后读取素材目录' }
    this.auth = { uid: result.uid }
    this.newToken = result.token && result.tokenExpired ? { token: result.token, tokenExpired: result.tokenExpired } : null
  },
  _after(error, result) {
    if (error) throw error
    if (this.newToken) result.newToken = this.newToken
    return result
  },
  async list() {
    const collection = uniCloud.database().collection('flower-material-assets')
    const data = []
    for (let skip = 0; ; skip += 100) {
      const page = await collection.orderBy('id', 'asc').skip(skip).limit(100).get()
      data.push(...page.data)
      if (page.data.length < 100) break
    }
    const items = data.map(({ id, category, name, introduction, flowerMeaning, group, colors, version, revision, geometry, assets, updatedAt }) => ({ id, category: category || 'flower', name, introduction, flowerMeaning, group, colors, version, revision, geometry, assets, updatedAt }))
    const ids = [...new Set(items.flatMap(row => Object.values(row.assets || {}).map(file => file.fileId)))]
    const byId = new Map()
    const batches = []
    for (let index = 0; index < ids.length; index += 50) {
      batches.push(ids.slice(index, index + 50))
    }
    const urlResults = await Promise.all(batches.map(fileList => uniCloud.getTempFileURL({ fileList })))
    for (const result of urlResults) {
      for (const file of result.fileList) byId.set(file.fileID, file.tempFileURL)
    }
    for (const row of items) {
      const files = {}
      for (const [key, file] of Object.entries(row.assets || {})) {
        const url = byId.get(file.fileId)
        if (!url) throw { errCode: 'ASSET_URL_FAILED', errMsg: `${row.name}的素材下载地址获取失败` }
        files[key] = { fileId: file.fileId, hash: file.hash, url }
      }
      row.assets = files
    }
    return { version: 2, items }
  }
}
