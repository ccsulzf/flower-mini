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
}>()
const studio = useFlowerStudioStore()
const artwork = useCreationArtworkStore()
const layout = useFlowerStudioLayoutStore()
const { showFlowerTools, toolsColorsOpen } = storeToRefs(studio)
const { selected, canMoveBack, canMoveFront } = storeToRefs(artwork)
const { flowerToolsStyle } = storeToRefs(layout)
</script>

<template>
  <view v-if="showFlowerTools && selected" class="studio-flower-tools-position" :style="flowerToolsStyle">
    <StudioFlowerTools
      :stem="selected" :colors-open="toolsColorsOpen" :can-move-back="canMoveBack"
      :can-move-front="canMoveFront" @close="emit('close')" @color="emit('color', $event)"
      @toggle-colors="emit('toggleColors')" @layer="emit('layer', $event)" @duplicate="emit('duplicate')"
      @remove="emit('remove')" @mirror="emit('mirror')" @adjacent="emit('adjacent', $event)"
    />
  </view>
</template>

<style scoped lang="scss">
.studio-flower-tools-position { position: absolute; z-index: 8; }
</style>
