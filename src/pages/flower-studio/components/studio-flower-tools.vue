<script setup lang="ts">
import type { MaterialInstance } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'

const props = defineProps<{ instance: MaterialInstance, material: CachedMaterial, colorsOpen: boolean, canMoveBackward: boolean, canMoveForward: boolean }>()
const emit = defineEmits<{
  color: [value: string]
  toggleColors: []
  mirror: []
  layer: [direction: 'forward' | 'backward']
  duplicate: []
  remove: []
}>()
const colors = computed(() => props.material.colors.map(color => color.value))
</script>

<template>
  <view class="flower-tools" @tap.stop @touchmove.stop>
    <view class="tools-actions">
      <button v-if="colors.length" class="tool-button color-button" :class="{ 'tool-active': colorsOpen }" @click="emit('toggleColors')"><view class="current-color" :style="`background-color:${instance.color};`" /><text>颜色</text></button>
      <button class="tool-button" :aria-pressed="instance.transform.mirrored" @click="emit('mirror')"><view class="tool-icon i-carbon-reflect-horizontal" /><text>镜像</text></button>
      <button class="tool-button" :disabled="!canMoveBackward" @click="emit('layer', 'backward')"><view class="tool-icon i-carbon-arrow-down" /><text>后移</text></button>
      <button class="tool-button" :disabled="!canMoveForward" @click="emit('layer', 'forward')"><view class="tool-icon i-carbon-arrow-up" /><text>前移</text></button>
      <button class="tool-button" @click="emit('duplicate')"><view class="tool-icon i-carbon-copy" /><text>复制</text></button>
      <button class="tool-button remove-button" @click="emit('remove')"><view class="tool-icon i-carbon-trash-can" /><text>删除</text></button>
    </view>
    <view v-if="colorsOpen && colors.length" class="tools-colors"><button v-for="color in colors" :key="color" class="color-choice" :class="{ 'dot-picked': instance.color === color }" :aria-label="`选择花色 ${color}`" @click="emit('color', color)"><view class="color-dot" :style="`background-color:${color};`" /></button></view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.flower-tools{display:flex;box-sizing:border-box;width:100%;flex-direction:column;gap:8rpx;color:$studio-ink}
.tools-actions{display:flex;align-items:center;justify-content:flex-end;gap:6rpx}.tool-button{display:flex;min-width:88rpx;height:64rpx;box-sizing:border-box;align-items:center;justify-content:center;flex:1;flex-direction:column;gap:3rpx;padding:0;margin:0;border:1rpx solid rgba(112,91,68,.17);border-radius:11rpx;background:rgba(248,243,233,.62);color:$studio-ink;font-size:18rpx;line-height:1;white-space:nowrap}.tool-button[disabled]{opacity:.38}.tool-icon{width:25rpx;height:25rpx}.remove-button{background:rgba(242,222,218,.72);color:#9f5c64}.color-button{gap:4rpx}.current-color{width:24rpx;height:24rpx;border:2rpx solid rgba(63,70,61,.2);border-radius:50%}.tool-active{background:$studio-accent!important;box-shadow:inset 0 -4rpx 0 rgba(126,145,113,.1)}
.tools-colors{display:flex;width:100%;min-height:74rpx;box-sizing:border-box;align-items:center;justify-content:flex-start;gap:10rpx;padding:8rpx 10rpx;border-top:1rpx solid rgba(112,91,68,.16);background:transparent}.color-choice{display:flex;width:58rpx;height:58rpx;flex-shrink:0;align-items:center;justify-content:center;margin:0;padding:0;background:transparent;border:2rpx solid transparent;border-radius:50%}.color-dot{width:36rpx;height:36rpx;border-radius:50%;border:1rpx solid rgba(63,70,61,.15)}.dot-picked{border-color:$studio-muted}.tool-button::after,.color-choice::after{border:none}
</style>
