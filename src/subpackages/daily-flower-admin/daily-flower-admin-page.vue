<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import { computed, ref, watch } from 'vue'
import FlowerArtworkRenderer from '@/components/flower/flower-artwork-renderer.vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { type DailyFlowerDraft, parseDailyFlower } from '@/utils/flower/daily-flower'
import { attachCloudMaterials } from './lib/daily-flower-preview'
import { publishDailyFlower } from './lib/publish'

definePage({ layout: 'default', style: { navigationBarTitleText: '每日插花维护' } })

const source = ref('')
const draft = ref<DailyFlowerDraft | null>(null)
const error = ref('')
const message = ref('')
const busy = ref(false)
const previewing = ref(false)
const previewStyle = computed(() => ({ backgroundColor: '#f6f3eb' }))
const artwork = computed<Artwork | null>(() => draft.value?.artwork || null)
const catalog = useFlowerCatalogStore()
watch(source, () => { draft.value = null; message.value = '' })

async function prepareArtworkMaterials(value: Artwork) {
  const references = new Set<string>()
  for (const material of value.materials)
    references.add(material.materialId)
  references.add(value.container.materialId)
  references.add(value.background.materialId)
  if (!references.size)
    return

  await waitForAppAuthReady()
  const catalog = useFlowerCatalogStore()
  if (!catalog.loaded)
    await catalog.load()
  if (catalog.error)
    throw new Error(catalog.error)
  await Promise.all([...references].map(id => catalog.ensure(id)))
}

async function preview() {
  if (previewing.value || busy.value)
    return
  error.value = ''
  message.value = ''
  try {
    const parsed = parseDailyFlower(source.value)
    previewing.value = true
    await waitForAppAuthReady()
    await catalog.load()
    if (catalog.error)
      throw new Error(catalog.error)
    parsed.artwork = attachCloudMaterials(parsed.artwork, catalog.materials)
    await prepareArtworkMaterials(parsed.artwork)
    draft.value = parsed
    message.value = `已载入 ${draft.value.date} 花束预览`
  }
  catch (cause) {
    draft.value = null
    error.value = cause instanceof Error ? cause.message : '每日花束 JSON 无效'
  }
  finally {
    previewing.value = false
  }
}

async function publish() {
  const item = draft.value
  if (!item || busy.value)
    return

  try {
    const confirmation = await new Promise<UniApp.ShowModalRes>((resolve, reject) => uni.showModal({
      title: '发布每日花束',
      content: `发布 ${item.date} 的花束？如果该日期已有内容，将覆盖更新。`,
      confirmText: '确认发布',
      success: resolve,
      fail: reject,
    }))
    if (!confirmation.confirm)
      return

    busy.value = true
    error.value = ''
    message.value = '正在生成并上传花束图片…'
    await waitForAppAuthReady()
    const result = await publishDailyFlower(item)
    message.value = result.imageCleanupWarning
      ? `${item.date} 已发布，但旧图片清理失败，请检查云存储`
      : `${item.date} 已${result.updated ? '覆盖更新' : '发布'}`
  }
  catch (cause) {
    error.value = cause instanceof Error
      ? cause.message
      : typeof cause === 'object' && cause !== null && 'errMsg' in cause
        ? String(cause.errMsg)
        : '发布失败，请重试'
    message.value = ''
  }
  finally {
    busy.value = false
  }
}

</script>

<template>
  <view class="admin-page">
    <view class="intro">
      <view class="app-section-title">
        每日插花维护
      </view>
      <view class="hint">
        粘贴花束 JSON，预览和发布前会验证其中引用的云端素材。
      </view>
    </view>
    <view class="input-card">
      <view class="input-heading">
        <view>
          <text class="input-title">
            今日花束 JSON
          </text>
        </view>
      </view>
      <textarea
        v-model="source" class="json-input" :maxlength="70000" :disabled="busy || previewing"
        placeholder="粘贴每日花束 JSON…"
        :auto-height="false" :adjust-position="true" :disable-default-padding="true"
      />
      <view class="hint">
        格式：{ "date": "YYYY-MM-DD", "description": "花束描述", "artwork": { 花束 JSON 字段 } }
      </view>
      <view v-if="error" class="error">
        {{ error }}
      </view>
      <view v-if="message" class="status">
        {{ message }}
      </view>
      <button class="app-secondary-btn" :disabled="busy || previewing" @click="preview">
        {{ previewing ? '正在准备预览…' : '重新预览' }}
      </button>
    </view>

    <view v-if="draft" class="preview-card">
      <view class="preview-meta">
        <text class="preview-date">
          {{ draft.date }}
        </text>
        <text>{{ draft.description }}</text>
      </view>
      <view class="preview" :style="previewStyle">
        <FlowerArtworkRenderer
          v-if="artwork"
          :artwork="artwork"
          :prepared-materials="catalog.prepared"
        />
      </view>
      <button class="app-primary-btn" :disabled="busy" @click="publish">
        {{ busy ? '正在发布…' : '确认并发布到云端' }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page { padding: 24rpx; color: #3f463d; }
.intro { margin-bottom: 24rpx; }
.hint { margin: 12rpx 0; color: #7b8276; font-size: 23rpx; line-height: 1.6; }
.input-card, .preview-card { padding: 24rpx; border: 1rpx solid #e3dfd3; border-radius: 24rpx; background: #fffdf7; }
.input-heading { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 18rpx; }
.input-title { font-size: 28rpx; font-weight: 600; }
.selected-date { display: block; margin-top: 6rpx; color: #7b8276; font-size: 23rpx; }
.date-picker { flex: none; }
.date-picker-label { display: flex; align-items: center; gap: 8rpx; padding: 10rpx 14rpx; border: 1rpx solid #e3dfd3; border-radius: 12rpx; color: #53624d; font-size: 23rpx; }
.json-input { display: block; width: 100%; height: 300rpx; padding: 20rpx; box-sizing: border-box; border-radius: 14rpx; background: #f1f0e9; color: #3f463d; font-family: monospace; font-size: 22rpx; line-height: 1.6; }
.error { margin: 16rpx 0; color: #b82b36; font-size: 24rpx; line-height: 1.6; overflow-wrap: anywhere; }
.status { margin: 16rpx 0; color: #456344; font-size: 24rpx; line-height: 1.6; }
.input-card .app-secondary-btn { margin-top: 20rpx; }
.preview-card { margin-top: 24rpx; padding: 0 0 24rpx; overflow: hidden; }
.preview-meta { display: flex; flex-direction: column; gap: 10rpx; margin: 0 24rpx 18rpx; padding-top: 24rpx; color: #777d70; font-size: 25rpx; line-height: 1.5; }
.preview-date { color: #3f463d; font-size: 30rpx; font-weight: 600; }
.preview { position: relative; width: 698rpx; height: 1000rpx; overflow: hidden; }
.preview-card > .app-primary-btn { margin: 20rpx 24rpx 0; }
</style>
