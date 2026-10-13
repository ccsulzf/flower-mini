import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

export const useFlowerStudioLayoutStore = defineStore('flowerStudioLayout', () => {
  const device = uni.getSystemInfoSync()
  const navigationStatusTop = ref(device.statusBarHeight || 0)
  const navigationCapsule = uni.getMenuButtonBoundingClientRect?.() || { top: navigationStatusTop.value, height: 0 }
  const navigationHeight = ref(navigationCapsule.height && navigationCapsule.top >= navigationStatusTop.value
    ? (navigationCapsule.top - navigationStatusTop.value) * 2 + navigationCapsule.height
    : 44)
  const navigationInset = navigationStatusTop.value + navigationHeight.value
  const unit = ref(device.windowWidth / 750)
  const safeBottom = ref(Math.max(0, device.screenHeight - (device.safeArea?.bottom ?? device.screenHeight)))
  // 画板按设备可用高度整体适配，拖动位移使用同一倍率，短屏也不会截掉长花枝。
  const pageActionsTop = ref(navigationInset + 16 * unit.value)
  const toolbarBottom = ref(safeBottom.value + 16 * unit.value)
  const stageTop = ref(pageActionsTop.value + (96 + 16) * unit.value)
  const stageBottom = ref(toolbarBottom.value + (96 + 16) * unit.value)
  const stageHeight = Math.max(0, device.windowHeight - stageTop.value - stageBottom.value)
  const boardScale = computed(() => Math.min(1, stageHeight / (studioMetrics.height * unit.value)))
  const boardPosition = computed(() => {
    const spareHeight = Math.max(0, stageHeight - studioMetrics.height * unit.value * boardScale.value)
    // 长屏将作品略上移；只使用空余空间，短屏仍完整显示长花枝。
    const lift = Math.min(64 * unit.value, spareHeight / 4)
    return {
      left: (device.windowWidth - studioMetrics.width * unit.value * boardScale.value) / 2,
      top: stageTop.value + spareHeight / 2 - lift,
    }
  })
  const artworkStyle = computed(() => `left:${boardPosition.value.left}px;top:${boardPosition.value.top - stageTop.value}px;transform:scale(${boardScale.value});`)
  const flowerToolsStyle = computed(() => ({
    left: `${26 * unit.value}px`,
    width: `${device.windowWidth - 52 * unit.value}px`,
    bottom: `${stageBottom.value}px`,
  }))

  return { device, unit, navigationStatusTop, navigationHeight, safeBottom, pageActionsTop, toolbarBottom, stageTop, stageBottom, boardScale, boardPosition, artworkStyle, flowerToolsStyle }
})
