<script setup lang="ts">
import { computed } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { anchorY, type Artwork, artworkBackground, type Stem, type VaseName } from '@/utils/flower/artwork'
import { backgroundOffset, backgroundSceneSource } from '@/utils/flower/background-render'
import { svgImageSource } from '@/utils/flower/material-render'
import FlowerInstance from './flower-stem.vue'
import FlowerVase from './flower-vase.vue'

const props = defineProps<{ background?: Artwork['background'], backgroundMaterialId?: string, backgroundMaterialRevision?: string, stems: Stem[], vase: VaseName, hideVase?: boolean, vaseMaterialId?: string, vaseMaterialRevision?: string }>()
const catalog = useFlowerCatalogStore()
const scene = computed(() => props.backgroundMaterialId && props.backgroundMaterialRevision ? catalog.get(props.backgroundMaterialId, props.backgroundMaterialRevision) : undefined)
const backgroundSource = computed(() => scene.value?.sources.background ? svgImageSource(backgroundSceneSource(scene.value)) : '')
const arrangementOffset = computed(() => backgroundOffset(scene.value, props.vaseMaterialId && props.vaseMaterialRevision ? catalog.get(props.vaseMaterialId, props.vaseMaterialRevision) : undefined, props.vase))
const boardColor = computed(() => artworkBackground(props.background || 'warm'))
</script>

<template>
  <view class="artwork-renderer" :style="{ backgroundColor: boardColor, width: `${studioMetrics.width}rpx`, height: `${studioMetrics.height}rpx` }">
    <image v-if="backgroundSource" class="board-background" :src="backgroundSource" mode="scaleToFill" />
    <view class="board-arrangement" :style="{ transform: `translateY(${arrangementOffset}rpx)` }">
      <FlowerVase v-if="!hideVase" layer="back" :vase="vase" :material-id="vaseMaterialId" :revision="vaseMaterialRevision" />
      <FlowerInstance v-for="stem in stems" :key="stem.id" :stem="stem" :anchor="anchorY(vase)" />
      <FlowerVase v-if="!hideVase" :vase="vase" :material-id="vaseMaterialId" :revision="vaseMaterialRevision" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.artwork-renderer { position: relative; width: 698rpx; height: 1000rpx; overflow: hidden; }
.board-background { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.board-arrangement { position: absolute; inset: 0; }
</style>
