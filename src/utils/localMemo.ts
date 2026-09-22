import type { Memo } from '@/models/memo.interface'

const STORAGE_KEY = 'demo_local_memos'

function read(): Memo[] {
  return (uni.getStorageSync(STORAGE_KEY) || []) as Memo[]
}

function write(items: Memo[]) {
  uni.setStorageSync(STORAGE_KEY, items)
}

export const localMemo = {
  async list({ page = 1 }: { page?: number } = {}) {
    const items = read().sort((a, b) => b.updated_at - a.updated_at)
    return { data: items.slice((page - 1) * 20, page * 20) }
  },
  async create(data: { title: string; content: string }) {
    const now = Date.now()
    const item: Memo = { _id: `${now}`, user_id: 'local-demo', ...data, created_at: now, updated_at: now }
    write([item, ...read()])
  },
  async update(data: { id: string; title: string; content: string }) {
    const now = Date.now()
    write(read().map(item => item._id === data.id ? { ...item, title: data.title, content: data.content, updated_at: now } : item))
  },
  async remove({ id }: { id: string }) {
    write(read().filter(item => item._id !== id))
  },
}
