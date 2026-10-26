<script setup lang="ts">
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'
import { bouquetLayers, svgImageSource, vaseLayers, vasePlacement } from '@/utils/flower/material-render'

const props = defineProps<{ material: CachedMaterial, hideContainer?: boolean }>()
const placement = computed(() => vasePlacement(props.material))
const imageStyle = computed(() => {
  const value = placement.value
  return `position:absolute;left:${value.x}px;top:${value.y}px;width:${value.width}px;height:${value.height}px;pointer-events:none;`
})
const backImageStyle = computed(() => `${imageStyle.value}z-index:0;`)
const frontImageStyle = computed(() => `${imageStyle.value}z-index:2;`)
const vase = computed(() => props.material.category === 'vase' ? vaseLayers(props.material) : null)
// Keep the complete vase as the base image. Some mini-program renderers drop an
// SVG image when its entire contents are wrapped in a dynamic clipPath, which
// made the default vase disappear before any flowers were added.
const vaseBack = computed(() => props.material.category === 'vase' && props.material.sources.vase
  ? svgImageSource(props.material.sources.vase)
  : '')
const vaseFront = computed(() => vase.value ? svgImageSource(vase.value.front) : '')
const bouquet = computed(() => props.material.category === 'bouquet' ? bouquetLayers(props.material) : null)
const bouquetBack = computed(() => bouquet.value ? svgImageSource(bouquet.value.back) : '')
const bouquetFront = computed(() => bouquet.value ? svgImageSource(bouquet.value.front) : '')
</script>

<template>
  <view class="studio-container">
    <image v-if="!hideContainer && (bouquetBack || vaseBack)" :src="bouquetBack || vaseBack" :style="backImageStyle" mode="scaleToFill" />
    <slot />
    <image v-if="!hideContainer && bouquetFront" :src="bouquetFront" :style="frontImageStyle" mode="scaleToFill" />
    <image v-if="!hideContainer && vaseFront" :src="vaseFront" :style="frontImageStyle" mode="scaleToFill" />
  </view>
</template>

<style scoped>
.studio-container { position: absolute; top: 0; left: 0; width: 698px; height: 1000px; }
</style>
