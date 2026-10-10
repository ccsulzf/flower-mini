<script setup lang="ts">
defineProps<{ exporting: boolean, imagePath: string, error: string }>()
const emit = defineEmits<{ close: [], retry: [], saveImage: [], shareImage: [], previewImage: [] }>()
</script>

<template>
  <view class="finish-card" @touchmove.stop>
    <view class="finish-heading">
      <view><text class="finish-title">把这束花，留在日常里</text><text class="finish-subtitle">保存图片，或分享这份心意。</text></view>
      <button class="finish-close" aria-label="返回编辑" @click="emit('close')"><view class="i-carbon-close" /></button>
    </view>
    <view class="preview-area">
      <text v-if="exporting" class="preview-status">正在生成作品图片…</text>
      <view v-else-if="error" class="preview-status">
        <text>{{ error }}</text><button class="retry-action" @click="emit('retry')">重新生成</button>
      </view>
      <image v-else-if="imagePath" class="image-preview" :src="imagePath" mode="aspectFit" @click="emit('previewImage')" />
    </view>
    <text v-if="imagePath" class="preview-note">点击图片查看大图</text>
    <view class="finish-actions">
      <button :disabled="exporting || !imagePath" @click="emit('saveImage')">保存到相册</button>
      <button class="primary-action" :disabled="exporting || !imagePath" @click="emit('shareImage')">分享图片</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.finish-card { background: $studio-panel; padding: 28rpx; border-radius: 32rpx; border: 2rpx solid $studio-border; color: $studio-ink; }
.finish-heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20rpx; }
.finish-title { display: block; font-size: 30rpx; font-weight: 500; }
.finish-subtitle { display: block; font-size: 22rpx; color: $studio-muted; margin-top: 12rpx; }
.finish-close { margin: 0; padding: 0; width: 44rpx; height: 44rpx; line-height: 1; display: flex; justify-content: center; align-items: center; background: transparent; color: $studio-muted; }
button::after { border: none; }
.preview-area { height: min(500rpx, 50vh); border-radius: 18rpx; overflow: hidden; background: $studio-secondary; }
.image-preview { width: 100%; height: 100%; }
.preview-status { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 25rpx; color: $studio-muted; }
.retry-action { margin: 24rpx 0 0; padding: 12rpx 28rpx; font-size: 24rpx; background: $studio-accent; color: $studio-ink; }
.preview-note { display: block; color: $studio-muted; font-size: 20rpx; text-align: center; margin-top: 12rpx; }
.finish-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.finish-actions button { flex: 1; margin: 0; padding: 18rpx 8rpx; border-radius: 18rpx; color: $studio-ink; background: $studio-secondary; font-size: 25rpx; line-height: 1.5; }
.finish-actions .primary-action { background: $studio-accent; }
.finish-actions button[disabled] { opacity: .45; }
</style>
