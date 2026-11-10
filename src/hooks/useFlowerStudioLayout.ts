import type { Point } from '@/models/artwork'
import { onReady, onResize, onShow, onUnload } from '@dcloudio/uni-app'
import { getCurrentInstance, nextTick, reactive } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

interface StageBounds {
  left: number
  top: number
  width: number
  height: number
}

function calculateLayout(bounds?: StageBounds) {
  const device = uni.getSystemInfoSync()
  const unit = device.windowWidth / 750
  const navigationStatusTop = device.statusBarHeight || 0
  const capsule = uni.getMenuButtonBoundingClientRect?.() || { top: navigationStatusTop, height: 0 }
  const navigationHeight = capsule.height && capsule.top >= navigationStatusTop
    ? (capsule.top - navigationStatusTop) * 2 + capsule.height
    : 44
  const safeBottom = Math.max(0, device.screenHeight - (device.safeArea?.bottom ?? device.screenHeight))
  const pageActionsTop = navigationStatusTop + navigationHeight + 12 * unit
  const toolbarBottom = safeBottom + 18 * unit
  const stageTop = pageActionsTop + (82 + 12) * unit
  const stageBottom = toolbarBottom + (88 + 18) * unit
  const stageInset = 38 * unit
  const stageWidth = bounds?.width ?? Math.max(0, device.windowWidth - stageInset * 2)
  const stageHeight = bounds?.height ?? Math.max(0, device.windowHeight - stageTop - stageBottom)
  if (bounds)
    device.windowHeight = bounds.top + bounds.height + stageBottom
  // Fit the artwork into the available stage so it stays clear of both toolbars.
  const scale = Math.min(stageWidth / studioMetrics.width, stageHeight / studioMetrics.height)
  const renderedWidth = studioMetrics.width * scale
  const renderedHeight = studioMetrics.height * scale
  const workspaceLeft = (stageWidth - renderedWidth) / 2
  const workspaceTop = Math.max(0, (stageHeight - renderedHeight) / 2)
  const offsetX = (bounds?.left ?? stageInset) + workspaceLeft
  const offsetY = (bounds?.top ?? stageTop) + workspaceTop
  const workspaceStyle = `width:${renderedWidth}px;height:${renderedHeight}px;`
  const boardStyle = `width:${studioMetrics.width}px;height:${studioMetrics.height}px;transform:scale(${scale});`
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
    boardStyle,
    screenToWorkspace,
    workspaceToScreen,
  }
}

export function useFlowerStudioLayout() {
  const instance = getCurrentInstance()
  const layout = reactive(calculateLayout())
  let alive = true
  let refreshVersion = 0
  function refreshLayout() {
    const version = ++refreshVersion
    void nextTick(() => {
      if (!alive || !instance?.proxy)
        return
      // 直接测量画布可用区域，缩放和触摸坐标都以真实布局为准。
      uni.createSelectorQuery().in(instance.proxy).select('.studio-stage').boundingClientRect((result) => {
        if (!alive || version !== refreshVersion || !result || Array.isArray(result)
          || !result.width || !result.height || typeof result.left !== 'number' || typeof result.top !== 'number')
          return
        Object.assign(layout, calculateLayout({ left: result.left, top: result.top, width: result.width, height: result.height }))
      }).exec()
    })
  }

  onReady(refreshLayout)
  onShow(refreshLayout)
  onResize(refreshLayout)
  onUnload(() => { alive = false })
  return layout
}

export type FlowerStudioLayout = ReturnType<typeof useFlowerStudioLayout>
