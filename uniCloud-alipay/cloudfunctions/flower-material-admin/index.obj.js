const uniID = require('uni-id-common')
module.exports = {
  async _before() {
    const result = await uniID.createInstance({ context: this }).checkToken(this.getUniIdToken())
    if (result.errCode !== 0 || typeof result.uid !== 'string' || !result.uid) {
      throw { errCode: 'AUTH_REQUIRED', errMsg: '登录已失效，请重新登录' }
    }
    // Token 确认身份，当前用户记录确认权限，避免旧 Token 角色滞后。
    const user = await uniCloud.database().collection('uni-id-users').doc(result.uid).field({ role: true }).get()
    const roles = user.data[0]?.role
    if (!Array.isArray(roles) || !roles.includes('admin')) {
      throw { errCode: 'ADMIN_REQUIRED', errMsg: '此账号没有素材管理权限' }
    }
    this.auth = { uid: result.uid }
  },
  async list() {
    const collection = uniCloud.database().collection('flower-material-assets')
    const items = []
    for (let skip = 0; ; skip += 100) {
      const result = await collection.orderBy('id', 'asc').skip(skip).limit(100).get()
      items.push(...result.data)
      if (result.data.length < 100) break
    }
    return { items }
  },
  async remove(data) {
    // _before 校验当前管理员身份；只下架档案，不删除被旧作品引用的云文件。
    if (!data || typeof data.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(data.id)) {
      throw { errCode: 'INVALID_MATERIAL', errMsg: '素材标识无效' }
    }
    await uniCloud.database().collection('flower-material-assets').doc(data.id).remove()
    return { ok: true }
  },
  async save(data) {
    const invalid = () => { throw { errCode: 'INVALID_MATERIAL', errMsg: '花材档案无效' } }
    if (!data || typeof data.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(data.id || '') || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 40
      || typeof data.introduction !== 'string' || data.introduction.length > 2000) invalid()
    const category = data.category || 'flower'
    if (!['flower', 'vase', 'bouquet', 'background'].includes(category)) invalid()
    if (category === 'flower' && (!['main', 'filler', 'foliage'].includes(data.group) || typeof data.flowerMeaning !== 'string' || data.flowerMeaning.length > 500
      || !Array.isArray(data.colors) || !data.colors.length || data.colors.length > 20
      || data.colors.some(color => !color || typeof color.name !== 'string' || !color.name.trim() || color.name.length > 20 || typeof color.value !== 'string' || !/^#[\da-f]{6}$/i.test(color.value)))) invalid()
    const defaultConnection = { rose: 101, tulip: 93, daisy: 102 }[data.id]
    const geometry = data.geometry || (category === 'flower' && defaultConnection ? { width: 110, flowerHeight: 110, stemHeight: 260, connectionY: defaultConnection } : null)
    const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 2000
    if (!geometry || !positive(geometry.width)) invalid()
    let cleanGeometry
    if (category === 'background') {
      if (data.backgroundKind !== undefined && !['solid', 'scene'].includes(data.backgroundKind)) invalid()
      if (!positive(geometry.height) || (geometry.surfaceY !== undefined && (typeof geometry.surfaceY !== 'number' || !Number.isFinite(geometry.surfaceY) || geometry.surfaceY < 0 || geometry.surfaceY > geometry.height))) invalid()
      cleanGeometry = { width: geometry.width, height: geometry.height, ...(geometry.surfaceY !== undefined ? { surfaceY: geometry.surfaceY } : {}) }
    } else if (category !== 'flower') {
      if (!positive(geometry.height) || !positive(geometry.mouthWidth) || geometry.mouthWidth > geometry.width
        || !Number.isFinite(geometry.mouthX) || !Number.isFinite(geometry.mouthY) || geometry.mouthX < geometry.mouthWidth / 2 || geometry.mouthX > geometry.width - geometry.mouthWidth / 2 || geometry.mouthY < 0 || geometry.mouthY >= geometry.height) invalid()
      cleanGeometry = { width: geometry.width, height: geometry.height, mouthX: geometry.mouthX, mouthY: geometry.mouthY, mouthWidth: geometry.mouthWidth }
    } else {
      if (!positive(geometry.flowerHeight) || !positive(geometry.stemHeight) || !positive(geometry.connectionY) || geometry.connectionY > geometry.flowerHeight) invalid()
      cleanGeometry = { width: geometry.width, flowerHeight: geometry.flowerHeight, stemHeight: geometry.stemHeight, connectionY: geometry.connectionY }
    }
    const keys = category === 'background' ? ['background'] : category === 'vase' ? ['vase'] : category === 'bouquet' ? ['bouquet'] : data.group === 'foliage' ? ['foliage'] : ['flower', 'stemWithoutLeaves']
    const assets = {}
    for (const key of keys) {
      const file = data.assets?.[key]
      if (!file || typeof file.fileId !== 'string' || !file.fileId || file.fileId.length > 1024 || typeof file.hash !== 'string' || !/^[a-f0-9]{40}$/.test(file.hash || '')) invalid()
      assets[key] = { fileId: file.fileId, hash: file.hash }
    }
    const record = { id: data.id, name: data.name.trim(), category, ...(category === 'background' ? { backgroundKind: data.backgroundKind === 'solid' ? 'solid' : 'scene' } : {}), geometry: cleanGeometry, group: category === 'flower' ? data.group : 'main', introduction: data.introduction, flowerMeaning: category === 'flower' ? data.flowerMeaning : '',
      colors: (category === 'flower' ? data.colors : []).map(color => ({ name: color.name, value: color.value })), assets,
      updatedBy: this.auth.uid, updatedAt: Date.now() }
    const collection = uniCloud.database().collection('flower-material-assets')
    const previous = await collection.doc(data.id).get()
    if (previous.data.length) {
      // 收集本地档案不再包含的旧 assets 子字段，整体写入时一并清掉，避免数据库与云端冗余。
      // set() 整体替换文档，能确保 record 中未包含的字段（包括 obsolete 子字段）一并清掉。
      const previousAssets = previous.data[0].assets || {}
      const obsoleteKeys = Object.keys(previousAssets).filter(key => !keys.includes(key))
      await collection.doc(data.id).set(record)
      // 清理 obsolete 字段对应的云存储文件，失败只记日志，不影响本次写入结果。
      const fileIds = []
      for (const key of obsoleteKeys) {
        const fileId = previousAssets[key] && previousAssets[key].fileId
        if (typeof fileId === 'string' && fileId.startsWith('cloud://')) fileIds.push(fileId)
      }
      if (fileIds.length) {
        try { await uniCloud.deleteFile({ fileList: fileIds }) }
        catch (error) { console.error(`[flower-material-admin] 清理 ${data.id} 历史云文件失败`, error) }
      }
    } else {
      await collection.add({ _id: data.id, ...record })
    }
    return { ok: true }
  },
  async purgeObsoleteAssets() {
    // 一次性扫描所有素材，清理非标准 assets 子字段及其云存储文件。
    // 标准字段集合与客户端 SvgPart 类型保持一致；其他子字段视为历史遗留。
    const allowedKeys = new Set(['flower', 'stemWithoutLeaves', 'foliage', 'vase', 'bouquet', 'background'])
    const collection = uniCloud.database().collection('flower-material-assets')
    const items = []
    for (let skip = 0; ; skip += 100) {
      const result = await collection.skip(skip).limit(100).get()
      items.push(...result.data)
      if (result.data.length < 100) break
    }
    const filesToDelete = []
    let dbUpdated = 0
    const failures = []
    for (const row of items) {
      const assets = row.assets || {}
      const obsoleteKeys = Object.keys(assets).filter(key => !allowedKeys.has(key))
      if (!obsoleteKeys.length) continue
      // 先改数据库，再删云文件；中途失败不会导致字段引用不存在的文件。
      // set() 整体替换文档，比 $unset 操作符更稳，能清掉 obsolete 子字段。
      const cleanAssets = {}
      for (const key of allowedKeys) { if (assets[key]) cleanAssets[key] = assets[key] }
      try {
        await collection.doc(row.id).set({ ...row, assets: cleanAssets })
        dbUpdated++
      } catch (error) {
        failures.push({ id: row.id, step: 'set', message: error.errMsg || error.message || String(error) })
        continue
      }
      for (const key of obsoleteKeys) {
        const fileId = assets[key] && assets[key].fileId
        if (typeof fileId === 'string' && fileId.startsWith('cloud://')) filesToDelete.push(fileId)
      }
    }
    // 支付宝云 deleteFile 单次最多 50 个 fileId，按批处理。
    let filesDeleted = 0
    for (let i = 0; i < filesToDelete.length; i += 50) {
      const batch = filesToDelete.slice(i, i + 50)
      try {
        await uniCloud.deleteFile({ fileList: batch })
        filesDeleted += batch.length
      } catch (error) {
        failures.push({ step: 'deleteFile', batchSize: batch.length, message: error.errMsg || error.message || String(error) })
      }
    }
    return { scanned: items.length, dbUpdated, filesToDelete: filesToDelete.length, filesDeleted, failures }
  }
}
