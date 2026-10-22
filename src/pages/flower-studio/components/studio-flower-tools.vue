<script setup lang="ts">
import type { MaterialInstance } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { computed, ref } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

interface SliderEvent { detail: { value: number } }
const props = defineProps<{ instance: MaterialInstance, material: CachedMaterial, colorsOpen: boolean, canMoveBackward: boolean, canMoveForward: boolean }>()
const emit = defineEmits<{
  close: []
  color: [value: string]
  toggleColors: []
  mirror: []
  adjacent: [direction: 'previous' | 'next']
  layer: [direction: 'forward' | 'backward']
  duplicate: []
  remove: []
  controlStart: []
  control: [field: 'angle' | 'height' | 'scale', value: number]
  controlEnd: []
}>()
const colors = computed(() => props.material.colors.map(color => color.value))
const controlActive = ref(false)
function beginControl() { if (!controlActive.value) { controlActive.value = true; emit('controlStart') } }
function changeControl(field: 'angle' | 'height' | 'scale', event: SliderEvent) { beginControl(); emit('control', field, field === 'scale' ? event.detail.value / 100 : event.detail.value) }
function endControl() { if (controlActive.value) { controlActive.value = false; emit('controlEnd') } }
</script>

<template>
  <view class="flower-tools" @tap.stop @touchmove.stop>
    <view class="tools-heading"><text class="flower-name">{{ material.name }}</text><button class="close-tools" aria-label="关闭花材调整" @click="emit('close')"><view class="i-carbon-close" /></button></view>
    <view class="tools-actions">
      <button v-if="colors.length" class="color-button" :class="{ 'tool-active': colorsOpen }" @click="emit('toggleColors')"><view class="current-color" :style="`background-color:${instance.color};`" /><text>颜色</text></button>
      <button class="icon-button" aria-label="左右镜像" :aria-pressed="instance.transform.mirrored" @click="emit('mirror')"><view class="i-carbon-reflect-horizontal" /></button>
      <button :disabled="!canMoveBackward" @click="emit('layer', 'backward')">后移</button>
      <button :disabled="!canMoveForward" @click="emit('layer', 'forward')">前移</button>
      <button class="icon-button" aria-label="复制花材" @click="emit('duplicate')"><view class="i-carbon-copy" /></button>
      <button class="icon-button remove-button" aria-label="删除花材" @click="emit('remove')"><view class="i-carbon-trash-can" /></button>
    </view>
    <view class="material-controls">
      <view class="material-control"><text class="control-label">位置</text><slider class="control-slider" min="-65" max="65" :value="Math.round(instance.transform.angle)" block-size="18" active-color="#879b79" background-color="#dfe3d7" @touchstart="beginControl" @changing="changeControl('angle', $event)" @change="changeControl('angle', $event); endControl()" @touchend="endControl" /></view>
      <view class="material-control"><text class="control-label">高度</text><slider class="control-slider" :min="studioMetrics.minMaterialHeight" :max="studioMetrics.maxMaterialHeight" :value="Math.round(instance.transform.height)" block-size="18" active-color="#879b79" background-color="#dfe3d7" @touchstart="beginControl" @changing="changeControl('height', $event)" @change="changeControl('height', $event); endControl()" @touchend="endControl" /></view>
      <view class="material-control"><text class="control-label">大小</text><slider class="control-slider" min="65" max="135" :value="Math.round(instance.transform.scale * 100)" block-size="18" active-color="#879b79" background-color="#dfe3d7" @touchstart="beginControl" @changing="changeControl('scale', $event)" @change="changeControl('scale', $event); endControl()" @touchend="endControl" /></view>
    </view>
    <view v-if="colorsOpen && colors.length" class="tools-colors"><button v-for="color in colors" :key="color" class="color-choice" :class="{ 'dot-picked': instance.color === color }" :aria-label="`选择花色 ${color}`" @click="emit('color', color)"><view class="color-dot" :style="`background-color:${color};`" /></button></view>
    <view class="material-navigation"><button @click="emit('adjacent', 'previous')">上一枝</button><text>切换重叠花材</text><button @click="emit('adjacent', 'next')">下一枝</button></view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.flower-tools { box-sizing: border-box; width: 100%; padding: 16rpx; border: 2rpx solid $studio-border; border-radius: 22rpx; background: $studio-panel; color: $studio-ink; box-shadow: 0 8rpx 24rpx rgba(0,0,0,.12); }
.tools-heading { display:flex; align-items:center; justify-content:space-between; height:52rpx; margin-bottom:12rpx; }.flower-name{font-size:28rpx;font-weight:500}.close-tools{display:flex;align-items:center;justify-content:center;width:60rpx;height:60rpx;padding:0;margin:0;background:transparent;color:$studio-muted}.close-tools view{width:24rpx;height:24rpx}
.tools-actions{display:flex;align-items:center;gap:8rpx}.tools-actions button{display:flex;align-items:center;justify-content:center;flex:1;min-width:0;height:72rpx;padding:0 4rpx;margin:0;font-size:23rpx;white-space:nowrap;border-radius:12rpx;background:$studio-secondary;color:$studio-ink}.tools-actions button[disabled]{opacity:.4}.tools-actions .icon-button{background:transparent}.icon-button view{width:26rpx;height:26rpx}.remove-button{color:#ae626b}.color-button{gap:6rpx}.current-color{width:22rpx;height:22rpx;border-radius:50%;border:1rpx solid rgba(63,70,61,.2)}.tool-active{background:$studio-accent!important}
.material-controls{display:flex;flex-direction:column;gap:4rpx;margin-top:14rpx;padding:8rpx 14rpx;border-radius:14rpx;background:$studio-secondary}.material-control{display:flex;align-items:center;min-height:54rpx}.control-label{width:72rpx;font-size:24rpx}.control-slider{flex:1;margin:0}.tools-colors{display:flex;align-items:center;flex-wrap:wrap;gap:8rpx;margin-top:12rpx}.color-choice{display:flex;align-items:center;justify-content:center;width:58rpx;height:58rpx;margin:0;padding:0;background:transparent;border:2rpx solid transparent;border-radius:50%}.color-dot{width:30rpx;height:30rpx;border-radius:50%;border:1rpx solid rgba(63,70,61,.15)}.dot-picked{border-color:$studio-muted}.material-navigation{display:flex;align-items:center;justify-content:space-between;margin-top:12rpx}.material-navigation text{font-size:23rpx;color:$studio-muted}.material-navigation button{padding:0 14rpx;margin:0;line-height:62rpx;font-size:24rpx;background:$studio-secondary;color:$studio-ink}.tools-actions button::after,.color-choice::after,.close-tools::after,.material-navigation button::after{border:none}
</style>
