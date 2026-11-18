<script setup lang="ts">
import type { MaterialInstance } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'

const props = withDefaults(defineProps<{ instance: MaterialInstance, material: CachedMaterial, dimmed?: boolean, revealDelay?: number }>(), { dimmed: false })
const height = computed(() => props.instance.transform.height + 55)
const color = computed(() => props.instance.color)
// 角度和位置只更新外层变换，不触发花材 SVG 重建。
const source = computed(() => svgImageSource(cloudPlantSvg(props.material, { color: color.value, transform: { height: height.value - 55 } })))
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
  <view class="flower-material" :class="{ 'flower-material-dimmed': dimmed }" :style="outerStyle">
    <view class="flower-material-instance" :style="instanceStyle">
      <image class="plant-image" :class="{ 'plant-revealing': revealDelay !== undefined }" :src="source" mode="scaleToFill" :style="`width:110px;height:${height}px;animation-delay:${revealDelay || 0}ms;`" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.flower-material { position: absolute; width: 110px; transform-origin: 50% 100%; pointer-events: none; transition: opacity .16s ease; }
.flower-material-dimmed { opacity: .18; }
.flower-material-instance { position: absolute; inset: 0; width: 110px; height: 100%; pointer-events: none; }
.plant-image { position: absolute; left: 0; top: 0; pointer-events: none; }
.plant-revealing { transform-origin: 50% 100%; animation: stem-arrive .8s cubic-bezier(.2,.65,.3,1) both; }
@keyframes stem-arrive { from { opacity: 0; transform: translateY(28px) scale(.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) { .plant-revealing { animation: none; } }
</style>
