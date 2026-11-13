const { createHash } = require('crypto')

// 北京时间自然日；固定三个唯一槽位，数据库主键冲突保证并发请求不能超额。
async function consumeDailyQuota(db, uid) {
  const now = Date.now()
  const day = new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const owner = createHash('sha256').update(uid).digest('hex')
  const collection = db.collection('flower-generation-quota')
  for (let slot = 1; slot <= 3; slot++) {
    const id = `${owner}_${day}_${slot}`
    try {
      await collection.add({ _id: id, user_id: uid, day, slot, createdAt: now })
      return
    }
    catch (error) {
      // 仅在确认该用户的槽位已占用后继续；数据库异常不能当成额度耗尽。
      const existing = await collection.where({ _id: id, user_id: uid }).limit(1).get()
      if (!existing.data.length) throw error
    }
  }
  throw { errCode: 'DAILY_LIMIT_REACHED', errMsg: '今天的 3 次生花机会已用完，明天再来让花开吧' }
}

module.exports = { consumeDailyQuota }
