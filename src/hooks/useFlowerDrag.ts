import type { Ref } from 'vue'
import type { Stem, StudioTouchEvent } from '@/models/artwork'
import type { useArtworkStore } from '@/stores/artworkStore'
import { moveStem } from '@/utils/flower/arrangement.cjs'

export function useFlowerDrag(store: ReturnType<typeof useArtworkStore>, boardScale: Ref<number>, unit: number, onTap: (id: number) => void, onDragStart: () => void) {
  let drag: (Stem & { clientX: number, clientY: number, changed: boolean }) | null = null
  function startDrag(event: StudioTouchEvent, stem: Stem) {
    const touch = event.touches[0]
    if (!touch) return
    drag = { ...stem, clientX: touch.clientX, clientY: touch.clientY, changed: false }
  }
  function moveDrag(event: StudioTouchEvent) {
    const touch = event.touches[0]
    if (!drag || !touch) return
    const delta = { x: touch.clientX - drag.clientX, y: touch.clientY - drag.clientY }
    if (!drag.changed && Math.hypot(delta.x, delta.y) < 2) return
    if (!drag.changed) {
      if (!store.beginStemEdit(drag.id)) { drag = null; return }
      onDragStart()
    }
    drag.changed = true
    store.updateStem(drag.id, moveStem(drag, delta, unit * boardScale.value, store.stemLandingBounds()))
  }
  function endDrag(cancelled: boolean) {
    const ended = drag
    drag = null
    store.endStemEdit()
    if (!cancelled && ended && !ended.changed) onTap(ended.id)
  }
  return { startDrag, moveDrag, endDrag }
}
