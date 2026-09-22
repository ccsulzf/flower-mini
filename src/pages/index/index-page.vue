<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { useFeedback } from '@/hooks/useFeedback'
import { initializeAppAuth, waitForAppAuthReady } from '@/utils/appAuth'
import { cloudEnabled } from '@/utils/cloudMode'

definePage({ type: 'home', layout: 'default', style: { navigationBarTitleText: '云开发模板' } })

const { triggerSuccess, triggerWarning, triggerError } = useFeedback()
const busy = ref(false)
const ready = ref(false)
const error = ref('')

function openWishPuzzle() {
  uni.navigateTo({ url: '/pages/wish-puzzle/wish-puzzle-page' })
}

async function checkAuth(retry = false) {
  if (busy.value)
    return
  busy.value = true
  ready.value = false
  error.value = ''
  if (!cloudEnabled) {
    ready.value = true
    busy.value = false
    return
  }
  try {
    if (retry)
      await initializeAppAuth(true)
    await waitForAppAuthReady()
    ready.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败，请稍后重试'
  }
  finally {
    busy.value = false
  }
}

onShow(() => checkAuth())
</script>

<template>
  <view class="home-page app-gradient-page">
    <view class="app-card section">
      <view class="app-section-title">
        云开发模板
      </view>
      <view class="app-section-desc">
        {{ busy ? '正在连接你的账号…' : ready ? '已登录' : '尚未登录' }}
      </view>
      <view v-if="error" class="error-message">
        {{ error }}
      </view>
      <button v-if="error" class="app-secondary-btn" :disabled="busy" @click="checkAuth(true)">
        重新登录
      </button>
    </view>
    <view class="app-card section">
      <view class="app-section-title">
        心愿拼图
      </view>
      <view class="app-section-desc">
        看看正在完成中的旅行拼图。
      </view>
      <button class="app-secondary-btn" @click="openWishPuzzle">
        打开心愿拼图
      </button>
    </view>
    <view class="app-card section">
      <view class="app-section-title">
        反馈演示
      </view>
      <view class="app-section-desc">
        成功、警告和错误提示。
      </view>
      <view class="actions">
        <button size="mini" @click="triggerSuccess()">
          成功
        </button>
        <button size="mini" @click="triggerWarning()">
          警告
        </button>
        <button size="mini" @click="triggerError()">
          错误
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.home-page { padding: 24rpx; box-sizing: border-box; }
.section { margin-bottom: 24rpx; }
.error-message { color: $danger-color; margin: 20rpx 0; }
.actions { display: flex; align-items: center; gap: 16rpx; margin-top: 20rpx; }
.actions button { flex: 1; }
</style>
