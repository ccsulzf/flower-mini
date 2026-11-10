<script setup lang="ts">
import { computed } from 'vue'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'

const dailyFlower = useDailyFlowerStore()
const flower = computed(() => dailyFlower.todayFlower)

function share() {
  const item = flower.value
  if (!item)
    return
  dailyFlower.dismissToday()
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && typeof wx.showShareImageMenu === 'function' && wx.canIUse('showShareImageMenu')) {
    wx.showShareImageMenu({
      path: item.imagePath,
      fail: (error) => {
        if (!String(error.errMsg || '').includes('cancel'))
          uni.showToast({ title: '分享失败，请重试', icon: 'none' })
      },
    })
    return
  }
  // #endif
  uni.showToast({ title: '当前平台不支持直接分享图片', icon: 'none' })
}

function makeCard() {
  const item = flower.value
  if (!item)
    return
  dailyFlower.dismissToday()
  uni.navigateTo({ url: `/pages/flower-card/flower-card-page?dailyFlowerDate=${item.date}` })
}
</script>

<template>
  <view v-if="dailyFlower.visible && flower" class="daily-flower-mask" @click="dailyFlower.dismissToday">
    <view class="daily-flower-dialog" @click.stop>
      <button class="daily-flower-close" aria-label="关闭今日花束" @click="dailyFlower.dismissToday">
        ×
      </button>
      <view class="daily-flower-title">
        今日花束
      </view>
      <view class="daily-flower-date">
        {{ flower.date }}
      </view>
      <view class="daily-flower-photo">
        <view class="daily-flower-tape" />
        <image class="daily-flower-image" :src="flower.imagePath" mode="aspectFit" />
      </view>
      <view class="daily-flower-description">
        {{ flower.description }}
      </view>
      <view class="daily-flower-actions">
        <view class="daily-flower-button-wrap">
          <button class="daily-flower-secondary" hover-class="daily-flower-button-pressed" @click="share">
            <view class="i-carbon-share" />
            分享花束
          </button>
        </view>
        <view class="daily-flower-button-wrap daily-flower-button-primary">
          <button class="daily-flower-primary" hover-class="daily-flower-button-pressed" @click="makeCard">
            <view class="i-carbon-image" />
            生成贺卡
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;

.daily-flower-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 99998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
  background: rgba(70, 61, 48, .42);
}

.daily-flower-dialog {
  position: relative;
  width: 100%;
  max-width: 620rpx;
  max-height: 86vh;
  overflow-y: auto;
  padding: 32rpx 26rpx 28rpx;
  box-sizing: border-box;
  border: 2rpx solid $studio-border;
  border-radius: 6rpx 14rpx 8rpx 11rpx;
  background: $studio-paper;
  color: $studio-ink;
  box-shadow: 5rpx 7rpx 0 #d8cdb9, 8rpx 10rpx 0 rgba(79, 64, 45, .12);
}

.daily-flower-close {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
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
}

.daily-flower-close::after,
.daily-flower-actions button::after { border: 0; }

.daily-flower-title {
  margin: 8rpx 56rpx 0;
  font-family: STSong, SimSun, serif;
  font-size: 36rpx;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 4rpx;
  text-align: center;
}

.daily-flower-date {
  width: 190rpx;
  margin: 8rpx auto 0;
  padding-bottom: 10rpx;
  border-bottom: 1rpx solid $studio-border;
  color: $studio-muted;
  font-size: 21rpx;
  letter-spacing: 2rpx;
  text-align: center;
}

.daily-flower-photo {
  position: relative;
  margin-top: 28rpx;
  padding: 10rpx;
  border: 1rpx solid $studio-border;
  background: $studio-panel;
  box-shadow: 3rpx 4rpx 0 $studio-shadow;
}

.daily-flower-tape {
  position: absolute;
  top: -12rpx;
  left: 50%;
  z-index: 1;
  width: 102rpx;
  height: 28rpx;
  margin-left: -51rpx;
  background: rgba(224, 207, 166, .64);
  transform: rotate(-4deg);
  pointer-events: none;
}

.daily-flower-image {
  display: block;
  width: 100%;
  height: 600rpx;
  background: $studio-secondary;
}

.daily-flower-description {
  margin: 22rpx 6rpx 24rpx;
  padding-left: 16rpx;
  border-left: 3rpx solid #c4cdb8;
  color: $studio-muted;
  font-family: STKaiti, KaiTi, serif;
  font-size: 25rpx;
  line-height: 1.75;
  overflow-wrap: break-word;
}

.daily-flower-actions { display: flex; gap: 18rpx; }

.daily-flower-button-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 84rpx;
  box-sizing: border-box;
  border: 2rpx solid rgba(91, 74, 57, .55);
  border-radius: 17rpx 255rpx 19rpx 225rpx / 225rpx 19rpx 255rpx 17rpx;
  box-shadow: 1rpx 3rpx 0 $studio-shadow;

  &::before {
    position: absolute;
    top: -3rpx;
    right: 2rpx;
    bottom: 2rpx;
    left: -3rpx;
    border: 1rpx solid rgba(91, 74, 57, .32);
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
    height: 72rpx;
    margin: 4rpx;
    padding: 0 8rpx;
    border: 0;
    border-radius: 12rpx 9rpx 15rpx 10rpx;
    font-size: 25rpx;
    line-height: 1;

    view { width: 27rpx; height: 27rpx; transform: rotate(-4deg); }
  }
}

.daily-flower-button-primary {
  border-radius: 255rpx 18rpx 225rpx 20rpx / 19rpx 225rpx 23rpx 255rpx;
  &::before { transform: rotate(.8deg); }
}

.daily-flower-button-pressed { transform: translateY(3rpx); }
.daily-flower-secondary { background: $studio-secondary; color: $studio-ink; }
.daily-flower-primary { background: #87977d; color: $studio-panel; }
</style>
