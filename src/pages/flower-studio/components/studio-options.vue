<script setup lang="ts">
import { backgroundOptions, flowerGroups, type Artwork, type VaseName } from '@/utils/flower/artwork'
import type { StudioTab } from '../studio-types'
import { computed, ref } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'
const props = defineProps<{ tab: StudioTab, vase: VaseName, background: Artwork['background'], backgroundMaterialId?: string, adding?: boolean }>()
const emit = defineEmits<{
  cloud: [id: string], close: [], background: [value: Artwork['background']],
}>()
const catalog = useFlowerCatalogStore()
const cloudFlowers = computed(() => catalog.materials.filter(item => item.category === 'flower'))
const activeGroup = ref<(typeof flowerGroups)[number]['value']>('main')
const visibleFlowers = computed(() => cloudFlowers.value.filter(item => item.group === activeGroup.value))
const containerTabs = [{ value: 'vase', name: '花瓶' }, { value: 'bouquet', name: '花束' }] as const
const activeContainer = ref<(typeof containerTabs)[number]['value']>('vase')
const visibleContainers = computed(() => catalog.materials.filter(item => item.category === activeContainer.value))
const activeBackground = ref<'solid' | 'scene'>(props.backgroundMaterialId ? 'scene' : 'solid')
const sceneBackgrounds = computed(() => catalog.materials.filter(item => item.category === 'background'))
const thumbnailCache = new Map<string, string>()
function thumbnail(id: string, revision: string) {
  const key = `${id}:${revision}`
  const cached = thumbnailCache.get(key)
  if (cached) return cached
  const item = catalog.get(id, revision)
  if (!item) return ''
  const color = item.colors[0]?.value || '#f4f0e6'
  const source = item.category === 'flower' ? cloudPlantSvg(item, { color, stemHeight: 230, leafMode: 'without' }) : (item.sources.vase || item.sources.bouquet || item.sources.background || '').replace(/__COLOR__/g, color)
  const result = source ? svgImageSource(source) : ''
  if (result) thumbnailCache.set(key, result)
  return result
}
async function refreshCatalog() { await catalog.load(); void catalog.preload() }
const titles: Record<StudioTab, string> = { flowers: '今天，想选什么花？', vases: '选一个容器', backgrounds: '为日常添一点颜色' }
const subtitles: Record<StudioTab, string> = { flowers: '从一枝开始，慢慢放进生活里。', vases: '切换形式，保留你搭配好的花朵。', backgrounds: '换一个背景，让作品有不同的气氛。' }
</script>
<template>
  <view class="options-card" @touchmove.stop>
    <view class="options-title"><view><text class="options-heading">{{ titles[tab] }}</text><text class="options-subtitle">{{ subtitles[tab] }}</text></view><button class="close-option" aria-label="关闭面板" @click="emit('close')"><view class="i-carbon-close" /></button></view>
    <view v-if="tab !== 'backgrounds'" class="material-note material-status" aria-live="polite">
      <text>{{ catalog.error || (adding ? '正在添加花材…' : catalog.preparing || catalog.loading ? '正在准备素材…' : '') }}</text>
    </view>
    <view v-if="tab === 'flowers'" class="flowers-panel">
      <view class="catalog-summary"><text>花材 {{ cloudFlowers.length }} 种</text><button :disabled="catalog.loading" @click="refreshCatalog">刷新目录</button></view>
      <view class="flower-tabs" role="tablist" aria-label="花材分类">
        <button v-for="group in flowerGroups" :key="group.value" class="flower-tab" :class="{ 'flower-tab-active': activeGroup === group.value }" role="tab" :aria-selected="activeGroup === group.value" @click="activeGroup = group.value">{{ group.name }} {{ cloudFlowers.filter(item => item.group === group.value).length }}</button>
      </view>
      <scroll-view :key="activeGroup" scroll-y class="flowers-scroll">
        <view class="material-grid">
          <button v-for="flower in visibleFlowers" :key="flower.id" class="material-card" hover-class="none" :aria-disabled="adding || (catalog.loading && !catalog.loaded)" :disabled="catalog.loading && !catalog.loaded" :aria-label="`添加${flower.name}`" @click="emit('cloud', flower.id)">
            <view class="material-add i-carbon-add" />
            <view class="material-art"><image v-if="thumbnail(flower.id, flower.revision)" :src="thumbnail(flower.id, flower.revision)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-sprout" /></view>
            <text class="material-name">{{ flower.name }}</text>
          </button>
        </view>
        <text v-if="!catalog.loading && !catalog.preparing && !catalog.error && !visibleFlowers.length" class="material-note">该分类暂无花材</text>
      </scroll-view>
    </view>
    <view v-else-if="tab === 'vases'" class="containers-panel">
      <view class="flower-tabs" role="tablist" aria-label="容器分类">
        <button v-for="group in containerTabs" :key="group.value" class="flower-tab" :class="{ 'flower-tab-active': activeContainer === group.value }" role="tab" :aria-selected="activeContainer === group.value" @click="activeContainer = group.value">{{ group.name }}</button>
      </view>
      <scroll-view :key="activeContainer" scroll-y class="flowers-scroll">
        <view class="material-grid">
          <button v-for="item in visibleContainers" :key="item.id" class="material-card" hover-class="none" :aria-disabled="adding || (catalog.loading && !catalog.loaded)" :disabled="catalog.loading && !catalog.loaded" :aria-label="`选择${item.name}`" @click="emit('cloud', item.id)">
            <view class="material-art"><image v-if="thumbnail(item.id, item.revision)" :src="thumbnail(item.id, item.revision)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-chemistry" /></view>
            <text class="material-name">{{ item.name }}</text>
          </button>
        </view>
        <text v-if="!catalog.loading && !catalog.preparing && !catalog.error && !visibleContainers.length" class="material-note">{{ activeContainer === 'vase' ? '暂无花瓶' : '暂无花束' }}</text>
      </scroll-view>
    </view>
    <view v-else class="backgrounds-panel">
      <view class="flower-tabs" role="tablist" aria-label="背景分类">
        <button class="flower-tab" :class="{ 'flower-tab-active': activeBackground === 'solid' }" role="tab" :aria-selected="activeBackground === 'solid'" @click="activeBackground = 'solid'">纯色</button>
        <button class="flower-tab" :class="{ 'flower-tab-active': activeBackground === 'scene' }" role="tab" :aria-selected="activeBackground === 'scene'" @click="activeBackground = 'scene'">场景</button>
      </view>
      <view v-if="activeBackground === 'solid'" class="choice-grid">
        <button v-for="option in backgroundOptions" :key="option.value" class="choice-card" hover-class="none" :class="{ 'choice-selected': !backgroundMaterialId && background === option.value }" @click="emit('background', option.value)"><view class="background-sample" :style="{ backgroundColor: option.color }" /><text>{{ option.name }}</text></button>
      </view>
      <scroll-view v-else scroll-y class="flowers-scroll">
        <view class="material-grid">
          <button v-for="item in sceneBackgrounds" :key="item.id" class="material-card" hover-class="none" :class="{ 'choice-selected': backgroundMaterialId === item.id }" :aria-label="`选择${item.name}背景`" :aria-disabled="adding" @click="emit('cloud', item.id)">
            <view class="material-art"><image v-if="thumbnail(item.id, item.revision)" :src="thumbnail(item.id, item.revision)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-image" /></view>
            <text class="material-name">{{ item.name }}</text>
          </button>
        </view>
        <text v-if="!sceneBackgrounds.length" class="material-note">{{ catalog.loading ? '正在加载背景…' : '暂无场景背景，请在素材管理上传' }}</text>
        <text v-if="catalog.error" class="material-note">{{ catalog.error }}</text>
      </scroll-view>
    </view>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.options-card { padding: 28rpx; border: 2rpx solid $studio-border; border-radius: 32rpx; background: $studio-panel; color: $studio-ink; box-shadow: 0 -12rpx 48rpx rgba(0,0,0,.12); }
.options-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22rpx; }.options-heading, .options-subtitle { display: block; }.options-heading { font-size: 27rpx; }.options-subtitle { margin-top: 8rpx; color: $studio-muted; font-size: 19rpx; }.close-option { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; padding: 0; margin: 0; font-size: 26rpx; background: $studio-secondary; color: $studio-muted; border-radius: 50%; }.close-option::after { border: none; }
.catalog-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; font-size: 18rpx; color: $studio-muted; }.catalog-summary button { margin: 0; padding: 0 10rpx; font-size: 18rpx; line-height: 32rpx; color: $studio-ink; background: $studio-secondary; }.catalog-summary button::after { border: none; }
.flower-tabs { display: flex; gap: 14rpx; margin-bottom: 18rpx; }
.flower-tab { flex: 1; margin: 0; padding: 12rpx 0; border: 2rpx solid $studio-border; border-radius: 12rpx; color: $studio-muted; background: transparent; font-size: 23rpx; line-height: 1.5; }
.flower-tab::after { border: none; }.flower-tab-active { color: $studio-ink; background: $studio-accent; border-color: $studio-accent; }
.flowers-scroll { height: 410rpx; }.material-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18rpx; }
.material-card { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20rpx 16rpx 18rpx; margin: 0; min-width: 0; height: 284rpx; box-sizing: border-box; border-radius: 14rpx; background: $studio-secondary; color: $studio-ink; font-size: 25rpx; line-height: 1.5; }
.material-card.choice-selected::after { border: 2rpx solid $studio-accent; border-radius: 14rpx; }.material-card::after { border: none; }.material-add { position: absolute; right: 16rpx; top: 16rpx; color: $studio-muted; font-size: 28rpx; }.material-art { display: flex; align-items: center; justify-content: center; width: 100%; height: 190rpx; pointer-events: none; }.material-image { width: 150rpx; height: 190rpx; }.material-name { display: block; margin-top: 10rpx; max-width: 100%; text-align: center; }

.choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }.choice-card { margin: 0; padding: 24rpx 10rpx 16rpx; color: $studio-ink; background: $studio-secondary; border-radius: 20rpx; font-size: 23rpx; line-height: 1.8; border: 2rpx solid transparent; }.choice-card::after { border: none; }.choice-selected { border-color: $studio-accent; }.mini-vase { width: 48rpx; height: 62rpx; margin: 0 auto 16rpx; background: linear-gradient(100deg,#e6e2d7,#cdc9bd); border-radius: 12% 12% 20% 20%; }.mini-glass { background: rgba(193,220,203,.45); border: 1rpx solid #b2c4b4; }.mini-round { width: 62rpx; height: 52rpx; margin-top: 10rpx; border-radius: 40%; background: #d4b8a4; }.background-sample { width: 62rpx; height: 62rpx; margin: 0 auto 16rpx; border-radius: 50%; border: 1rpx solid rgba(63,70,61,.18); }
.material-status { height: 31rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.material-note { display: block; font-size: 18rpx; line-height: 1.7; color: $studio-muted; }
.mini-bouquet { position: relative; width: 0; height: 0; margin: 0 auto 16rpx; border-left: 30rpx solid transparent; border-right: 30rpx solid transparent; border-top: 62rpx solid #e8decb; }
.mini-ribbon { position: absolute; left: -17rpx; top: -28rpx; width: 34rpx; height: 8rpx; border-radius: 4rpx; background: #c98b94; }
</style>
