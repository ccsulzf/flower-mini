<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'

const artwork = useCreationArtworkStore()
const studio = useFlowerStudioStore()
const { canUndo, canRedo, canClear } = storeToRefs(artwork)
const { finishing } = storeToRefs(studio)
const emit = defineEmits<{ undo: [], redo: [], reset: [], finish: [] }>()
</script>

<template>
  <view class="page-actions">
    <button class="action-button" :disabled="!canUndo" aria-label="撤销上一步" @click="emit('undo')">
      <view class="action-icon i-carbon-undo" /><text>撤销</text>
    </button>
    <button class="action-button" :disabled="!canRedo" aria-label="重做上一步" @click="emit('redo')">
      <view class="action-icon i-carbon-redo" /><text>重做</text>
    </button>
    <button class="action-button" :disabled="!canClear" @click="emit('reset')">
      <view class="action-icon i-carbon-trash-can" /><text>清空花材</text>
    </button>
    <button class="action-button finish-button" :disabled="finishing" @click="emit('finish')">
      <view class="finish-flower">
        <text>✿</text>
      </view>
      <text class="finish-label">
        {{ finishing ? '正在完成' : '完成作品' }}
      </text>
      <text class="finish-sparkle">
        ✦
      </text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.page-actions { @include studio-toolbar-shell; }
.action-button { @include studio-toolbar-button; }
.action-icon { @include studio-toolbar-icon; }
.finish-button {
  position: relative;
  overflow: hidden;
  gap: 8rpx;
  background: linear-gradient(125deg, #87977a 0%, #687a62 100%);
  color: #fffdf7;
  font-weight: 600;
  box-shadow: 0 7rpx 16rpx rgba(89, 100, 81, .2), inset 0 1rpx 0 rgba(255, 255, 255, .2);
  &:active { opacity: 1; transform: scale(.97); }
  &[disabled] { color: #fffdf7; opacity: .68; }
}
.finish-flower {
  display: flex;
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 253, 247, .4);
  border-radius: 50%;
  background: rgba(255, 253, 247, .16);
  color: #fff2cd;
  font-size: 25rpx;
  line-height: 1;
}
.finish-label { position: relative; z-index: 1; }
.finish-sparkle {
  position: absolute;
  top: 3rpx;
  right: 10rpx;
  color: #fff2cd;
  font-size: 14rpx;
  line-height: 1;
}
</style>
