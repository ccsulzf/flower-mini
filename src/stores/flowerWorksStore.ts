import type { CreationDraft, SavedFlowerWork } from '@/models/flower-creation'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { validateDraft } from '@/utils/flower/creation-storage'

interface SaveWorkInput { draft: CreationDraft, title: string, description: string, imagePath: string, workId?: string, expectedRevision?: number }
interface WorksCloud {
  list: (input: { page: number, pageSize: number }) => Promise<{ items: SavedFlowerWork[], hasMore: boolean }>
  get: (input: { id: string }) => Promise<SavedFlowerWork>
  save: (input: { id?: string, expectedRevision?: number, title: string, description: string, artwork: CreationDraft['artwork'], card: CreationDraft['card'], thumbnailBase64: string }) => Promise<SavedFlowerWork>
  remove: (input: { id: string, expectedRevision: number }) => Promise<unknown>
}
export function creationFailure(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'errMsg' in error ? String(error.errMsg) : '作品操作失败，请重试'
}
function normalize(work: SavedFlowerWork): SavedFlowerWork {
  if (!work || !/^[a-f\d]{32}$/.test(work.id) || typeof work.title !== 'string' || work.title.length > 40 || work.description !== undefined && (typeof work.description !== 'string' || work.description.length > 160) || !Number.isSafeInteger(work.revision) || work.revision < 1 || !Number.isFinite(work.updatedAt) || !Number.isFinite(work.createdAt))
    throw new Error('云端作品数据无效')
  return { ...work, description: work.description || '', draft: validateDraft({ ...work.draft, workId: work.id, workRevision: work.revision }) }
}
function readImage(path: string) {
  return new Promise<string>((resolve, reject) => {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined') {
      wx.getFileSystemManager().readFile({ filePath: path, encoding: 'base64', success: result => resolve(String(result.data)), fail: reject })
      return
    }
    // #endif
    reject(new Error('当前平台暂不支持云端保存作品'))
  })
}
export const useFlowerWorksStore = defineStore('flowerWorks', () => {
  const items = ref<SavedFlowerWork[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const hasMore = ref(true)
  let owner = ''
  let page = 1
  let epoch = 0
  async function client() {
    await waitForAppAuthReady()
    const uid = uniCloud.getCurrentUserInfo().uid
    if (!uid)
      throw new Error('请先登录后查看作品')
    if (owner !== uid) {
      owner = uid
      epoch++
      page = 1
      items.value = []
      hasMore.value = true
    }
    return { cloud: uniCloud.importObject('flower-works', { customUI: true }) as WorksCloud, uid, epoch }
  }
  function current(uid: string, request: number) {
    return uid === uniCloud.getCurrentUserInfo().uid && request === epoch
  }
  async function load(reset = false) {
    if (loading.value)
      return
    loading.value = true
    error.value = ''
    try {
      const context = await client()
      if (reset)
        page = 1
      if (!reset && !hasMore.value)
        return
      const result = await context.cloud.list({ page, pageSize: 20 })
      if (!current(context.uid, context.epoch))
        return
      const rows = result.items.map(normalize)
      const merged = reset ? rows : [...items.value, ...rows]
      items.value = [...new Map(merged.map(row => [row.id, row])).values()].sort((a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id))
      hasMore.value = result.hasMore
      page++
    }
    catch (value) {
      error.value = creationFailure(value)
    }
    finally {
      loading.value = false
    }
  }
  async function get(id: string) {
    const context = await client()
    const work = normalize(await context.cloud.get({ id }))
    if (!current(context.uid, context.epoch))
      throw new Error('账号已切换，请重新打开作品')
    return work
  }
  async function save(input: SaveWorkInput) {
    if (saving.value)
      throw new Error('作品正在保存，请稍候')
    saving.value = true
    error.value = ''
    try {
      const context = await client()
      const draft = validateDraft(input.draft)
      const thumbnailBase64 = await readImage(input.imagePath)
      if (!current(context.uid, context.epoch))
        throw new Error('账号已切换，请重新保存')
      const work = normalize(await context.cloud.save({ ...(input.workId ? { id: input.workId, expectedRevision: input.expectedRevision } : {}), title: input.title, description: input.description, artwork: draft.artwork, card: draft.card, thumbnailBase64 }))
      if (!current(context.uid, context.epoch))
        throw new Error('账号已切换，请重新打开作品列表')
      items.value = [work, ...items.value.filter(row => row.id !== work.id)].sort((a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id))
      return work
    }
    catch (value) {
      error.value = creationFailure(value)
      throw value
    }
    finally {
      saving.value = false
    }
  }
  async function remove(id: string, expectedRevision: number) {
    const context = await client()
    await context.cloud.remove({ id, expectedRevision })
    if (current(context.uid, context.epoch))
      items.value = items.value.filter(row => row.id !== id)
  }
  async function duplicate(id: string) {
    if (saving.value)
      throw new Error('作品正在保存，请稍候')
    saving.value = true
    error.value = ''
    try {
      const context = await client()
      const original = normalize(await context.cloud.get({ id }))
      if (!current(context.uid, context.epoch))
        throw new Error('账号已切换，请重新打开作品列表')
      if (!original.thumbnailUrl)
        throw new Error('作品图片暂不可用，请稍后重试')
      const imagePath = await new Promise<string>((resolve, reject) => {
        uni.downloadFile({ url: original.thumbnailUrl!, success: (result) => {
          if (result.statusCode === 200 && result.tempFilePath)
            resolve(result.tempFilePath)
          else
            reject(new Error('作品图片读取失败，请重试'))
        }, fail: reject })
      })
      const thumbnailBase64 = await readImage(imagePath)
      if (!current(context.uid, context.epoch))
        throw new Error('账号已切换，请重新打开作品列表')
      const work = normalize(await context.cloud.save({ title: `${original.title.slice(0, 37)} 副本`, description: original.description, artwork: original.draft.artwork, card: original.draft.card, thumbnailBase64 }))
      if (!current(context.uid, context.epoch))
        throw new Error('账号已切换，请重新打开作品列表')
      items.value = [work, ...items.value.filter(row => row.id !== work.id)].sort((a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id))
      return work
    }
    catch (value) {
      error.value = creationFailure(value)
      throw value
    }
    finally {
      saving.value = false
    }
  }
  return { items, loading, saving, error, hasMore, load, get, save, remove, duplicate }
})
