<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'

const studio = useFlowerStudioStore()
const { materialsLoading: loading } = storeToRefs(studio)
</script>

<template>
  <view v-if="loading" class="canvas-material-overlay">
    <view class="materials-loading-card">
      <view class="materials-loading-spinner" />
      <text>素材加载中…</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.canvas-material-overlay { position: absolute; z-index: 2; top: 12rpx; left: 0; right: 0; display: flex; justify-content: center; padding: 0 24rpx; box-sizing: border-box; pointer-events: none; }
.materials-loading-card { display: flex; max-width: 620rpx; flex-direction: column; align-items: center; gap: 20rpx; padding: 18rpx 30rpx; border: 2rpx solid #e1e5d9; border-radius: 28rpx; background: rgba(255,253,247,.96); color: #6f7964; font-size: 24rpx; text-align: center; pointer-events: auto; }
.materials-loading-spinner { width: 44rpx; height: 44rpx; border: 5rpx solid #d5dccb; border-top-color: #74806b; border-radius: 50%; animation: materials-loading-spin .8s linear infinite; }
@keyframes materials-loading-spin { to { transform: rotate(360deg); } }
</style>
