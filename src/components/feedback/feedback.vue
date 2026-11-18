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
  box-shadow: 0 12rpx 28rpx rgba(var(--app-ink-rgb), 0.12);
}

.cover-toast-success {
  color: var(--app-brandStrong);
  background: var(--app-brandSoft);
  border: 2rpx solid var(--app-sageSoft);
}

.cover-toast-warning {
  color: var(--app-ink);
  background: var(--app-surfaceMuted);
  border: 2rpx solid var(--app-line);
}

.cover-toast-error {
  color: var(--app-ink);
  background: var(--app-dangerSoft);
  border: 2rpx solid var(--app-line);
}

.cover-toast-title { color: var(--app-ink); }

.cover-toast-message {
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
  background: rgba(var(--app-surface-rgb), 0.98);
  color: var(--app-brandStrong);
  box-shadow: inset 0 0 0 2rpx rgba(var(--app-surface-rgb), 0.72);
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
