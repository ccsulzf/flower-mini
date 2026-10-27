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
    <view class="action-group history-actions">
      <view class="sketch-action action-undo" :class="{ disabled: !canUndo }">
        <button class="action-button history-button" :disabled="!canUndo" aria-label="撤销上一步" @click="emit('undo')">
          <view class="action-icon i-carbon-undo" /><text>撤销</text>
        </button>
      </view>
      <view class="history-divider" />
      <view class="sketch-action action-redo" :class="{ disabled: !canRedo }">
        <button class="action-button history-button" :disabled="!canRedo" aria-label="重做上一步" @click="emit('redo')">
          <view class="action-icon i-carbon-redo" /><text>重做</text>
        </button>
      </view>
    </view>
    <view class="action-group work-actions">
      <view class="sketch-action action-reset" :class="{ disabled: !canClear }">
        <view class="sketch-outline sketch-outline-back" />
        <view class="sketch-outline sketch-outline-front" />
        <button class="action-button" :disabled="!canClear" @click="emit('reset')">
          <view class="action-icon i-carbon-trash-can" /><text>清空</text>
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
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.page-actions { @include studio-toolbar-shell; height:82rpx; justify-content:space-between; gap:22rpx; padding:3rpx 0; }
.action-group { display:flex; min-width:0; height:76rpx; align-items:center; }
.history-actions { flex:1; padding:0 5rpx; border-top:1rpx solid rgba(112,91,68,.14); border-bottom:1rpx solid rgba(112,91,68,.2); background:rgba(255,253,247,.34); transform:rotate(-.25deg); }
.work-actions { flex:1.72; gap:10rpx; }
.sketch-action { position:relative; height:76rpx; flex:1; min-width:0; }
.action-reset { flex:.86; }
.action-finish { flex:1.28; }
.history-divider { width:1rpx; height:32rpx; flex-shrink:0; background:rgba(112,91,68,.17); transform:rotate(5deg); }
.sketch-outline { position:absolute; pointer-events:none; }
.sketch-outline-back { top:1rpx; right:-1rpx; bottom:-1rpx; left:2rpx; border:2rpx solid rgba(91,74,57,.3); border-radius:255rpx 16rpx 225rpx 20rpx / 19rpx 225rpx 23rpx 255rpx; transform:rotate(-.55deg); }
.sketch-outline-front { top:3rpx; right:2rpx; bottom:2rpx; left:-1rpx; border:2rpx solid rgba(91,74,57,.62); border-radius:17rpx 255rpx 19rpx 225rpx / 225rpx 19rpx 255rpx 17rpx; transform:rotate(.4deg); }
.action-redo .sketch-outline-back,.action-reset .sketch-outline-front { transform:rotate(.55deg); }
.action-redo .sketch-outline-front,.action-reset .sketch-outline-back { transform:rotate(-.45deg); }
.action-button { @include studio-toolbar-button; position:relative; z-index:1; width:calc(100% - 8rpx); height:68rpx; margin:4rpx; border-radius:14rpx 10rpx 17rpx 12rpx; background:rgba(247,241,229,.9); box-shadow:3rpx 4rpx 0 rgba(105,88,68,.045); font-size:21rpx; }
.history-button { width:100%; margin:0; background:transparent; box-shadow:none; }
.sketch-action.disabled { opacity:.4; }
.action-icon { @include studio-toolbar-icon; }
.finish-button {
  position: relative;
  overflow: hidden;
  gap: 8rpx;
  background: #87977d;
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
