<script setup lang="ts">
import type { MaterialGroup, MaterialInstance } from '@/models/artwork'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { materialThumbnailSource } from '@/utils/flower/material-thumbnail'
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
const { selectionMaterialId, selectedMaterialId, colorsExpanded } = storeToRefs(studio)
const { materials } = storeToRefs(artwork)
type SelectionGroup = 'all' | MaterialGroup
const groups: { value: SelectionGroup, name: string }[] = [
  { value: 'all', name: '全部' },
  { value: 'main', name: '主花' },
  { value: 'filler', name: '配花' },
  { value: 'foliage', name: '叶材' },
]
const activeGroup = ref<SelectionGroup>('all')

function thumbnail(instance: MaterialInstance) {
  return materialThumbnailSource(catalog.get(instance.materialId), {
    color: instance.color,
    mirrored: instance.transform.mirrored,
  })
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
  const filtered = activeGroup.value === 'all'
    ? materialOptions.value
    : materialOptions.value.filter(option => option.instances[0]?.group === activeGroup.value)
  if (!selectionMaterialId.value)
    return filtered
  return filtered.filter(option => option.id === selectionMaterialId.value)
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

function selectGroup(group: SelectionGroup) {
  activeGroup.value = group
  const focused = materialOptions.value.find(option => option.id === selectionMaterialId.value)
  if (focused && group !== 'all' && focused.instances[0]?.group !== group)
    studio.clearSelectionFocus()
}
</script>

<template>
  <view class="selection-panel" @tap.stop @touchmove.stop>
    <view class="material-filters" role="tablist" aria-label="已选花材分类">
      <button
        v-for="group in groups" :key="group.value" class="material-filter"
        :class="{ active: activeGroup === group.value }" role="tab"
        :aria-selected="activeGroup === group.value" @click="selectGroup(group.value)"
      >
        {{ group.name }}
      </button>
    </view>
    <scroll-view scroll-x enable-flex class="selection-scroll" :show-scrollbar="false">
      <view class="selection-list">
        <template v-for="option in visibleMaterialOptions" :key="option.id">
          <button
            class="material-card" :class="{ active: selectionMaterialId === option.id }"
            @click="chooseMaterial(option)"
          >
            <image v-if="materialThumbnail(option)" class="material-thumbnail" :src="materialThumbnail(option)" mode="aspectFit" />
            <view v-else class="material-thumbnail-fallback i-carbon-sprout" />
            <text class="material-name">{{ option.name }}</text>
            <text class="material-count">{{ option.instances.length }}</text>
          </button>
          <view
            v-if="selectionMaterialId === option.id && option.instances.length > 1"
            class="instance-list"
          >
            <button
              v-for="(instance, index) in option.instances" :key="instance.id" class="instance-card"
              :class="{ active: selectedMaterialId === instance.id }" @click="emit('instance', instance.id)"
            >
              <image v-if="thumbnail(instance)" class="instance-thumbnail" :src="thumbnail(instance)" mode="aspectFit" />
              <text>{{ index + 1 }}</text>
            </button>
          </view>
        </template>
      </view>
    </scroll-view>

    <StudioFlowerTools
      v-if="selected && selectedSource" :instance="selected" :material="selectedSource"
      :colors-open="colorsExpanded" :can-move-backward="canMoveBackward" :can-move-forward="canMoveForward"
      @color="emit('color', $event)" @toggle-colors="emit('toggleColors')" @layer="emit('layer', $event)"
      @duplicate="emit('duplicate')" @remove="emit('remove')" @mirror="emit('mirror')"
    />
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
  border: 1rpx solid rgba(112, 91, 68, .2);
  border-bottom: 0;
  border-radius: 28rpx 28rpx 0 0;
  background: rgba(255, 253, 247, .98);
  box-shadow: 0 -10rpx 30rpx rgba(88, 74, 55, .075)
}

.selection-scroll {
  width: 100%;
  white-space: nowrap
}

.material-filters {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 2rpx 4rpx 4rpx;
  border-bottom: 1rpx solid rgba(112, 91, 68, .12)
}

.material-filter {
  position: relative;
  min-width: 94rpx;
  height: 52rpx;
  margin: 0;
  padding: 0 18rpx;
  border: 0;
  border-radius: 10rpx 14rpx 9rpx 13rpx;
  background: transparent;
  color: rgba(72, 63, 53, .72);
  font-size: 23rpx;
  line-height: 52rpx
}

.material-filter::after {
  border: 0
}

.material-filter.active {
  background: rgba(226, 231, 217, .78);
  color: #465044;
  font-weight: 600
}

.material-filter.active::before {
  position: absolute;
  right: 12rpx;
  bottom: 5rpx;
  left: 12rpx;
  height: 2rpx;
  background: rgba(112, 132, 101, .62);
  content: '';
  transform: rotate(-1deg)
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
  border: 1rpx solid rgba(112, 91, 68, .17);
  background: rgba(248, 243, 233, .5);
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
  border-radius: 12rpx;
  font-size: 23rpx;
  line-height: 1;
}

.material-card.active,
.instance-card.active {
  border-color: #7f9274;
  background: $studio-accent;
  color: #3f463d;
  box-shadow: inset 0 -4rpx 0 rgba(126, 145, 113, .1)
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
  border-radius: 10rpx;
  background: #7f9274;
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
  border-radius: 12rpx;
  font-size: 21rpx;
  line-height: 1
}

.instance-thumbnail {
  width: 72rpx;
  height: 80rpx
}
</style>
