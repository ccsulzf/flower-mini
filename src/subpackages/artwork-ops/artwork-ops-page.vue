<script setup lang="ts">
import type { DailyFlowerSummary, RemovalResult, WorkSummary } from './lib/api'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import {
  listDailyFlowers,
  listWorks,
  removeAllDailyFlowers,
  removeAllWorks,
  removeDailyFlowers,
  removeWorks,
} from './lib/api'

definePage({ layout: 'default', style: { navigationBarTitleText: '作品运维', } })

type Tab = 'works' | 'daily'

const tab = ref<Tab>('works')
const works = ref<WorkSummary[]>([])
const dailyFlowers = ref<DailyFlowerSummary[]>([])
const selectedWorks = ref<string[]>([])
const selectedDailyFlowers = ref<string[]>([])
const workPage = ref(1)
const dailyPage = ref(1)
const worksHasMore = ref(false)
const dailyHasMore = ref(false)
const loadingWorks = ref(false)
const loadingDaily = ref(false)
const busy = ref(false)
const error = ref('')
const message = ref('')

const currentSelectionCount = computed(() => tab.value === 'works' ? selectedWorks.value.length : selectedDailyFlowers.value.length)

function errorMessage(value: unknown) {
  return value instanceof Error ? value.message : '操作失败，请稍后重试'
}

function includes(values: string[], id: string) {
  return values.includes(id)
}

function toggleWork(id: string) {
  selectedWorks.value = selectedWorks.value.includes(id) ? selectedWorks.value.filter(value => value !== id) : [...selectedWorks.value, id]
}

function toggleDailyFlower(id: string) {
  selectedDailyFlowers.value = selectedDailyFlowers.value.includes(id) ? selectedDailyFlowers.value.filter(value => value !== id) : [...selectedDailyFlowers.value, id]
}

function formatTime(timestamp: number) {
  if (!Number.isFinite(timestamp))
    return '时间未知'
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function loadWorks(reset = false) {
  if (loadingWorks.value || (!reset && !worksHasMore.value))
    return
  loadingWorks.value = true
  error.value = ''
  const page = reset ? 1 : workPage.value
  try {
    const result = await listWorks(page)
    works.value = reset ? result.items : [...works.value, ...result.items]
    worksHasMore.value = result.hasMore
    workPage.value = page + 1
    if (reset)
      selectedWorks.value = []
  }
  catch (value) {
    error.value = errorMessage(value)
  }
  finally {
    loadingWorks.value = false
  }
}

async function loadDailyFlowers(reset = false) {
  if (loadingDaily.value || (!reset && !dailyHasMore.value))
    return
  loadingDaily.value = true
  error.value = ''
  const page = reset ? 1 : dailyPage.value
  try {
    const result = await listDailyFlowers(page)
    dailyFlowers.value = reset ? result.items : [...dailyFlowers.value, ...result.items]
    dailyHasMore.value = result.hasMore
    dailyPage.value = page + 1
    if (reset)
      selectedDailyFlowers.value = []
  }
  catch (value) {
    error.value = errorMessage(value)
  }
  finally {
    loadingDaily.value = false
  }
}

async function confirmRemoval(title: string, content: string) {
  const result = await new Promise<UniApp.ShowModalRes>((resolve, reject) => uni.showModal({
    title,
    content,
    confirmText: '删除',
    confirmColor: '#b82b36',
    success: resolve,
    fail: reject,
  }))
  return result.confirm
}

function showRemovalResult(label: string, result: RemovalResult) {
  message.value = `已删除 ${result.deleted} 个${label}${result.cleanupWarnings ? `，另有 ${result.cleanupWarnings} 个云文件清理失败` : ''}`
}

async function deleteSelectedWorks() {
  const ids = [...selectedWorks.value]
  if (!ids.length || busy.value)
    return
  try {
    if (!await confirmRemoval('批量删除作品', `确定删除选中的 ${ids.length} 个作品吗？此操作无法撤销。`))
      return
    busy.value = true
    error.value = ''
    message.value = ''
    showRemovalResult('作品', await removeWorks(ids))
    await loadWorks(true)
  }
  catch (value) {
    error.value = errorMessage(value)
  }
  finally {
    busy.value = false
  }
}

async function deleteAllWorks() {
  if (busy.value)
    return
  try {
    if (!await confirmRemoval('删除全部作品', '确定删除当前登录账号的全部作品吗？此操作无法撤销。'))
      return
    busy.value = true
    error.value = ''
    message.value = ''
    showRemovalResult('作品', await removeAllWorks())
    await loadWorks(true)
  }
  catch (value) {
    error.value = errorMessage(value)
  }
  finally {
    busy.value = false
  }
}

async function deleteSelectedDailyFlowers() {
  const ids = [...selectedDailyFlowers.value]
  if (!ids.length || busy.value)
    return
  try {
    if (!await confirmRemoval('批量删除今日花束', `确定删除选中的 ${ids.length} 个今日花束吗？此操作无法撤销。`))
      return
    busy.value = true
    error.value = ''
    message.value = ''
    showRemovalResult('今日花束', await removeDailyFlowers(ids))
    await loadDailyFlowers(true)
  }
  catch (value) {
    error.value = errorMessage(value)
  }
  finally {
    busy.value = false
  }
}

async function deleteAllDailyFlowers() {
  if (busy.value)
    return
  try {
    if (!await confirmRemoval('删除全部今日花束', '确定删除所有已发布的今日花束吗？此操作影响所有用户且无法撤销。'))
      return
    busy.value = true
    error.value = ''
    message.value = ''
    showRemovalResult('今日花束', await removeAllDailyFlowers())
    await loadDailyFlowers(true)
  }
  catch (value) {
    error.value = errorMessage(value)
  }
  finally {
    busy.value = false
  }
}

function switchTab(next: Tab) {
  tab.value = next
  error.value = ''
  message.value = ''
  if (next === 'works' && !works.value.length)
    void loadWorks(true)
  if (next === 'daily' && !dailyFlowers.value.length)
    void loadDailyFlowers(true)
}

onShow(() => {
  void loadWorks(true)
  void loadDailyFlowers(true)
})
</script>

<template>
  <view class="ops-page app-page">
    <view class="warning">
      仅用于开发调试。删除会立即写入云端，且无法撤销。
    </view>

    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'works' }" @click="switchTab('works')">
        我的作品
      </view>
      <view class="tab" :class="{ active: tab === 'daily' }" @click="switchTab('daily')">
        今日花束
      </view>
    </view>

    <view v-if="error" class="error-message">{{ error }}</view>
    <view v-if="message" class="success-message">{{ message }}</view>

    <template v-if="tab === 'works'">
      <view class="action-bar app-card">
        <text>已选择 {{ currentSelectionCount }} 项</text>
        <view class="actions">
          <button class="delete-button" :disabled="busy || !selectedWorks.length" @click="deleteSelectedWorks">删除选中</button>
          <button class="delete-all-button" :disabled="busy || (!works.length && !worksHasMore)" @click="deleteAllWorks">删除我的全部作品</button>
        </view>
      </view>

      <view v-for="work in works" :key="work.id" class="record app-card" :class="{ selected: includes(selectedWorks, work.id) }" @click="toggleWork(work.id)">
        <view class="check">{{ includes(selectedWorks, work.id) ? '✓' : '' }}</view>
        <view class="record-info">
          <view class="record-title">{{ work.title || '未命名作品' }}</view>
          <view v-if="work.description" class="description">{{ work.description }}</view>
          <view class="meta">更新于 {{ formatTime(work.updatedAt) }}</view>
          <view class="id">{{ work.id }}</view>
        </view>
      </view>

      <view v-if="!works.length && !loadingWorks" class="empty app-card">当前账号没有作品</view>
      <button v-if="worksHasMore" class="load-more app-secondary-btn" :disabled="loadingWorks || busy" @click="loadWorks()">
        {{ loadingWorks ? '加载中…' : '加载更多' }}
      </button>
      <view v-else-if="loadingWorks" class="loading">正在加载作品…</view>
    </template>

    <template v-else>
      <view class="action-bar app-card">
        <text>已选择 {{ currentSelectionCount }} 项</text>
        <view class="actions">
          <button class="delete-button" :disabled="busy || !selectedDailyFlowers.length" @click="deleteSelectedDailyFlowers">删除选中</button>
          <button class="delete-all-button" :disabled="busy || (!dailyFlowers.length && !dailyHasMore)" @click="deleteAllDailyFlowers">删除全部今日花束</button>
        </view>
      </view>

      <view v-for="flower in dailyFlowers" :key="flower.id" class="record app-card" :class="{ selected: includes(selectedDailyFlowers, flower.id) }" @click="toggleDailyFlower(flower.id)">
        <view class="check">{{ includes(selectedDailyFlowers, flower.id) ? '✓' : '' }}</view>
        <view class="record-info">
          <view class="record-title">{{ flower.date }}</view>
          <view class="description">{{ flower.description }}</view>
          <view class="meta">更新于 {{ formatTime(flower.updatedAt) }}</view>
        </view>
      </view>

      <view v-if="!dailyFlowers.length && !loadingDaily" class="empty app-card">暂无已发布的今日花束</view>
      <button v-if="dailyHasMore" class="load-more app-secondary-btn" :disabled="loadingDaily || busy" @click="loadDailyFlowers()">
        {{ loadingDaily ? '加载中…' : '加载更多' }}
      </button>
      <view v-else-if="loadingDaily" class="loading">正在加载今日花束…</view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.ops-page { padding: 24rpx; box-sizing: border-box; }
.warning { margin-bottom: 20rpx; padding: 18rpx 22rpx; color: var(--app-ink); background: var(--app-surfaceMuted); border-radius: 14rpx; font-size: 24rpx; line-height: 1.6; }
.tabs { display: flex; padding: 6rpx; margin-bottom: 20rpx; background: var(--app-surfaceMuted); border-radius: 16rpx; }
.tab { flex: 1; padding: 18rpx; text-align: center; color: var(--app-brandStrong); font-size: 27rpx; border-radius: 12rpx; }
.tab.active { color: var(--app-brandStrong); background: var(--app-surface); font-weight: 600; }
.action-bar { margin-bottom: 18rpx; padding: 20rpx; color: var(--app-ink); font-size: 24rpx; }
.actions { display: flex; gap: 12rpx; margin-top: 16rpx; }
.actions button { flex: 1; margin: 0; padding: 0 10rpx; font-size: 24rpx; }
.delete-button { color: var(--app-danger); background: var(--app-dangerSoft); }
.delete-all-button { color: var(--app-surface); background: var(--app-danger); }
.delete-button[disabled], .delete-all-button[disabled] { color: var(--app-subtle); background: var(--app-surfaceMuted); }
.record { display: flex; align-items: flex-start; gap: 18rpx; margin-bottom: 14rpx; padding: 22rpx; border: 2rpx solid transparent; }
.record.selected { border-color: var(--app-sage); background: var(--app-page); }
.check { width: 36rpx; height: 36rpx; flex-shrink: 0; border: 2rpx solid var(--app-sage); border-radius: 8rpx; color: var(--app-surface); background: var(--app-surface); line-height: 34rpx; text-align: center; font-size: 24rpx; }
.selected .check { border-color: var(--app-brandStrong); background: var(--app-brandStrong); }
.record-info { flex: 1; min-width: 0; }
.record-title { color: var(--app-ink); font-size: 28rpx; font-weight: 600; overflow-wrap: anywhere; }
.description { margin-top: 8rpx; color: var(--app-inkMuted); font-size: 24rpx; line-height: 1.55; }
.meta, .id { margin-top: 10rpx; color: var(--app-inkMuted); font-size: 21rpx; overflow-wrap: anywhere; }
.error-message, .success-message { margin-bottom: 16rpx; padding: 16rpx 20rpx; border-radius: 12rpx; font-size: 24rpx; line-height: 1.5; }
.error-message { color: var(--app-danger); background: var(--app-dangerSoft); }
.success-message { color: var(--app-brandStrong); background: var(--app-sageSoft); }
.empty, .loading { padding: 46rpx 24rpx; color: var(--app-brandStrong); text-align: center; font-size: 25rpx; }
.load-more { margin-top: 18rpx; }
</style>
