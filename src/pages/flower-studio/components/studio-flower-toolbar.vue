<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import StudioFlowerTools from './studio-flower-tools.vue'

defineProps<{ panelStyle: Record<string, string> }>()
const emit = defineEmits<{
  close: []
  color: [value: string]
  toggleColors: []
  layer: [direction: 'forward' | 'backward']
  duplicate: []
  remove: []
  mirror: []
  adjacent: [direction: 'previous' | 'next']
  controlStart: []
  control: [field: 'angle' | 'height' | 'scale', value: number]
  controlEnd: []
}>()
const studio = useFlowerStudioStore()
const artwork = useCreationArtworkStore()
const catalog = useFlowerCatalogStore()
const { showFlowerTools, colorsExpanded, selectedMaterialId } = storeToRefs(studio)
const selected = computed(() => selectedMaterialId.value === null ? undefined : artwork.getMaterial(selectedMaterialId.value))
const material = computed(() => selected.value ? catalog.get(selected.value.materialId) : undefined)
const canMoveBackward = computed(() => selectedMaterialId.value !== null && artwork.canMoveBackward(selectedMaterialId.value))
const canMoveForward = computed(() => selectedMaterialId.value !== null && artwork.canMoveForward(selectedMaterialId.value))
function forwardControl(field: 'angle' | 'height' | 'scale', value: number) {
  emit('control', field, value)
}
</script>

<template>
  <view v-if="showFlowerTools && selected && material" class="studio-flower-tools-position" :style="panelStyle">
    <StudioFlowerTools :instance="selected" :material="material" :colors-open="colorsExpanded" :can-move-backward="canMoveBackward" :can-move-forward="canMoveForward" @close="emit('close')" @color="emit('color', $event)" @toggle-colors="emit('toggleColors')" @layer="emit('layer', $event)" @duplicate="emit('duplicate')" @remove="emit('remove')" @mirror="emit('mirror')" @adjacent="emit('adjacent', $event)" @control-start="emit('controlStart')" @control="forwardControl" @control-end="emit('controlEnd')" />
  </view>
</template>

<style scoped lang="scss">.studio-flower-tools-position{position:absolute;z-index:8}</style>
