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
  background: linear-gradient(180deg, #e3eaf3 0%, #e9eef5 18%, #edf2f7 100%);
  position: relative;
}

.feedback-layer {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
}
</style>
