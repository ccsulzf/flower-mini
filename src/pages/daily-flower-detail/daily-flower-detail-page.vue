<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getCurrentInstance, ref } from 'vue'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'

definePage({ style: { navigationBarTitleText: '每日花束', navigationBarBackgroundColor: '#f6f3eb', backgroundColor: '#f6f3eb' } })

const dailyFlowers = useDailyFlowerStore()
const works = useFlowerWorksStore()
const flower = ref<typeof dailyFlowers.todayFlower.value>(null)
const date = ref('')
const loading = ref(true)
const error = ref('')
const copying = ref(false)
const sharing = ref(false)
const instance = getCurrentInstance()
let alive = true

onLoad((query) => {
  date.value = String(query?.date || '')
  void loadFlower()
})
onUnload(() => {
  alive = false
})

async function loadFlower(refresh = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) {
    error.value = '每日花束日期无效'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await dailyFlowers.loadDate(date.value, refresh)
    if (!alive)
      return
    if (!result)
      throw new Error('这一天没有已发布的花束')
    flower.value = result
  }
  catch (value) {
    if (alive)
      error.value = creationFailure(value)
  }
  finally {
    if (alive)
      loading.value = false
  }
}

function makeCard() {
  if (!flower.value)
    return
  uni.navigateTo({
    url: `/pages/flower-card/flower-card-page?dailyFlowerDate=${flower.value.date}`,
  })
}

function shareFlower() {
  const original = flower.value
  if (!original || sharing.value)
    return
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && typeof wx.showShareImageMenu === 'function' && wx.canIUse('showShareImageMenu')) {
    sharing.value = true
    wx.showShareImageMenu({
      path: original.imagePath,
      complete: () => {
        sharing.value = false
      },
      fail: (value) => {
        if (!String(value.errMsg || '').includes('cancel'))
          uni.showToast({ title: '分享失败，请重试', icon: 'none' })
      },
    })
    return
  }
  // #endif
  uni.showToast({ title: '当前平台不支持直接分享图片', icon: 'none' })
}

async function copyToStudio() {
  const original = flower.value
  if (!original || copying.value)
    return
  copying.value = true
  try {
    const work = await works.save({
      draft: {
        artwork: original.artwork,
        card: { blessing: '', signature: '' },
        updatedAt: Date.now(),
      },
      title: `每日花束 ${original.date}`,
      description: original.description,
    })
    const channel = (instance?.proxy as unknown as { getOpenerEventChannel?: () => UniApp.EventChannel })
      ?.getOpenerEventChannel?.()
    if (channel) {
      channel.emit('daily-flower-copied', { workId: work.id })
    }
    else {
      uni.redirectTo({ url: `/pages/flower-studio/flower-studio-page?workId=${work.id}&edit=1` })
    }
  }
  catch (value) {
    uni.showToast({ title: creationFailure(value), icon: 'none' })
  }
  finally {
    copying.value = false
  }
}
</script>

<template>
  <view class="daily-detail">
    <view v-if="loading" class="detail-state">
      正在加载花束…
    </view>
    <view v-else-if="error" class="detail-state detail-error">
      <text>{{ error }}</text>
      <button class="retry-button" @click="loadFlower(true)">
        重试
      </button>
    </view>
    <template v-else-if="flower">
      <view class="artwork-paper">
        <view class="paper-tape paper-tape-left" />
        <view class="paper-tape paper-tape-right" />
        <view class="detail-image-wrap">
          <image class="detail-image" :src="flower.imagePath" mode="aspectFit" />
        </view>
        <view class="botanical-note" aria-hidden="true">
          <view class="botanical-stem" />
          <view class="botanical-leaf leaf-one" />
          <view class="botanical-leaf leaf-two" />
          <view class="botanical-leaf leaf-three" />
        </view>
      </view>

      <view class="detail-content">
        <view class="message-tape" />
        <text class="detail-description">
          {{ flower.description }}
        </text>
        <view class="message-flourish" aria-hidden="true">
          <view class="flourish-line" />
          <view class="flourish-heart">♡</view>
        </view>
      </view>

      <view class="detail-actions">
        <view class="sketch-action sketch-card">
          <view class="sketch-outline sketch-outline-back" />
          <view class="sketch-outline sketch-outline-front" />
          <button
            class="paper-action"
            hover-class="paper-action-pressed"
            :disabled="copying || sharing"
            @click="makeCard"
          >
            <view class="i-carbon-image" />
            <text>做贺卡</text>
          </button>
        </view>
        <view class="sketch-action sketch-share">
          <view class="sketch-outline sketch-outline-back" />
          <view class="sketch-outline sketch-outline-front" />
          <button
            class="paper-action"
            hover-class="paper-action-pressed"
            :disabled="copying || sharing"
            @click="shareFlower"
          >
            <view class="i-carbon-share" />
            <text>分享</text>
          </button>
        </view>
        <view class="sketch-action sketch-copy">
          <view class="sketch-outline sketch-outline-back" />
          <view class="sketch-outline sketch-outline-front" />
          <button
            class="paper-action"
            hover-class="paper-action-pressed"
            :disabled="copying || sharing"
            @click="copyToStudio"
          >
            <view class="i-carbon-copy" />
            <text>{{ copying ? '复制中' : '复制创作' }}</text>
          </button>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.daily-detail {
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  box-sizing: border-box;
  padding: 24rpx 30rpx calc(30rpx + env(safe-area-inset-bottom));
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 8%, rgba(193, 171, 139, .07) 0 2rpx, transparent 3rpx),
    radial-gradient(circle at 72% 28%, rgba(193, 171, 139, .05) 0 2rpx, transparent 3rpx),
    #f8f3e9;
  background-size: 34rpx 34rpx, 46rpx 46rpx, auto;
  color: #514a40;
}

.artwork-paper {
  position: relative;
  flex: 0 0 auto;
  padding: 20rpx;
  border: 2rpx solid rgba(184, 168, 139, .18);
  border-radius: 18rpx 26rpx 20rpx 30rpx;
  background: rgba(255, 253, 246, .9);
  box-shadow: 0 14rpx 34rpx rgba(88, 74, 55, .075);
}

.artwork-paper::after {
  position: absolute;
  right: 28rpx;
  bottom: -5rpx;
  left: 34rpx;
  height: 10rpx;
  border-bottom: 2rpx dashed rgba(174, 152, 120, .24);
  content: '';
}

.paper-tape {
  position: absolute;
  z-index: 2;
  width: 108rpx;
  height: 34rpx;
  opacity: .72;
}

.paper-tape-left { top: -18rpx; left: 34rpx; transform: rotate(-9deg); background: #cbd2af; }
.paper-tape-right { top: -17rpx; right: 54rpx; transform: rotate(7deg); background: #e4cfaf; }

.detail-image-wrap {
  display: flex;
  width: 100%;
  height: min(108vw, 820rpx);
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12rpx 20rpx 14rpx 22rpx;
  background: #f2f0e7;
}

.detail-image {
  display: block;
  width: 100%;
  height: 100%;
}

.botanical-note {
  position: absolute;
  right: 20rpx;
  bottom: 18rpx;
  width: 74rpx;
  height: 112rpx;
  transform: rotate(7deg);
  border: 1rpx solid rgba(152, 142, 119, .2);
  background: rgba(248, 244, 231, .9);
  box-shadow: 0 5rpx 12rpx rgba(85, 75, 59, .06);
}

.botanical-stem {
  position: absolute;
  bottom: 12rpx;
  left: 35rpx;
  width: 2rpx;
  height: 78rpx;
  transform: rotate(14deg);
  background: #7f9274;
}

.botanical-leaf {
  position: absolute;
  width: 22rpx;
  height: 12rpx;
  border-radius: 100% 0 100% 0;
  background: #91a186;
}

.leaf-one { top: 32rpx; left: 15rpx; transform: rotate(30deg); }
.leaf-two { top: 54rpx; right: 10rpx; transform: rotate(-24deg) scaleX(-1); }
.leaf-three { top: 72rpx; left: 16rpx; transform: rotate(18deg); }

.detail-content {
  position: relative;
  flex-shrink: 0;
  width: 82%;
  min-height: 104rpx;
  box-sizing: border-box;
  margin: 24rpx auto 22rpx;
  padding: 30rpx 34rpx 22rpx;
  transform: rotate(-.7deg);
  background: #f5ead7;
  box-shadow: 0 8rpx 20rpx rgba(92, 74, 51, .06);
  text-align: center;
}

.message-tape {
  position: absolute;
  top: -13rpx;
  left: 50%;
  width: 86rpx;
  height: 26rpx;
  transform: translateX(-50%) rotate(3deg);
  background: rgba(218, 180, 173, .58);
}

.detail-description {
  color: #655849;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
  font-size: 27rpx;
  line-height: 1.65;
}

.message-flourish {
  position: relative;
  width: 170rpx;
  height: 28rpx;
  margin: 8rpx auto 0;
}

.flourish-line {
  position: absolute;
  top: 13rpx;
  left: 10rpx;
  width: 135rpx;
  height: 16rpx;
  border-top: 2rpx solid #887261;
  border-radius: 50%;
  transform: rotate(-3deg);
}

.flourish-heart {
  position: absolute;
  top: -5rpx;
  right: 1rpx;
  color: #887261;
  font-size: 32rpx;
}

.detail-actions {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 1fr .8fr 1.15fr;
  gap: 14rpx;
  padding: 4rpx 2rpx 8rpx;
}

.sketch-action {
  position: relative;
  height: 84rpx;
}

.sketch-card { transform: rotate(.8deg); }
.sketch-share { transform: rotate(-1deg); }
.sketch-copy { transform: rotate(.55deg); }

.sketch-outline {
  position: absolute;
  pointer-events: none;
}

.sketch-outline-back {
  top: 1rpx;
  right: -2rpx;
  bottom: -2rpx;
  left: 2rpx;
  border: 2rpx solid rgba(91, 74, 57, .34);
  border-radius: 255rpx 18rpx 225rpx 22rpx / 20rpx 225rpx 24rpx 255rpx;
  transform: rotate(-.65deg);
}

.sketch-outline-front {
  top: 3rpx;
  right: 2rpx;
  bottom: 2rpx;
  left: -1rpx;
  border: 2rpx solid rgba(91, 74, 57, .7);
  border-radius: 18rpx 255rpx 20rpx 225rpx / 225rpx 20rpx 255rpx 18rpx;
  transform: rotate(.45deg);
}

.sketch-share .sketch-outline-back {
  top: -1rpx;
  right: 1rpx;
  bottom: 2rpx;
  left: -2rpx;
  border-radius: 22rpx 225rpx 16rpx 255rpx / 255rpx 18rpx 225rpx 22rpx;
  transform: rotate(.8deg);
}

.sketch-share .sketch-outline-front {
  top: 3rpx;
  right: -2rpx;
  bottom: 0;
  left: 2rpx;
  border-radius: 225rpx 20rpx 255rpx 16rpx / 18rpx 255rpx 20rpx 225rpx;
  transform: rotate(-.6deg);
}

.sketch-copy .sketch-outline-back {
  top: 2rpx;
  right: -2rpx;
  bottom: -1rpx;
  left: 1rpx;
  border-radius: 255rpx 16rpx 225rpx 20rpx / 22rpx 225rpx 18rpx 255rpx;
  transform: rotate(-.45deg);
}

.sketch-copy .sketch-outline-front {
  top: 0;
  right: 2rpx;
  bottom: 3rpx;
  left: -2rpx;
  border-radius: 16rpx 225rpx 22rpx 255rpx / 255rpx 20rpx 225rpx 18rpx;
  transform: rotate(.7deg);
}

.paper-action {
  position: relative;
  z-index: 1;
  display: flex;
  width: calc(100% - 8rpx);
  min-width: 0;
  height: 76rpx;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-sizing: border-box;
  margin: 4rpx;
  padding: 0 14rpx;
  border: 0;
  border-radius: 18rpx 12rpx 20rpx 14rpx;
  background: transparent;
  box-shadow: 5rpx 6rpx 0 rgba(105, 88, 68, .08);
  clip-path: polygon(1% 7%, 97% 1%, 100% 90%, 96% 99%, 4% 96%, 0 13%);
  color: #5c5145;
  font-size: 23rpx;
  font-weight: 500;
  line-height: 1;
}

.paper-action::after {
  border: 0;
}
.paper-action view { flex-shrink: 0; font-size: 29rpx; transform: rotate(-4deg); }
.paper-action text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sketch-card .paper-action { background: #f2deda; }
.sketch-share .paper-action { background: #e3e9d7; }
.sketch-share .paper-action view { transform: rotate(3deg); }
.sketch-copy .paper-action { background: #f0e3c8; }
.sketch-copy .paper-action view { transform: rotate(-2deg); }
.paper-action[disabled] { opacity: .48; }
.paper-action-pressed { transform: translate(3rpx, 4rpx) rotate(.4deg); opacity: .8; }

.detail-state {
  display: flex;
  min-height: 60vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  color: #7c8474;
  font-size: 25rpx;
  text-align: center;
}

.detail-error {
  color: #995c50;
}

.retry-button {
  padding: 0 28rpx;
  background: #fffdf7;
  color: #64715b;
  font-size: 24rpx;
  line-height: 60rpx;
}
</style>
