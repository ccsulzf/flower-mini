<script setup lang="ts">
import type { StudioCompletionState } from '../studio-types'

defineProps<{
  state: StudioCompletionState
  imagePath: string
  imageError: string
}>()

const emit = defineEmits<{
  close: []
  retry: []
  preview: []
  share: []
  'make-card': []
}>()
</script>

<template>
  <view v-if="state !== 'idle'" class="completion-overlay" @click="state === 'ready' && emit('close')" @touchmove.stop.prevent>
    <view class="completion-sheet" @click.stop>
      <template v-if="state === 'saving' || state === 'generating'">
        <view class="completion-bloom" aria-hidden="true">
          ✿
        </view>
        <text class="completion-title">
          {{ state === 'saving' ? '正在收好这束花…' : '正在制作作品图片…' }}
        </text>
        <text class="completion-note">
          {{ state === 'saving' ? '正在保存作品' : '作品已保存，请稍候' }}
        </text>
      </template>
      <template v-else-if="state === 'failed'">
        <view class="completion-bloom completion-bloom-still" aria-hidden="true">
          ✿
        </view>
        <text class="completion-title">
          图片还没有准备好
        </text>
        <text class="completion-note">
          {{ imageError || '作品已保存，请重试生成图片' }}
        </text>
        <view class="completion-actions">
          <view class="completion-button-wrap completion-button-primary">
            <button class="completion-primary" @click="emit('retry')">
              重新生成
            </button>
          </view>
        </view>
      </template>
      <template v-else>
        <button class="completion-close" aria-label="关闭完成作品弹窗" @click="emit('close')">
          ×
        </button>
        <view class="completion-kicker">
          我的花作
        </view>
        <text class="completion-title">
          这束花已经完成
        </text>
        <view v-if="imagePath" class="completion-photo">
          <view class="completion-tape" aria-hidden="true" />
          <image class="completion-image" :src="imagePath" mode="aspectFit" @click="emit('preview')" />
        </view>
        <view class="completion-actions">
          <view class="completion-button-wrap completion-button-secondary">
            <button class="completion-secondary" @click="emit('share')">
              <view class="i-carbon-share" />分享图片
            </button>
          </view>
          <view class="completion-button-wrap completion-button-primary">
            <button class="completion-primary" @click="emit('make-card')">
              <view class="i-carbon-image" />制作贺卡
            </button>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;

.completion-overlay {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  padding: 38rpx;
  background: rgba(var(--app-ink-rgb), .42);
}

.completion-sheet {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 570rpx;
  max-height: 88vh;
  overflow: auto;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  padding: 26rpx 26rpx 24rpx;
  border: 2rpx solid rgba(var(--app-ink-rgb), .38);
  border-radius: 5rpx 13rpx 7rpx 10rpx;
  background: $studio-paper;
  box-shadow: 6rpx 8rpx 0 var(--app-line), 9rpx 12rpx 0 rgba(var(--app-ink-rgb), .18);
  color: $studio-ink;
  text-align: center;
}

.completion-kicker {
  padding: 0 14rpx 5rpx;
  border-bottom: 1rpx solid $studio-border;
  color: $studio-muted;
  font-size: 19rpx;
  line-height: 1.4;
  letter-spacing: 4rpx;
  transform: rotate(-2deg);
}

.completion-title {
  margin-top: 10rpx;
  color: $studio-ink;
  font-family: STSong, SimSun, serif;
  font-size: 32rpx;
  font-weight: 500;
  line-height: 1.5;
}

.completion-note {
  margin-top: 8rpx;
  color: $studio-muted;
  font-size: 23rpx;
  line-height: 1.7;
}

.completion-photo {
  position: relative;
  flex-shrink: 0;
  margin-top: 24rpx;
  padding: 8rpx;
  border: 1rpx solid rgba(var(--app-ink-rgb), .2);
  background: $studio-panel;
  box-shadow: 3rpx 5rpx 0 rgba(var(--app-ink-rgb), .09);
}

.completion-tape {
  position: absolute;
  top: -12rpx;
  left: 50%;
  z-index: 1;
  width: 100rpx;
  height: 28rpx;
  margin-left: -50rpx;
  border: 1rpx solid rgba(var(--app-danger-rgb), .12);
  background: rgba(var(--app-line-rgb), .64);
  transform: rotate(-4deg);
  pointer-events: none;
}

.completion-image {
  display: block;
  width: 390rpx;
  height: 559rpx;
  // 扣除标题、相框与操作区的空间，矮屏上按作品比例同步限制宽高。
  max-width: calc(61.424vh - 209.4rpx);
  max-height: calc(88vh - 300rpx);
  background: $studio-secondary;
}

.completion-caption {
  display: block;
  padding: 12rpx 0 14rpx;
  color: var(--app-inkMuted);
  font-family: STKaiti, KaiTi, serif;
  font-size: 22rpx;
  letter-spacing: 3rpx;
}

.completion-actions {
  display: flex;
  flex-shrink: 0;
  width: 100%;
  gap: 16rpx;
  margin-top: 22rpx;
}

.completion-button-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 76rpx;
  border: 2rpx solid rgba(var(--app-ink-rgb), .55);
  border-radius: 17rpx 255rpx 19rpx 225rpx / 225rpx 19rpx 255rpx 17rpx;
  &::before {
    position: absolute;
    top: -3rpx;
    right: 2rpx;
    bottom: 2rpx;
    left: -3rpx;
    border: 1rpx solid rgba(var(--app-ink-rgb), .32);
    border-radius: 255rpx 16rpx 225rpx 20rpx / 19rpx 225rpx 23rpx 255rpx;
    content: '';
    transform: rotate(-.7deg);
    pointer-events: none;
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    width: calc(100% - 8rpx);
    height: 68rpx;
    margin: 4rpx;
    padding: 0 8rpx;
    border: 0;
    border-radius: 12rpx 9rpx 15rpx 10rpx;
    font-size: 24rpx;
    line-height: 1;
    &::after { border: 0; }
    &:active { transform: translateY(3rpx); }
    view { width: 27rpx; height: 27rpx; transform: rotate(-4deg); }
  }
}

.completion-button-primary {
  border-radius: 255rpx 18rpx 225rpx 20rpx / 19rpx 225rpx 23rpx 255rpx;
  &::before { transform: rotate(.8deg); }
}
.completion-primary { background: var(--app-brand); color: $studio-panel; }
.completion-secondary { background: $studio-secondary; color: $studio-ink; }

.completion-close {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 72rpx;
  height: 72rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: $studio-muted;
  font-size: 42rpx;
  line-height: 72rpx;
  &::after { border: 0; }
}

.completion-bloom {
  padding-top: 18rpx;
  color: var(--app-danger);
  font-size: 64rpx;
  line-height: 1.3;
  animation: completion-bloom 1.6s ease-in-out infinite;
}
.completion-bloom-still { animation: none; }
@keyframes completion-bloom {
  0%, 100% { transform: rotate(-5deg); opacity: .65; }
  50% { transform: rotate(5deg); opacity: 1; }
}
</style>
