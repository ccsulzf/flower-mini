<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { useFlowerStudioLayoutStore } from '@/stores/flowerStudioLayoutStore'
import StudioHeader from './studio-header.vue'

const studio = useFlowerStudioStore()
const layout = useFlowerStudioLayoutStore()
const { pageReady, finishing } = storeToRefs(studio)
const { navigationStatusTop: navigationTop, navigationHeight, pageActionsTop: actionsTop } = storeToRefs(layout)
const emit = defineEmits<{
  works: []
  today: []
  undo: []
  redo: []
  reset: []
  finish: []
}>()
</script>

<template>
  <view class="studio-navigation" :style="{ top: `${navigationTop}px`, height: `${navigationHeight}px` }">
    <text class="studio-navigation-title">
      插花
    </text>
    <button class="studio-works-link" :disabled="!pageReady" @click="emit('works')">
      <view class="studio-works-icon i-carbon-folder-open" />
      <text>我的作品</text>
    </button>
    <button class="studio-today-badge" :disabled="!pageReady" @click="emit('today')">
      <view class="studio-today-icon i-carbon-calendar" />
      <text>今日</text>
    </button>
  </view>
  <view class="studio-page-actions-position" :style="{ top: `${actionsTop}px` }">
    <StudioHeader
      @undo="emit('undo')" @redo="emit('redo')" @reset="emit('reset')" @finish="emit('finish')"
    />
  </view>
</template>

<style scoped lang="scss">
.studio-navigation { position: absolute; z-index: 9; left: 26rpx; right: 26rpx; height: 44px; display: flex; align-items: center; gap: 20rpx; font-size: 30rpx; }
.studio-navigation-title { position: absolute; left: 0; right: 0; text-align: center; pointer-events: none; font-size: 32rpx; font-weight: 500; }
.studio-works-link {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 54rpx;
  margin: 0;
  padding: 0 16rpx 0 13rpx;
  border: 1rpx solid rgba(116, 128, 107, .24);
  border-radius: 999rpx;
  background: rgba(255, 253, 247, .9);
  color: #5c6b53;
  box-shadow: 0 4rpx 12rpx rgba(63, 70, 61, .07);
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1;
  &::after { border: none; }
  &[disabled] { opacity: .45; }
  &:active { background: #eaf0e4; transform: scale(.97); }
}
.studio-works-icon { width: 27rpx; height: 27rpx; color: #74876a; }
.studio-today-badge {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7rpx;
  height: 54rpx;
  padding: 0 15rpx;
  border: 1rpx solid rgba(188, 145, 88, .3);
  border-radius: 999rpx;
  background: rgba(255, 248, 232, .94);
  color: #92703e;
  box-shadow: 0 4rpx 12rpx rgba(83, 68, 44, .06);
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1;
  margin: 0;
  &::after { border: none; }
  &[disabled] { opacity: .45; }
  &:active { background: #f7edda; transform: scale(.97); }
}
.studio-today-icon { width: 25rpx; height: 25rpx; color: #b18a4d; }
.studio-page-actions-position { position: absolute; z-index: 7; left: 26rpx; right: 26rpx; }
</style>
