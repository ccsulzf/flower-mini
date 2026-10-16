<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { backgroundOptions } from '@/utils/flower/artwork'
import { backgroundSceneSource } from '@/utils/flower/background-render'
import { svgImageSource } from '@/utils/flower/material-render'

const emit = defineEmits<{
  cloud: [id: string]
  close: []
  background: [value: Artwork['background']]
}>()
const catalog = useFlowerCatalogStore()
const artwork = useCreationArtworkStore()
const studio = useFlowerStudioStore()
const { background, backgroundMaterialId } = storeToRefs(artwork)
const { addingMaterial: adding } = storeToRefs(studio)
const activeBackground = ref<'solid' | 'scene'>(backgroundMaterialId.value ? 'scene' : 'solid')
const sceneBackgrounds = computed(() => catalog.materials.filter(item => item.category === 'background'))
const thumbnailCache = new Map<string, string>()
function thumbnail(id: string, revision: string) {
  const key = `${id}:${revision}`
  const cached = thumbnailCache.get(key)
  if (cached)
    return cached
  const item = catalog.get(id, revision)
  if (!item || item.category !== 'background')
    return ''
  const source = backgroundSceneSource(item)
  const result = source ? svgImageSource(source) : ''
  if (result)
    thumbnailCache.set(key, result)
  return result
}
</script>

<template>
  <view class="options-card" @touchmove.stop>
    <view class="options-title">
      <view>
        <text class="options-heading">
          为日常添一点颜色
        </text><text class="options-subtitle">
          换一个背景，让作品有不同的气氛。
        </text>
      </view><button class="close-option" aria-label="关闭面板" @click="emit('close')">
        <view class="i-carbon-close" />
      </button>
    </view>
    <view class="backgrounds-panel">
      <view class="flower-tabs" role="tablist" aria-label="背景分类">
        <button class="flower-tab" :class="{ 'flower-tab-active': activeBackground === 'solid' }" role="tab" :aria-selected="activeBackground === 'solid'" @click="activeBackground = 'solid'">
          纯色
        </button>
        <button class="flower-tab" :class="{ 'flower-tab-active': activeBackground === 'scene' }" role="tab" :aria-selected="activeBackground === 'scene'" @click="activeBackground = 'scene'">
          场景
        </button>
      </view>
      <view v-if="activeBackground === 'solid'" class="choice-grid">
        <button v-for="option in backgroundOptions" :key="option.value" class="choice-card" hover-class="none" :class="{ 'choice-selected': !backgroundMaterialId && background === option.value }" @click="emit('background', option.value)">
          <view class="background-sample" :style="{ backgroundColor: option.color }" /><text>{{ option.name }}</text>
        </button>
      </view>
      <scroll-view v-else scroll-y class="flowers-scroll">
        <view class="material-grid">
          <button v-for="item in sceneBackgrounds" :key="item.id" class="material-card" hover-class="none" :class="{ 'choice-selected': backgroundMaterialId === item.id }" :aria-label="`选择${item.name}背景`" :aria-disabled="adding" @click="emit('cloud', item.id)">
            <view class="material-art">
              <image v-if="thumbnail(item.id, item.revision)" :src="thumbnail(item.id, item.revision)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-image" />
            </view>
            <text class="material-name">
              {{ item.name }}
            </text>
          </button>
        </view>
        <text v-if="!sceneBackgrounds.length" class="material-note">
          {{ catalog.loading ? '正在加载背景…' : '暂无场景背景' }}
        </text>
        <text v-if="catalog.error" class="material-note">
          {{ catalog.error }}
        </text>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-material-panel.scss';
</style>
