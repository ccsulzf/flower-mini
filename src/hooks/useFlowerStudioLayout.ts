import type { Ref } from 'vue'
import type { Stem, VaseName } from '@/models/artwork'
import { computed } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { anchorY } from '@/utils/flower/artwork'

export function useFlowerStudioLayout(selected: Ref<Stem | undefined>, vase: Ref<VaseName>) {
  const device = uni.getSystemInfoSync()
  const unit = device.windowWidth / 750
  const safeBottom = Math.max(0, device.screenHeight - (device.safeArea?.bottom ?? device.screenHeight))
  // 画板按设备可用高度整体适配，拖动位移使用同一倍率，短屏也不会截掉长花枝。
  // 原生导航已在 windowHeight 外部，页面内只预留工具栏和紧凑间距。
  const pageActionsTop = 16 * unit
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

  // 编辑面板跟随当前花头，放在花头上方；位置只依赖整枝的真实变换。
  const flowerToolsStyle = computed(() => {
    if (!selected.value)
      return {}
    const stem = selected.value
    const scale = unit * boardScale.value
    const radians = stem.angle * Math.PI / 180
    const { left: boardLeft, top: boardTop } = boardPosition.value
    const visualHeight = (stem.stemHeight + 55) * stem.flowerScale
    const x = boardLeft + (stem.x + Math.sin(radians) * visualHeight) * scale
    const flowerTop = boardTop + (anchorY(vase.value) - Math.cos(radians) * visualHeight) * scale
    const width = Math.min(520 * unit, device.windowWidth - 24)
    // 始终按展开色板后的高度定位，展开、收起或换色不重新切换上下位置。
    const height = (stem.materialId ? 420 : 220) * unit
    const bloomHeight = (stem.kind === 'chrysanthemum' ? 190 : 140) * stem.flowerScale * scale
    const headPadding = (stem.kind === 'chrysanthemum' ? 40 : 16) * stem.flowerScale * scale
    const aboveTop = flowerTop - headPadding - height - 12
    const belowTop = flowerTop + bloomHeight + 12
    const maxTop = device.windowHeight - stageBottom - height
    const top = aboveTop >= stageTop
      ? aboveTop
      : belowTop <= maxTop
        ? belowTop
        : Math.max(stageTop, Math.min(maxTop, aboveTop))
    return {
      width: `${width}px`,
      left: `${Math.max(12, Math.min(device.windowWidth - width - 12, x - width / 2))}px`,
      top: `${top}px`,
    }
  })

  return { device, unit, safeBottom, pageActionsTop, toolbarBottom, stageTop, stageBottom, boardScale, boardPosition, artworkStyle, flowerToolsStyle }
}
