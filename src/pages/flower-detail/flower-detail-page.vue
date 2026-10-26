<script setup lang="ts">
import { computed, ref } from 'vue'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { useDevice } from '@/hooks/useDevice'
import { useFlowerPageArtwork } from '@/hooks/useFlowerPageArtwork'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

definePage({ style: { navigationBarTitleText: '作品详情', navigationBarBackgroundColor: '#f6f3eb', disableScroll: true } })
const { draft, title, description, loading, error, images, retry } = useFlowerPageArtwork({ savedOnly: true })
const { exportingImage, imageError } = images
const { deviceWidth, deviceHeight } = useDevice()
const artworkScale = computed(() => {
  const width = deviceWidth.value
  const height = deviceHeight.value
  const rpx = width / 750
  return Math.max(0.1, Math.min(
    1,
    (width - 56 * rpx) / studioMetrics.width,
    (height - 350 * rpx) / studioMetrics.height,
  ))
})
const showMetadataEditor = ref(false)
const savingMetadata = ref(false)
const editTitle = ref('')
const editDescription = ref('')
const metadataInputStyles = {
  color: '#3f463d',
  backgroundColor: '#fffdf7',
  borderColor: '#e0e3d7',
}
function edit() {
  if (draft.value?.workId)
    uni.navigateTo({ url: `/pages/flower-studio/flower-studio-page?workId=${draft.value.workId}&edit=1` })
  else
    uni.navigateBack()
}
async function shareArtwork() {
  if (!draft.value || exportingImage.value)
    return
  if (await images.exportImage())
    images.shareImage()
}
async function saveArtwork() {
  if (!draft.value || exportingImage.value)
    return
  if (await images.exportImage())
    images.saveImage()
}
function makeCard() {
  if (!draft.value?.workId)
    return
  uni.navigateTo({ url: `/pages/flower-card/flower-card-page?workId=${draft.value.workId}` })
}
function editMetadata() {
  if (loading.value || savingMetadata.value)
    return
  editTitle.value = title.value
  editDescription.value = description.value
  showMetadataEditor.value = true
}
async function saveMetadata() {
  if (!draft.value?.workId || savingMetadata.value)
    return
  savingMetadata.value = true
  try {
    const work = await useFlowerWorksStore().save({
      draft: draft.value,
      title: editTitle.value,
      description: editDescription.value,
      workId: draft.value.workId,
    })
    draft.value = work.draft
    title.value = work.title
    description.value = work.description
    showMetadataEditor.value = false
    uni.showToast({ title: '作品信息已更新', icon: 'none' })
  }
  catch (value) {
    uni.showToast({ title: creationFailure(value), icon: 'none' })
  }
  finally {
    savingMetadata.value = false
  }
}
</script>

<template>
  <view class="detail-page">
    <view class="detail-top-actions">
      <view class="detail-action-group">
        <button :disabled="loading || savingMetadata" @click="edit">
          <view class="i-carbon-edit" />
          编辑
        </button>
      </view>
      <view class="detail-action-group">
        <button :disabled="loading || exportingImage || !draft" @click="shareArtwork">
          <view class="i-carbon-share" />
          分享
        </button>
        <button :disabled="loading || exportingImage || savingMetadata || !draft" @click="saveArtwork">
          <view class="i-carbon-download" />
          保存
        </button>
        <button :disabled="loading || exportingImage || savingMetadata || !draft" @click="makeCard">
          <view class="i-carbon-image" />
          贺卡
        </button>
      </view>
    </view>
    <view class="detail-artwork">
      <FlowerArtworkPreview v-if="draft && !loading && !error" :artwork="draft.artwork" :scale="artworkScale" />
      <view v-else class="detail-state">
        <text>{{ loading || exportingImage ? '正在准备作品…' : error || imageError || '作品尚未准备好' }}</text>
        <button v-if="!loading && !exportingImage" @click.stop="retry">
          重新加载
        </button>
      </view>
      <text v-if="imageError" class="image-export-error">{{ imageError }}</text>
    </view>
    <view class="detail-info">
      <view class="detail-heading" @click="editMetadata">
        <text>{{ title }}</text>
        <view class="i-carbon-edit detail-heading-edit" />
      </view>
      <text v-if="description" class="detail-description">
        {{ description }}
      </text>
    </view>
    <view v-if="showMetadataEditor" class="metadata-overlay" @click="!savingMetadata && (showMetadataEditor = false)">
      <view class="metadata-sheet" @click.stop>
        <text class="metadata-title">
          修改作品信息
        </text>
        <uni-forms class="metadata-form" label-position="top">
          <uni-forms-item name="title" label="名字">
            <uni-easyinput
              v-model="editTitle"
              :maxlength="40"
              :disabled="savingMetadata"
              :clearable="false"
              :input-border="true"
              :styles="metadataInputStyles"
              placeholder="给作品取个名字"
            />
          </uni-forms-item>
          <uni-forms-item name="description" label="介绍">
            <uni-easyinput
              v-model="editDescription"
              type="textarea"
              :maxlength="160"
              :disabled="savingMetadata"
              :clearable="false"
              :input-border="true"
              :styles="metadataInputStyles"
              placeholder="写一段作品介绍"
            />
          </uni-forms-item>
        </uni-forms>
        <view class="detail-actions">
          <button :disabled="savingMetadata" @click="showMetadataEditor = false">
            <view class="i-carbon-close" />
            取消
          </button>
          <button class="primary" :disabled="savingMetadata || editTitle.length > 40 || editDescription.length > 160"
            @click="saveMetadata">
            <view class="i-carbon-checkmark" />
            {{ savingMetadata ? '正在保存…' : '保存修改' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  padding: 8rpx 28rpx 8rpx;
  padding-bottom: env(safe-area-inset-bottom, 0);
  color: #3f463d;
  height: 100%;
  box-sizing: border-box;
}

.detail-top-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  flex-shrink: 0;
  padding: 0 6rpx 10rpx;
}

.detail-action-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.detail-artwork {
  flex: 1 1 0;
  min-height: 0;
  margin: 8rpx 0 12rpx;
  border-radius: 28rpx;
}

.detail-image {
  width: 100%;
  height: 100%;
}

.image-export-error {
  position: absolute;
  bottom: 8rpx;
  left: 0;
  width: 100%;
  color: #995c50;
  font-size: 22rpx;
  text-align: center;
}

.detail-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  font-size: 26rpx;
}

.detail-state button {
  margin: 0;
  padding: 8rpx 18rpx;
  border-radius: 12rpx;
  background: transparent;
  color: #75806c;
  font-size: 24rpx;
  line-height: 48rpx;
}

.detail-info {
  flex-shrink: 0;
  padding: 18rpx 6rpx 16rpx;
}

.detail-heading {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.detail-heading text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-heading-edit {
  flex-shrink: 0;
  color: #737b6c;
  font-size: 28rpx;
}

.detail-description {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 8rpx;
  color: #737b6c;
  font-size: 25rpx;
  line-height: 1.5;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.detail-top-actions button {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: transparent;
  color: #596451;
  font-size: 24rpx;
  padding: 8rpx 10rpx;
  margin: 0;
  line-height: 44rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
}

.detail-top-actions button view {
  font-size: 28rpx;
}

button::after {
  border: none;
}

.detail-actions {
  display: flex;
  justify-content: center;
  gap: 12rpx;
}

.detail-actions button {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin: 0;
  padding: 10rpx 8rpx;
  background: transparent;
  color: #75806c;
  font-size: 24rpx;
  border-radius: 12rpx;
  line-height: 48rpx;
  white-space: nowrap;
}

.detail-actions .primary {
  background: transparent;
  color: #515c49;
  font-weight: 500;
}

.detail-actions button:not([disabled]):active,
.detail-top-actions button:not([disabled]):active {
  background: #e9ecdf;
}

.detail-actions button[disabled],
.detail-top-actions button[disabled] {
  opacity: .42;
}

.detail-state button:not([disabled]):active {
  background: #e9ecdf;
}

.metadata-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 32rpx;
  box-sizing: border-box;
  background: rgba(30, 35, 25, .25);
}

.metadata-sheet {
  width: 100%;
  padding: 32rpx;
  box-sizing: border-box;
  border: 2rpx solid #dde1d4;
  border-radius: 30rpx;
  background: #fffdf7;
}

.metadata-title {
  display: block;
  margin-bottom: 28rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.metadata-form :deep(.uni-forms-item) {
  margin-bottom: 18rpx;
}

.metadata-form :deep(.uni-forms-item__label) {
  height: auto;
  padding: 0 0 10rpx;
  color: #67705f;
  font-size: 26rpx;
}

.metadata-form :deep(.uni-forms-item__content) {
  width: 100%;
}

.metadata-form :deep(.uni-easyinput__content) {
  min-height: 76rpx;
  border-radius: 16rpx;
}

.metadata-form :deep(.uni-easyinput__content-textarea) {
  box-sizing: border-box;
  height: 180rpx;
  min-height: 180rpx;
  margin: 14rpx 18rpx;
}

.metadata-sheet .detail-actions {
  margin-top: 26rpx;
}

</style>
