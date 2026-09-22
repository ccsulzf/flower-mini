<script setup lang="ts">
import type { FeedbackPayload } from '@/models/feedback.interface'
import { storeToRefs } from 'pinia'
import { useFeedbackStore } from '@/stores/feedbackStore'

const feedbackStore = useFeedbackStore()
const { latestFeedback } = storeToRefs(feedbackStore)
const feedback = ref<FeedbackPayload | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => latestFeedback.value?.id,
  async () => {
    const currentFeedback = latestFeedback.value
    if (!currentFeedback)
      return

    if (hideTimer)
      clearTimeout(hideTimer)

    feedback.value = null
    await nextTick()
    feedback.value = { ...currentFeedback }
    hideTimer = setTimeout(() => {
      feedback.value = null
    }, 1650)
  },
)

onBeforeUnmount(() => {
  if (hideTimer)
    clearTimeout(hideTimer)
})
</script>

<template>
  <view v-if="feedback" :key="feedback.id" class="cover-stage">
    <view
      class="cover-toast"
      :class="{
        'cover-toast-success': feedback.type === 'success',
        'cover-toast-warning': feedback.type === 'warning',
        'cover-toast-error': feedback.type === 'error',
      }"
    >
      <view class="cover-toast-title">
        {{ feedback.title }}
      </view>
      <view class="cover-toast-message">
        {{ feedback.message }}
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cover-stage {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
}

.cover-toast {
  position: absolute;
  top: 28rpx;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 22rpx;
  border-radius: 24rpx;
  transform: translateX(-50%);
  font-size: 24rpx;
  font-weight: 700;
  white-space: nowrap;
  animation: cover-toast-fade 1.65s ease forwards;
  box-shadow: 0 8rpx 18rpx rgba(15, 23, 42, 0.1);
}

.cover-toast-success {
  color: #064e3b;
  background: rgba(236, 253, 245, 1);
  border: 2rpx solid rgba(16, 185, 129, 0.32);
}

.cover-toast-warning {
  color: #7c2d12;
  background: rgba(255, 247, 237, 1);
  border: 2rpx solid rgba(249, 115, 22, 0.3);
}

.cover-toast-error {
  color: #991b1b;
  background: rgba(254, 242, 242, 1);
  border: 2rpx solid rgba(239, 68, 68, 0.32);
}

.cover-toast-title { color: #1f2937; }

.cover-toast-message {
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.98);
  color: #111827;
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, 0.92);
}

@keyframes cover-toast-fade {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(18rpx) scale(0.94);
  }
  18% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  82% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-12rpx) scale(0.98);
  }
}
</style>
