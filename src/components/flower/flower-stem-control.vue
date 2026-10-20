<script setup lang="ts">
import { computed } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import type { Stem } from '@/utils/flower/artwork'

const props = defineProps<{ stem: Stem, anchor: number, selected: boolean }>()
const emit = defineEmits<{ start: [event: { touches: { clientX: number, clientY: number }[] }], move: [event: { touches: { clientX: number, clientY: number }[] }], end: [cancelled: boolean] }>()
const catalog = useFlowerCatalogStore()
const material = computed(() => props.stem.materialId ? catalog.get(props.stem.materialId) : undefined)
const isFoliage = computed(() => material.value ? material.value.group === 'foliage' : props.stem.kind === 'leaf')
const touchAreaStyle = computed(() => isFoliage.value ? `height:${props.stem.stemHeight + 79}rpx;` : '')
const stemControlStyle = computed(() => `left:${props.stem.x}rpx;top:${props.anchor}rpx;height:${props.stem.stemHeight + 55}rpx;transform:translate(-50%, -100%) rotate(${props.stem.angle}deg);`)
const instanceStyle = computed(() => `transform:scale(${props.stem.mirrored ? -props.stem.flowerScale : props.stem.flowerScale}, ${props.stem.flowerScale});transform-origin:55rpx ${props.stem.stemHeight + 55}rpx;`)
</script>

<template>
  <view class="stem-control" :style="stemControlStyle">
    <view class="stem-control-instance" :style="instanceStyle">
      <view
        class="flower-touch"
        :style="touchAreaStyle"
        :class="{ 'mum-touch': stem.kind === 'chrysanthemum', 'foliage-touch': isFoliage }"
        @tap.stop
        @touchstart.stop="emit('start', $event)"
        @touchmove.stop.prevent="emit('move', $event)"
        @touchend.stop="emit('end', false)"
        @touchcancel.stop="emit('end', true)"
      >
        <view v-if="selected" class="flower-outline" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.stem-control { position: absolute; width: 110rpx; transform-origin: 50% 100%; pointer-events: none; }
.stem-control-instance { position: absolute; inset: 0; width: 110rpx; height: 100%; pointer-events: none; }
.flower-touch { position: absolute; left: -12rpx; top: -12rpx; width: 134rpx; height: 134rpx; border-radius: 50%; pointer-events: auto; }
.mum-touch { width: 190rpx; height: 190rpx; left: -40rpx; top: -40rpx; }
.foliage-touch { border-radius: 12rpx; }
.flower-outline { position: absolute; inset: 8rpx; border: 2rpx dashed rgba(101, 119, 90, .72); border-radius: 50%; pointer-events: none; }
.foliage-touch .flower-outline { border-radius: 12rpx; }
</style>
