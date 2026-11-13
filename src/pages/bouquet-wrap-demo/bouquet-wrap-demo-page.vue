<script setup lang="ts">
import BouquetWrapDemo from './components/bouquet-wrap-demo.vue'

definePage({
  layout: 'default',
  style: { navigationBarTitleText: '花束包装实验', navigationBarBackgroundColor: '#f6f3eb' },
})
</script>

<template>
  <view class="bouquet-demo-page">
    <BouquetWrapDemo />
  </view>
</template>

<style scoped>
.bouquet-demo-page { min-height: 100vh; padding: 30rpx 26rpx 60rpx; box-sizing: border-box; background: #f6f3eb; }
</style>
