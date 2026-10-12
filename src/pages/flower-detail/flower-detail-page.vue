<script setup lang="ts">
import { computed } from 'vue'
import { useFlowerPageArtwork } from '@/hooks/useFlowerPageArtwork'

definePage({ style: { navigationBarTitleText: '作品详情', navigationBarBackgroundColor: '#f6f3eb' } })
const { draft, title, thumbnail, loading, error, images, retry } = useFlowerPageArtwork({ savedOnly: true })
const { imagePath, exportingImage, imageError, exportCanvasId, canvasHeight } = images
const pageHeight = uni.getSystemInfoSync().windowHeight
const displayImage = computed(() => imagePath.value || thumbnail.value)
function edit() {
  if (draft.value?.workId)
    uni.navigateTo({ url: `/pages/flower-studio/flower-studio-page?workId=${draft.value.workId}&edit=1` })
  else
    uni.navigateBack()
}
function makeCard() {
  if (!draft.value?.workId)
    return
  uni.navigateTo({ url: `/pages/flower-card/flower-card-page?workId=${draft.value.workId}` })
}
</script>

<template>
  <view class="detail-page" :style="{ height: `${pageHeight}px` }">
    <view class="detail-top-actions">
      <button :disabled="loading || exportingImage || !imagePath" @click="images.saveImage()">
        保存到相册
      </button>
    </view>
    <view class="detail-artwork" @click="images.previewImage()">
      <image v-if="displayImage" :src="displayImage" mode="aspectFit" class="detail-image" />
      <view v-else class="detail-state">
        <text>{{ loading || exportingImage ? '正在准备作品…' : error || imageError || '作品尚未生成' }}</text>
        <button v-if="!loading && !exportingImage" @click.stop="retry">
          重新加载
        </button>
      </view>
    </view>
    <view class="detail-info">
      <view class="detail-heading">
        <text>{{ title }}</text>
      </view>
    </view>
    <view class="detail-actions detail-footer">
      <button :disabled="loading" @click="edit">
        继续编辑
      </button>
      <button class="primary" :disabled="loading || exportingImage || !imagePath" @click="makeCard">
        制作贺卡
      </button>
    </view>
    <canvas :id="exportCanvasId" :canvas-id="exportCanvasId" class="export-canvas" :style="{ height: `${canvasHeight}px` }" />
  </view>
</template>

<style scoped lang="scss">
.detail-page { display: flex; flex-direction: column; box-sizing: border-box; padding: 16rpx 28rpx calc(24rpx + env(safe-area-inset-bottom)); background: #f6f3eb; color: #3f463d; }
.detail-top-actions { display: flex; justify-content: flex-end; flex-shrink: 0; padding: 0 6rpx 8rpx; }
.detail-artwork { flex: 1; min-height: 0; border-radius: 24rpx; overflow: hidden; background: #f6f3eb; }
.detail-image { width: 100%; height: 100%; }
.detail-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; font-size: 26rpx; }
.detail-info { flex-shrink: 0; padding: 22rpx 6rpx 28rpx; }
.detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; font-size: 30rpx; font-weight: 600; }
.detail-heading text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-top-actions button { background: transparent; color: #79816e; font-size: 26rpx; padding: 0; margin: 0; line-height: 52rpx; flex-shrink: 0; }
.edit-link { margin-top: 12rpx; text-align: left; }
button::after { border: none; }
.detail-footer { flex-shrink: 0; }
.detail-actions { display: flex; gap: 20rpx; }
.detail-actions button { flex: 1; margin: 0; background: #e5e9dd; color: #3f463d; font-size: 30rpx; border-radius: 20rpx; line-height: 88rpx; }
.detail-actions .primary { background: #c8d6bd; font-weight: 600; }
.export-canvas { position: fixed; left: -2000px; top: 0; width: 698px; pointer-events: none; }
</style>
