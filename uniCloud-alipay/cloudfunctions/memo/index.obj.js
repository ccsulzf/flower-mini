const resolveAuth = require('auth')
const collection = () => uniCloud.database().collection('demo-memos')

function payload(data) {
  if (!data || typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 80)
    throw new Error('标题需为 1–80 个字符')
  if (typeof data.content !== 'string' || data.content.length > 2000)
    throw new Error('内容需为不超过 2000 个字符的文本')
  return { title: data.title.trim(), content: data.content.trim() }
}
function recordId(data) {
  if (!data || typeof data.id !== 'string' || !data.id.trim() || data.id.length > 100)
    throw new Error('记录 ID 无效')
  return data.id
}
module.exports = {
  async _before() {
    const auth = await resolveAuth(this)
    if (!auth || !auth.uid) throw new Error('请先登录')
    this.uid = auth.uid
  },
  async list({ page = 1 } = {}) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new Error('页码无效')
    return collection().where({ user_id: this.uid }).orderBy('created_at', 'desc').orderBy('_id', 'desc').skip((page - 1) * 20).limit(20).get()
  },
  async create(data) {
    const value = payload(data)
    const now = Date.now()
    return collection().add({ ...value, user_id: this.uid, created_at: now, updated_at: now })
  },
  async update(data) {
    const id = recordId(data)
    const value = payload(data)
    const result = await collection().where({ _id: id, user_id: this.uid }).update({ ...value, updated_at: Date.now() })
    if (!result.updated) throw new Error('记录不存在或无权访问')
    return { success: true }
  },
  async remove(data) {
    const id = recordId(data)
    const result = await collection().where({ _id: id, user_id: this.uid }).remove()
    if (!result.deleted) throw new Error('记录不存在或无权访问')
    return { success: true }
  },
}
