<script setup lang="ts">
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { anchorY, type Stem, type VaseName } from '@/utils/flower/artwork'
import FlowerInstance from './flower-stem.vue'
import FlowerVase from './flower-vase.vue'
import type { StudioTouchEvent } from '@/models/artwork'
defineProps<{ stems: Stem[], vase: VaseName, selectedId: number | null, hideVase?: boolean, vaseMaterialId?: string, vaseMaterialRevision?: string }>()
const emit = defineEmits<{ start: [event: StudioTouchEvent, stem: Stem], move: [event: StudioTouchEvent], end: [cancelled: boolean], clear: [] }>()
</script>
<template>
  <view @tap="emit('clear')" class="studio-board" :style="{ width: `${studioMetrics.width}rpx`, height: `${studioMetrics.height}rpx` }">
    <FlowerInstance v-for="stem in stems" :key="stem.id" :stem="stem" :anchor="anchorY(vase)" :selected="selectedId === stem.id" @start="emit('start', $event, stem)" @move="emit('move', $event)" @end="emit('end', $event)" />
    <FlowerVase v-if="!hideVase" :vase="vase" :material-id="vaseMaterialId" :revision="vaseMaterialRevision" />
    <view v-if="!stems.length" class="studio-empty"><text>从一枝花开始</text><text class="empty-hint">在下方选择喜欢的花材</text></view>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.studio-board { position: relative; width: 698rpx; height: 1000rpx; }
.studio-empty { position: absolute; top: 300rpx; width: 100%; text-align: center; color: $studio-muted; font-size: 30rpx; letter-spacing: 3rpx; pointer-events: none; }.empty-hint { display: block; margin-top: 20rpx; font-size: 22rpx; letter-spacing: 1rpx; }
</style>
