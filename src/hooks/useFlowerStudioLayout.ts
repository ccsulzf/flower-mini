import type { Ref } from 'vue'
import type { Stem, VaseName } from '@/models/artwork'
import { computed } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

export function useFlowerStudioLayout(_selected: Ref<Stem | undefined>, _vase: Ref<VaseName>, _arrangementOffset?: Ref<number>, navigationInset = 0) {
  const device = uni.getSystemInfoSync()
  const unit = device.windowWidth / 750
  const safeBottom = Math.max(0, device.screenHeight - (device.safeArea?.bottom ?? device.screenHeight))
  // 画板按设备可用高度整体适配，拖动位移使用同一倍率，短屏也不会截掉长花枝。
  // navigationInset 由页面提供，包含自定义导航和状态栏所需高度。
  const pageActionsTop = navigationInset + 16 * unit
  const toolbarBottom = safeBottom + 16 * unit
  const stageTop = pageActionsTop + (96 + 16) * unit
  const stageBottom = toolbarBottom + (96 + 16) * unit
  const stageHeight = Math.max(0, device.windowHeight - stageTop - stageBottom)
  const boardScale = computed(() => Math.min(1, stageHeight / (studioMetrics.height * unit)))
  const boardPosition = computed(() => {
    const spareHeight = Math.max(0, stageHeight - studioMetrics.height * unit * boardScale.value)
    // 长屏将作品略上移；只使用空余空间，短屏仍完整显示长花枝。
    const lift = Math.min(64 * unit, spareHeight / 4)
    return {
      left: (device.windowWidth - studioMetrics.width * unit * boardScale.value) / 2,
      top: stageTop + spareHeight / 2 - lift,
    }
  })
  const artworkStyle = computed(() => `left:${boardPosition.value.left}px;top:${boardPosition.value.top - stageTop}px;transform:scale(${boardScale.value});`)

  // 固定在底部工具区上方，不随花头移动，也不遮挡相邻花朵。
  const flowerToolsStyle = computed(() => ({
    left: `${26 * unit}px`,
    width: `${device.windowWidth - 52 * unit}px`,
    bottom: `${stageBottom}px`,
  }))

  return { device, unit, safeBottom, pageActionsTop, toolbarBottom, stageTop, stageBottom, boardScale, boardPosition, artworkStyle, flowerToolsStyle }
}
