<script setup lang="ts">
import type { StudioTab } from '../studio-types'
import { onReady, onResize } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, getCurrentInstance, nextTick, watch } from 'vue'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import StudioBackgroundPanel from './studio-background-panel.vue'
import StudioContainerPanel from './studio-container-panel.vue'
import StudioFlowerPanel from './studio-flower-panel.vue'
import StudioSelectionFab from './studio-selection-fab.vue'
import StudioToolbar from './studio-toolbar.vue'

defineProps<{ toolbarBottom: number, stageBottom: number }>()
const emit = defineEmits<{
  select: [tab: StudioTab]
  generate: []
  guideTargets: [targets: Record<string, { left: number, top: number, width: number, height: number }>]
  close: []
  dismiss: []
  material: [id: string]
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
const { activeTab, pendingMaterialId } = storeToRefs(studio)
const { container, background, materials } = storeToRefs(artwork)
const usageCounts = computed(() => materials.value.reduce<Record<string, number>>((counts, item) => { counts[item.materialId] = (counts[item.materialId] || 0) + 1; return counts }, {}))
const instance = getCurrentInstance()
let measureVersion = 0
async function measureGuideTargets() {
  const version = ++measureVersion
  await nextTick()
  if (!instance?.proxy)
    return
  const targets: Record<string, { left: number, top: number, width: number, height: number }> = {}
  const query = uni.createSelectorQuery().in(instance.proxy)
  for (const [key, selector] of Object.entries({
    flowers: '.studio-toolbar-position >>> .guide-flowers-target',
    generate: '.studio-toolbar-position >>> .tool-generate-target',
    panel: '.studio-options-position',
  })) {
    query.select(selector).boundingClientRect((rect) => {
      if (rect && !Array.isArray(rect) && typeof rect.left === 'number' && typeof rect.top === 'number' && rect.width && rect.height)
        targets[key] = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    })
  }
  query.exec(() => {
    if (version === measureVersion)
      emit('guideTargets', targets)
  })
}
onReady(measureGuideTargets)
onResize(measureGuideTargets)
watch(activeTab, measureGuideTargets, { flush: 'post' })

function forwardFocus(materialId: string, group: 'flowers' | 'foliage', expanded: boolean) {
  emit('focus', materialId, group, expanded)
}
</script>

<template>
  <view v-if="activeTab" class="panel-backdrop" @click="emit('dismiss')" @touchmove.stop.prevent />
  <view v-if="activeTab" class="studio-options-position" :style="{ bottom: `calc(${toolbarBottom}px + 88rpx)` }">
    <StudioFlowerPanel v-if="activeTab === 'flowers'" :usage-counts="usageCounts" @close="emit('close')" @add="emit('material', $event)" />
    <StudioContainerPanel v-else-if="activeTab === 'vases'" :selected-id="container.materialId" :pending-id="pendingMaterialId" @close="emit('close')" @select="emit('material', $event)" />
    <StudioBackgroundPanel v-else-if="activeTab === 'backgrounds'" :selected-id="background.materialId" :pending-id="pendingMaterialId" @close="emit('close')" @select="emit('material', $event)" />
    <StudioSelectionFab
      v-else-if="activeTab === 'selection'" @focus="forwardFocus" @instance="emit('instance', $event)"
      @color="emit('color', $event)" @toggle-colors="emit('toggleColors')" @layer="emit('layer', $event)"
      @duplicate="emit('duplicate')" @remove="emit('remove')" @mirror="emit('mirror')"
    />
  </view>
  <view class="studio-toolbar-position" :style="{ bottom: `${toolbarBottom}px` }"><StudioToolbar @select="emit('select', $event)" @generate="emit('generate')" /></view>
</template>

<style scoped lang="scss">
.panel-backdrop{position:absolute;z-index:4;top:0;right:0;bottom:0;left:0;background:rgba(var(--app-ink-rgb), .025)}.studio-options-position{position:absolute;z-index:6;right:38rpx;left:38rpx}.studio-toolbar-position{position:absolute;z-index:7;right:38rpx;left:38rpx}
</style>
