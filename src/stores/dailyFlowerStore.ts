import type { Artwork } from '@/models/artwork'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parseDailyFlower } from '@/utils/flower/daily-flower'

export interface PublishedDailyFlower {
  date: string
  description: string
  artwork: Artwork
  imageFileId: string
  imageUrl: string
  imagePath: string
}

export interface DailyFlowerHistoryItem {
  date: string
  description: string
}

interface DailyFlowerCloud {
  getByDate: (input: { date: string }) => Promise<{ flower: Omit<PublishedDailyFlower, 'imagePath'> | null }>
  getArtwork: (input: { date: string }) => Promise<{ flower: { date: string, description: string, artwork: Artwork } | null }>
  listHistory: (input: { today: string, page: number, pageSize: number, date?: string }) => Promise<{ items: DailyFlowerHistoryItem[], hasMore: boolean }>
}

interface CachedDailyImage {
  imageFileId: string
  imagePath: string
}

const dismissedStorageKey = 'daily-flower-dismissed-date:v1'

function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function cacheKey(date: string) {
  return `daily-flower-image:v1:${date}`
}

function fileExists(filePath: string) {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager())
    return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
}

async function cachedOrDownloadImage(record: Omit<PublishedDailyFlower, 'imagePath'>) {
  const key = cacheKey(record.date)
  const cached: unknown = uni.getStorageSync(key)
  if (typeof cached === 'object' && cached !== null && 'imageFileId' in cached && 'imagePath' in cached
    && cached.imageFileId === record.imageFileId && typeof cached.imagePath === 'string'
    && await fileExists(cached.imagePath)) {
    return cached.imagePath
  }

  let download: UniApp.DownloadSuccessData | undefined
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      download = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
        uni.downloadFile({ url: record.imageUrl, success: resolve, fail: reject })
      })
      break
    }
    catch (error) {
      lastError = error
    }
  }
  if (!download)
    throw lastError
  if (download.statusCode !== 200)
    throw new Error('今日花束图片下载失败')

  const saved = await new Promise<UniApp.SaveFileSuccess>((resolve, reject) => {
    uni.saveFile({ tempFilePath: download.tempFilePath, success: resolve, fail: reject })
  })
  uni.setStorageSync(key, { imageFileId: record.imageFileId, imagePath: saved.savedFilePath } satisfies CachedDailyImage)
  return saved.savedFilePath
}

async function fetchDailyFlower(date: string): Promise<PublishedDailyFlower | null> {
  const cloud = uniCloud.importObject('flower-daily', { customUI: true }) as DailyFlowerCloud
  const { flower: result } = await cloud.getByDate({ date })
  if (!result)
    return null
  if (result.date !== date || typeof result.imageUrl !== 'string' || !/^https:\/\//.test(result.imageUrl))
    throw new Error('今日花束记录无效')

  const parsed = parseDailyFlower(JSON.stringify({
    date: result.date,
    description: result.description,
    artwork: result.artwork,
  }))
  const imagePath = await cachedOrDownloadImage({ ...result, ...parsed })
  return { ...parsed, imageFileId: result.imageFileId, imageUrl: result.imageUrl, imagePath }
}

export const useDailyFlowerStore = defineStore('dailyFlower', () => {
  const todayFlower = ref<PublishedDailyFlower | null>(null)
  const visible = ref(false)
  const loading = ref(false)
  const historyItems = ref<DailyFlowerHistoryItem[]>([])
  const historyLoading = ref(false)
  const historyError = ref('')
  const historyHasMore = ref(true)
  const historyDateFilter = ref('')
  const records = new Map<string, PublishedDailyFlower | null>()
  const tasks = new Map<string, Promise<PublishedDailyFlower | null>>()
  let historyPage = 1

  async function loadDate(date: string, refresh = false) {
    if (!refresh && records.has(date))
      return records.get(date) ?? null
    const running = tasks.get(date)
    if (running)
      return running
    const task = fetchDailyFlower(date).then((flower) => {
      records.set(date, flower)
      return flower
    }).finally(() => tasks.delete(date))
    tasks.set(date, task)
    return task
  }

  async function getArtwork(date: string) {
    const cloud = uniCloud.importObject('flower-daily', { customUI: true }) as DailyFlowerCloud
    const { flower } = await cloud.getArtwork({ date })
    if (!flower)
      return null
    return parseDailyFlower(JSON.stringify(flower)).artwork
  }

  async function checkToday() {
    const date = localDate()
    const dismissedDate = uni.getStorageSync(dismissedStorageKey)
    if (dismissedDate === date) {
      visible.value = false
      return
    }
    if (todayFlower.value?.date === date && visible.value)
      return
    if (todayFlower.value?.date !== date)
      visible.value = false

    loading.value = true
    try {
      const flower = await loadDate(date, true)
      if (localDate() !== date)
        return
      todayFlower.value = flower
      visible.value = Boolean(flower)
    }
    catch (error) {
      todayFlower.value = null
      visible.value = false
      console.error('加载今日花束失败', error)
      uni.showToast({ title: '今日花束图片加载失败，请检查网络或图片域名配置', icon: 'none' })
    }
    finally {
      loading.value = false
    }
  }

  async function loadHistory(reset = false, dateFilter?: string) {
    if (historyLoading.value)
      return
    if (reset && dateFilter !== undefined)
      historyDateFilter.value = dateFilter
    if (!reset && !historyHasMore.value)
      return
    historyLoading.value = true
    historyError.value = ''
    try {
      const date = localDate()
      const cloud = uniCloud.importObject('flower-daily', { customUI: true }) as DailyFlowerCloud
      const page = reset ? 1 : historyPage
      const result = await cloud.listHistory({
        today: date,
        page,
        pageSize: 20,
        ...(historyDateFilter.value ? { date: historyDateFilter.value } : {}),
      })
      if (!Array.isArray(result.items) || typeof result.hasMore !== 'boolean')
        throw new Error('历史花束数据格式无效')
      const parsed = result.items.map((item) => {
        const flower = parseDailyFlower(JSON.stringify(item))
        if (flower.date > date)
          throw new Error('历史花束日期无效')
        return { date: flower.date, description: flower.description }
      })
      const merged = reset ? parsed : [...historyItems.value, ...parsed]
      historyItems.value = [...new Map(merged.map(item => [item.date, item])).values()]
      historyHasMore.value = result.hasMore
      historyPage = page + 1
    }
    catch (error) {
      historyError.value = error instanceof Error ? error.message : '历史花束加载失败，请重试'
    }
    finally {
      historyLoading.value = false
    }
  }

  function dismissToday() {
    const date = todayFlower.value?.date
    if (!date)
      return
    visible.value = false
    try {
      uni.setStorageSync(dismissedStorageKey, date)
    }
    catch (error) {
      console.error('今日花束关闭状态保存失败', error)
      uni.showToast({ title: '关闭状态保存失败，今日可能再次弹出', icon: 'none' })
    }
  }

  return {
    todayFlower,
    visible,
    loading,
    historyItems,
    historyLoading,
    historyError,
    historyHasMore,
    historyDateFilter,
    loadDate,
    getArtwork,
    checkToday,
    loadHistory,
    dismissToday,
  }
})
