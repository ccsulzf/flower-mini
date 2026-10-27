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

type DraftOrigin = 'local' | 'pasted'
type DraftStatus = 'pending' | 'validating' | 'ready' | 'publishing' | 'published' | 'error'

interface DraftQueueItem {
  date: string
  description: string
  draft: DailyFlowerDraft
  origin: DraftOrigin
  label: string
  selected: boolean
  status: DraftStatus
  error: string
  result: string
}

const pastedSource = ref('')
const localItems = ref<DraftQueueItem[]>([])
const pastedItems = ref<DraftQueueItem[]>([])
const localErrors = ref<string[]>([])
const importError = ref('')
const operationMessage = ref('')
const currentDate = ref('')
const batchPublishing = ref(false)
const catalog = useFlowerCatalogStore()
const { deviceWidth } = useDevice()

const queueItems = computed(() => {
  const merged = new Map<string, DraftQueueItem>()
  for (const item of localItems.value)
    merged.set(item.date, item)
  for (const item of pastedItems.value)
    merged.set(item.date, item)
  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date))
})
const currentItem = computed(() => queueItems.value.find(item => item.date === currentDate.value) || null)
const currentArtwork = computed<Artwork | null>(() => {
  const item = currentItem.value
  return item && ['ready', 'publishing', 'published'].includes(item.status) ? item.draft.artwork : null
})
const selectedItems = computed(() => queueItems.value.filter(item => item.selected))
const selectedCount = computed(() => selectedItems.value.length)
const publishedCount = computed(() => queueItems.value.filter(item => item.status === 'published').length)
const failedCount = computed(() => queueItems.value.filter(item => item.status === 'error').length)
const allSelected = computed(() => queueItems.value.length > 0 && selectedCount.value === queueItems.value.length)
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

function queueItem(draft: DailyFlowerDraft, origin: DraftOrigin, label: string, selected = true): DraftQueueItem {
  return { date: draft.date, description: draft.description, draft, origin, label, selected, status: 'pending', error: '', result: '' }
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
  for (const entry of localDailyFlowerDrafts()) {
    try {
      const draft = parseDailyFlower(entry.source)
      items.push(queueItem(draft, 'local', entry.filename, draft.date >= localDate()))
    }
    catch (cause) {
      errors.push(`${entry.filename}：${failureMessage(cause, '草稿无效')}`)
    }
  }
  localItems.value = items
  localErrors.value = errors
  syncCurrentDate(localDate())
}

function importPastedDrafts() {
  importError.value = ''
  operationMessage.value = ''
  try {
    if (!pastedSource.value.trim())
      throw new Error('请先粘贴单个花束对象或花束 JSON 数组')
    if (pastedSource.value.length > 500_000)
      throw new Error('粘贴内容过大，请拆分后导入')
    const value: unknown = JSON.parse(pastedSource.value)
    const rows = Array.isArray(value) ? value : [value]
    if (!rows.length)
      throw new Error('花束 JSON 数组不能为空')
    const byDate = new Map<string, DraftQueueItem>()
    rows.forEach((row, index) => {
      const draft = parseDailyFlower(JSON.stringify(row))
      byDate.set(draft.date, queueItem(draft, 'pasted', `粘贴项 ${index + 1}`))
    })
    pastedItems.value = [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
    syncCurrentDate(pastedItems.value[0]?.date)
    operationMessage.value = `已导入 ${pastedItems.value.length} 天草稿；同日期内容以粘贴版本为准`
  }
  catch (cause) {
    importError.value = failureMessage(cause, '无法解析粘贴内容')
  }
}

function clearPastedDrafts() {
  pastedItems.value = []
  pastedSource.value = ''
  importError.value = ''
  operationMessage.value = '已移除粘贴草稿，恢复本地文件版本'
  syncCurrentDate()
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

function toggleItem(item: DraftQueueItem) {
  if (item.status !== 'publishing')
    item.selected = !item.selected
}

function toggleAll() {
  const selected = !allSelected.value
  for (const item of queueItems.value) {
    if (item.status !== 'publishing')
      item.selected = selected
  }
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
  if (askConfirmation && !await confirmPublish('发布每日花束', `发布 ${item.date} 的花束？已有内容将被覆盖。`))
    return false
  item.status = 'publishing'
  item.error = ''
  item.result = '正在生成并上传图片…'
  try {
    const result = await publishDailyFlower(item.draft)
    item.status = 'published'
    item.result = result.imageCleanupWarning ? '发布成功，旧图片清理失败' : result.updated ? '已覆盖更新' : '发布成功'
    return true
  }
  catch (cause) {
    item.status = 'error'
    item.error = failureMessage(cause, '发布失败，请重试')
    item.result = ''
    return false
  }
}

async function publishSelected() {
  if (batchPublishing.value || !selectedItems.value.length)
    return
  const targets = [...selectedItems.value].sort((left, right) => left.date.localeCompare(right.date))
  const dateRange = targets.length === 1 ? targets[0].date : `${targets[0].date} 至 ${targets[targets.length - 1].date}`
  if (!await confirmPublish('批量发布每日花束', `将按日期顺序发布 ${targets.length} 天（${dateRange}）。单项失败不会中断后续发布。`))
    return
  batchPublishing.value = true
  operationMessage.value = `正在发布 0 / ${targets.length}`
  let successes = 0
  try {
    for (let index = 0; index < targets.length; index++) {
      const item = targets[index]
      currentDate.value = item.date
      operationMessage.value = `正在发布 ${index + 1} / ${targets.length}：${item.date}`
      if (await publishItem(item, false))
        successes++
    }
    operationMessage.value = `批量发布完成：成功 ${successes} 天，失败 ${targets.length - successes} 天`
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
      <view>
        <text class="admin-kicker">
          DAILY FLOWER DESK
        </text><text class="admin-title">
          每日花束运营台
        </text>
      </view>
      <view class="admin-summary">
        <text>{{ queueItems.length }} 天草稿</text><text>{{ selectedCount }} 天已选</text>
        <text v-if="publishedCount">
          {{ publishedCount }} 天已发布
        </text><text v-if="failedCount" class="summary-error">
          {{ failedCount }} 天需处理
        </text>
      </view>
    </view>

    <view class="import-sheet">
      <view class="section-heading">
        <view>
          <text class="section-title">
            导入一周草稿
          </text><text class="section-note">
            已自动读取本地文件；也可粘贴单个对象或 JSON 数组，同日期以粘贴内容为准。
          </text>
        </view>
        <text class="local-count">
          本地 {{ localItems.length }} 份
        </text>
      </view>
      <textarea v-model="pastedSource" class="json-input" :maxlength="500000" :disabled="batchPublishing" placeholder="粘贴 [{ date, description, artwork }, ...]" :auto-height="false" :adjust-position="true" :disable-default-padding="true" />
      <view class="import-actions">
        <button class="secondary paper-button" :disabled="batchPublishing" @click="importPastedDrafts">
          导入粘贴内容
        </button>
        <button v-if="pastedItems.length" class="text-button" :disabled="batchPublishing" @click="clearPastedDrafts">
          清空粘贴版本
        </button>
      </view>
      <text v-if="importError" class="feedback error-text">
        {{ importError }}
      </text>
      <text v-if="operationMessage" class="feedback status-text">
        {{ operationMessage }}
      </text>
      <view v-if="localErrors.length" class="local-errors">
        <text v-for="item in localErrors" :key="item">
          {{ item }}
        </text>
      </view>
    </view>

    <view class="queue-sheet">
      <view class="section-heading queue-heading">
        <view>
          <text class="section-title">
            发布队列
          </text><text class="section-note">
            点击日期可校验并查看大图；批量发布按日期顺序执行。
          </text>
        </view>
        <button class="select-all" :disabled="batchPublishing || !queueItems.length" @click="toggleAll">
          {{ allSelected ? '取消全选' : '全选' }}
        </button>
      </view>
      <view v-if="queueItems.length" class="draft-list">
        <view v-for="item in queueItems" :key="item.date" class="draft-row" :class="[`status-${item.status}`, { active: currentDate === item.date }]" @click="openItem(item)">
          <view class="draft-check" :class="{ checked: item.selected }" @click.stop="toggleItem(item)">
            <view v-if="item.selected" class="i-carbon-checkmark" />
          </view>
          <view class="draft-copy">
            <view class="draft-line">
              <text class="draft-date">
                {{ item.date }}
              </text><text class="origin-tag" :class="item.origin">
                {{ item.origin === 'pasted' ? '粘贴' : '本地' }}
              </text><text class="status-tag">
                {{ statusLabel(item) }}
              </text>
            </view>
            <text class="draft-description">
              {{ item.description }}
            </text>
            <text v-if="item.error" class="row-message row-error">
              {{ item.error }}
            </text><text v-else-if="item.result" class="row-message">
              {{ item.result }}
            </text>
          </view>
          <button class="row-publish" :disabled="batchPublishing || item.status === 'publishing' || item.status === 'validating'" @click.stop="publishItem(item)">
            {{ item.status === 'published' ? '重新发布' : item.status === 'error' ? '重试' : '发布' }}
          </button>
        </view>
      </view>
      <view v-else class="empty-state">
        未找到本地草稿，请粘贴花束 JSON 数组。
      </view>
      <view class="batch-bar">
        <view>
          <text class="batch-count">
            已选 {{ selectedCount }} 天
          </text><text class="batch-note">
            未来日期可提前发布，到当天才会在用户端出现
          </text>
        </view>
        <button class="paper-button primary" :disabled="batchPublishing || !selectedCount" @click="publishSelected">
          {{ batchPublishing ? '批量发布中…' : `发布选中 ${selectedCount} 天` }}
        </button>
      </view>
    </view>

    <view v-if="currentItem" class="preview-sheet">
      <view class="preview-meta">
        <view>
          <text class="preview-date">
            {{ currentItem.date }}
          </text><text class="preview-source">
            {{ currentItem.label }}
          </text>
        </view><text class="preview-description">
          {{ currentItem.description }}
        </text>
      </view>
      <view class="preview">
        <view v-if="currentArtwork" class="preview-board" :style="previewBoardStyle">
          <FlowerArtworkRenderer :artwork="currentArtwork" :prepared-materials="catalog.prepared" />
        </view>
        <view v-else class="preview-placeholder">
          <view class="preview-icon i-carbon-flower" /><text>{{ currentItem.status === 'validating' ? '正在准备花材…' : currentItem.error || '点击当前日期重新校验预览' }}</text><button v-if="currentItem.status !== 'validating'" class="text-button" @click="openItem(currentItem)">
            重新校验
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page{min-height:100vh;padding:28rpx 24rpx 80rpx;box-sizing:border-box;background:#f6f1e7;color:#47483f}.admin-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24rpx;margin:4rpx 6rpx 30rpx}.admin-kicker{display:block;color:#89927f;font-size:19rpx;letter-spacing:3rpx}.admin-title{display:block;margin-top:8rpx;font-family:serif;font-size:40rpx;font-weight:600}.admin-summary{display:flex;max-width:330rpx;flex-wrap:wrap;justify-content:flex-end;gap:7rpx 14rpx;color:#73786c;font-size:21rpx}.summary-error{color:#a55757}.import-sheet,.queue-sheet,.preview-sheet{position:relative;margin-top:24rpx;padding:26rpx;border:1rpx solid rgba(122,110,89,.18);background:rgba(255,253,247,.86);box-shadow:4rpx 6rpx 0 rgba(104,91,70,.055)}.import-sheet{margin-top:0;transform:rotate(-.12deg)}.queue-sheet{transform:rotate(.08deg)}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:22rpx;margin-bottom:20rpx}.section-title{display:block;font-family:serif;font-size:30rpx;font-weight:600}.section-note{display:block;margin-top:8rpx;color:#7a8073;font-size:22rpx;line-height:1.55}.local-count{flex:none;padding:7rpx 12rpx;background:#e7eadc;color:#66705e;font-size:21rpx;transform:rotate(1deg)}.json-input{display:block;width:100%;height:250rpx;padding:18rpx;box-sizing:border-box;border:1rpx solid rgba(112,103,87,.15);border-radius:7rpx 12rpx 6rpx 9rpx;background:#f0eee6;color:#41463f;font-family:monospace;font-size:21rpx;line-height:1.55}.import-actions{display:flex;align-items:center;gap:20rpx;margin-top:18rpx}.paper-button{position:relative;margin:0;padding:0 25rpx;border:1rpx solid rgba(91,101,82,.46);border-radius:9rpx 5rpx 11rpx 6rpx;background:#f8f3e8;color:#56604f;font-size:24rpx;line-height:68rpx;box-shadow:3rpx 4rpx 0 rgba(84,91,75,.15)}.paper-button::after,.text-button::after,.select-all::after,.row-publish::after{border:0}.paper-button:active{transform:translateY(2rpx)}.paper-button.primary{border-color:#66735e;background:#77836e;color:#fffdf7}.paper-button[disabled],.text-button[disabled],.select-all[disabled],.row-publish[disabled]{opacity:.42}.text-button,.select-all{margin:0;padding:0;border:0;background:transparent;color:#71806a;font-size:22rpx;line-height:60rpx}.feedback{display:block;margin-top:15rpx;font-size:23rpx;line-height:1.5}.error-text,.row-error{color:#a34e50}.status-text,.row-message{color:#5c7758}.local-errors{display:flex;flex-direction:column;gap:7rpx;margin-top:14rpx;padding:14rpx;border-left:4rpx solid #b77972;background:#f5e8e3;color:#944e4d;font-size:21rpx;line-height:1.45}.queue-heading{align-items:center}.select-all{flex:none}.draft-list{border-top:1rpx solid rgba(111,102,87,.16)}.draft-row{display:flex;align-items:flex-start;gap:16rpx;padding:20rpx 4rpx;border-bottom:1rpx solid rgba(111,102,87,.13);transition:background-color .15s}.draft-row.active{margin:0 -10rpx;padding-right:14rpx;padding-left:14rpx;background:rgba(225,229,211,.48)}.draft-check{display:flex;width:34rpx;height:34rpx;flex:none;align-items:center;justify-content:center;margin-top:3rpx;border:2rpx solid #9da493;border-radius:5rpx 8rpx 4rpx 7rpx;color:#fff;font-size:25rpx}.draft-check.checked{border-color:#78856e;background:#78856e}.draft-copy{min-width:0;flex:1}.draft-line{display:flex;align-items:center;gap:10rpx}.draft-date{color:#3f463d;font-size:27rpx;font-weight:600}.origin-tag,.status-tag{padding:4rpx 8rpx;font-size:18rpx;line-height:1}.origin-tag{background:#ebe5d6;color:#7a6d5d;transform:rotate(-1deg)}.origin-tag.pasted{background:#e4e0ec;color:#6d637b}.status-tag{margin-left:auto;color:#777d70}.status-ready .status-tag,.status-published .status-tag{color:#567052}.status-error .status-tag{color:#a34e50}.draft-description{display:-webkit-box;overflow:hidden;margin-top:8rpx;color:#777d70;font-size:21rpx;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.row-message{display:block;margin-top:7rpx;font-size:20rpx;line-height:1.4}.row-publish{flex:none;margin:0;padding:0 13rpx;border:1rpx solid rgba(102,116,94,.35);border-radius:8rpx 5rpx 9rpx 6rpx;background:#f8f5ec;color:#63705c;font-size:21rpx;line-height:54rpx}.empty-state{padding:70rpx 20rpx;text-align:center;color:#85897f;font-size:23rpx}.batch-bar{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin:24rpx -6rpx -6rpx;padding:20rpx 18rpx;background:rgba(233,231,218,.62)}.batch-count{display:block;font-size:25rpx;font-weight:600}.batch-note{display:block;max-width:350rpx;margin-top:5rpx;color:#7e8278;font-size:19rpx;line-height:1.4}.preview-sheet{padding:0;overflow:hidden}.preview-meta{display:flex;gap:20rpx;align-items:flex-start;justify-content:space-between;padding:24rpx 26rpx 20rpx}.preview-date{display:block;font-family:serif;font-size:32rpx;font-weight:600}.preview-source{display:block;margin-top:5rpx;color:#8a877c;font-size:19rpx}.preview-description{max-width:430rpx;color:#71776b;font-size:22rpx;line-height:1.55}.preview{position:relative;width:698rpx;height:1000rpx;overflow:hidden;background:#f6f3eb}.preview-board{position:absolute;top:0;left:0;width:698px;height:1000px;transform-origin:top left}.preview-placeholder{display:flex;height:100%;flex-direction:column;align-items:center;justify-content:center;padding:50rpx;box-sizing:border-box;color:#7c8277;font-size:24rpx;line-height:1.6;text-align:center}.preview-icon{margin-bottom:18rpx;color:#929d88;font-size:64rpx}
</style>
