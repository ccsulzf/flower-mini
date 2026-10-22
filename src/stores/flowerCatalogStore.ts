import type { CachedMaterial, UploadedMaterial } from '@/models/material'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { normalizeMaterial, parseMaterialCatalog } from '@/utils/flower/material-catalog'
import { cachedRecord, hasMaterialFiles, prepareMaterial } from '@/utils/flower/material-cache'

type PreparePhase = 'idle' | 'catalog' | 'checking' | 'downloading' | 'complete' | 'error'

interface MaterialPrepareProgress {
  phase: PreparePhase
  total: number
  processed: number
}

export const useFlowerCatalogStore = defineStore('flowerCatalog', () => {
  const materials = ref<UploadedMaterial[]>([])
  const prepared = ref<Record<string, CachedMaterial>>({})
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const downloading = ref(0)
  const downloads = ref(0)
  const cacheHits = ref(0)
  const preparing = ref(false)
  const ready = ref(false)
  const prepareError = ref('')
  const progress = ref<MaterialPrepareProgress>({ phase: 'idle', total: 0, processed: 0 })
  const preparePercent = computed(() => progress.value.phase === 'complete'
    ? 100
    : progress.value.total > 0 ? Math.min(99, Math.round(progress.value.processed / progress.value.total * 100)) : 0)
  const prepareMessage = computed(() => {
    if (progress.value.phase === 'catalog')
      return '正在准备花材，请稍候'
    if (progress.value.phase === 'checking')
      return '正在整理创作素材'
    if (progress.value.phase === 'downloading')
      return '正在准备花材，请稍候'
    if (progress.value.phase === 'complete')
      return '花材准备完成'
    return '正在准备创作空间'
  })
  const needsPreparation = computed(() => preparing.value || !ready.value || Boolean(prepareError.value))
  let prepareTask: Promise<void> | null = null
  let loadTask: Promise<void> | null = null
  const tasks = new Map<string, Promise<CachedMaterial>>()

  function failure(value: unknown) {
    return value instanceof Error ? value.message : typeof value === 'object' && value !== null && 'errMsg' in value ? String(value.errMsg) : '素材加载失败，请重试'
  }

  function get(id: string) {
    return prepared.value[id]
  }

  function load(): Promise<void> {
    if (loadTask)
      return loadTask
    loading.value = true
    error.value = ''
    loadTask = (async () => {
      try {
        await waitForAppAuthReady()
        const cloud = uniCloud.importObject('flower-catalog', { customUI: true })
        materials.value = parseMaterialCatalog(await cloud.list())
        loaded.value = true
        if (materials.value.some(item => !get(item.id) || !hasMaterialFiles(item)))
          ready.value = false
      }
      catch (value) {
        error.value = failure(value)
      }
      finally {
        loading.value = false
        loadTask = null
      }
    })()
    return loadTask
  }

  function ensure(id: string, onAssetProcessed?: () => void): Promise<CachedMaterial> {
    const running = tasks.get(id)
    if (running)
      return running
    downloading.value++
    error.value = ''
    const task = (async () => {
      try {
        let record = materials.value.find(item => item.id === id)
        if (!record) {
          const stored = cachedRecord(id)
          if (stored)
            record = normalizeMaterial(stored)
        }
        if (!record)
          throw new Error('素材不可用，请刷新目录')
        const result = await prepareMaterial(record, onAssetProcessed)
        prepared.value[id] = result.material
        downloads.value += result.downloaded
        cacheHits.value += result.cached
        return result.material
      }
      catch (value) {
        const message = failure(value)
        error.value = message
        throw new Error(message)
      }
      finally {
        downloading.value--
        tasks.delete(id)
      }
    })()
    tasks.set(id, task)
    return task
  }

  function prepareAll(): Promise<void> {
    if (prepareTask)
      return prepareTask
    const invalid = loaded.value ? materials.value.filter(item => !get(item.id) || !hasMaterialFiles(item)) : []
    if (loaded.value && ready.value && !invalid.length)
      return Promise.resolve()
    preparing.value = true
    prepareError.value = ''
    progress.value = { phase: loaded.value ? 'checking' : 'catalog', total: 0, processed: 0 }
    prepareTask = (async () => {
      if (!loaded.value)
        await load()
      if (error.value)
        throw new Error(error.value)
      const queue = materials.value.filter(item => !get(item.id) || !hasMaterialFiles(item))
      progress.value = {
        phase: queue.some(item => !hasMaterialFiles(item)) ? 'downloading' : 'checking',
        total: queue.reduce((total, item) => total + Object.keys(item.assets).length, 0),
        processed: 0,
      }
      const advance = () => { progress.value.processed++ }
      const failures: string[] = []
      await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length) {
          const item = queue.shift()!
          try { await ensure(item.id, advance) }
          catch (value) { failures.push(failure(value)) }
        }
      }))
      if (failures.length)
        throw new Error(failures[0])
      ready.value = true
      error.value = ''
      progress.value = { ...progress.value, phase: 'complete', processed: progress.value.total }
    })().catch((value) => {
      ready.value = false
      progress.value = { ...progress.value, phase: 'error' }
      prepareError.value = '花材准备失败，请重新加载'
      throw value
    }).finally(() => {
      preparing.value = false
      prepareTask = null
    })
    return prepareTask
  }

  function retryPreparation() {
    prepareError.value = ''
    error.value = ''
    return prepareAll()
  }

  return {
    materials,
    prepared,
    loading,
    loaded,
    error,
    downloading,
    downloads,
    cacheHits,
    preparing,
    ready,
    needsPreparation,
    preparePercent,
    prepareMessage,
    prepareError,
    load,
    ensure,
    prepareAll,
    preload: prepareAll,
    retryPreparation,
    get,
  }
})
