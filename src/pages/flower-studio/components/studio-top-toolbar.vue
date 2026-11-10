<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import StudioHeader from './studio-header.vue'

defineProps<{ navigationTop: number, navigationHeight: number, actionsTop: number }>()
const emit = defineEmits<{ works: [], today: [], undo: [], redo: [], reset: [], finish: [] }>()
const { pageReady } = storeToRefs(useFlowerStudioStore())
</script>

<template>
  <view class="studio-navigation" :style="{ top: `${navigationTop}px`, height: `${navigationHeight}px` }">
    <button class="studio-nav-note studio-works-link" :disabled="!pageReady" @click="emit('works')">
      <view class="studio-nav-icon i-carbon-image" />
      <text>我的作品</text>
    </button>
    <button class="studio-nav-note studio-today-badge" :disabled="!pageReady" @click="emit('today')">
      <view class="studio-nav-icon i-carbon-sprout" />
      <text>今日花束</text>
    </button>
  </view>
  <view class="studio-page-actions-position" :style="{ top: `${actionsTop}px` }"><StudioHeader @undo="emit('undo')" @redo="emit('redo')" @reset="emit('reset')" @finish="emit('finish')" /></view>
</template>

<style scoped lang="scss">
.studio-navigation{position:absolute;z-index:9;left:26rpx;right:230rpx;height:44px;display:flex;align-items:center;justify-content:flex-start;gap:18rpx}.studio-nav-note{position:relative;display:flex;align-items:center;justify-content:center;gap:8rpx;height:56rpx;margin:0;padding:0 13rpx;border:0;border-bottom:1rpx solid rgba(105,87,67,.25);border-radius:5rpx 9rpx 4rpx 7rpx;background:rgba(255,253,247,.46);box-shadow:2rpx 3rpx 0 rgba(105,87,67,.045);color:#62594d;font-size:21rpx;font-weight:500;line-height:1;white-space:nowrap}.studio-nav-note::before{position:absolute;right:10rpx;bottom:4rpx;left:13rpx;height:2rpx;border-radius:50%;background:rgba(127,146,116,.28);content:'';transform:rotate(-1deg)}.studio-nav-note::after{border:none}.studio-nav-icon{width:24rpx;height:24rpx;flex-shrink:0;color:#75836d;transform:rotate(-3deg)}.studio-today-badge{border-radius:8rpx 4rpx 9rpx 5rpx;background:rgba(244,238,226,.58);color:#75634f}.studio-today-badge .studio-nav-icon{color:#b17d78;transform:rotate(4deg)}.studio-nav-note:active{transform:translateY(2rpx);box-shadow:1rpx 1rpx 0 rgba(105,87,67,.04)}.studio-nav-note[disabled]{opacity:.42}.studio-page-actions-position{position:absolute;z-index:7;left:26rpx;right:26rpx}
</style>
