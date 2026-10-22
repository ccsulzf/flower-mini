<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { backgroundSceneSource } from '@/utils/flower/background-render'
import { svgImageSource } from '@/utils/flower/material-render'

defineProps<{ selectedId: string, pendingId: string | null }>()
const emit = defineEmits<{ select: [id: string], close: [] }>()
const catalog = useFlowerCatalogStore()
const activeKind = ref<'solid' | 'scene'>('scene')
const visible = computed(() => catalog.materials.filter(item => item.category === 'background' && (activeKind.value === 'solid' ? item.backgroundKind === 'solid' : item.backgroundKind !== 'solid')))
const cache = new Map<string, string>()
function thumbnail(id: string) {
  if (cache.has(id)) return cache.get(id)!
  const item = catalog.get(id)
  const result = item?.category === 'background' ? svgImageSource(backgroundSceneSource(item)) : ''
  if (result) cache.set(id, result)
  return result
}
</script>

<template>
  <view class="options-card" @touchmove.stop>
    <view class="options-title"><view><text class="options-heading">为日常添一点颜色</text><text class="options-subtitle">换一个背景，让作品有不同的气氛。</text></view><button class="close-option" aria-label="关闭面板" @click="emit('close')"><view class="i-carbon-close" /></button></view>
    <view class="backgrounds-panel"><view class="flower-tabs"><button class="flower-tab" :class="{ 'flower-tab-active': activeKind === 'solid' }" @click="activeKind = 'solid'">纯色</button><button class="flower-tab" :class="{ 'flower-tab-active': activeKind === 'scene' }" @click="activeKind = 'scene'">场景</button></view>
      <scroll-view scroll-y class="flowers-scroll"><view class="material-grid"><button v-for="item in visible" :key="item.id" class="material-card" :class="{ 'choice-selected': selectedId === item.id }" :disabled="pendingId === item.id" @click="emit('select', item.id)"><view class="material-art"><image v-if="thumbnail(item.id)" :src="thumbnail(item.id)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-image" /></view><text class="material-name">{{ item.name }}</text></button></view><text v-if="!visible.length" class="material-note">{{ activeKind === 'solid' ? '暂无纯色背景' : '暂无场景背景' }}</text></scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">@use '@/styles/flower-material-panel.scss';</style>
