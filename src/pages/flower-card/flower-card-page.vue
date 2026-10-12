<script setup lang="ts">
import type { FlowerCardText, FlowerGreetingText } from '@/models/flower-creation'
import { onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { useFlowerPageArtwork } from '@/hooks/useFlowerPageArtwork'
import { validateCard } from '@/utils/flower/creation-storage'

definePage({ style: { navigationBarTitleText: '制作贺卡', navigationBarBackgroundColor: '#f6f3eb' } })
const { draft, loading, error, images, retry } = useFlowerPageArtwork()
const { exportCanvasId, canvasHeight, imagePath, cardImagePath, exportingCard, cardImageError } = images
const text = ref<FlowerGreetingText>({ recipient: '', blessing: '', signature: '' })
const renderedKey = ref('')
const previewPath = ref('')
const contentKey = computed(() => JSON.stringify([text.value.recipient.trim(), text.value.blessing.trim(), text.value.signature.trim()]))
const canExport = computed(() => !loading.value && !exportingCard.value && renderedKey.value === contentKey.value && Boolean(cardImagePath.value))
let timer: ReturnType<typeof setTimeout> | undefined
let alive = true
async function preview(value: FlowerCardText = text.value) {
  const greeting = { ...validateCard(value), recipient: ('recipient' in value ? String(value.recipient) : text.value.recipient).trim() }
  const key = JSON.stringify([greeting.recipient, greeting.blessing, greeting.signature])
  const ok = await images.exportCard(greeting)
  if (alive && ok && key === contentKey.value) {
    renderedKey.value = key
    previewPath.value = cardImagePath.value
  }
  return ok
}
watch([loading, contentKey], () => {
  if (timer)
    clearTimeout(timer)
  if (!loading.value && draft.value && !error.value)
    timer = setTimeout(() => { void preview() }, 350)
})
onUnload(() => {
  alive = false
  if (timer)
    clearTimeout(timer)
})
function save() {
  if (canExport.value)
    images.saveImage('card')
}
function share() {
  if (canExport.value)
    images.shareImage('card')
}
</script>

<template>
  <view class="greeting-page">
    <view v-if="loading || error" class="greeting-state">
      <text>{{ loading ? '正在准备贺卡…' : error }}</text>
      <button v-if="error" @click="retry">
        重新加载
      </button>
    </view>
    <template v-else>
      <view class="greeting-preview" @click="canExport ? images.previewImage('card') : images.previewImage()">
        <image :src="previewPath || imagePath" mode="aspectFit" class="greeting-image" />
        <text v-if="exportingCard" class="preview-status">
          正在更新预览…
        </text>
      </view>
      <view class="greeting-intro">
        留白也可以，或写下一句祝福。
      </view>
      <view class="greeting-form">
        <view class="greeting-field">
          <text class="field-label">
            送给
          </text>
          <input v-model="text.recipient" :maxlength="24" placeholder="给亲爱的你">
        </view>
        <view class="greeting-field">
          <view class="field-label-row">
            <text class="field-label">
              祝福的话
            </text><text class="field-limit">
              最多三行
            </text>
          </view>
          <textarea v-model="text.blessing" :maxlength="120" placeholder="愿你的每一天，都有花开。" :adjust-position="true" />
          <text class="field-hint">
            手动换行和自动换行都计入三行。
          </text>
        </view>
        <view class="greeting-field">
          <text class="field-label">
            署名
          </text>
          <input v-model="text.signature" :maxlength="24" placeholder="你的名字">
        </view>
      </view>
      <view v-if="cardImageError" class="greeting-error">
        {{ cardImageError }}
      </view>
      <view class="greeting-actions">
        <button :disabled="!canExport" @click="save">
          保存图片
        </button>
        <button class="greeting-primary" :disabled="!canExport" @click="share">
          分享贺卡
        </button>
      </view>
    </template>
    <canvas :id="exportCanvasId" :canvas-id="exportCanvasId" class="export-canvas" :style="{ height: `${canvasHeight}px` }" />
  </view>
</template>

<style scoped lang="scss">
.greeting-page { min-height: 100vh; box-sizing: border-box; background: #f6f3eb; color: #3f463d; padding: 20rpx 32rpx calc(140rpx + env(safe-area-inset-bottom)); }
.greeting-preview { height: 480rpx; position: relative; overflow: hidden; background: #edece5; border-radius: 20rpx; }
.greeting-image { width: 100%; height: 100%; }
.preview-status { position: absolute; right: 16rpx; bottom: 16rpx; padding: 8rpx 16rpx; border-radius: 20rpx; background: rgba(246,243,235,.9); color: #7c8474; font-size: 22rpx; }
.greeting-intro { margin: 24rpx 0; font-size: 26rpx; color: #79816e; }
.greeting-field + .greeting-field { margin-top: 20rpx; }
.field-label { display: block; font-size: 26rpx; margin-bottom: 12rpx; }
.field-label-row { display: flex; align-items: baseline; justify-content: space-between; }
.field-limit, .field-hint { font-size: 22rpx; color: #8a907f; }
.field-hint { display: block; margin-top: 10rpx; }
.greeting-field input, .greeting-field textarea { box-sizing: border-box; width: 100%; border: 1rpx solid #e0e3d7; border-radius: 16rpx; background: #fffdf7; padding: 18rpx 22rpx; font-size: 28rpx; color: #3f463d; }
.greeting-field input { height: 76rpx; }
.greeting-field textarea { height: 148rpx; line-height: 38rpx; }
.greeting-actions { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 20rpx; padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); background: #f6f3eb; }
.greeting-actions button { flex: 1; margin: 0; background: #e4e8dc; color: #3f463d; line-height: 88rpx; font-size: 28rpx; border-radius: 18rpx; }
.greeting-actions .greeting-primary { background: #c8d6bd; font-weight: 600; }
button::after { border: none; }
.greeting-error { margin-top: 16rpx; color: #a35a47; font-size: 24rpx; }
.greeting-state { text-align: center; padding: 80rpx 0; font-size: 26rpx; }
.export-canvas { position: fixed; left: -2000px; top: 0; width: 698px; pointer-events: none; }
</style>
