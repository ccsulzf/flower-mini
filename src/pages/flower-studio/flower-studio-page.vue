<script setup lang="ts">
import type { StudioTab } from './studio-types'
import type { Artwork } from '@/models/artwork'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import FlowerBoard from '@/components/flower/flower-board.vue'
import { useArtworkImage } from '@/hooks/useArtworkImage'
import { useFlowerDrag } from '@/hooks/useFlowerDrag'
import { useFlowerStudioLayout } from '@/hooks/useFlowerStudioLayout'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useArtworkStore } from '@/stores/artworkStore'
import { artworkBackground } from '@/utils/flower/artwork'
import StudioFinish from './components/studio-finish.vue'
import StudioFlowerTools from './components/studio-flower-tools.vue'
import StudioHeader from './components/studio-header.vue'
import StudioOptions from './components/studio-options.vue'
import StudioToolbar from './components/studio-toolbar.vue'

definePage({
  layout: 'default',
  style: { navigationBarTitleText: '花草工作室', navigationBarBackgroundColor: '#f6f3eb', disableScroll: true },
})

const store = useArtworkStore()
store.initialize({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })
const { stems, vase, vaseMaterialId, vaseMaterialRevision, background, selectedId, selected, canUndo, canRedo, canClear, canMoveBack, canMoveFront } = storeToRefs(store)
const catalog = useFlowerCatalogStore()
onShow(() => { void loadMaterials() })
async function loadMaterials() {
  await catalog.preload()
  if (vaseMaterialId.value) return
  const firstVase = catalog.materials.find(item => item.category === 'vase')
  if (!firstVase) return
  try { store.setVaseMaterial(await catalog.ensure(firstVase.id, firstVase.revision)) }
  catch (value) { notify(value instanceof Error ? value.message : '花瓶加载失败') }
}
const activeTab = ref<StudioTab | null>(null)
const showFinish = ref(false)
const showFlowerTools = ref(false)
const toolsColorsOpen = ref(false)
const { device, unit, pageActionsTop, toolbarBottom, stageTop, stageBottom, boardScale, boardPosition, artworkStyle, flowerToolsStyle } = useFlowerStudioLayout(selected, vase)
const images = useArtworkImage(store.snapshot)
const { exportCanvasId, exportingImage, imagePath, imageError, exportImage, saveImage, shareImage, previewImage } = images
const { startDrag, moveDrag, endDrag } = useFlowerDrag(store, boardScale, unit, openFlowerTools, () => {
  toolsColorsOpen.value = false
  showFlowerTools.value = false
})
watch(background, value => uni.setNavigationBarColor({
  frontColor: value === 'cocoa' ? '#ffffff' : '#000000', backgroundColor: artworkBackground(value),
}), { immediate: true })
onUnload(() => { endDrag(true); images.invalidate() })

function notify(title: string) { uni.showToast({ title, icon: 'none' }) }
function closeFinish() { showFinish.value = false; images.invalidate() }
function closeFlowerTools() { showFlowerTools.value = false; toolsColorsOpen.value = false; store.select(null) }
function closePanels() { activeTab.value = null; closeFinish(); closeFlowerTools() }
function toggleTab(tab: StudioTab) {
  endDrag(true); closeFinish(); closeFlowerTools()
  activeTab.value = activeTab.value === tab ? null : tab
}
function finish() {
  endDrag(true); closeFlowerTools(); activeTab.value = null
  if (!vaseMaterialId.value) { notify('请先选择花瓶或包装'); return }
  showFinish.value = true
  void exportImage()
}
function openFlowerTools(id: number) {
  store.select(id)
  toolsColorsOpen.value = false
  activeTab.value = null
  closeFinish()
  showFlowerTools.value = true
}
async function addCloudMaterial(id: string) {
  const row = catalog.materials.find(item => item.id === id)
  if (!row || catalog.downloading) return
  try {
    const material = await catalog.ensure(row.id, row.revision)
    endDrag(true)
    if (material.category === 'vase' || material.category === 'bouquet') store.setVaseMaterial(material)
    else if (store.addMaterial(material) === null) { notify('最多放入 16 枝花材'); return }
    activeTab.value = null; closeFlowerTools()
  } catch (value) { notify(value instanceof Error ? value.message : '素材加载失败') }
}
function undo() { endDrag(true); store.undo(); closeFlowerTools() }
function redo() { endDrag(true); store.redo(); closeFlowerTools() }
function reset() {
  if (!canClear.value) return
  uni.showModal({
    title: '清空花材',
    content: '确定清空所有花材吗？清空后可以撤销恢复。',
    confirmText: '清空',
    cancelText: '取消',
    success: (result) => {
      if (!result.confirm) return
      endDrag(true); store.clearArtwork(); closeFlowerTools()
    },
  })
}
function setColor(color: string) { store.setColor(color) }
function setBackground(value: Artwork['background']) { store.setBackground(value) }
function setLayer(direction: 'front' | 'back') { toolsColorsOpen.value = false; store.setLayer(direction) }
function duplicateSelected() {
  endDrag(true)
  const id = store.duplicateSelected()
  if (id !== null) openFlowerTools(id)
  else if (stems.value.length >= 16) notify('最多放入 16 枝花材')
}
function removeSelected() { endDrag(true); store.removeSelected(); closeFlowerTools() }
</script>

<template>
  <view
    class="flower-studio" :class="{ 'studio-light': background !== 'cocoa' }"
    :style="{ backgroundColor: artworkBackground(background), height: `${device.windowHeight}px` }"
  >
    <view class="studio-stage" :style="{ bottom: `${stageBottom}px`, top: `${stageTop}px` }">
      <view class="studio-artwork" :style="artworkStyle">
        <FlowerBoard
          :stems="stems" :vase="vase" :hide-vase="!vaseMaterialId" :vase-material-id="vaseMaterialId" :vase-material-revision="vaseMaterialRevision" :selected-id="selectedId" @start="startDrag" @move="moveDrag"
          @end="endDrag" @clear="closeFlowerTools"
        />
      </view>
    </view>
    <view v-if="activeTab || showFinish" class="panel-backdrop" @click="closePanels" @touchmove.stop.prevent />
    <view v-if="activeTab" class="studio-options-position" :style="{ bottom: `${stageBottom}px` }">
      <StudioOptions
        :tab="activeTab" :vase="vase" :background="background" @close="activeTab = null" @cloud="addCloudMaterial"
        @background="setBackground"
      />
    </view>
    <view v-if="showFlowerTools && selected" class="studio-flower-tools-position" :style="flowerToolsStyle">
      <StudioFlowerTools
        :stem="selected" :colors-open="toolsColorsOpen" :can-move-back="canMoveBack"
        :can-move-front="canMoveFront" @close="closeFlowerTools" @color="setColor"
        @toggle-colors="toolsColorsOpen = !toolsColorsOpen" @layer="setLayer" @duplicate="duplicateSelected"
        @remove="removeSelected" @leaves="store.toggleLeaves()"
      />
    </view>
    <view v-if="showFinish" class="studio-finish-position" :style="{ bottom: `${toolbarBottom}px` }">
      <StudioFinish
        :exporting="exportingImage" :image-path="imagePath" :error="imageError"
        @close="closeFinish" @retry="exportImage" @save-image="saveImage"
        @share-image="shareImage" @preview-image="previewImage"
      />
    </view>
    <view v-if="!showFinish" class="studio-page-actions-position" :style="{ top: `${pageActionsTop}px` }">
      <StudioHeader
        :can-undo="canUndo" :can-redo="canRedo"
        :can-clear="canClear" @undo="undo" @redo="redo" @reset="reset" @finish="finish"
      />
    </view>
    <view v-if="!showFinish" class="studio-toolbar-position" :style="{ bottom: `${toolbarBottom}px` }">
      <StudioToolbar :active-tab="activeTab" @select="toggleTab" />
    </view>
    <!-- 仅导出时绘制，保留真实尺寸，不能 display:none。 -->
    <canvas :id="exportCanvasId" :canvas-id="exportCanvasId" class="artwork-export-canvas" />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;

.flower-studio {
  position: relative;
  min-height: 100vh;
  width: 750rpx;
  overflow: hidden;
  color: $studio-ink;
}

.studio-stage {
  position: absolute;
  left: 0;
  right: 0;
  overflow: hidden;
}

.studio-artwork {
  position: absolute;
  transform-origin: 0 0;
}

.studio-toolbar-position {
  position: absolute;
  z-index: 7;
  left: 26rpx;
  right: 26rpx;
}

.studio-page-actions-position {
  position: absolute;
  z-index: 7;
  left: 26rpx;
  right: 26rpx;
}

.panel-backdrop {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(17, 20, 15, .2);
}

.studio-options-position {
  position: absolute;
  z-index: 6;
  left: 26rpx;
  right: 26rpx;
}

.studio-flower-tools-position {
  position: absolute;
  z-index: 3;
}

.studio-finish-position {
  position: absolute;
  z-index: 8;
  left: 26rpx;
  right: 26rpx;
}

.artwork-export-canvas {
  position: fixed;
  left: -2000px;
  top: 0;
  width: 698px;
  height: 1000px;
  pointer-events: none;
}
</style>
