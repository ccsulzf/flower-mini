<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
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
const instance = getCurrentInstance()
let alive = true

onLoad((query) => {
  date.value = String(query?.date || '')
  void loadFlower()
})
onUnload(() => {
  alive = false
})

async function loadFlower() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) {
    error.value = '每日花束日期无效'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await dailyFlowers.loadDate(date.value, true)
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

function displayDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

async function copyToStudio() {
  const original = flower.value
  if (!original || copying.value)
    return
  copying.value = true
  try {
    const work = await works.save({
      draft: {
        version: 1,
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
      <button class="retry-button" @click="loadFlower">
        重试
      </button>
    </view>
    <template v-else-if="flower">
      <view class="detail-image-wrap">
        <image class="detail-image" :src="flower.imagePath" mode="aspectFit" />
      </view>
      <view class="detail-content">
        <text class="detail-date">{{ displayDate(flower.date) }}</text>
        <text class="detail-description">{{ flower.description }}</text>
      </view>
      <view class="detail-footer">
        <button class="copy-button" :disabled="copying" @click="copyToStudio">
          {{ copying ? '复制中' : '复制' }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.daily-detail {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  box-sizing: border-box;
  padding: 26rpx 26rpx calc(32rpx + env(safe-area-inset-bottom));
  background: #f6f3eb;
  color: #3f463d;
}

.detail-image-wrap {
  display: flex;
  width: 100%;
  height: min(112vw, 850rpx);
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 22rpx;
  background: #eeeee5;
}

.detail-image {
  width: 100%;
  height: 100%;
}

.detail-content {
  display: flex;
  flex-direction: column;
  padding: 26rpx 8rpx;
}

.detail-date {
  font-size: 32rpx;
  font-weight: 600;
}

.detail-description {
  margin-top: 14rpx;
  color: #6f756a;
  font-size: 26rpx;
  line-height: 1.7;
}

.detail-footer {
  margin-top: auto;
  padding-top: 24rpx;
}

.copy-button {
  width: 100%;
  height: 84rpx;
  margin: 0;
  border: 0;
  border-radius: 44rpx;
  background: #758c70;
  color: #fffdf7;
  font-size: 26rpx;
  line-height: 84rpx;
}

.copy-button::after {
  border: 0;
}

.copy-button[disabled] {
  opacity: .55;
}

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
