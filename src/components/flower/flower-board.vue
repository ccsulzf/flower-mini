<script setup lang="ts">
import type { Artwork, MaterialInstance, StudioTouchEvent } from '@/models/artwork'
import type { StudioSelectionFilter } from '@/models/flower-studio'
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { backgroundOffset } from '@/utils/flower/background-render'
import FlowerArtworkRenderer from './flower-artwork-renderer.vue'
import FlowerStemControl from './flower-stem-control.vue'

const props = defineProps<{
  artwork: Artwork
  preparedMaterials: Record<string, CachedMaterial>
  selectedId: number | null
  hideContainer?: boolean
  pickScope?: StudioSelectionFilter
  pickMaterialId?: string | null
}>()
const emit = defineEmits<{
  start: [event: StudioTouchEvent, instance: MaterialInstance]
  move: [event: StudioTouchEvent]
  end: [cancelled: boolean]
  clear: []
}>()
const background = computed(() => props.preparedMaterials[props.artwork.background.materialId])
const container = computed(() => props.preparedMaterials[props.artwork.container.materialId])
const arrangementOffset = computed(() => backgroundOffset(background.value, container.value))

function isInteractive(instance: MaterialInstance) {
  if (props.selectedId !== null)
    return props.selectedId === instance.id
  if (props.pickMaterialId)
    return props.pickMaterialId === instance.materialId
  if (props.pickScope === 'flowers')
    return instance.group !== 'foliage'
  if (props.pickScope === 'foliage')
    return instance.group === 'foliage'
  return true
}
</script>

<template>
  <view class="studio-board" :style="`width:${studioMetrics.width}px;height:${studioMetrics.height}px;`" @tap="emit('clear')">
    <FlowerArtworkRenderer :artwork="artwork" :prepared-materials="preparedMaterials" :hide-container="hideContainer" :selected-id="selectedId" :pick-scope="pickScope" :pick-material-id="pickMaterialId" />
    <view class="board-controls" :style="`transform:translateY(${arrangementOffset}px);`">
      <FlowerStemControl
        v-for="instance in artwork.materials"
        :key="instance.id"
        :instance="instance"
        :material="preparedMaterials[instance.materialId]"
        :selected="selectedId === instance.id"
        :interactive="isInteractive(instance)"
        :precision="Boolean(pickMaterialId) && instance.materialId === pickMaterialId"
        @start="emit('start', $event, instance)"
        @move="emit('move', $event)"
        @end="emit('end', $event)"
      />
    </view>
    <view v-if="!artwork.materials.length" class="studio-empty">
      <text>从一枝花开始</text><text class="empty-hint">在下方选择喜欢的花材</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.studio-board { position: relative; overflow: hidden; }
.board-controls { position: absolute; inset: 0; pointer-events: none; }
.studio-empty { position: absolute; z-index: 1; top: 300px; width: 100%; text-align: center; color: $studio-muted; font-size: 28px; letter-spacing: 2px; pointer-events: none; }
.empty-hint { display: block; margin-top: 12px; font-size: 20px; letter-spacing: 1px; }
</style>
