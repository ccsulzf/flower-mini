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
    <view class="sketch-action action-undo" :class="{ disabled: !canUndo }">
      <view class="sketch-outline sketch-outline-back" />
      <view class="sketch-outline sketch-outline-front" />
      <button class="action-button" :disabled="!canUndo" aria-label="撤销上一步" @click="emit('undo')">
        <view class="action-icon i-carbon-undo" /><text>撤销</text>
      </button>
    </view>
    <view class="sketch-action action-redo" :class="{ disabled: !canRedo }">
      <view class="sketch-outline sketch-outline-back" />
      <view class="sketch-outline sketch-outline-front" />
      <button class="action-button" :disabled="!canRedo" aria-label="重做上一步" @click="emit('redo')">
        <view class="action-icon i-carbon-redo" /><text>重做</text>
      </button>
    </view>
    <view class="sketch-action action-reset" :class="{ disabled: !canClear }">
      <view class="sketch-outline sketch-outline-back" />
      <view class="sketch-outline sketch-outline-front" />
      <button class="action-button" :disabled="!canClear" @click="emit('reset')">
        <view class="action-icon i-carbon-trash-can" /><text>清空花材</text>
      </button>
    </view>
    <view class="sketch-action action-finish" :class="{ disabled: finishing }">
      <view class="sketch-outline sketch-outline-back" />
      <view class="sketch-outline sketch-outline-front" />
      <button class="action-button finish-button" :disabled="finishing" @click="emit('finish')">
        <view class="finish-flower"><text>✿</text></view>
        <text class="finish-label">{{ finishing ? '正在完成' : '完成作品' }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.page-actions { @include studio-toolbar-shell; padding:4rpx; }
.sketch-action { position:relative; height:88rpx; flex:1; min-width:0; }
.action-reset { flex:1.18; }
.action-finish { flex:1.28; }
.sketch-outline { position:absolute; pointer-events:none; }
.sketch-outline-back { top:1rpx; right:-1rpx; bottom:-1rpx; left:2rpx; border:2rpx solid rgba(91,74,57,.3); border-radius:255rpx 16rpx 225rpx 20rpx / 19rpx 225rpx 23rpx 255rpx; transform:rotate(-.55deg); }
.sketch-outline-front { top:3rpx; right:2rpx; bottom:2rpx; left:-1rpx; border:2rpx solid rgba(91,74,57,.62); border-radius:17rpx 255rpx 19rpx 225rpx / 225rpx 19rpx 255rpx 17rpx; transform:rotate(.4deg); }
.action-redo .sketch-outline-back,.action-reset .sketch-outline-front { transform:rotate(.55deg); }
.action-redo .sketch-outline-front,.action-reset .sketch-outline-back { transform:rotate(-.45deg); }
.action-button { @include studio-toolbar-button; position:relative; z-index:1; width:calc(100% - 8rpx); height:80rpx; margin:4rpx; border-radius:14rpx 10rpx 17rpx 12rpx; background:#f3eadb; box-shadow:3rpx 4rpx 0 rgba(105,88,68,.055); }
.sketch-action.disabled { opacity:.4; }
.action-icon { @include studio-toolbar-icon; }
.finish-button {
  position: relative;
  overflow: hidden;
  gap: 8rpx;
  background: #829477;
  color: #fffdf7;
  font-weight: 600;
  box-shadow: 3rpx 4rpx 0 rgba(82, 97, 75, .1);
  &:active { opacity: 1; transform: scale(.97); }
  &[disabled] { color: #fffdf7; opacity: 1; }
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
</style>
