<script setup lang="ts">
import Feedback from '@/components/feedback/feedback.vue'
import DailyFlowerPopup from '@/components/flower/daily-flower-popup.vue'
</script>

<template>
  <view class="layout-default">
    <slot />

    <view class="feedback-layer">
      <Feedback />
    </view>
    <DailyFlowerPopup />
  </view>
</template>

<style lang="scss" scoped>
.layout-default {
  height: 100vh;
  background: var(--app-page);
  color: var(--app-ink);
  position: relative;
}

.feedback-layer {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
}
</style>
