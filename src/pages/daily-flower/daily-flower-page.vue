<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'

definePage({ layout: 'default', style: { navigationBarTitleText: '每日插花', navigationBarBackgroundColor: '#f6f3eb', backgroundColor: '#f6f3eb' } })

const dailyFlowers = useDailyFlowerStore()
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
      <view>
        <text class="daily-title">每日花束</text>
        <text class="daily-subtitle">留住每一份花意</text>
      </view>
    </view>

    <view class="history-filter">
      <picker
        mode="date"
        :value="dailyFlowers.historyDateFilter || today"
        :end="today"
        :disabled="dailyFlowers.historyLoading"
        @change="filterByDate"
      >
        <view class="filter-picker">
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
        清除筛选
      </button>
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
        v-for="flower in dailyFlowers.historyItems"
        :key="flower.date"
        class="history-card"
      >
        <view class="history-cover">
          <FlowerArtworkPreview :artwork="flower.artwork" :scale="0.44" />
          <view class="history-cover-hitarea" @tap="openFlower(flower.date)" />
        </view>
        <view class="history-content" @click="openFlower(flower.date)">
          <text class="history-date">{{ displayDate(flower.date) }}</text>
          <text class="history-description">{{ flower.description }}</text>
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
  min-height: 100vh;
  box-sizing: border-box;
  padding: 30rpx 26rpx calc(36rpx + env(safe-area-inset-bottom));
  background: #f6f3eb;
  color: #3f463d;
}

.daily-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 28rpx;
}

.daily-title,
.daily-subtitle {
  display: block;
}

.daily-title {
  font-size: 34rpx;
  font-weight: 600;
}

.daily-subtitle {
  margin-top: 8rpx;
  color: #7c8474;
  font-size: 22rpx;
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
  align-items: center;
  gap: 20rpx;
  margin-bottom: 22rpx;
}

.filter-picker {
  display: flex;
  height: 60rpx;
  align-items: center;
  gap: 10rpx;
  padding: 0 18rpx;
  border: 1rpx solid #e4e8dd;
  border-radius: 999rpx;
  background: #fffdf7;
  color: #64715b;
  font-size: 22rpx;
}

.filter-picker .i-carbon-calendar,
.filter-picker .i-carbon-chevron-down {
  color: #84927b;
  font-size: 24rpx;
}

.clear-filter {
  margin: 0;
  padding: 0 8rpx;
  background: transparent;
  color: #7c8474;
  font-size: 22rpx;
  line-height: 60rpx;
}

.clear-filter::after {
  border: 0;
}

.history-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22rpx;
}

.history-card {
  overflow: hidden;
  border: 2rpx solid #e4e8dd;
  border-radius: 22rpx;
  background: #fffdf7;
  &:active { opacity: .85; }
}

.history-cover {
  position: relative;
  height: 420rpx;
  background: #eeeee5;
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
  padding: 18rpx 16rpx 16rpx;
}

.history-date {
  font-size: 28rpx;
  font-weight: 600;
}

.history-description {
  display: -webkit-box;
  overflow: hidden;
  min-height: 60rpx;
  margin-top: 8rpx;
  color: #7c8474;
  font-size: 22rpx;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.load-more::after {
  border: 0;
}

.history-state,
.history-empty,
.history-error {
  padding: 38rpx 22rpx;
  color: #7c8474;
  font-size: 24rpx;
  text-align: center;
}

.history-empty {
  display: flex;
  min-height: 300rpx;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  flex-direction: column;
}

.history-empty .i-carbon-calendar {
  color: #9aa58e;
  font-size: 48rpx;
}

.history-error {
  color: #995c50;
}

.history-error button {
  display: block;
  margin: 18rpx auto 0;
  padding: 0 24rpx;
  background: transparent;
  color: #758c70;
  font-size: 23rpx;
}

.load-more {
  display: block;
  margin: 24rpx auto 0;
  padding: 0 30rpx;
  background: #fffdf7;
  color: #64715b;
}
</style>
