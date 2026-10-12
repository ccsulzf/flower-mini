<script setup lang="ts">
import Feedback from '@/components/feedback/feedback.vue'
</script>

<template>
  <view class="layout-default">
    <slot />

    <view class="feedback-layer">
      <Feedback />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.layout-default {
  height: 100vh;
  background: #f6f3eb;
  color: #3f463d;
  position: relative;
}

.feedback-layer {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
}
</style>
