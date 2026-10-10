<script setup lang="ts">
import { backgroundOptions, flowerGroups, type Artwork, type VaseName } from '@/utils/flower/artwork'
import type { StudioTab } from '../studio-types'
import { computed } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { svgImageSource } from '@/utils/flower/material-render'
defineProps<{ tab: StudioTab, vase: VaseName, background: Artwork['background'] }>()
const emit = defineEmits<{
  cloud: [id: string], close: [], background: [value: Artwork['background']],
}>()
const catalog = useFlowerCatalogStore()
const cloudFlowers = computed(() => catalog.materials.filter(item => item.category === 'flower'))
const cloudVases = computed(() => catalog.materials.filter(item => item.category === 'vase' || item.category === 'bouquet'))
function thumbnail(id: string, revision: string) {
  const item = catalog.get(id, revision)
  const source = item?.sources.flower || item?.sources.foliage || item?.sources.vase || item?.sources.bouquet
  return source ? svgImageSource(source.replace(/__COLOR__/g, item!.colors[0]?.value || '#f4f0e6')) : ''
}
const titles: Record<StudioTab, string> = { flowers: '今天，想选什么花？', vases: '选一个花瓶或花束包装', backgrounds: '为日常添一点颜色' }
const subtitles: Record<StudioTab, string> = { flowers: '从一枝开始，慢慢放进生活里。', vases: '切换形式，保留你搭配好的花朵。', backgrounds: '换一个背景，让作品有不同的气氛。' }
</script>
<template>
  <view class="options-card" @touchmove.stop>
    <view class="options-title"><view><text class="options-heading">{{ titles[tab] }}</text><text class="options-subtitle">{{ subtitles[tab] }}</text></view><button class="close-option" aria-label="关闭面板" @click="emit('close')"><view class="i-carbon-close" /></button></view>
    <view v-if="tab !== 'backgrounds'" class="material-note">
      <text>{{ catalog.preparing || catalog.loading ? '正在准备素材…' : '' }}</text>
      <text v-if="catalog.error">{{ catalog.error }}</text>
    </view>
    <scroll-view v-if="tab === 'flowers'" scroll-y class="flowers-scroll">
      <view v-for="group in flowerGroups" :key="group.value" class="flower-group">
        <text v-if="cloudFlowers.some(item => item.group === group.value)" class="flower-group-title">{{ group.name }}</text>
        <view class="material-grid"><button v-for="flower in cloudFlowers.filter(item => item.group === group.value)" :key="flower.id" class="material-card" :disabled="catalog.preparing || catalog.downloading > 0" @click="emit('cloud', flower.id)"><view class="material-art"><image v-if="thumbnail(flower.id, flower.revision)" :src="thumbnail(flower.id, flower.revision)" style="width:110rpx;height:106rpx;" mode="aspectFit" /><view v-else class="i-carbon-flower" /></view><text>{{ flower.name }}</text></button></view>
      </view>
      <text v-if="!catalog.loading && !catalog.error && !cloudFlowers.length" class="material-note">暂无花材</text>
      <text class="material-note">花朵按花种保持固定比例，只调节花枝高度与角度。</text>
    </scroll-view>
    <view v-else-if="tab === 'vases'" class="choice-grid">
      <button v-for="item in cloudVases" :key="item.id" class="choice-card" :disabled="catalog.preparing || catalog.downloading > 0" @click="emit('cloud', item.id)"><image v-if="thumbnail(item.id, item.revision)" :src="thumbnail(item.id, item.revision)" style="width:62rpx;height:62rpx;" mode="aspectFit" /><text>{{ item.name }}</text></button>
      <text v-if="!catalog.loading && !catalog.error && !cloudVases.length" class="material-note">暂无花瓶或包装</text>
    </view>
    <view v-else class="choice-grid">
      <button v-for="option in backgroundOptions" :key="option.value" class="choice-card" :class="{ 'choice-selected': background === option.value }" @click="emit('background', option.value)"><view class="background-sample" :style="{ backgroundColor: option.color }" /><text>{{ option.name }}</text></button>
    </view>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.options-card { padding: 28rpx; border: 2rpx solid $studio-border; border-radius: 32rpx; background: $studio-panel; color: $studio-ink; box-shadow: 0 -12rpx 48rpx rgba(0,0,0,.12); }
.options-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22rpx; }.options-heading, .options-subtitle { display: block; }.options-heading { font-size: 27rpx; }.options-subtitle { margin-top: 8rpx; color: $studio-muted; font-size: 19rpx; }.close-option { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; padding: 0; margin: 0; font-size: 26rpx; background: $studio-secondary; color: $studio-muted; border-radius: 50%; }.close-option::after { border: none; }
.flowers-scroll { height: 460rpx; }.material-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }.material-card { display: flex; flex-direction: column; align-items: center; padding: 12rpx; margin: 0; height: 158rpx; border-radius: 18rpx; background: $studio-secondary; color: $studio-ink; font-size: 20rpx; line-height: 1.5; }.material-card::after { border: none; }.material-art { width: 110rpx; height: 106rpx; transform: scale(.65); transform-origin: 50% 50%; pointer-events: none; }
.choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }.choice-card { margin: 0; padding: 24rpx 10rpx 16rpx; color: $studio-ink; background: $studio-secondary; border-radius: 20rpx; font-size: 23rpx; line-height: 1.8; border: 2rpx solid transparent; }.choice-card::after { border: none; }.choice-selected { border-color: $studio-accent; }.mini-vase { width: 48rpx; height: 62rpx; margin: 0 auto 16rpx; background: linear-gradient(100deg,#e6e2d7,#cdc9bd); border-radius: 12% 12% 20% 20%; }.mini-glass { background: rgba(193,220,203,.45); border: 1rpx solid #b2c4b4; }.mini-round { width: 62rpx; height: 52rpx; margin-top: 10rpx; border-radius: 40%; background: #d4b8a4; }.background-sample { width: 62rpx; height: 62rpx; margin: 0 auto 16rpx; border-radius: 50%; border: 1rpx solid rgba(63,70,61,.18); }
.flower-group { margin-bottom: 22rpx; }.flower-group-title { display: block; margin-bottom: 14rpx; font-size: 21rpx; color: $studio-muted; }.material-note { display: block; font-size: 18rpx; line-height: 1.7; color: $studio-muted; }
.mini-bouquet { position: relative; width: 0; height: 0; margin: 0 auto 16rpx; border-left: 30rpx solid transparent; border-right: 30rpx solid transparent; border-top: 62rpx solid #e8decb; }
.mini-ribbon { position: absolute; left: -17rpx; top: -28rpx; width: 34rpx; height: 8rpx; border-radius: 4rpx; background: #c98b94; }
</style>
