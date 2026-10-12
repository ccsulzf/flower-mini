<script setup lang="ts">
import type { FlowerCardText, FlowerGreetingText } from '@/models/flower-creation'
import { onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { useFlowerPageArtwork } from '@/hooks/useFlowerPageArtwork'
import { validateCard } from '@/utils/flower/creation-storage'

definePage({ style: { navigationBarTitleText: '制作贺卡', navigationBarBackgroundColor: '#f6f3eb' } })
const { draft, loading, error, thumbnail, images, retry } = useFlowerPageArtwork()
const { exportCanvasId, canvasHeight, imagePath, cardImagePath, exportingCard, cardImageError } = images
const text = ref<FlowerGreetingText>({ recipient: '', blessing: '', signature: '' })
const appliedText = ref<FlowerGreetingText>({ recipient: '', blessing: '', signature: '' })
const fieldInputStyles = {
  color: '#3f463d',
  backgroundColor: '#fffdf7',
  borderColor: '#e0e3d7',
}
const showEditor = ref(false)
const renderedKey = ref('')
const previewPath = ref('')
const failedPreviewSources = ref<string[]>([])
const previewImageLoaded = ref(false)
const contentKey = computed(() => JSON.stringify([appliedText.value.recipient.trim(), appliedText.value.blessing.trim(), appliedText.value.signature.trim()]))
const canExport = computed(() => !loading.value && !exportingCard.value && renderedKey.value === contentKey.value && Boolean(cardImagePath.value))
const previewUpdating = computed(() => exportingCard.value || (Boolean(renderedKey.value) && renderedKey.value !== contentKey.value))
const previewImageSource = computed(() => [previewPath.value, imagePath.value, thumbnail.value].find(path => path && !failedPreviewSources.value.includes(path)) || '')
const blessingCount = computed(() => text.value.blessing.length)
let timer: ReturnType<typeof setTimeout> | undefined
let alive = true
let initialized = false
watch(draft, (value) => {
  if (value && !initialized) {
    const greeting = { ...value.card, recipient: '' }
    text.value = { ...greeting }
    appliedText.value = { ...greeting }
    initialized = true
  }
}, { immediate: true })
async function preview(value: FlowerGreetingText = appliedText.value) {
  const greeting = { ...validateCard(value), recipient: value.recipient.trim() }
  const key = JSON.stringify([greeting.recipient, greeting.blessing, greeting.signature])
  const ok = await images.exportCard(greeting)
  if (alive && ok && key === contentKey.value) {
    renderedKey.value = key
    previewPath.value = cardImagePath.value
    failedPreviewSources.value = failedPreviewSources.value.filter(path => path !== previewPath.value)
  }
  return ok
}
watch([loading, contentKey], () => {
  if (timer)
    clearTimeout(timer)
  if (!loading.value && draft.value && !error.value)
    timer = setTimeout(() => { void preview() }, 350)
})
watch(previewImageSource, () => { previewImageLoaded.value = false })
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
function onPreviewImageError() {
  if (previewImageSource.value && !failedPreviewSources.value.includes(previewImageSource.value))
    failedPreviewSources.value.push(previewImageSource.value)
}
function onPreviewImageLoad() {
  previewImageLoaded.value = true
}
function retryPreview() {
  failedPreviewSources.value = []
  previewImageLoaded.value = false
  void preview()
}
function openEditor() {
  text.value = { ...appliedText.value }
  showEditor.value = true
}
function cancelEditor() {
  if (exportingCard.value)
    return
  text.value = { ...appliedText.value }
  showEditor.value = false
}
function applyEditor() {
  if (exportingCard.value)
    return
  appliedText.value = { ...validateCard(text.value), recipient: text.value.recipient.trim() }
  showEditor.value = false
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
        <image
          v-if="previewImageSource" :src="previewImageSource" mode="aspectFit" class="greeting-image"
          @load="onPreviewImageLoad" @error="onPreviewImageError"
        />
        <view v-if="previewImageSource && !previewImageLoaded" class="preview-placeholder">
          <view class="preview-spinner" />
          <text>{{ exportingCard ? '正在生成贺卡预览…' : '正在加载预览…' }}</text>
        </view>
        <view v-if="!previewImageSource" class="preview-placeholder">
          <text>{{ exportingCard ? '正在生成贺卡预览…' : cardImageError || '预览图片暂不可用' }}</text>
          <button v-if="!exportingCard" @click.stop="retryPreview">
            重新生成预览
          </button>
        </view>
        <text v-if="previewUpdating" class="preview-status">
          正在更新贺卡预览…
        </text>
      </view>
      <view v-if="cardImageError" class="greeting-error">
        {{ cardImageError }}
        <button :disabled="exportingCard" @click="retryPreview">
          重试
        </button>
      </view>
      <view class="greeting-actions">
        <button class="greeting-edit" :disabled="exportingCard" @click="openEditor">
          <view class="i-carbon-edit" />
          填写内容
        </button>
        <button :disabled="!canExport" @click="save">
          <view class="i-carbon-download" />
          保存图片
        </button>
        <button class="greeting-primary" :disabled="!canExport" @click="share">
          <view class="i-carbon-share" />
          分享贺卡
        </button>
      </view>
      <view v-if="showEditor" class="editor-backdrop" @click="cancelEditor">
        <view class="editor-sheet" @click.stop>
          <view class="editor-heading">
            <text>填写贺卡内容</text>
            <button aria-label="取消编辑" @click="cancelEditor">
              ×
            </button>
          </view>
          <uni-forms class="greeting-form" :model="text" label-position="top" label-width="100%">
            <uni-forms-item name="recipient" label="送给">
              <uni-easyinput
                v-model="text.recipient" class="greeting-easyinput" :maxlength="24" :clearable="false"
                :input-border="true" :styles="fieldInputStyles" placeholder="给亲爱的你"
              />
            </uni-forms-item>
            <uni-forms-item name="blessing">
              <template #label>
                <view class="field-label-row">
                  <text class="field-label">
                    祝福的话
                  </text>
                  <text class="field-limit">
                    最多120字
                  </text>
                </view>
              </template>
              <uni-easyinput
                v-model="text.blessing" class="greeting-easyinput" type="textarea" :maxlength="120"
                :clearable="false" :input-border="true" :styles="fieldInputStyles" placeholder="愿你的每一天，都有花开。"
              />
              <view class="field-footer">
                <text class="field-hint">
                  支持自动换行，最多120字。
                </text>
                <text class="field-count" :class="{ 'field-count-limit': blessingCount >= 120 }">
                  {{ blessingCount }}/120
                </text>
              </view>
            </uni-forms-item>
            <uni-forms-item name="signature" label="署名">
              <uni-easyinput
                v-model="text.signature" class="greeting-easyinput" :maxlength="24" :clearable="false"
                :input-border="true" :styles="fieldInputStyles" placeholder="你的名字"
              />
            </uni-forms-item>
          </uni-forms>
          <button class="editor-done greeting-primary" :disabled="exportingCard" @click="applyEditor">
            完成填写
          </button>
        </view>
      </view>
    </template>
    <canvas
      :id="exportCanvasId" :canvas-id="exportCanvasId" class="export-canvas"
      :style="{ height: `${canvasHeight}px` }"
    />
  </view>
</template>

<style scoped lang="scss">
.greeting-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  box-sizing: border-box;
  color: #3f463d;
  padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
}

.greeting-preview {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 700rpx;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 24rpx;
}

.greeting-image {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  color: #7c8474;
  font-size: 26rpx;
}

.preview-spinner {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid #d5dccb;
  border-top-color: #74806b;
  border-radius: 50%;
  animation: preview-spin .8s linear infinite;
}

@keyframes preview-spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-placeholder button {
  margin: 0;
  padding: 0 22rpx;
  border-radius: 14rpx;
  background: #e4e8dd;
  color: #68735f;
  font-size: 24rpx;
  line-height: 60rpx;
}

.preview-status {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(246, 243, 235, .9);
  color: #7c8474;
  font-size: 22rpx;
}

.greeting-actions {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: 12rpx;
  padding: 14rpx 0 0;
}

.greeting-actions button {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin: 0;
  padding: 8rpx 4rpx;
  background: transparent;
  color: #75806c;
  line-height: 48rpx;
  font-size: 22rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}

.greeting-actions button view {
  font-size: 28rpx;
}

.greeting-actions .greeting-primary {
  background: transparent;
  color: #75806c;
  font-weight: 400;
}

.greeting-actions .greeting-edit {
  color: #515c49;
}

.greeting-actions button[disabled] {
  opacity: .42;
}

.greeting-error {
  flex-shrink: 0;
  margin-top: 12rpx;
  color: #a35a47;
  font-size: 24rpx;
}

.greeting-state {
  text-align: center;
  margin: auto;
  padding: 80rpx 0;
  font-size: 26rpx;
}

.editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: flex-end;
  box-sizing: border-box;
  padding: 24rpx;
  background: rgba(30, 35, 25, .28);
}

.editor-sheet {
  width: 100%;
  max-height: 84vh;
  overflow: auto;
  box-sizing: border-box;
  padding: 30rpx;
  border-radius: 28rpx;
  background: #f6f3eb;
}

.editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.editor-heading button {
  width: 60rpx;
  height: 60rpx;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: #e7eadf;
  color: #74806b;
  font-size: 38rpx;
  line-height: 60rpx;
}

.greeting-form :deep(.uni-forms-item) {
  margin-bottom: 22rpx;
}

.greeting-form :deep(.uni-forms-item__label) {
  height: auto;
  padding: 0 0 12rpx;
  color: #3f463d;
  font-size: 26rpx;
}

.greeting-form :deep(.uni-forms-item__content) {
  width: 100%;
}

.greeting-form :deep(.uni-easyinput__content) {
  min-height: 76rpx;
  border-radius: 18rpx;
}

.greeting-form :deep(.uni-easyinput__content-textarea) {
  box-sizing: border-box;
  height: 148rpx;
  min-height: 148rpx;
  margin: 14rpx 18rpx;
}

.field-label {
  font-size: 26rpx;
  color: #3f463d;
}

.field-label-row {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
}

.field-limit,
.field-hint,
.field-count {
  font-size: 22rpx;
  color: #8a907f;
}

.field-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.field-count-limit {
  color: #a35a47;
}

.editor-done {
  width: 100%;
  margin: 26rpx 0 0;
  border-radius: 18rpx;
  line-height: 84rpx;
  font-size: 28rpx;
}

.greeting-error button {
  display: inline-block;
  margin: 0 0 0 12rpx;
  padding: 0 14rpx;
  color: #995c50;
  background: transparent;
  font-size: 24rpx;
  line-height: 1.5;
}

button::after {
  border: none;
}

.export-canvas {
  position: fixed;
  left: -2000px;
  top: 0;
  width: 698px;
  pointer-events: none;
}
</style>
