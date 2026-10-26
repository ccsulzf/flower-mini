<script setup lang="ts">
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { computed, getCurrentInstance, ref } from 'vue'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { useDevice } from '@/hooks/useDevice'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

definePage({ layout: 'default', style: { navigationBarTitleText: '每日插花', navigationBarBackgroundColor: '#f8f3e9', backgroundColor: '#f8f3e9' } })

const dailyFlowers = useDailyFlowerStore()
const { deviceWidth } = useDevice()
const artworkScale = computed(() => {
  const width = deviceWidth.value
  const rpx = width / 750
  const cardWidth = (width - (56 + 8 + 22) * rpx) / 2 - (4 + 24 + 2) * rpx
  return Math.max(0.1, Math.min(1, cardWidth / studioMetrics.width))
})
const instance = getCurrentInstance()

onShow(() => {
  void dailyFlowers.loadHistory(true)
})
onReachBottom(() => {
  if (dailyFlowers.historyHasMore)
    void dailyFlowers.loadHistory()
})

function displayDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

function currentLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const today = currentLocalDate()

function filterByDate(event: { detail: { value: string } }) {
  void dailyFlowers.loadHistory(true, event.detail.value)
}

function clearDateFilter() {
  void dailyFlowers.loadHistory(true, '')
}

function openFlower(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return
  const channel = (instance?.proxy as unknown as { getOpenerEventChannel?: () => UniApp.EventChannel })
    ?.getOpenerEventChannel?.()
  uni.navigateTo({
    url: `/pages/daily-flower-detail/daily-flower-detail-page?date=${date}`,
    events: {
      'daily-flower-copied': (payload: { workId: string }) => {
        if (!/^[a-f\d]{32}$/.test(payload?.workId))
          return
        if (channel) {
          channel.emit('daily-flower-copied', payload)
          uni.navigateBack({ delta: 2 })
        }
        else {
          uni.redirectTo({ url: `/pages/flower-studio/flower-studio-page?workId=${payload.workId}&edit=1` })
        }
      },
    },
  })
}
</script>

<template>
  <view class="daily-page">
    <view class="daily-heading">
      <view class="history-filter">
        <picker
          mode="date"
          :value="dailyFlowers.historyDateFilter || today"
          :end="today"
          :disabled="dailyFlowers.historyLoading"
          @change="filterByDate"
        >
          <view class="filter-picker">
            <view class="filter-tape" aria-hidden="true" />
            <view class="i-carbon-calendar" />
            <text>{{ dailyFlowers.historyDateFilter ? displayDate(dailyFlowers.historyDateFilter) : '选择日期' }}</text>
            <view class="i-carbon-chevron-down" />
          </view>
        </picker>
        <button
          v-if="dailyFlowers.historyDateFilter"
          class="clear-filter"
          :disabled="dailyFlowers.historyLoading"
          @click="clearDateFilter"
        >
          重置
        </button>
      </view>
      <view class="heading-copy">
        <text class="daily-kicker">
          FLOWER JOURNAL
        </text>
        <text class="daily-subtitle">
          留住每一份花意
        </text>
      </view>
      <view class="heading-doodle" aria-hidden="true">
        <view class="heading-flower">
          <view class="heading-petal petal-a" />
          <view class="heading-petal petal-b" />
          <view class="heading-petal petal-c" />
          <view class="heading-petal petal-d" />
          <view class="heading-flower-center" />
        </view>
        <view class="heading-stem" />
        <view class="heading-leaf heading-leaf-left" />
        <view class="heading-leaf heading-leaf-right" />
      </view>
    </view>

    <view v-if="dailyFlowers.historyError" class="history-error">
      <text>{{ dailyFlowers.historyError }}</text>
      <button :disabled="dailyFlowers.historyLoading" @click="dailyFlowers.loadHistory(true)">
        重试
      </button>
    </view>
    <view v-else-if="!dailyFlowers.historyItems.length && !dailyFlowers.historyLoading" class="history-empty">
      <view class="i-carbon-calendar" />
      <text>{{ dailyFlowers.historyDateFilter ? '该日期没有已发布的每日花束' : '还没有已发布的每日花束' }}</text>
    </view>

    <view class="history-list">
      <view
        v-for="(flower, index) in dailyFlowers.historyItems"
        :key="flower.date"
        class="history-card"
        :class="index % 2 ? 'history-card-even' : 'history-card-odd'"
      >
        <view class="card-tape" aria-hidden="true" />
        <view class="history-cover">
          <FlowerArtworkPreview :daily-date="flower.date" :scale="artworkScale" />
          <view class="history-cover-hitarea" @tap="openFlower(flower.date)" />
        </view>
        <view class="history-content" @click="openFlower(flower.date)">
          <text class="history-date">
            {{ displayDate(flower.date) }}
          </text>
          <view class="history-date-line" aria-hidden="true" />
          <text class="history-description">
            {{ flower.description }}
          </text>
        </view>
      </view>
    </view>

    <view v-if="dailyFlowers.historyLoading" class="history-state">
      正在加载每日花束…
    </view>
    <button
      v-else-if="dailyFlowers.historyHasMore && dailyFlowers.historyItems.length"
      class="load-more"
      @click="dailyFlowers.loadHistory()"
    >
      加载更多
    </button>
    <view v-else-if="dailyFlowers.historyItems.length" class="history-state">
      已经看完所有每日花束了
    </view>
  </view>
</template>

<style scoped lang="scss">
.daily-page {
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 34rpx 28rpx calc(42rpx + env(safe-area-inset-bottom));
  overflow-x: hidden;
  background:
    radial-gradient(circle at 18% 8%, rgba(193, 171, 139, .07) 0 2rpx, transparent 3rpx),
    radial-gradient(circle at 72% 28%, rgba(193, 171, 139, .05) 0 2rpx, transparent 3rpx),
    #f8f3e9;
  background-size: 34rpx 34rpx, 46rpx 46rpx, auto;
  color: #514a40;
}

.daily-heading {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 82rpx;
  margin-bottom: 24rpx;
  padding: 10rpx 8rpx 12rpx 4rpx;
}

.daily-heading::after {
  position: absolute;
  right: 76rpx;
  bottom: 0;
  left: 6rpx;
  height: 14rpx;
  transform: rotate(-1deg);
  border-top: 2rpx solid rgba(112, 91, 68, .52);
  border-radius: 50%;
  content: '';
}

.heading-copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}

.daily-kicker,
.daily-subtitle {
  display: block;
}

.daily-kicker {
  overflow: hidden;
  margin-bottom: 3rpx;
  color: #a28b71;
  font-family: Georgia, serif;
  font-size: 15rpx;
  letter-spacing: 2rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.daily-subtitle {
  overflow: hidden;
  color: #817667;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
  font-size: 19rpx;
  letter-spacing: 1rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heading-doodle {
  position: relative;
  width: 62rpx;
  height: 76rpx;
  flex: 0 0 auto;
  transform: rotate(7deg);
}

.heading-flower {
  position: absolute;
  top: 0;
  left: 11rpx;
  width: 42rpx;
  height: 42rpx;
}

.heading-petal,
.heading-flower-center {
  position: absolute;
  border-radius: 60% 40% 60% 40%;
}

.heading-petal {
  width: 17rpx;
  height: 22rpx;
  background: rgba(213, 154, 153, .84);
}

.petal-a { top: 0; left: 13rpx; }
.petal-b { top: 10rpx; right: 0; transform: rotate(90deg); }
.petal-c { bottom: 0; left: 13rpx; transform: rotate(180deg); }
.petal-d { top: 10rpx; left: 0; transform: rotate(-90deg); }
.heading-flower-center { top: 15rpx; left: 16rpx; width: 10rpx; height: 10rpx; background: #d6ad58; }
.heading-stem { position: absolute; top: 36rpx; left: 32rpx; width: 2rpx; height: 39rpx; transform: rotate(9deg); background: #829178; }
.heading-leaf { position: absolute; width: 20rpx; height: 10rpx; border-radius: 100% 0 100% 0; background: rgba(137, 156, 125, .9); }
.heading-leaf-left { top: 50rpx; left: 14rpx; transform: rotate(28deg); }
.heading-leaf-right { top: 59rpx; right: 8rpx; transform: rotate(-28deg) scaleX(-1); }

.history-filter picker {
  transform: rotate(-.8deg);
}

.load-more {
  margin: 0;
  border: 0;
  border-radius: 999rpx;
  font-size: 23rpx;
  line-height: 64rpx;
}

.history-filter {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  align-items: center;
  gap: 8rpx;
}

.filter-picker {
  position: relative;
  display: flex;
  height: 58rpx;
  align-items: center;
  gap: 10rpx;
  padding: 0 17rpx;
  border: 2rpx solid rgba(105, 88, 68, .42);
  border-radius: 18rpx 12rpx 20rpx 14rpx;
  background: #f3ead8;
  box-shadow: 5rpx 6rpx 0 rgba(105, 88, 68, .07);
  clip-path: polygon(1% 7%, 98% 1%, 100% 91%, 96% 99%, 3% 96%, 0 12%);
  color: #625648;
  font-size: 20rpx;
}

.filter-tape {
  position: absolute;
  top: -14rpx;
  left: 50%;
  width: 52rpx;
  height: 18rpx;
  transform: translateX(-50%) rotate(3deg);
  background: rgba(203, 210, 175, .72);
}

.filter-picker .i-carbon-calendar,
.filter-picker .i-carbon-chevron-down {
  color: #78866f;
  font-size: 22rpx;
}

.clear-filter {
  margin: 0;
  padding: 0 2rpx;
  background: transparent;
  color: #7d6e5d;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
  font-size: 19rpx;
  line-height: 54rpx;
  text-decoration: underline;
  text-decoration-color: rgba(125, 110, 93, .44);
  text-underline-offset: 7rpx;
}

.clear-filter::after {
  border: 0;
}

.history-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28rpx 22rpx;
  padding: 8rpx 4rpx 14rpx;
}

.history-card {
  position: relative;
  overflow: hidden;
  border: 2rpx solid rgba(113, 94, 70, .38);
  border-radius: 15rpx 23rpx 18rpx 27rpx;
  background: rgba(255, 253, 246, .94);
  box-shadow: 7rpx 10rpx 0 rgba(101, 83, 61, .06), 0 15rpx 28rpx rgba(88, 74, 55, .07);
  clip-path: polygon(.7% 1.5%, 98.8% .3%, 100% 97.5%, 96.8% 100%, 1.2% 98.7%, 0 3%);
  transition: opacity .15s ease, transform .15s ease;
  &:active { opacity: .78; }
}

.history-card-odd { transform: rotate(-.65deg); }
.history-card-even { transform: translateY(10rpx) rotate(.7deg); }
.history-card-odd:active { transform: translate(2rpx, 4rpx) rotate(-.2deg); }
.history-card-even:active { transform: translate(2rpx, 14rpx) rotate(.2deg); }

.card-tape {
  position: absolute;
  z-index: 4;
  top: -7rpx;
  left: 50%;
  width: 76rpx;
  height: 27rpx;
  transform: translateX(-50%) rotate(-4deg);
  background: rgba(228, 207, 175, .76);
  pointer-events: none;
}

.history-card-even .card-tape {
  transform: translateX(-50%) rotate(5deg);
  background: rgba(203, 210, 175, .76);
}

.history-cover {
  position: relative;
  height: 420rpx;
  margin: 12rpx 12rpx 0;
  overflow: hidden;
  border: 1rpx solid rgba(153, 138, 113, .17);
  border-radius: 10rpx 16rpx 12rpx 19rpx;
  background: #f2f0e7;
}

.history-cover-hitarea {
  position: absolute;
  z-index: 2;
  inset: 0;
  background: transparent;
}

.history-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 18rpx 18rpx 20rpx;
}

.history-date {
  color: #5f5345;
  font-family: Georgia, 'Songti SC', 'STSong', serif;
  font-size: 25rpx;
  font-weight: 500;
}

.history-date-line {
  width: 78%;
  height: 9rpx;
  margin: 7rpx 0 1rpx;
  transform: rotate(-1deg);
  border-top: 2rpx solid rgba(111, 91, 70, .42);
  border-radius: 50%;
}

.history-description {
  display: -webkit-box;
  overflow: hidden;
  min-height: 60rpx;
  margin-top: 5rpx;
  color: #75695b;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
  font-size: 22rpx;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.load-more::after {
  border: 0;
}

.history-state,
.history-empty,
.history-error {
  width: 82%;
  box-sizing: border-box;
  margin: 22rpx auto;
  padding: 30rpx 24rpx;
  transform: rotate(-.45deg);
  background: rgba(245, 234, 215, .72);
  box-shadow: 0 8rpx 20rpx rgba(92, 74, 51, .05);
  color: #7b6f60;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
  font-size: 24rpx;
  text-align: center;
}

.history-empty {
  display: flex;
  min-height: 260rpx;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  flex-direction: column;
}

.history-empty .i-carbon-calendar {
  color: #91a186;
  font-size: 48rpx;
}

.history-error {
  color: #995c50;
}

.history-error button {
  display: block;
  margin: 18rpx auto 0;
  padding: 0 24rpx;
  border: 2rpx solid rgba(105, 88, 68, .42);
  border-radius: 16rpx 11rpx 18rpx 13rpx;
  background: #e3e9d7;
  color: #625648;
  font-size: 23rpx;
}

.load-more {
  display: block;
  margin: 30rpx auto 0;
  padding: 0 30rpx;
  transform: rotate(.5deg);
  border: 2rpx solid rgba(105, 88, 68, .42);
  border-radius: 18rpx 12rpx 20rpx 14rpx;
  background: #e3e9d7;
  box-shadow: 5rpx 6rpx 0 rgba(105, 88, 68, .07);
  color: #625648;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
}
</style>
