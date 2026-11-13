<script setup lang="ts">
import { computed } from 'vue'
import { useMaterialPreviewBatch } from '@/hooks/useMaterialPreviewBatch'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { svgImageSource } from '@/utils/flower/material-render'

defineProps<{ selectedId: string, pendingId: string | null }>()
const emit = defineEmits<{ select: [id: string], close: [] }>()
const catalog = useFlowerCatalogStore()
const matching = computed(() => catalog.materials.filter(item => item.category === 'vase' || item.category === 'bouquet'))
const { visible, loading: previewsLoading, failed: previewsFailed, loadMore, retry } = useMaterialPreviewBatch(() => matching.value)
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
    <view class="options-title"><view><text class="options-heading">选一个容器</text><text class="options-subtitle">花瓶与包装二选一，保留你搭配好的花朵。</text></view><button class="close-option" aria-label="关闭面板" @click="emit('close')"><view class="i-carbon-close" /></button></view>
    <view class="containers-panel">
      <scroll-view scroll-y class="flowers-scroll" @scrolltolower="loadMore"><view class="material-grid"><button v-for="item in visible" :key="item.id" class="material-card" :class="{ 'choice-selected': selectedId === item.id }" :disabled="pendingId === item.id" @click="emit('select', item.id)"><view class="material-art"><image v-if="thumbnail(item.id)" :src="thumbnail(item.id)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-chemistry" /></view><text class="material-name">{{ item.name }}</text></button></view><text v-if="!visible.length" class="material-note">暂无花瓶或包装</text><text v-if="previewsLoading" class="material-note">正在加载预览…</text><button v-else-if="previewsFailed" class="material-note" @click="retry">部分预览加载失败，点击重试</button></scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">@use '@/styles/flower-material-panel.scss';</style>
