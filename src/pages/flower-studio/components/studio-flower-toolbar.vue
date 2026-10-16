<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { useFlowerStudioLayoutStore } from '@/stores/flowerStudioLayoutStore'
import StudioFlowerTools from './studio-flower-tools.vue'

const emit = defineEmits<{
  close: []
  color: [value: string]
  toggleColors: []
  layer: [direction: 'front' | 'back']
  duplicate: []
  remove: []
  mirror: []
  adjacent: [direction: 'previous' | 'next']
  controlStart: []
  control: [field: 'position' | 'height', value: number]
  controlEnd: []
}>()
const studio = useFlowerStudioStore()
const artwork = useCreationArtworkStore()
const layout = useFlowerStudioLayoutStore()
const { showFlowerTools, toolsColorsOpen } = storeToRefs(studio)
const { selected, selectedControlBounds, canMoveBack, canMoveFront } = storeToRefs(artwork)
const { flowerToolsStyle } = storeToRefs(layout)

function forwardControl(field: 'position' | 'height', value: number) {
  emit('control', field, value)
}
</script>

<template>
  <view v-if="showFlowerTools && selected && selectedControlBounds" class="studio-flower-tools-position" :style="flowerToolsStyle">
    <StudioFlowerTools
      :stem="selected" :colors-open="toolsColorsOpen" :can-move-back="canMoveBack"
      :can-move-front="canMoveFront" :control-bounds="selectedControlBounds"
      @close="emit('close')" @color="emit('color', $event)"
      @toggle-colors="emit('toggleColors')" @layer="emit('layer', $event)" @duplicate="emit('duplicate')"
      @remove="emit('remove')" @mirror="emit('mirror')" @adjacent="emit('adjacent', $event)"
      @control-start="emit('controlStart')" @control="forwardControl" @control-end="emit('controlEnd')"
    />
  </view>
</template>

<style scoped lang="scss">
.studio-flower-tools-position { position: absolute; z-index: 8; }
</style>
