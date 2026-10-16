<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import type { StudioTab } from '../studio-types'
import { storeToRefs } from 'pinia'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { useFlowerStudioLayoutStore } from '@/stores/flowerStudioLayoutStore'
import StudioBackgroundPanel from './studio-background-panel.vue'
import StudioContainerPanel from './studio-container-panel.vue'
import StudioFlowerPanel from './studio-flower-panel.vue'
import StudioToolbar from './studio-toolbar.vue'

const studio = useFlowerStudioStore()
const layout = useFlowerStudioLayoutStore()
const { activeTab } = storeToRefs(studio)
const { toolbarBottom, stageBottom } = storeToRefs(layout)
const emit = defineEmits<{
  select: [tab: StudioTab]
  close: []
  dismiss: []
  cloud: [id: string]
  background: [value: Artwork['background']]
}>()
</script>

<template>
  <view v-if="activeTab" class="panel-backdrop" @click="emit('dismiss')" @touchmove.stop.prevent />
  <view v-if="activeTab" class="studio-options-position" :style="{ bottom: `${stageBottom}px` }">
    <StudioFlowerPanel
      v-if="activeTab === 'flowers'" @close="emit('close')" @cloud="emit('cloud', $event)"
    />
    <StudioContainerPanel
      v-else-if="activeTab === 'vases'" @close="emit('close')" @cloud="emit('cloud', $event)"
    />
    <StudioBackgroundPanel
      v-else-if="activeTab === 'backgrounds'" @close="emit('close')" @cloud="emit('cloud', $event)" @background="emit('background', $event)"
    />
  </view>
  <view class="studio-toolbar-position" :style="{ bottom: `${toolbarBottom}px` }">
    <StudioToolbar @select="emit('select', $event)" />
  </view>
</template>

<style scoped lang="scss">
.panel-backdrop { position: absolute; inset: 0; z-index: 4; background: transparent; }
.studio-options-position { position: absolute; z-index: 6; left: 26rpx; right: 26rpx; }
.studio-toolbar-position { position: absolute; z-index: 7; left: 26rpx; right: 26rpx; }
</style>
