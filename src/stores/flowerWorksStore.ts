import type { CreationDraft, SavedFlowerWork } from '@/models/flower-creation'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { validateDraft } from '@/utils/flower/creation-storage'
import { clearImageCacheScope } from '@/utils/flower/image-cache'

interface SaveWorkInput { draft: CreationDraft, title: string, description: string, imagePath?: string, workId?: string, expectedRevision?: number }
interface WorksCloud {
  list: (input: { page: number, pageSize: number }) => Promise<{ items: SavedFlowerWork[], hasMore: boolean }>
  get: (input: { id: string }) => Promise<SavedFlowerWork>
  save: (input: { id?: string, expectedRevision?: number, title: string, description: string, artwork: CreationDraft['artwork'], card: CreationDraft['card'], thumbnailBase64?: string }) => Promise<SavedFlowerWork>
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
  let page = 1
  async function client(): Promise<{ cloud: WorksCloud }> {
    await useUserInfoStore().requireUid('请先登录后查看作品')
    return { cloud: uniCloud.importObject('flower-works', { customUI: true }) as WorksCloud }
  }
  async function load(reset = false) {
    if (loading.value)
      return
    loading.value = true
    error.value = ''
    try {
      const { cloud } = await client()
      if (reset)
        page = 1
      if (!reset && !hasMore.value)
        return
      const result = await cloud.list({ page, pageSize: 20 })
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
    const { cloud } = await client()
    return normalize(await cloud.get({ id }))
  }
  async function save(input: SaveWorkInput) {
    if (saving.value)
      throw new Error('作品正在保存，请稍候')
    saving.value = true
    error.value = ''
    try {
      const { cloud } = await client()
      const draft = validateDraft(input.draft)
      const thumbnailBase64 = input.imagePath ? await readImage(input.imagePath) : undefined
      const work = normalize(await cloud.save({ ...(input.workId ? { id: input.workId, expectedRevision: input.expectedRevision } : {}), title: input.title, description: input.description, artwork: draft.artwork, card: draft.card, ...(thumbnailBase64 ? { thumbnailBase64 } : {}) }))
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
    const { cloud } = await client()
    await cloud.remove({ id, expectedRevision })
    clearImageCacheScope(`work:${id}`)
    items.value = items.value.filter(row => row.id !== id)
  }
  async function duplicate(id: string) {
    if (saving.value)
      throw new Error('作品正在保存，请稍候')
    saving.value = true
    error.value = ''
    try {
      const { cloud } = await client()
      const original = normalize(await cloud.get({ id }))
      const work = normalize(await cloud.save({ title: `${original.title.slice(0, 37)} 副本`, description: original.description, artwork: original.draft.artwork, card: original.draft.card }))
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
