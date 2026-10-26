import type { Point } from '@/models/artwork'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

export function useFlowerStudioLayout() {
  const device = uni.getSystemInfoSync()
  const unit = device.windowWidth / 750
  const navigationStatusTop = device.statusBarHeight || 0
  const capsule = uni.getMenuButtonBoundingClientRect?.() || { top: navigationStatusTop, height: 0 }
  const navigationHeight = capsule.height && capsule.top >= navigationStatusTop
    ? (capsule.top - navigationStatusTop) * 2 + capsule.height
    : 44
  const safeBottom = Math.max(0, device.screenHeight - (device.safeArea?.bottom ?? device.screenHeight))
  const pageActionsTop = navigationStatusTop + navigationHeight + 16 * unit
  const toolbarBottom = safeBottom + 16 * unit
  const stageTop = pageActionsTop + (96 + 16) * unit
  const stageBottom = toolbarBottom + (96 + 16) * unit
  const stageInset = 24 * unit
  const stageWidth = Math.max(0, device.windowWidth - stageInset * 2)
  const stageHeight = Math.max(0, device.windowHeight - stageTop - stageBottom)
  const scale = Math.min(stageWidth / studioMetrics.width, stageHeight / studioMetrics.height)
  const renderedWidth = studioMetrics.width * scale
  const renderedHeight = studioMetrics.height * scale
  const workspaceLeft = (stageWidth - renderedWidth) / 2
  const workspaceTop = Math.max(0, (stageHeight - renderedHeight) / 2 - 24 * unit)
  const offsetX = stageInset + workspaceLeft
  const offsetY = stageTop + workspaceTop
  const workspaceStyle = `left:${workspaceLeft}px;top:${workspaceTop}px;transform:scale(${scale});`
  function screenToWorkspace(point: Point): Point {
    return { x: (point.x - offsetX) / scale, y: (point.y - offsetY) / scale }
  }

  function workspaceToScreen(point: Point): Point {
    return { x: offsetX + point.x * scale, y: offsetY + point.y * scale }
  }

  return {
    device,
    unit,
    navigationStatusTop,
    navigationHeight,
    safeBottom,
    pageActionsTop,
    toolbarBottom,
    stageTop,
    stageBottom,
    stageInset,
    stageWidth,
    stageHeight,
    scale,
    offsetX,
    offsetY,
    workspaceStyle,
    screenToWorkspace,
    workspaceToScreen,
  }
}

export type FlowerStudioLayout = ReturnType<typeof useFlowerStudioLayout>
