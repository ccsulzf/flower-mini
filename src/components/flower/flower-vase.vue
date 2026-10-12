<script setup lang="ts">
import type { VaseName } from '@/utils/flower/artwork'
import { computed, ref, watch } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { bouquetLayers, svgImageSource, vasePlacement } from '@/utils/flower/material-render'
import FlowerBouquet from './flower-bouquet.vue'
const props = defineProps<{ vase: VaseName, materialId?: string, revision?: string, layer?: 'back' | 'front' }>()
const catalog = useFlowerCatalogStore()
const material = computed(() => props.materialId && props.revision ? catalog.get(props.materialId, props.revision) : undefined)
const imageFailed = ref(false)
const source = computed(() => {
  if (props.layer === 'back' && material.value?.category !== 'bouquet') return ''
  if (material.value?.category === 'bouquet') return svgImageSource(bouquetLayers(material.value)[props.layer === 'back' ? 'back' : 'front'])
  const svg = material.value?.sources.vase || material.value?.sources.bouquet
  return svg ? svgImageSource(svg) : ''
})
watch(source, () => { imageFailed.value = false })
const imageStyle = computed(() => {
  if (!material.value) return ''
  const p = vasePlacement(material.value)
  return `position:absolute;left:${p.x}rpx;top:${p.y}rpx;width:${p.width}rpx;height:${p.height}rpx;pointer-events:none;`
})
</script>
<template>
  <image v-if="materialId && source && !imageFailed" :src="source" :style="imageStyle" mode="scaleToFill" @error="imageFailed = true" />
  <view v-else-if="materialId && layer !== 'back'" class="vase-missing">容器素材不可用</view>
  <FlowerBouquet v-else-if="vase === '花束' && layer !== 'back'" />
  <template v-else-if="layer !== 'back'">
    <view class="studio-vase-shadow" />
    <view class="studio-vase" :class="{ 'vase-glass': vase === '玻璃瓶', 'vase-round': vase === '圆花器' }"><view class="vase-mouth" /><view class="vase-light" /></view>
  </template>
</template>
<style scoped lang="scss">
.vase-missing { position: absolute; left: 280rpx; top: 747rpx; color: #b82b36; font-size: 22rpx; }
.studio-vase-shadow { position: absolute; left: 242rpx; top: 895rpx; width: 218rpx; height: 30rpx; border-radius: 50%; background: radial-gradient(ellipse, rgba(0,0,0,.22), transparent 70%); pointer-events: none; }
.studio-vase { position: absolute; width: 140rpx; height: 170rpx; left: 280rpx; top: 735rpx; border-radius: 12% 12% 19% 19%; background: linear-gradient(100deg, #e6e2d7, #dedacf 58%, #cdc9bd); pointer-events: none; }
.vase-mouth { position: absolute; left: 0; top: -6rpx; width: 100%; height: 17rpx; background: #84917b; border: 3rpx solid #ece8dc; border-radius: 50%; box-sizing: border-box; }
.vase-light { position: absolute; left: 19rpx; top: 25rpx; width: 5rpx; height: 102rpx; border-radius: 50%; background: #fff; opacity: .1; }
.vase-glass { background: linear-gradient(90deg,rgba(126,164,158,.5),rgba(225,240,229,.25),rgba(121,158,151,.5)); border: 1rpx solid #a5bcb2; box-sizing: border-box; }.vase-glass .vase-mouth { border-color: #cbd9cf; }
.vase-round { width: 180rpx; height: 140rpx; left: 260rpx; top: 765rpx; border-radius: 42% 42% 45% 45%; background: linear-gradient(90deg,#bfa18f,#e5cbbc,#c4a18d); }.vase-round .vase-mouth { width: 90rpx; left: 45rpx; }
</style>
