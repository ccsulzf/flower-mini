<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore, type MaterialPickerGroup } from '@/stores/flowerStudioStore'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'

const props = defineProps<{ usageCounts: Record<string, number> }>()
const emit = defineEmits<{ add: [id: string], close: [] }>()
const catalog = useFlowerCatalogStore()
const studio = useFlowerStudioStore()
const { activeMaterialGroup, materialKeyword, pendingMaterialId, lastAddedMaterialId, recentMaterialIds } = storeToRefs(studio)
const groups: { value: MaterialPickerGroup, name: string }[] = [
  { value: 'recent', name: '最近' },
  { value: 'main', name: '主花' },
  { value: 'filler', name: '配花' },
  { value: 'foliage', name: '叶材' },
]
const flowers = computed(() => catalog.materials.filter(item => item.category === 'flower'))
const visibleFlowers = computed(() => {
  const keyword = materialKeyword.value.trim().toLocaleLowerCase()
  if (keyword)
    return flowers.value.filter(item => item.name.toLocaleLowerCase().includes(keyword))
  if (activeMaterialGroup.value === 'recent') {
    const byId = new Map(flowers.value.map(item => [item.id, item]))
    return recentMaterialIds.value.flatMap(id => byId.get(id) ? [byId.get(id)!] : [])
  }
  return flowers.value.filter(item => item.group === activeMaterialGroup.value)
})
const thumbnailCache = new Map<string, string>()
function thumbnail(id: string) {
  const cached = thumbnailCache.get(id)
  if (cached)
    return cached
  const item = catalog.get(id)
  if (!item || item.category !== 'flower')
    return ''
  const source = cloudPlantSvg(item, {
    color: item.colors[0]?.value || '#f4f0e6',
    transform: { anchor: { x: 55, y: 285 }, angle: 0, height: 230, scale: 1, mirrored: false },
  })
  const result = svgImageSource(source)
  thumbnailCache.set(id, result)
  return result
}
function selectGroup(group: MaterialPickerGroup) {
  if (group === 'recent' && !recentMaterialIds.value.some(id => flowers.value.some(item => item.id === id))) {
    activeMaterialGroup.value = 'main'
    return
  }
  activeMaterialGroup.value = group
}
</script>

<template>
  <view class="options-card" @touchmove.stop>
    <view class="options-title">
      <view><text class="options-heading">今天，想选什么花？</text></view>
      <button class="close-option" aria-label="关闭面板" @click="emit('close')"><view class="i-carbon-close" /></button>
    </view>
    <input v-model="materialKeyword" class="material-search" placeholder="搜索花材名称" confirm-type="search">
    <view class="flowers-panel">
      <view class="flower-tabs" role="tablist" aria-label="花材分类">
        <button v-for="group in groups" :key="group.value" class="flower-tab" :class="{ 'flower-tab-active': activeMaterialGroup === group.value }" role="tab" :aria-selected="activeMaterialGroup === group.value" @click="selectGroup(group.value)">
          {{ group.name }}
        </button>
      </view>
      <scroll-view :key="`${activeMaterialGroup}:${materialKeyword}`" scroll-y class="flowers-scroll">
        <view class="material-grid">
          <button v-for="flower in visibleFlowers" :key="flower.id" class="material-card" hover-class="material-card-pressed" :disabled="pendingMaterialId === flower.id" :aria-label="`添加${flower.name}`" @click="emit('add', flower.id)">
            <view class="material-art">
              <image v-if="thumbnail(flower.id)" :src="thumbnail(flower.id)" class="material-image" mode="aspectFit" /><view v-else class="i-carbon-sprout" />
              <text v-if="lastAddedMaterialId === flower.id" class="added-badge">已加入</text>
            </view>
            <text class="material-name">{{ flower.name }}<text v-if="usageCounts[flower.id]"> × {{ usageCounts[flower.id] }}</text></text>
          </button>
        </view>
        <text v-if="!visibleFlowers.length" class="material-note">{{ activeMaterialGroup === 'recent' && !materialKeyword.trim() ? '还没有最近使用的花材' : '没有找到花材' }}</text>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-material-panel.scss';
.material-search { box-sizing: border-box; width: 100%; height: 68rpx; margin-bottom: 14rpx; padding: 0 22rpx; border: 1rpx solid rgba(116,128,107,.22); border-radius: 14rpx; background: #fffdf7; font-size: 25rpx; }
.material-art { position: relative; }
.added-badge { position: absolute; right: 4rpx; bottom: 4rpx; padding: 5rpx 9rpx; border-radius: 999rpx; background: rgba(104,122,98,.9); color: #fff; font-size: 18rpx; }
</style>
