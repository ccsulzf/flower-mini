<script setup lang="ts">
import type { VaseName } from '@/utils/flower/artwork'
import { computed, ref, watch } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { bouquetLayers, svgImageSource, vasePlacement } from '@/utils/flower/material-render'

const props = defineProps<{ vase: VaseName, materialId?: string, layer?: 'back' | 'front' }>()
const catalog = useFlowerCatalogStore()
const material = computed(() => props.materialId ? catalog.get(props.materialId) : undefined)
const imageFailed = ref(false)
const source = computed(() => {
  if (props.layer === 'back' && material.value?.category !== 'bouquet')
    return ''
  if (material.value?.category === 'bouquet')
    return svgImageSource(bouquetLayers(material.value)[props.layer === 'back' ? 'back' : 'front'])
  const svg = material.value?.sources.vase || material.value?.sources.bouquet
  return svg ? svgImageSource(svg) : ''
})
watch(source, () => { imageFailed.value = false })
const imageStyle = computed(() => {
  if (!material.value)
    return ''
  const p = vasePlacement(material.value)
  return `position:absolute;left:${p.x}rpx;top:${p.y}rpx;width:${p.width}rpx;height:${p.height}rpx;pointer-events:none;`
})
</script>

<template>
  <image v-if="materialId && source && !imageFailed" :src="source" :style="imageStyle" mode="scaleToFill" @error="imageFailed = true" />
</template>
