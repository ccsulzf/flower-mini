<script setup lang="ts">
import type { MaterialInstance, StudioTouchEvent } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'

const props = defineProps<{ instance: MaterialInstance, material: CachedMaterial, selected: boolean }>()
const emit = defineEmits<{ start: [event: StudioTouchEvent], move: [event: StudioTouchEvent], end: [cancelled: boolean] }>()
const isFoliage = computed(() => props.instance.group === 'foliage')
const height = computed(() => props.instance.transform.height + 55)
const outerStyle = computed(() => {
  const { anchor, angle } = props.instance.transform
  return `left:${anchor.x}px;top:${anchor.y}px;height:${height.value}px;transform:translate(-50%, -100%) rotate(${angle}deg);`
})
const instanceStyle = computed(() => {
  const { mirrored, scale } = props.instance.transform
  return `transform:scale(${mirrored ? -scale : scale}, ${scale});transform-origin:55px ${height.value}px;`
})
const touchAreaStyle = computed(() => isFoliage.value ? `height:${height.value + 24}px;` : '')
</script>

<template>
  <view class="material-control" :style="outerStyle">
    <view class="material-control-instance" :style="instanceStyle">
      <view
        class="material-touch"
        :class="{ 'foliage-touch': isFoliage }"
        :style="touchAreaStyle"
        @tap.stop
        @touchstart.stop="emit('start', $event)"
        @touchmove.stop.prevent="emit('move', $event)"
        @touchend.stop="emit('end', false)"
        @touchcancel.stop="emit('end', true)"
      >
        <view v-if="selected" class="material-outline" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.material-control { position: absolute; width: 110px; transform-origin: 50% 100%; pointer-events: none; }
.material-control-instance { position: absolute; inset: 0; width: 110px; height: 100%; pointer-events: none; }
.material-touch { position: absolute; left: -12px; top: -12px; width: 134px; height: 134px; border-radius: 50%; pointer-events: auto; }
.foliage-touch { border-radius: 12px; }
.material-outline { position: absolute; inset: 8px; border: 2px dashed rgba(101, 119, 90, .72); border-radius: 50%; pointer-events: none; }
.foliage-touch .material-outline { border-radius: 12px; }
</style>
