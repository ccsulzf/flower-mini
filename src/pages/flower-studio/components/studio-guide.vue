<script setup lang="ts">
import type { FlowerGuideTarget } from '@/models/flower-guide'
import { computed } from 'vue'
import type { StudioGuideStep } from '../composables/useStudioGuide'

const props = defineProps<{ step: StudioGuideStep, target: FlowerGuideTarget | null, windowWidth: number, windowHeight: number }>()
const spotlight = computed(() => {
  const target = props.target
  if (!target || target.step !== props.step)
    return null
  const padding = 6
  const left = Math.max(0, target.left - padding)
  const top = Math.max(0, target.top - padding)
  const right = Math.min(props.windowWidth, target.left + target.width + padding)
  const bottom = Math.min(props.windowHeight, target.top + target.height + padding)
  if (right <= left || bottom <= top)
    return null
  return { left, top, right, bottom, width: right - left, height: bottom - top }
})
const holeStyle = computed(() => spotlight.value ? {
  left: `${spotlight.value.left}px`, top: `${spotlight.value.top}px`,
  width: `${spotlight.value.width}px`, height: `${spotlight.value.height}px`,
} : {})
const note = computed(() => {
  const box = spotlight.value
  if (!box || !props.target)
    return null
  const unit = props.windowWidth / 750
  const width = Math.min(300 * unit, props.windowWidth - 32 * unit)
  const height = 120 * unit
  const gap = 24 * unit
  let left = box.left
  let top = box.top - gap - height
  let arrow = '↓'
  if (props.target.placement === 'right' && props.windowWidth - box.right >= width + gap) {
    left = box.right + gap
    top = box.top + 8 * unit
    arrow = '←'
  }
  else if (props.target.placement === 'below' || top < 16 * unit) {
    top = box.bottom + gap
    arrow = '↑'
  }
  left = Math.max(16 * unit, Math.min(left, props.windowWidth - width - 16 * unit))
  top = Math.max(16 * unit, Math.min(top, props.windowHeight - height - 16 * unit))
  return { arrow, style: { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` } }
})
</script>

<template>
  <view class="guide-spotlight-layer">
    <template v-if="spotlight">
      <view class="guide-hole" :style="holeStyle"><view class="guide-hole-outline" /></view>
      <view class="guide-blocker" :style="{ top: '0px', left: '0px', width: `${windowWidth}px`, height: `${spotlight.top}px` }" @touchmove.stop.prevent @click.stop />
      <view class="guide-blocker" :style="{ top: `${spotlight.bottom}px`, left: '0px', width: `${windowWidth}px`, height: `${windowHeight - spotlight.bottom}px` }" @touchmove.stop.prevent @click.stop />
      <view class="guide-blocker" :style="{ top: `${spotlight.top}px`, left: '0px', width: `${spotlight.left}px`, height: `${spotlight.height}px` }" @touchmove.stop.prevent @click.stop />
      <view class="guide-blocker" :style="{ top: `${spotlight.top}px`, left: `${spotlight.right}px`, width: `${windowWidth - spotlight.right}px`, height: `${spotlight.height}px` }" @touchmove.stop.prevent @click.stop />
      <view v-if="note" class="guide-label" :style="note.style" role="status"><text class="guide-arrow">{{ note.arrow }}</text><text>{{ target?.text }}</text></view>
    </template>

  </view>
</template>

<style scoped lang="scss">
.guide-spotlight-layer { position:absolute; top:0; right:0; bottom:0; left:0; z-index:25; pointer-events:none; }
.guide-hole { position:absolute; box-sizing:border-box; border:3rpx solid #8a9975; border-radius:47% 53% 46% 54%; box-shadow:0 0 0 3000rpx rgba(56,49,40,.48); }
.guide-hole-outline { position:absolute; top:3rpx; right:-4rpx; bottom:-3rpx; left:2rpx; border:1rpx solid #c4caaa; border-radius:54% 46% 52% 48%; transform:rotate(-2deg); }
.guide-blocker { position:absolute; pointer-events:auto; }
.guide-label { position:absolute; display:flex; align-items:center; box-sizing:border-box; padding:14rpx 18rpx; border:1rpx solid #d2c7b3; border-radius:6rpx 12rpx 8rpx 5rpx; background:#fff9ec; box-shadow:3rpx 4rpx 0 rgba(110,94,69,.12); color:#625948; font-family:STKaiti,KaiTi,serif; font-size:25rpx; line-height:1.5; }
.guide-arrow { flex-shrink:0; color:#7a8c68; margin-right:10rpx; }
</style>
