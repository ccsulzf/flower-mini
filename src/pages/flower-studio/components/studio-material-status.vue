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
.materials-loading-card { display:flex; max-width:620rpx; flex-direction:column; align-items:center; gap:16rpx; padding:18rpx 30rpx; border:1rpx solid rgba(112,91,68,.22); border-radius:14rpx; background:rgba(245,234,215,.96); box-shadow:0 6rpx 16rpx rgba(88,74,55,.05); color:#75695b; font-size:24rpx; text-align:center; pointer-events:auto; }
.materials-loading-spinner { width:44rpx; height:44rpx; border:5rpx solid #d8d8c8; border-top-color:#7f9274; border-radius:55% 45% 52% 48%; animation:materials-loading-spin .8s linear infinite; }
@keyframes materials-loading-spin { to { transform: rotate(360deg); } }
</style>
