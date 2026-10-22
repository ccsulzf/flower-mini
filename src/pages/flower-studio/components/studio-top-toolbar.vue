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
    <button class="studio-works-link" :disabled="!pageReady" @click="emit('works')"><view class="studio-works-icon i-carbon-folder-open" /><text>我的作品</text></button>
    <button class="studio-today-badge" :disabled="!pageReady" @click="emit('today')"><view class="studio-today-icon i-carbon-calendar" /><text>今日花束</text></button>
  </view>
  <view class="studio-page-actions-position" :style="{ top: `${actionsTop}px` }"><StudioHeader @undo="emit('undo')" @redo="emit('redo')" @reset="emit('reset')" @finish="emit('finish')" /></view>
</template>

<style scoped lang="scss">
.studio-navigation{position:absolute;z-index:9;left:26rpx;right:26rpx;height:44px;display:flex;align-items:center;gap:20rpx}.studio-works-link,.studio-today-badge{position:relative;z-index:1;display:flex;align-items:center;gap:8rpx;height:54rpx;margin:0;padding:0 15rpx;border-radius:999rpx;font-size:22rpx;font-weight:500;line-height:1}.studio-works-link{border:1rpx solid rgba(116,128,107,.24);background:rgba(255,253,247,.9);color:#5c6b53}.studio-today-badge{border:1rpx solid rgba(188,145,88,.3);background:rgba(255,248,232,.94);color:#92703e}.studio-works-link::after,.studio-today-badge::after{border:none}.studio-works-link[disabled],.studio-today-badge[disabled]{opacity:.45}.studio-works-icon,.studio-today-icon{width:26rpx;height:26rpx}.studio-page-actions-position{position:absolute;z-index:7;left:26rpx;right:26rpx}
</style>
