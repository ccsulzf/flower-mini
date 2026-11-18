<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { initializeAppAuth, waitForAppAuthReady } from '@/utils/appAuth'

definePage({ layout: 'default', style: { navigationBarTitleText: '花草工作室' } })

const busy = ref(false)
const ready = ref(false)
const error = ref('')
const materialAdminEnabled = __MATERIAL_ADMIN__
const dailyFlowerAdminEnabled = __DAILY_FLOWER_ADMIN__
const artworkOpsEnabled = __ARTWORK_OPS__
const demoEnabled = import.meta.env.DEV
function openMaterialAdmin() {
  if (__MATERIAL_ADMIN__) uni.navigateTo({ url: '/subpackages/material-admin/material-admin-page' })
}

function openDailyFlowerAdmin() {
  if (__DAILY_FLOWER_ADMIN__) uni.navigateTo({ url: '/subpackages/daily-flower-admin/daily-flower-admin-page' })
}

function openArtworkOps() {
  if (__ARTWORK_OPS__) uni.navigateTo({ url: '/subpackages/artwork-ops/artwork-ops-page' })
}

function openFlowerStudio() {
  uni.navigateTo({ url: '/pages/flower-studio/flower-studio-page' })
}

function openFlowerJson() {
  uni.navigateTo({ url: '/pages/flower-json/flower-json-page' })
}

function openFlowerAiDemo() {
  if (import.meta.env.DEV)
    uni.navigateTo({ url: '/pages/flower-ai-demo/flower-ai-demo-page' })
}

function openFlowerGenerateDemo() {
  if (import.meta.env.DEV)
    uni.navigateTo({ url: '/pages/flower-generate-demo/flower-generate-demo-page' })
}

function openBouquetWrapDemo() {
  if (import.meta.env.DEV)
    uni.navigateTo({ url: '/pages/bouquet-wrap-demo/bouquet-wrap-demo-page' })
}

function openFlowerRenderTest() {
  uni.navigateTo({ url: '/pages/flower-render-test/flower-render-test-page' })
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
  <view class="home-page app-page">
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
    <view v-if="demoEnabled" class="app-card section">
      <view class="app-section-title">
        一句话生花
      </view>
      <view class="app-section-desc">
        说说想送给谁，或最近发生的一件事，让这一刻开成花。
      </view>
      <button class="app-secondary-btn" @click="openFlowerGenerateDemo">
        打开文字生成 Demo
      </button>
    </view>
    <view v-if="demoEnabled" class="app-card section">
      <view class="app-section-title">
        花束搭配调试
      </view>
      <view class="app-section-desc">
        用单枝、三枝或当前作品，看看花束整理后的样子。
      </view>
      <button class="app-secondary-btn" @click="openFlowerAiDemo">
        打开搭配调试页
      </button>
    </view>
    <view class="app-card section">
      <view class="app-section-title">
        渲染路线验证
      </view>
      <view class="app-section-desc">
        并排对比 Vue 预览和云端生成的 PNG。
      </view>
      <button class="app-secondary-btn" @click="openFlowerRenderTest">
        打开验证页
      </button>
    </view>
    <view v-if="demoEnabled" class="app-card section">
      <view class="app-section-title">
        花束包装实验
      </view>
      <view class="app-section-desc">
        试试包装纸配色、开口和花枝展开效果。
      </view>
      <button class="app-secondary-btn" @click="openBouquetWrapDemo">
        试试花束包装
      </button>
    </view>
    <view v-if="materialAdminEnabled" class="app-card section">
      <view class="app-section-title">素材管理</view>
      <view class="app-section-desc">上传 SVG、管理目录与验证缓存</view>
      <button class="app-secondary-btn" @click="openMaterialAdmin">管理素材</button>
    </view>
    <view v-if="dailyFlowerAdminEnabled" class="app-card section">
      <view class="app-section-title">每日插花维护</view>
      <view class="app-section-desc">导入本地花束 JSON，预览后发布当天花束</view>
      <button class="app-secondary-btn" @click="openDailyFlowerAdmin">维护每日插花</button>
    </view>
    <view v-if="artworkOpsEnabled" class="app-card section">
      <view class="app-section-title">作品运维</view>
      <view class="app-section-desc">批量清理当前账号的作品与已发布的今日花束</view>
      <button class="app-secondary-btn" @click="openArtworkOps">打开作品运维</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.home-page { padding: 24rpx; box-sizing: border-box; }
.section { margin-bottom: 24rpx; }
.error-message { color: $danger-color; margin: 20rpx 0; }
</style>
