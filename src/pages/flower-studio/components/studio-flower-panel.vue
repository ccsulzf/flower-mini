<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { flowerGroups } from '@/utils/flower/artwork'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'

const emit = defineEmits<{ cloud: [id: string], close: [] }>()
const catalog = useFlowerCatalogStore()
const studio = useFlowerStudioStore()
const { addingMaterial: adding } = storeToRefs(studio)
const cloudFlowers = computed(() => catalog.materials.filter(item => item.category === 'flower'))
const activeGroup = ref<(typeof flowerGroups)[number]['value']>('main')
const visibleFlowers = computed(() => cloudFlowers.value.filter(item => item.group === activeGroup.value))
const thumbnailCache = new Map<string, string>()
function thumbnail(id: string, revision: string) {
  const key = `${id}:${revision}`
  const cached = thumbnailCache.get(key)
  if (cached)
    return cached
  const item = catalog.get(id, revision)
  if (!item || item.category !== 'flower')
    return ''
  const source = cloudPlantSvg(item, { color: item.colors[0]?.value || '#f4f0e6', stemHeight: 230, leafMode: 'without' })
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
          今天，想选什么花？
        </text><text class="options-subtitle">
          从一枝开始，慢慢放进生活里。
        </text>
      </view><button class="close-option" aria-label="关闭面板" @click="emit('close')">
        <view class="i-carbon-close" />
      </button>
    </view>
    <view class="material-note material-status" aria-live="polite">
      <text>{{ catalog.error || (adding ? '正在添加花材…' : catalog.preparing || catalog.loading ? '正在准备素材…' : '') }}</text>
    </view>
    <view class="flowers-panel">
      <view class="flower-tabs" role="tablist" aria-label="花材分类">
        <button v-for="group in flowerGroups" :key="group.value" class="flower-tab" :class="{ 'flower-tab-active': activeGroup === group.value }" role="tab" :aria-selected="activeGroup === group.value" @click="activeGroup = group.value">
          {{ group.name }}
        </button>
      </view>
      <scroll-view :key="activeGroup" scroll-y class="flowers-scroll">
        <view class="material-grid">
          <button v-for="flower in visibleFlowers" :key="flower.id" class="material-card" hover-class="material-card-pressed" :aria-disabled="adding || (catalog.loading && !catalog.loaded)" :disabled="catalog.loading && !catalog.loaded" :aria-label="`添加${flower.name}`" @click="emit('cloud', flower.id)">
            <view class="material-art">
              <image v-if="thumbnail(flower.id, flower.revision)" :src="thumbnail(flower.id, flower.revision)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-sprout" />
            </view>
            <text class="material-name">
              {{ flower.name }}
            </text>
          </button>
        </view>
        <text v-if="!catalog.loading && !catalog.preparing && !catalog.error && !visibleFlowers.length" class="material-note">
          该分类暂无花材
        </text>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-material-panel.scss';
</style>
