import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FlowerMaterial } from '@/models/flower-material'
import type { CachedMaterial, UploadedMaterial } from '@/models/material'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { parseFlowerCatalog } from '@/utils/flower/catalog'
import { normalizeMaterial, parseMaterialCatalog } from '@/utils/flower/material-catalog'
import { cachedRecord, prepareMaterial } from '@/utils/flower/material-cache'
export const useFlowerCatalogStore = defineStore('flowerCatalog', () => {
  const items = ref<FlowerMaterial[]>([])
  const materials = ref<UploadedMaterial[]>([])
  const prepared = ref<Record<string, CachedMaterial>>({})
  const loading = ref(false), loaded = ref(false), error = ref('')
  const downloading = ref(0), downloads = ref(0), cacheHits = ref(0)
  const preparing = ref(false), ready = ref(false)
  let preloadTask: Promise<void> | null = null
  let loadTask: Promise<void> | null = null
  const tasks = new Map<string, Promise<CachedMaterial>>()
  function failure(value: unknown) { return value instanceof Error ? value.message : typeof value === 'object' && value !== null && 'errMsg' in value ? String(value.errMsg) : '素材加载失败，请重试' }
  function get(id: string, revision: string) { return prepared.value[`${id}:${revision}`] }
  function load(): Promise<void> {
    if (loadTask) return loadTask
    loading.value = true; error.value = ''
    loadTask = (async () => {
      try {
        await waitForAppAuthReady()
        const cloud = uniCloud.importObject('flower-catalog', { customUI: true })
        const result = await cloud.list()
        if (result.version === 1) { items.value = parseFlowerCatalog(result); materials.value = [] }
        else { materials.value = parseMaterialCatalog(result); items.value = [] }
        loaded.value = true
        if (materials.value.some(item => !get(item.id, item.revision))) ready.value = false
      } catch (value) { error.value = failure(value) }
      finally { loading.value = false; loadTask = null }
    })()
    return loadTask
  }
  function ensure(id: string, revision: string): Promise<CachedMaterial> {
    const key = `${id}:${revision}`
    const running = tasks.get(key)
    if (running) return running
    downloading.value++; error.value = ''
    const task = (async () => {
      try {
        // 即使已在内存中，也检查持久文件，避免系统清理后的失效路径。
        let record = materials.value.find(item => item.id === id && item.revision === revision)
        if (!record) {
          const stored = cachedRecord(id, revision)
          if (stored) record = normalizeMaterial(stored)
        }
        if (!record) throw new Error('此版本素材不可用，请刷新目录')
        const result = await prepareMaterial(record)
        prepared.value[key] = result.material
        downloads.value += result.downloaded; cacheHits.value += result.cached
        return result.material
      } catch (value) { const message = failure(value); error.value = message; throw new Error(message) }
      finally { downloading.value--; tasks.delete(key) }
    })()
    tasks.set(key, task)
    return task
  }
  function preload(): Promise<void> {
    if (preloadTask) return preloadTask
    if (ready.value) return Promise.resolve()
    preparing.value = true
    preloadTask = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!loaded.value || error.value) await load()
        if (error.value) continue
        const queue = materials.value.filter(row => !get(row.id, row.revision))
        const failures: string[] = []
        // Limit parallel downloads when the material library grows.
        await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
          while (queue.length) {
            const row = queue.shift()!
            try { await ensure(row.id, row.revision) }
            catch (value) { failures.push(failure(value)) }
          }
        }))
        if (!failures.length) { ready.value = true; error.value = ''; return }
        error.value = failures[0]
      }
    })().finally(() => { preparing.value = false; preloadTask = null })
    return preloadTask
  }
  return { items, materials, prepared, loading, loaded, error, downloading, downloads, cacheHits, preparing, ready, preload, load, ensure, get }
})
