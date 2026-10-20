<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { svgImageSource } from '@/utils/flower/material-render'

const emit = defineEmits<{ cloud: [id: string], close: [] }>()
const catalog = useFlowerCatalogStore()
const studio = useFlowerStudioStore()
const { addingMaterial: adding } = storeToRefs(studio)
const containerTabs = [{ value: 'vase', name: '花瓶' }, { value: 'bouquet', name: '花束' }] as const
const activeContainer = ref<(typeof containerTabs)[number]['value']>('vase')
const visibleContainers = computed(() => catalog.materials.filter(item => item.category === activeContainer.value))
const thumbnailCache = new Map<string, string>()
function thumbnail(id: string) {
  const key = id
  const cached = thumbnailCache.get(key)
  if (cached)
    return cached
  const item = catalog.get(id)
  if (!item || (item.category !== 'vase' && item.category !== 'bouquet'))
    return ''
  const source = (item.sources.vase || item.sources.bouquet || '').replace(/__COLOR__/g, item.colors[0]?.value || '#f4f0e6')
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
          选一个容器
        </text><text class="options-subtitle">
          切换形式，保留你搭配好的花朵。
        </text>
      </view><button class="close-option" aria-label="关闭面板" @click="emit('close')">
        <view class="i-carbon-close" />
      </button>
    </view>
    <view class="material-note material-status" aria-live="polite">
      <text>{{ catalog.error || (adding ? '正在切换容器…' : catalog.preparing || catalog.loading ? '正在准备素材…' : '') }}</text>
    </view>
    <view class="containers-panel">
      <view class="flower-tabs" role="tablist" aria-label="容器分类">
        <button v-for="group in containerTabs" :key="group.value" class="flower-tab" :class="{ 'flower-tab-active': activeContainer === group.value }" role="tab" :aria-selected="activeContainer === group.value" @click="activeContainer = group.value">
          {{ group.name }}
        </button>
      </view>
      <scroll-view :key="activeContainer" scroll-y class="flowers-scroll">
        <view class="material-grid">
          <button v-for="item in visibleContainers" :key="item.id" class="material-card" hover-class="none" :aria-disabled="adding || (catalog.loading && !catalog.loaded)" :disabled="catalog.loading && !catalog.loaded" :aria-label="`选择${item.name}`" @click="emit('cloud', item.id)">
            <view class="material-art">
              <image v-if="thumbnail(item.id)" :src="thumbnail(item.id)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-chemistry" />
            </view>
            <text class="material-name">
              {{ item.name }}
            </text>
          </button>
        </view>
        <text v-if="!catalog.loading && !catalog.preparing && !catalog.error && !visibleContainers.length" class="material-note">
          {{ activeContainer === 'vase' ? '暂无花瓶' : '暂无花束' }}
        </text>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-material-panel.scss';
</style>
