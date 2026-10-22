<script setup lang="ts">
import type { ContainerType } from '@/models/artwork'
import { computed, ref } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { svgImageSource } from '@/utils/flower/material-render'

const props = defineProps<{ selectedId: string, selectedType: ContainerType, pendingId: string | null }>()
const emit = defineEmits<{ select: [id: string], close: [] }>()
const catalog = useFlowerCatalogStore()
const tabs = [{ value: 'vase', name: '花瓶' }, { value: 'bouquet', name: '花束' }] as const
const activeType = ref<ContainerType>(props.selectedType)
const visible = computed(() => catalog.materials.filter(item => item.category === activeType.value))
const cache = new Map<string, string>()
function thumbnail(id: string) {
  if (cache.has(id)) return cache.get(id)!
  const item = catalog.get(id)
  const source = item && (item.sources.vase || item.sources.bouquet || '')
  const result = source ? svgImageSource(source.replace(/__COLOR__/g, item?.colors[0]?.value || '#f4f0e6')) : ''
  if (result) cache.set(id, result)
  return result
}
</script>

<template>
  <view class="options-card" @touchmove.stop>
    <view class="options-title"><view><text class="options-heading">选一个容器</text><text class="options-subtitle">切换形式，保留你搭配好的花朵。</text></view><button class="close-option" aria-label="关闭面板" @click="emit('close')"><view class="i-carbon-close" /></button></view>
    <view class="containers-panel">
      <view class="flower-tabs" role="tablist" aria-label="容器分类"><button v-for="tab in tabs" :key="tab.value" class="flower-tab" :class="{ 'flower-tab-active': activeType === tab.value }" @click="activeType = tab.value">{{ tab.name }}</button></view>
      <scroll-view :key="activeType" scroll-y class="flowers-scroll"><view class="material-grid"><button v-for="item in visible" :key="item.id" class="material-card" :class="{ 'choice-selected': selectedId === item.id }" :disabled="pendingId === item.id" @click="emit('select', item.id)"><view class="material-art"><image v-if="thumbnail(item.id)" :src="thumbnail(item.id)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-chemistry" /></view><text class="material-name">{{ item.name }}</text></button></view><text v-if="!visible.length" class="material-note">{{ activeType === 'vase' ? '暂无花瓶' : '暂无花束' }}</text></scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">@use '@/styles/flower-material-panel.scss';</style>
