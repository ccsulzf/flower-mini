<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import { computed, onMounted, ref } from 'vue'
import FlowerArtworkRenderer from '@/components/flower/flower-artwork-renderer.vue'
import { useDevice } from '@/hooks/useDevice'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { type DailyFlowerDraft, parseDailyFlower } from '@/utils/flower/daily-flower'
import { attachCloudMaterials } from './lib/daily-flower-preview'
import { localDailyFlowerDrafts } from './lib/local-daily-flower-drafts'
import { publishDailyFlower } from './lib/publish'

definePage({ layout: 'default', style: { navigationBarTitleText: '每日花束运营台' } })

type DraftStatus = 'pending' | 'validating' | 'ready' | 'publishing' | 'published' | 'error'

interface DraftQueueItem {
  date: string
  description: string
  draft: DailyFlowerDraft
  label: string
  status: DraftStatus
  error: string
  result: string
}

const localItems = ref<DraftQueueItem[]>([])
const localErrors = ref<string[]>([])
const operationMessage = ref('')
const currentDate = ref('')
const batchPublishing = ref(false)
const catalog = useFlowerCatalogStore()
const { deviceWidth } = useDevice()
const weekRange = currentWeekRange()

const queueItems = computed(() => {
  const byDate = new Map(localItems.value.map(item => [item.date, item]))
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
})
const currentItem = computed(() => queueItems.value.find(item => item.date === currentDate.value) || null)
const currentArtwork = computed<Artwork | null>(() => {
  const item = currentItem.value
  return item && ['ready', 'publishing', 'published'].includes(item.status) ? item.draft.artwork : null
})
const publishedCount = computed(() => queueItems.value.filter(item => item.status === 'published').length)
const previewScale = computed(() => Math.min(1, deviceWidth.value * 698 / 750 / studioMetrics.width))
const previewBoardStyle = computed(() => ({ transform: `scale(${previewScale.value})` }))

function failureMessage(cause: unknown, fallback: string) {
  return cause instanceof Error
    ? cause.message
    : typeof cause === 'object' && cause !== null && 'errMsg' in cause
      ? String(cause.errMsg)
      : fallback
}

function localDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function currentWeekRange(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDate(monday), end: formatDate(sunday) }
}

function queueItem(draft: DailyFlowerDraft, label: string): DraftQueueItem {
  return { date: draft.date, description: draft.description, draft, label, status: 'pending', error: '', result: '' }
}

function syncCurrentDate(preferred = '') {
  if (preferred && queueItems.value.some(item => item.date === preferred)) {
    currentDate.value = preferred
    return
  }
  if (!queueItems.value.some(item => item.date === currentDate.value))
    currentDate.value = queueItems.value[0]?.date || ''
}

function loadLocalDrafts() {
  const items: DraftQueueItem[] = []
  const errors: string[] = []
  for (const entry of localDailyFlowerDrafts(weekRange.start, weekRange.end)) {
    try {
      const draft = parseDailyFlower(entry.source)
      items.push(queueItem(draft, entry.filename))
    }
    catch (cause) {
      errors.push(`${entry.filename}：${failureMessage(cause, '草稿无效')}`)
    }
  }
  localItems.value = items
  localErrors.value = errors
  syncCurrentDate(items.some(item => item.date === localDate()) ? localDate() : items[0]?.date)
}

async function prepareArtworkMaterials(value: Artwork) {
  const references = new Set(value.materials.map(item => item.materialId))
  references.add(value.container.materialId)
  references.add(value.background.materialId)
  await waitForAppAuthReady()
  if (!catalog.loaded)
    await catalog.load()
  if (catalog.error)
    throw new Error(catalog.error)
  await Promise.all([...references].map(id => catalog.ensure(id)))
}

async function validateItem(item: DraftQueueItem) {
  if (item.status === 'ready' || item.status === 'published')
    return true
  if (item.status === 'validating' || item.status === 'publishing')
    return false
  item.status = 'validating'
  item.error = ''
  item.result = ''
  try {
    await waitForAppAuthReady()
    if (!catalog.loaded)
      await catalog.load()
    if (catalog.error)
      throw new Error(catalog.error)
    if (item.draft.artwork.container.type === 'bouquet') {
      const vase = catalog.materials.find(material => material.category === 'vase')
      if (!vase)
        throw new Error('旧草稿使用了已停用的花束包装，且云端没有可替换的花瓶')
      item.draft.artwork.container = { materialId: vase.id, type: 'vase' }
      item.draft.artwork.containerLayouts = {}
      item.result = '已将旧包装引用替换为花瓶'
    }
    item.draft.artwork = attachCloudMaterials(item.draft.artwork, catalog.materials)
    await prepareArtworkMaterials(item.draft.artwork)
    item.status = 'ready'
    return true
  }
  catch (cause) {
    item.status = 'error'
    item.error = failureMessage(cause, '草稿校验失败')
    return false
  }
}

async function openItem(item: DraftQueueItem) {
  currentDate.value = item.date
  await validateItem(item)
}

function statusLabel(item: DraftQueueItem) {
  if (item.status === 'validating')
    return '校验中'
  if (item.status === 'ready')
    return '可发布'
  if (item.status === 'publishing')
    return '发布中'
  if (item.status === 'published')
    return '已发布'
  if (item.status === 'error')
    return '需处理'
  return '待校验'
}

async function confirmPublish(title: string, content: string) {
  try {
    const confirmation = await new Promise<UniApp.ShowModalRes>((resolve, reject) => uni.showModal({
      title,
      content,
      confirmText: '确认发布',
      success: resolve,
      fail: reject,
    }))
    return confirmation.confirm
  }
  catch {
    return false
  }
}

async function publishItem(item: DraftQueueItem, askConfirmation = true) {
  currentDate.value = item.date
  if (item.status === 'publishing' || !await validateItem(item))
    return false
  if (askConfirmation && !await confirmPublish('上传本日花束', `上传 ${item.date} 的花束？已有内容将被更新。`))
    return false
  item.status = 'publishing'
  item.error = ''
  item.result = '正在生成并上传图片…'
  try {
    const result = await publishDailyFlower(item.draft)
    item.status = 'published'
    item.result = result.imageCleanupWarning ? '上传成功，旧图片清理失败' : result.updated ? '已更新上传' : '上传成功'
    return true
  }
  catch (cause) {
    item.status = 'error'
    item.error = failureMessage(cause, '上传失败，请重试')
    item.result = ''
    return false
  }
}

async function publishSelected() {
  if (batchPublishing.value || !queueItems.value.length)
    return
  const targets = [...queueItems.value].sort((left, right) => left.date.localeCompare(right.date))
  const dateRange = targets.length === 1 ? targets[0].date : `${targets[0].date} 至 ${targets[targets.length - 1].date}`
  if (!await confirmPublish('上传本周花束', `将按日期顺序上传本周 ${targets.length} 天（${dateRange}）。单项失败不会中断后续上传。`))
    return
  batchPublishing.value = true
  operationMessage.value = `正在上传 0 / ${targets.length}`
  let successes = 0
  try {
    for (let index = 0; index < targets.length; index++) {
      const item = targets[index]
      currentDate.value = item.date
      operationMessage.value = `正在上传 ${index + 1} / ${targets.length}：${item.date}`
      if (await publishItem(item, false))
        successes++
    }
    operationMessage.value = `本周上传完成：成功 ${successes} 天，失败 ${targets.length - successes} 天`
  }
  finally {
    batchPublishing.value = false
  }
}

onMounted(async () => {
  loadLocalDrafts()
  if (currentItem.value)
    await openItem(currentItem.value)
})
</script>

<template>
  <view class="admin-page">
    <view class="admin-heading">
      <view><text class="admin-kicker">DAILY FLOWER DESK</text><text class="admin-title">每日花束运营台</text></view>
      <text class="week-stamp">本周 {{ weekRange.start.slice(5) }} — {{ weekRange.end.slice(5) }}</text>
    </view>

    <view v-if="currentItem" class="preview-sheet">
      <view class="day-switcher">
        <button v-for="item in queueItems" :key="item.date" class="day-tab" :class="{ active: currentDate === item.date, done: item.status === 'published', failed: item.status === 'error' }" :disabled="batchPublishing" @click="openItem(item)">
          <text class="day-name">周{{ ['日', '一', '二', '三', '四', '五', '六'][new Date(`${item.date}T00:00:00`).getDay()] }}</text>
          <text class="day-number">{{ item.date.slice(8) }}</text>
        </button>
      </view>
      <view class="preview-heading">
        <view><text class="section-title">{{ currentItem.date }}</text><text class="section-note">{{ statusLabel(currentItem) }} · 本周 {{ queueItems.length }} 天草稿</text></view>
        <text v-if="publishedCount" class="published-count">已上传 {{ publishedCount }} 天</text>
      </view>
      <view class="preview-meta"><text class="preview-description">{{ currentItem.description }}</text></view>
      <view class="publish-panel">
        <view class="publish-copy"><text class="publish-label">上传本日</text><text class="publish-hint">未来日期可提前上传，到当天才会在用户端出现。</text></view>
        <button class="paper-button primary publish-button" :disabled="batchPublishing || currentItem.status === 'publishing' || currentItem.status === 'validating'" @click="publishItem(currentItem)">
          {{ currentItem.status === 'published' ? '重新上传本日' : currentItem.status === 'error' ? '重试本日' : '上传本日' }}
        </button>
      </view>
      <view class="week-upload-bar">
        <text class="week-upload-note">按日期顺序上传本周草稿，失败项会继续处理。</text>
        <button class="paper-button week-upload-button" :disabled="batchPublishing || !queueItems.length" @click="publishSelected">{{ batchPublishing ? '上传中…' : '上传本周' }}</button>
      </view>
      <view class="preview">
        <view v-if="currentArtwork" class="preview-board" :style="previewBoardStyle"><FlowerArtworkRenderer :artwork="currentArtwork" :prepared-materials="catalog.prepared" /></view>
        <view v-else class="preview-placeholder">
          <view class="preview-icon i-carbon-flower" />
          <text>{{ currentItem.status === 'validating' ? '正在准备花材…' : currentItem.error || '正在等待预览' }}</text>
          <button v-if="currentItem.status !== 'validating'" class="text-button" @click="openItem(currentItem)">重新校验</button>
        </view>
      </view>
      <view v-if="currentItem.error || currentItem.result" class="item-feedback" :class="{ failed: !!currentItem.error }">{{ currentItem.error || currentItem.result }}</view>
      <view v-if="localErrors.length" class="local-errors compact-errors"><text v-for="item in localErrors" :key="item">{{ item }}</text></view>
      <view v-if="operationMessage" class="operation-message">{{ operationMessage }}</view>
    </view>
    <view v-else class="empty-week">
      <text class="section-title">本周还没有花束</text>
      <text class="section-note">把本周每日花束数据放入 docs/daily-flowers 后重新打开运营台。</text>
      <view v-if="localErrors.length" class="local-errors"><text v-for="item in localErrors" :key="item">{{ item }}</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page{min-height:100vh;padding:28rpx 24rpx 80rpx;box-sizing:border-box;background:#f6f1e7;color:#47483f}.admin-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24rpx;margin:4rpx 6rpx 30rpx}.admin-kicker{display:block;color:#89927f;font-size:19rpx;letter-spacing:3rpx}.admin-title{display:block;margin-top:8rpx;font-family:serif;font-size:40rpx;font-weight:600}.admin-summary{display:flex;max-width:330rpx;flex-wrap:wrap;justify-content:flex-end;gap:7rpx 14rpx;color:#73786c;font-size:21rpx}.summary-error{color:#a55757}.overview-sheet,.queue-sheet,.preview-sheet{position:relative;margin-top:24rpx;padding:26rpx;border:1rpx solid rgba(122,110,89,.18);background:rgba(255,253,247,.86);box-shadow:4rpx 6rpx 0 rgba(104,91,70,.055)}.overview-sheet{margin-top:0;transform:rotate(-.1deg)}.overview-top{display:flex;align-items:center;gap:22rpx}.overview-copy{min-width:0;flex:1}.overview-count{display:flex;align-items:baseline;gap:8rpx;padding:10rpx 15rpx;background:#e7eadc;color:#66705e;transform:rotate(1deg)}.count-number{font-family:serif;font-size:34rpx;font-weight:600}.count-label{font-size:19rpx}.operation-message{margin-top:14rpx;color:#5c7758;font-size:20rpx;line-height:1.45}.local-errors{display:flex;flex-direction:column;gap:7rpx;margin-top:14rpx;padding:14rpx;border-left:4rpx solid #b77972;background:#f5e8e3;color:#944e4d;font-size:21rpx;line-height:1.45}.queue-sheet{transform:rotate(.06deg)}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:22rpx;margin-bottom:20rpx}.section-title{display:block;font-family:serif;font-size:30rpx;font-weight:600}.section-note{display:block;margin-top:8rpx;color:#7a8073;font-size:22rpx;line-height:1.55}.paper-button{position:relative;margin:0;padding:0 25rpx;border:1rpx solid rgba(91,101,82,.46);border-radius:9rpx 5rpx 11rpx 6rpx;background:#f8f3e8;color:#56604f;font-size:24rpx;line-height:68rpx;box-shadow:3rpx 4rpx 0 rgba(84,91,75,.15)}.paper-button::after,.select-all::after,.text-button::after{border:0}.paper-button:active{transform:translateY(2rpx)}.paper-button.primary{border-color:#66735e;background:#77836e;color:#fffdf7}.paper-button[disabled],.select-all[disabled]{opacity:.42}.select-all,.text-button{flex:none;margin:0;padding:0;border:0;background:transparent;color:#71806a;font-size:22rpx;line-height:60rpx}.queue-heading{align-items:center}.draft-list{border-top:1rpx solid rgba(111,102,87,.16)}.draft-row{display:flex;align-items:flex-start;gap:16rpx;padding:20rpx 4rpx;border-bottom:1rpx solid rgba(111,102,87,.13)}.draft-row.active{margin:0 -10rpx;padding-right:14rpx;padding-left:14rpx;background:rgba(225,229,211,.48)}.draft-check{display:flex;width:34rpx;height:34rpx;flex:none;align-items:center;justify-content:center;margin-top:3rpx;border:2rpx solid #9da493;border-radius:5rpx 8rpx 4rpx 7rpx;color:#fff;font-size:25rpx}.draft-check.checked{border-color:#78856e;background:#78856e}.draft-copy{min-width:0;flex:1}.draft-line{display:flex;align-items:center;gap:10rpx}.draft-date{color:#3f463d;font-size:27rpx;font-weight:600}.status-tag{margin-left:auto;color:#777d70}.status-ready .status-tag,.status-published .status-tag{color:#567052}.status-error .status-tag{color:#a34e50}.draft-description{display:-webkit-box;overflow:hidden;margin-top:8rpx;color:#777d70;font-size:21rpx;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.row-message{display:block;margin-top:7rpx;font-size:20rpx;line-height:1.4}.row-error{color:#a34e50}.row-message{color:#5c7758}.empty-state{padding:70rpx 20rpx;text-align:center;color:#85897f;font-size:23rpx}.preview-sheet{padding:0;overflow:hidden}.preview-heading{padding:26rpx 26rpx 0}.preview-meta{display:flex;gap:20rpx;align-items:flex-start;justify-content:space-between;padding:20rpx 26rpx}.preview-date{display:block;font-family:serif;font-size:32rpx;font-weight:600}.preview-source{display:block;margin-top:5rpx;color:#8a877c;font-size:19rpx}.preview-description{max-width:430rpx;color:#71776b;font-size:22rpx;line-height:1.55}.preview{position:relative;width:698rpx;height:1000rpx;overflow:hidden;background:#f6f3eb}.preview-board{position:absolute;top:0;left:0;width:698px;height:1000px;transform-origin:top left}.preview-placeholder{display:flex;height:100%;flex-direction:column;align-items:center;justify-content:center;padding:50rpx;box-sizing:border-box;color:#7c8277;font-size:24rpx;line-height:1.6;text-align:center}.preview-icon{margin-bottom:18rpx;color:#929d88;font-size:64rpx}.text-button{margin-top:8rpx}.publish-panel{display:flex;align-items:center;justify-content:space-between;gap:20rpx;padding:24rpx 26rpx}.publish-label{display:block;color:#3f463d;font-size:24rpx;font-weight:600}.publish-hint{display:block;margin-top:7rpx;color:#7c8277;font-size:19rpx;line-height:1.4}.publish-button{flex:none}.batch-bar{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin:0;padding:20rpx 26rpx;background:rgba(233,231,218,.62)}.batch-count{display:block;font-size:25rpx;font-weight:600}.batch-note{display:block;max-width:350rpx;margin-top:5rpx;color:#7e8278;font-size:19rpx;line-height:1.4}
.admin-page{padding:18rpx 16rpx 30rpx}.admin-heading{align-items:center;margin:0 4rpx 16rpx}.admin-title{font-size:34rpx}.week-stamp{flex:none;padding:8rpx 12rpx;background:#e7eadc;color:#66705e;font-size:20rpx;transform:rotate(1deg)}.preview-sheet{margin-top:0;border-radius:8rpx 13rpx 7rpx 10rpx}.day-switcher{display:flex;justify-content:space-between;gap:8rpx;padding:14rpx 16rpx 10rpx;border-bottom:1rpx solid rgba(111,102,87,.13)}.day-tab{display:flex;min-width:0;flex:1;flex-direction:column;align-items:center;justify-content:center;margin:0;padding:6rpx 2rpx;border:1rpx solid transparent;border-radius:7rpx 10rpx 6rpx 8rpx;background:transparent;color:#777d70;line-height:1.2}.day-tab::after{border:0}.day-name{font-size:18rpx}.day-number{margin-top:5rpx;font-size:24rpx;font-weight:600}.day-tab.active{border-color:rgba(102,116,94,.42);background:#e7eadc;color:#4f614b}.day-tab.done .day-number::after{display:block;width:7rpx;height:7rpx;margin:4rpx auto 0;border-radius:50%;background:#78906e;content:""}.day-tab.failed .day-number{color:#a34e50}.preview-heading{display:flex;align-items:center;justify-content:space-between;gap:16rpx;padding:16rpx 20rpx 0}.preview-heading .section-note{margin-top:3rpx;font-size:19rpx}.published-count{flex:none;color:#647a5d;font-size:19rpx}.preview-meta{padding:8rpx 20rpx 12rpx}.preview-description{max-width:none;color:#666e60;font-size:21rpx}.preview{width:698rpx;height:1000rpx}.preview-board{width:698px;height:1000px;transform-origin:top left}.preview-placeholder{padding:24rpx;font-size:22rpx}.item-feedback{padding:10rpx 20rpx 0;color:#5c7758;font-size:20rpx;line-height:1.4}.item-feedback.failed{color:#a34e50}.compact-errors{margin:10rpx 18rpx 0}.operation-message{margin:10rpx 20rpx 0;padding:8rpx 10rpx;background:rgba(231,234,220,.62);font-size:19rpx}.publish-panel{padding:12rpx 18rpx 14rpx}.publish-label{font-size:22rpx}.publish-hint{margin-top:3rpx;font-size:17rpx}.paper-button{padding:0 20rpx;font-size:21rpx;line-height:58rpx}.publish-button{min-width:170rpx}.week-upload-bar{display:flex;align-items:center;justify-content:space-between;gap:12rpx;padding:12rpx 18rpx 16rpx;border-top:1rpx solid rgba(111,102,87,.12);background:rgba(233,231,218,.42)}.week-upload-note{color:#7e8278;font-size:17rpx;line-height:1.35}.week-upload-button{flex:none;border-color:#77836e;background:#77836e;color:#fffdf7}.empty-week{display:flex;min-height:280rpx;flex-direction:column;align-items:center;justify-content:center;padding:36rpx;text-align:center}.empty-week .section-note{max-width:540rpx}.empty-week .local-errors{width:100%;box-sizing:border-box;text-align:left}
</style>
