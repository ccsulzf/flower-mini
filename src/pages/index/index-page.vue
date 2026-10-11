<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { initializeAppAuth, waitForAppAuthReady } from '@/utils/appAuth'

definePage({ layout: 'default', style: { navigationBarTitleText: '花草工作室' } })

const busy = ref(false)
const ready = ref(false)
const error = ref('')
const materialAdminEnabled = __MATERIAL_ADMIN__
function openMaterialAdmin() {
  if (__MATERIAL_ADMIN__) uni.navigateTo({ url: '/subpackages/material-admin/material-admin-page' })
}

function openFlowerStudio() {
  uni.navigateTo({ url: '/pages/flower-studio/flower-studio-page' })
}

function openFlowerJson() {
  uni.navigateTo({ url: '/pages/flower-json/flower-json-page' })
}

async function checkAuth(retry = false) {
  if (busy.value)
    return
  busy.value = true
  ready.value = false
  error.value = ''
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
        花草工作室
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
        一枝花 · 插花创作
      </view>
      <view class="app-section-desc">
        选几枝花，试试拖动、旋转和搭配花器。
      </view>
      <button class="app-secondary-btn" @click="openFlowerStudio">
        开始插花
      </button>
    </view>
    <view class="app-card section">
      <view class="app-section-title">
        JSON 生成花束
      </view>
      <view class="app-section-desc">
        粘贴花束 JSON，一键查看完整花束效果。
      </view>
      <button class="app-secondary-btn" @click="openFlowerJson">
        导入花束
      </button>
    </view>
    <view v-if="materialAdminEnabled" class="app-card section">
      <view class="app-section-title">素材管理</view>
      <view class="app-section-desc">上传 SVG、管理目录与验证缓存</view>
      <button class="app-secondary-btn" @click="openMaterialAdmin">管理素材</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.home-page { padding: 24rpx; box-sizing: border-box; }
.section { margin-bottom: 24rpx; }
.error-message { color: $danger-color; margin: 20rpx 0; }
</style>
