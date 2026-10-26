<script setup lang="ts">
import type { MaterialInstance } from '@/models/artwork'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'
import StudioFlowerTools from './studio-flower-tools.vue'

const emit = defineEmits<{
  focus: [materialId: string, group: 'flowers' | 'foliage', expanded: boolean]
  instance: [id: number]
  color: [value: string]
  toggleColors: []
  layer: [direction: 'forward' | 'backward']
  duplicate: []
  remove: []
  mirror: []
}>()

const studio = useFlowerStudioStore()
const artwork = useCreationArtworkStore()
const catalog = useFlowerCatalogStore()
const { selectionMaterialId, selectionMenuLevel, selectedMaterialId, colorsExpanded } = storeToRefs(studio)
const { materials } = storeToRefs(artwork)

const thumbnailCache = new Map<string, string>()
function thumbnail(instance: MaterialInstance) {
  const key = `${instance.materialId}:${instance.color}:${instance.transform.mirrored ? 'mirrored' : 'normal'}`
  const cached = thumbnailCache.get(key)
  if (cached)
    return cached
  const item = catalog.get(instance.materialId)
  if (!item || item.category !== 'flower')
    return ''
  const result = svgImageSource(cloudPlantSvg(item, {
    color: instance.color || item.colors[0]?.value || '#f4f0e6',
    transform: { anchor: { x: 55, y: 285 }, angle: 0, height: 230, scale: 1, mirrored: instance.transform.mirrored },
  }))
  thumbnailCache.set(key, result)
  return result
}

const materialOptions = computed(() => {
  const grouped = new Map<string, { id: string, name: string, group: 'flowers' | 'foliage', instances: MaterialInstance[] }>()
  for (const instance of materials.value) {
    const existing = grouped.get(instance.materialId)
    if (existing) {
      existing.instances.push(instance)
      continue
    }
    const source = catalog.get(instance.materialId)
    grouped.set(instance.materialId, {
      id: instance.materialId,
      name: source?.name || '未命名花材',
      group: instance.group === 'foliage' ? 'foliage' : 'flowers',
      instances: [instance],
    })
  }
  return [...grouped.values()]
})
const visibleMaterialOptions = computed(() => {
  if (!selectionMaterialId.value)
    return materialOptions.value
  return materialOptions.value.filter(option => option.id === selectionMaterialId.value)
})

const selected = computed(() => selectedMaterialId.value === null ? undefined : artwork.getMaterial(selectedMaterialId.value))
const selectedSource = computed(() => selected.value ? catalog.get(selected.value.materialId) : undefined)
const canMoveBackward = computed(() => selectedMaterialId.value !== null && artwork.canMoveBackward(selectedMaterialId.value))
const canMoveForward = computed(() => selectedMaterialId.value !== null && artwork.canMoveForward(selectedMaterialId.value))

function materialThumbnail(option: typeof materialOptions.value[number]) {
  const instance = option.instances.find(item => item.id === selectedMaterialId.value) || option.instances[0]
  return instance ? thumbnail(instance) : ''
}

function chooseMaterial(option: typeof materialOptions.value[number]) {
  const exiting = selectionMaterialId.value === option.id
  emit('focus', option.id, option.group, option.instances.length > 1)
  if (!exiting && option.instances.length === 1)
    emit('instance', option.instances[0].id)
}
</script>

<template>
  <view class="selection-panel" @tap.stop @touchmove.stop>
    <scroll-view scroll-x enable-flex class="selection-scroll" :show-scrollbar="false">
      <view class="selection-list">
        <template v-for="option in visibleMaterialOptions" :key="option.id">
          <button class="material-card" :class="{ active: selectionMaterialId === option.id }"
            @click="chooseMaterial(option)">
            <image v-if="materialThumbnail(option)" class="material-thumbnail" :src="materialThumbnail(option)" mode="aspectFit" />
            <view v-else class="material-thumbnail-fallback i-carbon-sprout" />
            <text class="material-name">{{ option.name }}</text>
            <text class="material-count">{{ option.instances.length }}</text>
          </button>
          <view
            v-if="selectionMaterialId === option.id && selectionMenuLevel === 'material' && option.instances.length > 1"
            class="instance-list">
            <button v-for="(instance, index) in option.instances" :key="instance.id" class="instance-card"
              :class="{ active: selectedMaterialId === instance.id }" @click="emit('instance', instance.id)">
              <image v-if="thumbnail(instance)" class="instance-thumbnail" :src="thumbnail(instance)" mode="aspectFit" />
              <text>{{ index + 1 }}</text>
            </button>
          </view>
        </template>
      </view>
    </scroll-view>

    <StudioFlowerTools v-if="selected && selectedSource" :instance="selected" :material="selectedSource"
      :colors-open="colorsExpanded" :can-move-backward="canMoveBackward" :can-move-forward="canMoveForward"
      @color="emit('color', $event)" @toggle-colors="emit('toggleColors')" @layer="emit('layer', $event)"
      @duplicate="emit('duplicate')" @remove="emit('remove')" @mirror="emit('mirror')" />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;

.selection-panel {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  flex-direction: column;
  gap: 10rpx;
  padding: 10rpx;
  border: 2rpx solid $studio-border;
  border-radius: 22rpx;
  background: rgba(255, 253, 247, .97);
  box-shadow: 0 10rpx 30rpx rgba(63, 70, 61, .15)
}

.selection-scroll {
  width: 100%;
  white-space: nowrap
}

.selection-list {
  display: flex;
  min-width: 100%;
  box-sizing: border-box;
  align-items: center;
  gap: 12rpx
}

.material-card,
.instance-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: 2rpx solid rgba(116, 128, 107, .26);
  background: $studio-secondary;
  color: $studio-ink;
  box-shadow: none
}

.material-card::after,
.instance-card::after {
  border: none
}

.material-card {
  position: relative;
  width: 184rpx;
  height: 190rpx;
  flex-shrink: 0;
  gap: 8rpx;
  padding: 10rpx 14rpx 12rpx;
  border-radius: 20rpx;
  font-size: 23rpx;
  line-height: 1;
}

.material-card.active,
.instance-card.active {
  border-color: #829477;
  background: $studio-accent;
  color: #3f463d
}

.material-thumbnail {
  width: 104rpx;
  height: 124rpx;
  flex-shrink: 0
}

.material-thumbnail-fallback {
  width: 54rpx;
  height: 54rpx;
  flex-shrink: 0
}

.material-name {
  display: block;
  max-width: 150rpx;
  overflow: hidden;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap
}

.material-count {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  display: flex;
  min-width: 32rpx;
  height: 32rpx;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: #829477;
  color: #fff;
  font-size: 18rpx;
  line-height: 1
}

.instance-list {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12rpx;
  padding-left: 6rpx
}

.instance-card {
  width: 112rpx;
  height: 116rpx;
  flex-shrink: 0;
  flex-direction: column;
  gap: 3rpx;
  padding: 5rpx;
  border-radius: 19rpx;
  font-size: 21rpx;
  line-height: 1
}

.instance-thumbnail {
  width: 72rpx;
  height: 80rpx
}
</style>
