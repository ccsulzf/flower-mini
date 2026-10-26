<script setup lang="ts">
import type { MaterialInstance, StudioTouchEvent } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ instance: MaterialInstance, material: CachedMaterial, selected: boolean, interactive?: boolean, precision?: boolean }>(), { interactive: true, precision: false })
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
const touchAreaStyle = computed(() => isFoliage.value ? `height:${height.value + (props.precision ? 44 : 24)}px;` : '')
</script>

<template>
  <view class="material-control" :class="{ 'material-control-disabled': !interactive }" :style="outerStyle">
    <view class="material-control-instance" :style="instanceStyle">
      <view
        class="material-touch"
        :class="{ 'foliage-touch': isFoliage, 'precision-touch': precision }"
        :style="touchAreaStyle"
        @tap.stop
        @touchstart.stop="emit('start', $event)"
        @touchmove.stop.prevent="emit('move', $event)"
        @touchend.stop="emit('end', false)"
        @touchcancel.stop="emit('end', true)"
      >
        <view v-if="selected" class="material-outline" />
        <view v-if="selected" class="material-head-marker"><view class="material-head-marker-core" /></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.material-control { position: absolute; width: 110px; transform-origin: 50% 100%; pointer-events: none; }
.material-control-disabled .material-touch { pointer-events: none; }
.material-control-instance { position: absolute; inset: 0; width: 110px; height: 100%; pointer-events: none; }
.material-touch { position: absolute; left: -12px; top: -12px; width: 134px; height: 134px; border-radius: 50%; pointer-events: auto; }
.material-touch.precision-touch { left: -30px; top: -24px; width: 170px; height: 170px; }
.foliage-touch { border-radius: 12px; }
.material-outline { position: absolute; inset: 5px; border: 3px solid rgba(89, 112, 76, .88); border-radius: 50%; background: rgba(223, 230, 215, .12); box-shadow: 0 0 0 4px rgba(255, 253, 247, .72); pointer-events: none; }
.foliage-touch .material-outline { border-radius: 12px; }
.material-head-marker { position: absolute; z-index: 2; left: 50%; top: 0; width: 30px; height: 30px; transform: translate(-50%, -50%); border: 3px solid #fffdf7; border-radius: 50%; background: #718467; box-shadow: 0 3px 10px rgba(63, 70, 61, .28); pointer-events: none; }
.material-head-marker-core { position: absolute; inset: 9px; border-radius: 50%; background: #fffdf7; }
</style>
