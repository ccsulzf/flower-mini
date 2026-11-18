import type { DailyFlowerSummary, LocalDailyFlower } from '@/models/daily-flower'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDailyFlowerArtwork, getDailyFlowerByDate, listDailyFlowerHistory } from '@/api/flower-daily'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { resolveDailyFlowerImage } from '@/utils/flower/daily-flower-image-cache'

export type PublishedDailyFlower = LocalDailyFlower
export type DailyFlowerHistoryItem = DailyFlowerSummary

const dismissedStorageKey = 'daily-flower-dismissed-date:v1'

function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

async function fetchDailyFlower(date: string): Promise<PublishedDailyFlower | null> {
  const result = await getDailyFlowerByDate(date)
  if (!result)
    return null
  const imagePath = await resolveDailyFlowerImage(result)
  return { ...result, imagePath }
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
  const guideResolvedUids = new Set<string>()

  function guideResolved(uid: string) {
    if (!uid)
      return false
    if (guideResolvedUids.has(uid))
      return true
    try {
      return Boolean(uni.getStorageSync(`flower-studio-guide-v1:${uid}`))
    }
    catch {
      // 与引导组件一致：读取失败时不阻塞后续操作。
      return true
    }
  }

  function allowTodayAfterGuide(uid: string) {
    if (!uid)
      return
    guideResolvedUids.add(uid)
    void checkToday()
  }

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
    return getDailyFlowerArtwork(date)
  }

  async function checkToday() {
    try {
      await waitForAppAuthReady()
    }
    catch {
      return
    }
    const uid = uniCloud.getCurrentUserInfo().uid
    if (!guideResolved(uid))
      return
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
      if (localDate() !== date || uniCloud.getCurrentUserInfo().uid !== uid)
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
      const page = reset ? 1 : historyPage
      const result = await listDailyFlowerHistory({
        page,
        pageSize: 20,
        ...(historyDateFilter.value ? { date: historyDateFilter.value } : {}),
      })
      const merged = reset ? result.items : [...historyItems.value, ...result.items]
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
    allowTodayAfterGuide,
    loadHistory,
    dismissToday,
  }
})
