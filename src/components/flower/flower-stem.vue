<script setup lang="ts">
import type { MaterialInstance } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'

const props = defineProps<{ instance: MaterialInstance, material: CachedMaterial }>()
const source = computed(() => svgImageSource(cloudPlantSvg(props.material, props.instance)))
const height = computed(() => props.instance.transform.height + 55)
const outerStyle = computed(() => {
  const { anchor, angle } = props.instance.transform
  return `left:${anchor.x}px;top:${anchor.y}px;height:${height.value}px;transform:translate(-50%, -100%) rotate(${angle}deg);`
})
const instanceStyle = computed(() => {
  const { mirrored, scale } = props.instance.transform
  return `transform:scale(${mirrored ? -scale : scale}, ${scale});transform-origin:55px ${height.value}px;`
})
</script>

<template>
  <view class="flower-material" :style="outerStyle">
    <view class="flower-material-instance" :style="instanceStyle">
      <image class="plant-image" :src="source" mode="scaleToFill" :style="`width:110px;height:${height}px;`" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.flower-material { position: absolute; width: 110px; transform-origin: 50% 100%; pointer-events: none; }
.flower-material-instance { position: absolute; inset: 0; width: 110px; height: 100%; pointer-events: none; }
.plant-image { position: absolute; left: 0; top: 0; pointer-events: none; }
</style>
