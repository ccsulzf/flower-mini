<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import type { Stem } from '@/utils/flower/artwork'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'
import { plantSvgSource } from '@/utils/flower/svg-artwork'

const props = defineProps<{ stem: Stem, anchor: number }>()
const catalog = useFlowerCatalogStore()
const cloudMaterial = computed(() => props.stem.materialId ? catalog.get(props.stem.materialId) : undefined)
const cloudSource = computed(() => {
  if (!cloudMaterial.value)
    return ''
  try { return svgImageSource(cloudPlantSvg(cloudMaterial.value, props.stem)) }
  catch { return '' }
})
const plantSource = computed(() => props.stem.materialId ? cloudSource.value : plantSvgSource(props.stem.kind, props.stem.color, props.stem.stemHeight))
const svgFailed = ref(false)
const usesSvgPlant = computed(() => Boolean(plantSource.value && !svgFailed.value))
watch(plantSource, () => { svgFailed.value = false })
// 小程序 WXML 对对象形式的 :style 表达式解析不稳定，统一输出 CSS 字符串。
const studioStemStyle = computed(() => `left:${props.stem.x}rpx;top:${props.anchor}rpx;height:${props.stem.stemHeight + 55}rpx;transform:translate(-50%, -100%) rotate(${props.stem.angle}deg);`)
const flowerInstanceStyle = computed(() => `transform:scale(${props.stem.mirrored ? -props.stem.flowerScale : props.stem.flowerScale}, ${props.stem.flowerScale});transform-origin:55rpx ${props.stem.stemHeight + 55}rpx;`)
const plantImageStyle = computed(() => `width:110rpx;height:${props.stem.stemHeight + 55}rpx;`)
</script>

<template>
  <!-- 花头与花茎共享瓶口固定点，不分层绘制，防止拖动分离。 -->
  <view class="studio-stem" :style="studioStemStyle">
    <!-- 每一枝花材都是一个完整实例：花头、花茎和选中框共享同一变换。 -->
    <view class="flower-instance" :style="flowerInstanceStyle">
      <image v-if="usesSvgPlant" class="plant-image" :src="plantSource" mode="scaleToFill" :style="plantImageStyle" @error="svgFailed = true" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.studio-stem { position: absolute; width: 110rpx; height: 260rpx; transform-origin: 50% 100%; pointer-events: none; }
.flower-instance { position: absolute; inset: 0; width: 110rpx; height: 100%; pointer-events: none; }
.plant-image { position: absolute; left: 0; top: 0; pointer-events: none; }
</style>
