<script setup lang="ts">
import type { StudioTouchEvent } from '@/models/artwork'
import { computed } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { anchorY, type Artwork, artworkBackground, type Stem, type VaseName } from '@/utils/flower/artwork'
import { backgroundOffset, backgroundSceneSource } from '@/utils/flower/background-render'
import { svgImageSource } from '@/utils/flower/material-render'
import FlowerInstance from './flower-stem.vue'
import FlowerVase from './flower-vase.vue'

const props = defineProps<{ background?: Artwork['background'], backgroundMaterialId?: string, backgroundMaterialRevision?: string, stems: Stem[], vase: VaseName, selectedId: number | null, hideVase?: boolean, vaseMaterialId?: string, vaseMaterialRevision?: string }>()
const emit = defineEmits<{ start: [event: StudioTouchEvent, stem: Stem], move: [event: StudioTouchEvent], end: [cancelled: boolean], clear: [] }>()
const catalog = useFlowerCatalogStore()
const scene = computed(() => props.backgroundMaterialId && props.backgroundMaterialRevision ? catalog.get(props.backgroundMaterialId, props.backgroundMaterialRevision) : undefined)
const backgroundSource = computed(() => scene.value?.sources.background ? svgImageSource(backgroundSceneSource(scene.value)) : '')
const arrangementOffset = computed(() => backgroundOffset(scene.value, props.vaseMaterialId && props.vaseMaterialRevision ? catalog.get(props.vaseMaterialId, props.vaseMaterialRevision) : undefined, props.vase))
const boardColor = computed(() => artworkBackground(props.background || 'warm'))
</script>

<template>
  <view class="studio-board" :style="{ backgroundColor: boardColor, width: `${studioMetrics.width}rpx`, height: `${studioMetrics.height}rpx` }" @tap="emit('clear')">
    <image v-if="backgroundSource" class="board-background" :src="backgroundSource" mode="scaleToFill" />
    <view class="board-arrangement" :style="{ transform: `translateY(${arrangementOffset}rpx)` }">
      <FlowerVase v-if="!hideVase" layer="back" :vase="vase" :material-id="vaseMaterialId" :revision="vaseMaterialRevision" />
      <FlowerInstance v-for="stem in stems" :key="stem.id" :stem="stem" :anchor="anchorY(vase)" :selected="selectedId === stem.id" @start="emit('start', $event, stem)" @move="emit('move', $event)" @end="emit('end', $event)" />
      <FlowerVase v-if="!hideVase" :vase="vase" :material-id="vaseMaterialId" :revision="vaseMaterialRevision" />
    </view>
    <view v-if="!stems.length" class="studio-empty">
      <text>从一枝花开始</text><text class="empty-hint">
        在下方选择喜欢的花材
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.studio-board { position: relative; width: 698rpx; height: 1000rpx; }
.board-background { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }.board-arrangement { position: absolute; inset: 0; }
.studio-empty { position: absolute; top: 300rpx; width: 100%; text-align: center; color: $studio-muted; font-size: 30rpx; letter-spacing: 3rpx; pointer-events: none; }.empty-hint { display: block; margin-top: 20rpx; font-size: 22rpx; letter-spacing: 1rpx; }
</style>
