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
      <view class="daily-flower-kicker">
        DAILY FLOWER
      </view>
      <view class="daily-flower-title">
        今日花束
      </view>
      <view class="daily-flower-date">
        {{ flower.date }}
      </view>
      <image class="daily-flower-image" :src="flower.imagePath" mode="aspectFit" />
      <view class="daily-flower-description">
        {{ flower.description }}
      </view>
      <view class="daily-flower-actions">
        <button class="daily-flower-secondary" @click="share">
          <view class="i-carbon-share" />
          分享花束
        </button>
        <button class="daily-flower-primary" @click="makeCard">
          <view class="i-carbon-image" />
          生成贺卡
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.daily-flower-mask { position: fixed; z-index: 99998; inset: 0; display: flex; align-items: center; justify-content: center; padding: 40rpx; box-sizing: border-box; background: rgba(35, 41, 34, .58); }
.daily-flower-dialog { position: relative; width: 100%; max-width: 620rpx; padding: 34rpx 28rpx 28rpx; box-sizing: border-box; border: 1rpx solid #e7e2d5; border-radius: 30rpx; background: #fffdf7; color: #3f463d; box-shadow: 0 20rpx 80rpx rgba(30, 38, 29, .2); }
.daily-flower-close { position: absolute; top: 14rpx; right: 16rpx; width: 56rpx; height: 56rpx; margin: 0; padding: 0; border: 0; border-radius: 50%; background: #f1f0e9; color: #6f7964; font-size: 42rpx; line-height: 52rpx; }
.daily-flower-close::after, .daily-flower-actions button::after { border: 0; }
.daily-flower-kicker { color: #849c81; font-size: 19rpx; letter-spacing: 5rpx; text-align: center; }
.daily-flower-title { margin-top: 8rpx; font-size: 36rpx; font-weight: 650; text-align: center; }
.daily-flower-date { margin-top: 8rpx; color: #818779; font-size: 22rpx; text-align: center; }
.daily-flower-image { display: block; width: 100%; height: 620rpx; margin-top: 18rpx; border-radius: 18rpx; background: #f2f0e9; }
.daily-flower-description { margin: 18rpx 6rpx 20rpx; color: #6f756a; font-size: 24rpx; line-height: 1.6; }
.daily-flower-actions { display: flex; gap: 16rpx; }
.daily-flower-actions button { display: flex; flex: 1; height: 84rpx; align-items: center; justify-content: center; gap: 10rpx; margin: 0; border-radius: 44rpx; font-size: 25rpx; }
.daily-flower-secondary { border: 1rpx solid #dcded3; background: #fffdf7; color: #58624f; }
.daily-flower-primary { background: #758c70; color: #fffdf7; }
</style>
