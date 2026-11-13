<script setup lang="ts">
import type { CachedMaterial } from '@/models/material'
import type { MaterialInstance } from '@/models/artwork'
import { computed, ref } from 'vue'
import { bouquetBoundary, fitBouquetTransform } from '@/utils/flower/bouquet-boundary.cjs'
import FlowerStem from '@/components/flower/flower-stem.vue'
import { bouquetLayers, svgImageSource } from '@/utils/flower/material-render'
import { wrappingMaterials as wraps } from './wrapping-materials'
import roseMetadata from './assets/demo-rose-material.json'
import roseFlower from './assets/demo-rose-flower.svg?raw'
import roseStem from './assets/demo-rose-stemWithoutLeaves.svg?raw'

import tulipMetadata from './assets/demo-tulip-material.json'
import tulipFlower from './assets/demo-tulip-flower.svg?raw'
import tulipStem from './assets/demo-tulip-stemWithoutLeaves.svg?raw'
import carnationMetadata from './assets/demo-carnation-material.json'
import carnationFlower from './assets/demo-carnation-flower.svg?raw'
import carnationStem from './assets/demo-carnation-stemWithoutLeaves.svg?raw'
import chamomileMetadata from './assets/demo-chamomile-material.json'
import chamomileFlower from './assets/demo-chamomile-flower.svg?raw'
import chamomileStem from './assets/demo-chamomile-stemWithoutLeaves.svg?raw'

import lisianthusMetadata from './assets/demo-lisianthus-material.json'
import lisianthus_flower from './assets/demo-lisianthus-flower.svg?raw'
import lisianthus_stemWithoutLeaves from './assets/demo-lisianthus-stemWithoutLeaves.svg?raw'
import ranunculusMetadata from './assets/demo-ranunculus-material.json'
import ranunculus_flower from './assets/demo-ranunculus-flower.svg?raw'
import ranunculus_stemWithoutLeaves from './assets/demo-ranunculus-stemWithoutLeaves.svg?raw'
import gypsophilaMetadata from './assets/demo-gypsophila-material.json'
import gypsophila_flower from './assets/demo-gypsophila-flower.svg?raw'
import gypsophila_stemWithoutLeaves from './assets/demo-gypsophila-stemWithoutLeaves.svg?raw'
import sunflowerMetadata from './assets/demo-sunflower-material.json'
import sunflower_flower from './assets/demo-sunflower-flower.svg?raw'
import sunflower_stemWithoutLeaves from './assets/demo-sunflower-stemWithoutLeaves.svg?raw'
import eucalyptusMetadata from './assets/demo-eucalyptus-material.json'
import eucalyptus_foliage from './assets/demo-eucalyptus-foliage.svg?raw'
import asparagus_fernMetadata from './assets/demo-asparagus-fern-material.json'
import asparagus_fern_foliage from './assets/demo-asparagus-fern-foliage.svg?raw'
import boston_fernMetadata from './assets/demo-boston-fern-material.json'
import boston_fern_foliage from './assets/demo-boston-fern-foliage.svg?raw'

const scale = (uni.getSystemInfoSync().windowWidth - 92) / 698
const rose: CachedMaterial = {
  ...roseMetadata, category: 'flower', group: 'main', assets: {}, updatedAt: 0, paths: {},
  sources: { flower: roseFlower, stemWithoutLeaves: roseStem },
}
const flowers: CachedMaterial[] = [rose, ...[
  { metadata: tulipMetadata, flower: tulipFlower, stem: tulipStem },
  { metadata: carnationMetadata, flower: carnationFlower, stem: carnationStem },
  { metadata: chamomileMetadata, flower: chamomileFlower, stem: chamomileStem },
  { metadata: lisianthusMetadata, flower: lisianthus_flower, stem: lisianthus_stemWithoutLeaves },
  { metadata: ranunculusMetadata, flower: ranunculus_flower, stem: ranunculus_stemWithoutLeaves },
  { metadata: gypsophilaMetadata, flower: gypsophila_flower, stem: gypsophila_stemWithoutLeaves },
  { metadata: sunflowerMetadata, flower: sunflower_flower, stem: sunflower_stemWithoutLeaves },
].map(({ metadata, flower, stem }): CachedMaterial => ({
  ...metadata, category: 'flower', group: metadata.group === 'filler' ? 'filler' : 'main', assets: {}, updatedAt: 0, paths: {},
  sources: { flower, stemWithoutLeaves: stem },
}))]
const foliage: CachedMaterial[] = [
  { metadata: eucalyptusMetadata, source: eucalyptus_foliage },
  { metadata: asparagus_fernMetadata, source: asparagus_fern_foliage },
  { metadata: boston_fernMetadata, source: boston_fern_foliage },
].map(({ metadata, source }) => ({
  ...metadata, category: 'flower', group: 'foliage', assets: {}, paths: {}, updatedAt: 0,
  sources: { foliage: source },
}))
const wrapIndex = ref(0)
const selectedWrap = computed(() => wraps[wrapIndex.value])
const selectedId = ref<number | null>(null)
const transforms = ref<Record<number, MaterialInstance['transform']>>({})
const bouquet = [
  ...[-.95, .85, -.38].map((offset, index) => ({
    material: foliage[index], height: [475, 445, 515][index], angle: offset * 15,
  })),
  ...[-1, 1, -.55, .55, 0, -.3, .3, .7].map((offset, index) => ({
    material: flowers[[6, 3, 4, 2, 0, 5, 0, 1][index]],
    height: [405, 420, 475, 450, 495, 360, 385, 390][index], angle: offset * 15,
  })),
].map(({ material, height, angle }, index) => ({
  material,
  instance: {
    id: index + 1, materialId: material.id, group: material.group,
    color: material.colors[index % material.colors.length].value,
    transform: { anchor: { x: 350, y: 747 }, angle, height, scale: 1, mirrored: index % 2 === 0 },
  } satisfies MaterialInstance,
}))
const flowerClipStyle = computed(() => {
  const boundary = bouquetBoundary(selectedWrap.value)
  return boundary ? `clip-path:polygon(${boundary.points.map(([x, y]) => `${x}px ${y}px`).join(',')});` : ''
})
const editableStems = computed(() => bouquet.map(stem => ({ ...stem,
  instance: { ...stem.instance, transform: fitBouquetTransform(transforms.value[stem.instance.id] ?? stem.instance.transform, stem.material, selectedWrap.value) },
})))
function flowerHandleStyle(stem: typeof bouquet[number]) {
  const { height, angle, anchor } = stem.instance.transform
  const radians = angle * Math.PI / 180
  return `left:${anchor.x + Math.sin(radians) * height - 36}px;top:${anchor.y - Math.cos(radians) * height - 36}px;`
}
let drag: { id: number, x: number, y: number, transform: MaterialInstance['transform'] } | null = null
function startDrag(stem: typeof bouquet[number], event: { touches: { clientX: number, clientY: number }[] }) {
  const touch = event.touches[0]
  if (!touch) return
  selectedId.value = stem.instance.id
  drag = { id: stem.instance.id, x: touch.clientX, y: touch.clientY, transform: { ...stem.instance.transform } }
}
function moveDrag(event: { touches: { clientX: number, clientY: number }[] }) {
  const touch = event.touches[0]
  if (!drag || !touch) return
  const radians = drag.transform.angle * Math.PI / 180
  const x = Math.sin(radians) * drag.transform.height + (touch.clientX - drag.x) / scale
  const y = Math.cos(radians) * drag.transform.height - (touch.clientY - drag.y) / scale
  transforms.value[drag.id] = { ...drag.transform,
    angle: Math.max(-22, Math.min(22, Math.atan2(x, y) * 180 / Math.PI)),
    height: Math.max(330, Math.min(530, Math.hypot(x, y))),
  }
}
function endDrag() { drag = null }
function resetBouquet() { transforms.value = {}; selectedId.value = null }
const paperImages = computed(() => {
  const layers = bouquetLayers(selectedWrap.value)
  return { back: svgImageSource(layers.back), front: svgImageSource(layers.front) }
})
</script>

<template>
  <view class="wrap-demo">
    <text class="demo-title">给这一束花换张包装纸</text>
    <text class="demo-note">花朵高低错落，绿叶轻轻衬托。拖动花头调整位置，换张纸看看。</text>
    <view class="demo-preview" :style="`height:${1000 * scale}px;`">
      <view class="demo-board" :style="`transform:scale(${scale});`">
        <image class="paper-image back-paper" :src="paperImages.back" mode="scaleToFill" />
        <view class="flower-layer" :style="flowerClipStyle">
          <FlowerStem v-for="stem in editableStems" :key="stem.instance.id" :instance="stem.instance" :material="stem.material" />
        </view>
        <image class="paper-image front-paper" :src="paperImages.front" mode="scaleToFill" />
        <view v-for="stem in editableStems" :key="`handle-${stem.instance.id}`" class="flower-handle" :class="{ selected: selectedId === stem.instance.id }" :style="flowerHandleStyle(stem)" @touchstart.stop="startDrag(stem, $event)" @touchmove.stop.prevent="moveDrag" @touchend="endDrag" @touchcancel="endDrag" />
      </view>
    </view>
    <text class="section-label">换一款包装</text>
    <view class="demo-options">
      <button v-for="(wrap, index) in wraps" :key="wrap.id" class="paper-button" :class="{ active: wrapIndex === index }" @click="wrapIndex = index">{{ wrap.name }}</button>
    </view>
    <button class="reset-button" @click="resetBouquet">恢复花枝位置</button>
  </view>
</template>

<style scoped lang="scss">
.wrap-demo { padding: 20rpx; margin-bottom: 36rpx; background: var(--app-surface); border: 1rpx solid var(--app-line); }
.demo-title { display: block; font-family: STSong, SimSun, serif; font-size: 36rpx; color: var(--app-ink); }
.demo-note { display: block; margin-top: 12rpx; font-size: 22rpx; line-height: 1.7; color: var(--app-inkMuted); }
.section-label { display: block; font-size: 24rpx; color: var(--app-inkMuted); }
.demo-preview { position: relative; width: 100%; overflow: hidden; }
.demo-board { position: absolute; top: 0; left: 0; width: 698px; height: 1000px; transform-origin: top left; }
.paper-image { position: absolute; top: 0; left: 0; width: 698px; height: 1000px; pointer-events: none; }
.back-paper { z-index: 0; }
.flower-layer { position: absolute; top: 0; left: 0; width: 698px; height: 1000px; z-index: 1; }
.front-paper { z-index: 2; }
.flower-handle { position: absolute; width: 72px; height: 72px; z-index: 3; border: 2px solid transparent; border-radius: 50%; box-sizing: border-box; touch-action: none; }
.flower-handle.selected { border-color: var(--app-sage); }
.demo-options { display: flex; flex-wrap: wrap; gap: 14rpx; margin: 12rpx 0 24rpx; }
.paper-button { flex: 0 0 calc((100% - 28rpx) / 3); box-sizing: border-box; margin: 0; padding: 0 8rpx; color: var(--app-inkMuted); background: var(--app-surfaceMuted); font-size: 23rpx; line-height: 72rpx; border: 1rpx solid var(--app-line); border-radius: 12rpx 18rpx 10rpx 16rpx; box-shadow: 2rpx 3rpx 0 var(--app-line); }
.paper-button::after { border: 1rpx solid var(--app-line); top: 4rpx; left: 3rpx; right: 2rpx; bottom: 3rpx; border-radius: 15rpx 10rpx 16rpx 9rpx; }
.paper-button:nth-child(2) { border-radius: 18rpx 9rpx 14rpx 11rpx; }
.paper-button.active { background: var(--app-sageSoft); color: var(--app-brandStrong); border-color: var(--app-sage); }
.reset-button { margin: 0; padding: 8rpx; font-size: 22rpx; color: var(--app-inkMuted); background: transparent; line-height: 48rpx; }
.reset-button::after { border: none; }
</style>
