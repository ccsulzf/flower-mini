import type { MaterialInstance, Point, StudioTouchEvent } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import type { useArtworkStore } from '@/stores/artworkStore'
import type { FlowerStudioLayout } from './useFlowerStudioLayout'
import { materialHeadPoint } from '@/utils/flower/arrangement.cjs'
import { vasePlacement } from '@/utils/flower/material-render'

type MaterialResolver = (id: string) => CachedMaterial | undefined
type ContainerResolver = () => CachedMaterial | undefined

interface DragState {
  material: MaterialInstance
  startScreen: Point
  startWorkspace: Point
  changed: boolean
}

function snap(value: number, targets: number[], threshold: number) {
  const target = targets.find(target => Math.abs(target - value) <= threshold)
  return target ?? value
}

export function useFlowerDrag(
  store: ReturnType<typeof useArtworkStore>,
  layout: FlowerStudioLayout,
  resolveMaterial: MaterialResolver,
  resolveContainer: ContainerResolver,
  selectedMaterialId: () => number | null,
  onTap: (id: number) => void,
) {
  let drag: DragState | null = null

  function startDrag(event: StudioTouchEvent, material: MaterialInstance) {
    const touch = event.touches[0]
    if (!touch)
      return
    if (selectedMaterialId() !== material.id)
      onTap(material.id)
    const startScreen = { x: touch.clientX, y: touch.clientY }
    drag = {
      material: { ...material, transform: { ...material.transform, anchor: { ...material.transform.anchor } } },
      startScreen,
      startWorkspace: layout.screenToWorkspace(startScreen),
      changed: false,
    }
  }

  function moveDrag(event: StudioTouchEvent) {
    const touch = event.touches[0]
    if (!drag || !touch)
      return
    const screen = { x: touch.clientX, y: touch.clientY }
    if (!drag.changed && Math.hypot(screen.x - drag.startScreen.x, screen.y - drag.startScreen.y) < 2)
      return
    const sourceMaterial = resolveMaterial(drag.material.materialId)
    const containerMaterial = resolveContainer()
    if (!sourceMaterial || !containerMaterial) {
      drag = null
      store.endEdit()
      return
    }
    if (!drag.changed) {
      if (!store.beginEdit(drag.material.id)) {
        drag = null
        return
      }
      drag.changed = true
    }
    const current = layout.screenToWorkspace(screen)
    const originalHead = materialHeadPoint(drag.material.transform)
    const targetHead = {
      x: originalHead.x + current.x - drag.startWorkspace.x,
      y: originalHead.y + current.y - drag.startWorkspace.y,
    }
    const placement = vasePlacement(containerMaterial)
    const mouthLeft = placement.mouthLeft
    const mouthRight = placement.mouthRight
    const mouthCenter = (mouthLeft + mouthRight) / 2
    const anchorX = mouthCenter + Math.max(-1, Math.min(1, (targetHead.x - mouthCenter) / 240)) * (mouthRight - mouthLeft) / 2
    const anchor = { x: anchorX, y: 747 }
    const headX = targetHead.x - anchor.x
    const headY = anchor.y - targetHead.y
    const foliage = drag.material.group === 'foliage'
    const angle = Math.atan2(headX, headY) * 180 / Math.PI
    const height = Math.hypot(headX, headY)
    store.updateMaterialTransform(drag.material.id, {
      ...drag.material.transform,
      anchor,
      angle: foliage ? snap(angle, [-45, -30, 0, 30, 45], 2.5) : angle,
      height: foliage ? snap(height, [250, 370, 450], 7) : height,
    }, sourceMaterial, containerMaterial)
  }

  function endDrag(cancelled: boolean) {
    const ended = drag
    drag = null
    store.endEdit()
    if (!cancelled && ended && !ended.changed)
      onTap(ended.material.id)
  }

  return { startDrag, moveDrag, endDrag }
}
