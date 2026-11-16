<script setup lang="ts">
import type { StudioTab } from '../studio-types'
import type { FlowerStudioLayout } from '@/hooks/useFlowerStudioLayout'
import type { MaterialInstance } from '@/models/artwork'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  uid: string
  debugReplay?: boolean
  generationOpen: boolean
  eligible: boolean
  visible: boolean
  materials: MaterialInstance[]
  layout: FlowerStudioLayout
  targets: Record<string, { left: number, top: number, width: number, height: number }>
  activeTab: StudioTab | null
}>()
const emit = defineEmits<{ focusWorkspace: [] }>()
const steps = [
  { title: '先选一枝喜欢的花', note: '点「花材」，选一枝花。' },
  { title: '试着挪一挪花朵', note: '拖动花朵，调整方向和高低。' },
  { title: '也可以用一句话生花', note: '点「生花」，让一句心情开成花。' },
]
const step = ref(0)
const dismissed = ref(true)
let checkedUid = ''
const showing = computed(() => props.visible && props.eligible && !dismissed.value)
const current = computed(() => steps[step.value])
watch(() => props.generationOpen, (open) => {
  if (open && props.eligible && !dismissed.value && step.value === steps.length - 1)
    dismiss()
})
watch(step, (value) => {
  if (showing.value && value > 0)
    emit('focusWorkspace')
})
watch(() => [props.uid, props.eligible] as const, ([uid, eligible]) => {
  if (!uid || !eligible || uid === checkedUid)
    return
  checkedUid = uid
  step.value = 0
  if (props.debugReplay) {
    dismissed.value = false
    return
  }
  try {
    dismissed.value = Boolean(uni.getStorageSync(`flower-studio-guide-v1:${uid}`))
  }
  catch {
    // 无法读取记录时不打断创作。
    dismissed.value = true
  }
}, { immediate: true })
watch(() => props.materials.length, (count, previous) => {
  if (showing.value && step.value === 0 && count > previous)
    step.value = 1
})
watch(() => props.materials.map(item => ({
  id: item.id,
  pose: `${item.transform.anchor.x},${item.transform.anchor.y},${item.transform.angle},${item.transform.height}`,
})), (items, previous) => {
  const moved = items.some(item => previous.some(old => old.id === item.id && old.pose !== item.pose))
  if (showing.value && step.value === 1 && moved)
    step.value = 2
})

const focus = computed(() => {
  const { layout, targets } = props
  const unit = layout.unit
  const toolbarWidth = layout.device.windowWidth - 76 * unit
  // 查询尚未返回时，按工具栏的固定尺寸定位，避免高亮闪到屏幕原点。
  const slotWidth = (toolbarWidth - (32 + 40 + 11) * unit) / 5.15
  const generate = { left: 54 * unit, top: layout.device.windowHeight - layout.toolbarBottom - 78 * unit, width: slotWidth * 1.15, height: 60 * unit }
  const flowers = { ...generate, left: generate.left + generate.width + 21 * unit, width: slotWidth }
  const stage = { left: layout.stageInset, top: layout.stageTop, width: layout.stageWidth, height: layout.stageHeight }
  const rect = step.value === 2
    ? targets.generate || generate
    : step.value === 1
      ? targets.arrange || stage
      : props.activeTab === 'flowers' && targets.panel ? targets.panel : targets.flowers || flowers
  const left = Math.max(4, rect.left - 5)
  const top = Math.max(4, rect.top - 5)
  return {
    left,
    top,
    width: Math.max(0, Math.min(rect.width + 10, layout.device.windowWidth - left - 4)),
    height: Math.max(0, Math.min(rect.height + 10, layout.device.windowHeight - top - 4)),
  }
})
const focusStyle = computed(() => ({ left: `${focus.value.left}px`, top: `${focus.value.top}px`, width: `${focus.value.width}px`, height: `${focus.value.height}px` }))
const paperTop = computed(() => {
  const height = 240 * props.layout.unit
  const above = focus.value.top - height - 16
  return Math.max(props.layout.navigationStatusTop + props.layout.navigationHeight, Math.min(above, props.layout.device.windowHeight - props.layout.toolbarBottom - 88 * props.layout.unit - height - 18))
})
const masks = computed(() => {
  const { left, top, width, height } = focus.value
  const screenWidth = props.layout.device.windowWidth
  const screenHeight = props.layout.device.windowHeight
  return [
    { left: 0, top: 0, width: screenWidth, height: top },
    { left: 0, top, width: left, height },
    { left: left + width, top, width: Math.max(0, screenWidth - left - width), height },
    { left: 0, top: top + height, width: screenWidth, height: Math.max(0, screenHeight - top - height) },
  ].map(rect => ({ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }))
})

function dismiss() {
  dismissed.value = true
  if (props.debugReplay)
    return
  try {
    uni.setStorageSync(`flower-studio-guide-v1:${props.uid}`, true)
  }
  catch {
    // 本次仍然结束引导，不影响作品和草稿。
  }
}
function next() {
  if (step.value === steps.length - 1)
    dismiss()
  else
    step.value++
}
</script>

<template>
  <view v-if="showing" class="guide-layer">
    <view v-for="(mask, index) in masks" :key="index" class="guide-mask" :style="mask" />
    <view class="guide-focus" :style="focusStyle" />
    <view class="guide-paper" :style="{ top: `${paperTop}px` }" role="status">
      <view class="guide-heading">
        <text class="guide-title">
          {{ current.title }}
        </text>
        <button class="guide-skip" @tap="dismiss">
          跳过引导
        </button>
      </view>
      <text class="guide-note">
        {{ current.note }}
      </text>
      <view class="guide-footer">
        <text>{{ step + 1 }} / {{ steps.length }}</text>
        <button class="guide-next" @tap="next">
          {{ step === steps.length - 1 ? '开始自由创作' : '下一步' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.guide-layer { position: fixed; z-index: 12; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; }
.guide-mask { position: absolute; background: rgba(48, 54, 43, .48); pointer-events: none; }
.guide-focus { position: absolute; box-sizing: border-box; border: 3rpx solid var(--app-sage); border-radius: 10rpx 15rpx 9rpx 13rpx; box-shadow: 0 0 0 4rpx rgba(var(--app-surface-rgb), .8); pointer-events: none; }
.guide-paper { pointer-events: auto; box-sizing: border-box; height: 240rpx; position: absolute; z-index: 8; right: 38rpx; left: 38rpx; padding: 18rpx 24rpx; border: 1rpx solid var(--app-line); border-radius: 4rpx 8rpx 5rpx 3rpx; background: var(--app-surface); color: var(--app-ink); box-shadow: 3rpx 4rpx 0 rgba(var(--app-ink-rgb), .06); }
.guide-heading, .guide-footer { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.guide-title { font-family: STSong, SimSun, serif; font-size: 28rpx; }
.guide-note { display: block; margin: 4rpx 0 8rpx; color: var(--app-inkMuted); font-size: 24rpx; line-height: 1.7; }
.guide-footer { color: var(--app-inkMuted); font-size: 21rpx; }
.guide-skip, .guide-next { min-width: 140rpx; height: 72rpx; margin: 0; padding: 0 12rpx; background: transparent; color: var(--app-brandStrong); font-size: 23rpx; line-height: 72rpx; }
.guide-skip { color: var(--app-inkMuted); }
.guide-next { border: 1rpx solid var(--app-sage); border-radius: 8rpx 16rpx 11rpx 14rpx; background: var(--app-page); }
.guide-next:active { transform: translateY(2rpx); }
.guide-skip::after, .guide-next::after { border: 0; }
</style>
