<script setup lang="ts">
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'
import { bouquetLayers, svgImageSource, vasePlacement } from '@/utils/flower/material-render'

const props = defineProps<{ material: CachedMaterial, hideContainer?: boolean }>()
const placement = computed(() => vasePlacement(props.material))
const imageStyle = computed(() => {
  const value = placement.value
  return `position:absolute;left:${value.x}px;top:${value.y}px;width:${value.width}px;height:${value.height}px;pointer-events:none;`
})
const vaseSource = computed(() => props.material.sources.vase ? svgImageSource(props.material.sources.vase) : '')
const bouquet = computed(() => props.material.category === 'bouquet' ? bouquetLayers(props.material) : null)
const bouquetBack = computed(() => bouquet.value ? svgImageSource(bouquet.value.back) : '')
const bouquetFront = computed(() => bouquet.value ? svgImageSource(bouquet.value.front) : '')
</script>

<template>
  <image v-if="!hideContainer && bouquetBack" :src="bouquetBack" :style="imageStyle" mode="scaleToFill" />
  <slot />
  <image v-if="!hideContainer && bouquetFront" :src="bouquetFront" :style="imageStyle" mode="scaleToFill" />
  <image v-else-if="!hideContainer && vaseSource" :src="vaseSource" :style="imageStyle" mode="scaleToFill" />
</template>
