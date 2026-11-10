<script setup lang="ts">
import { ref } from 'vue'
import type { Artwork } from '@/utils/flower/artwork'
import FlowerArtworkRenderer from '@/components/flower/flower-artwork-renderer.vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { parseArtwork } from '@/utils/flower/artwork'
import { exampleJson } from './example'

definePage({
  layout: 'default',
  style: { navigationBarTitleText: 'JSON 生成花束', navigationBarBackgroundColor: '#f6f3eb' },
})

const jsonInput = ref('')
const artwork = ref<Artwork | null>(null)
const error = ref('')
const catalog = useFlowerCatalogStore()

async function generate() {
  error.value = ''
  if (!jsonInput.value.trim()) {
    error.value = '请先粘贴花束 JSON，或填入示例'
    return
  }
  try {
    // 全部校验通过后才替换预览；失败时保留上一束花。
    const next = parseArtwork(jsonInput.value)
    if (!catalog.loaded)
      await catalog.load()
    await Promise.all([...next.materials.map(item => item.materialId), next.container.materialId, next.background.materialId].map(id => catalog.ensure(id)))
    artwork.value = next
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法生成花束，请检查 JSON'
  }
}

function fillExample() {
  jsonInput.value = exampleJson
  error.value = ''
}
</script>

<template>
  <view class="json-page">
    <view class="intro">
      <text class="title">把文字变成一束花</text>
      <text class="description">粘贴花束 JSON，看看花朵在瓶中的样子。</text>
    </view>
    <view class="input-card">
      <view class="input-heading">
        <text class="input-title">花束 JSON</text>
        <button class="example-button" @click="fillExample">填入示例</button>
      </view>
      <textarea
        v-model="jsonInput" class="json-input" :maxlength="65536"
        placeholder="在这里粘贴 JSON…" :auto-height="false" :adjust-position="true"
        :disable-default-padding="true"
      />
      <text class="input-hint">支持普通 JSON 和带转义的 JSON 字符串。</text>
      <text v-if="error" class="error-message">{{ error }}</text>
      <button class="generate-button" @click="generate">生成花束</button>
    </view>
    <view class="preview-heading">
      <text>花束预览</text>
      <text v-if="artwork" class="stem-count">{{ artwork.materials.length }} 枝 · {{ artwork.container.type === 'bouquet' ? '花束' : '花瓶' }}</text>
    </view>
    <view class="preview">
      <view v-if="artwork" class="preview-board">
        <FlowerArtworkRenderer :artwork="artwork" :prepared-materials="catalog.prepared" />
      </view>
      <view v-else class="preview-empty">
        <text>你的花束会出现在这里</text>
        <text class="empty-hint">可以先填入示例，再点击生成花束</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.json-page { min-height: 100vh; padding: 36rpx 26rpx 60rpx; box-sizing: border-box; background: #f6f3eb; color: #3f463d; }
.intro { margin: 12rpx 0 30rpx; }
.title { display: block; font-size: 38rpx; font-weight: 600; }
.description { display: block; margin-top: 14rpx; font-size: 25rpx; line-height: 1.6; color: #777d70; }
.input-card { padding: 24rpx; border: 1rpx solid #e3dfd3; border-radius: 24rpx; background: #fffdf7; }
.input-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.input-title { font-size: 28rpx; font-weight: 600; }
.example-button { margin: 0; padding: 0 20rpx; background: #eceee3; color: #59634e; font-size: 23rpx; line-height: 56rpx; border-radius: 14rpx; }
.example-button::after, .generate-button::after { border: none; }
.json-input { display: block; width: 100%; height: 280rpx; padding: 20rpx; box-sizing: border-box; border-radius: 14rpx; background: #f1f0e9; color: #3f463d; font-family: monospace; font-size: 23rpx; line-height: 1.6; }
.input-hint { display: block; margin-top: 16rpx; font-size: 22rpx; line-height: 1.6; color: #777d70; }
.error-message { display: block; margin-top: 16rpx; color: #b82b36; font-size: 24rpx; line-height: 1.6; }
.generate-button { margin-top: 22rpx; border-radius: 16rpx; background: #59634e; color: #fffdf7; font-size: 28rpx; line-height: 80rpx; }
.preview-heading { display: flex; justify-content: space-between; align-items: center; margin: 32rpx 4rpx 18rpx; font-size: 28rpx; font-weight: 600; }
.stem-count { font-size: 23rpx; font-weight: 400; color: #777d70; }
.preview { position: relative; width: 698rpx; height: 1000rpx; overflow: hidden; border-radius: 24rpx; }
.preview-board { pointer-events: none; }
.preview-empty { display: flex; height: 100%; flex-direction: column; align-items: center; justify-content: center; color: #777d70; font-size: 28rpx; }
.empty-hint { margin-top: 18rpx; font-size: 23rpx; }
</style>
