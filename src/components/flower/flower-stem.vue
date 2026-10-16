<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { curveFor, type Stem } from '@/utils/flower/artwork'
import { flowerConnectionY, plantSvgSource, stemSvgSource } from '@/utils/flower/svg-artwork'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'
import FlowerBloom from './flower-bloom.vue'
const props = defineProps<{ stem: Stem, anchor: number }>()
const catalog = useFlowerCatalogStore()
const cloudMaterial = computed(() => props.stem.materialId && props.stem.materialRevision ? catalog.get(props.stem.materialId, props.stem.materialRevision) : undefined)
const cloudSource = computed(() => {
  if (!cloudMaterial.value) return ''
  try { return svgImageSource(cloudPlantSvg(cloudMaterial.value, { ...props.stem, leafMode: 'without' })) } catch { return '' }
})
const curve = computed(() => curveFor(props.stem))
const svgSource = computed(() => stemSvgSource(props.stem.kind))
const plantSource = computed(() => props.stem.materialId ? cloudSource.value : plantSvgSource(props.stem.kind, props.stem.color, props.stem.stemHeight, true))
const svgFailed = ref(false)
const usesSvgPlant = computed(() => Boolean((props.stem.materialId ? cloudSource.value : svgSource.value) && !svgFailed.value))
watch(plantSource, () => { svgFailed.value = false })
// 小程序 WXML 对对象形式的 :style 表达式解析不稳定，统一输出 CSS 字符串。
const studioStemStyle = computed(() => `left:${props.stem.x}rpx;top:${props.anchor}rpx;height:${props.stem.stemHeight + 55}rpx;transform:translate(-50%, -100%) rotate(${props.stem.angle}deg);`)
const flowerInstanceStyle = computed(() => `transform:scale(${props.stem.mirrored ? -props.stem.flowerScale : props.stem.flowerScale}, ${props.stem.flowerScale});transform-origin:55rpx ${props.stem.stemHeight + 55}rpx;`)
// PNG 上方 55/260 是透明留白；裁剪后从花心 y=55 延伸到瓶口，不能沿用 SVG 的偏移。
const stemClipStyle = computed(() => `top:55rpx;height:${props.stem.stemHeight}rpx;`)
const stemImageStyle = computed(() => usesSvgPlant.value
  ? `top:${flowerConnectionY(props.stem.kind) + 50}rpx;height:${props.stem.stemHeight + 55 - flowerConnectionY(props.stem.kind)}rpx;`
  : `top:${-55 * props.stem.stemHeight / 205}rpx;height:${260 * props.stem.stemHeight / 205}rpx;`)
const plantImageStyle = computed(() => `width:110rpx;height:${props.stem.stemHeight + 55}rpx;`)
</script>
<template>
  <!-- 花头与花茎共享瓶口固定点，不分层绘制，防止拖动分离。 -->
  <view class="studio-stem" :style="studioStemStyle">
    <!-- 每一枝花材都是一个完整实例：花头、花茎、叶片和选中框共享同一变换。 -->
    <view class="flower-instance" :style="flowerInstanceStyle">
      <!-- SVG 使用整枝素材；PNG 单独裁掉透明留白，从花心连接到瓶口。 -->
      <image v-if="usesSvgPlant" class="plant-image" :src="plantSource" @error="svgFailed = true" mode="scaleToFill" :style="plantImageStyle" />
      <view v-else-if="!stem.materialId" class="stem-image-clip" :style="stemClipStyle">
        <image class="stem-image" :src="curve.image" @error="svgFailed = true" mode="scaleToFill" :style="stemImageStyle" />
      </view>
      <view class="flower-touch" :class="{ 'mum-touch': stem.kind === 'chrysanthemum' }">
        <view v-if="!usesSvgPlant && !stem.materialId" class="flower-art-position"><FlowerBloom :kind="stem.kind" :color="stem.color" /></view>
      </view>
    </view>
  </view>
</template>
<style scoped lang="scss">
.studio-stem { position: absolute; width: 110rpx; height: 260rpx; transform-origin: 50% 100%; pointer-events: none; }
.flower-instance { position: absolute; inset: 0; width: 110rpx; height: 100%; pointer-events: none; }
.plant-image { position: absolute; left: 0; top: 0; pointer-events: none; }
.stem-image-clip { position: absolute; left: 0; width: 110rpx; overflow: hidden; pointer-events: none; }
.stem-image { position: absolute; left: 0; top: 0; width: 110rpx; height: 260rpx; pointer-events: none; }
.side-leaf { position: absolute; top: 140rpx; width: 40rpx; height: 18rpx; background: #879b71; border-radius: 100% 0 100% 0; transform: rotate(-30deg); }
.flower-touch { position: absolute; left: -12rpx; top: -12rpx; width: 134rpx; height: 134rpx; border-radius: 50%; pointer-events: none; }
.flower-art-position { position: absolute; left: 12rpx; top: 12rpx; pointer-events: none; }
.mum-touch { width: 190rpx; height: 190rpx; left: -40rpx; top: -40rpx; }.mum-touch .flower-art-position { left: 40rpx; top: 40rpx; }
</style>
