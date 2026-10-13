import { computed } from 'vue'
import { useFlowerStudioLayoutStore } from '@/stores/flowerStudioLayoutStore'
export function useFlowerStudioLayout() {
  const layout = useFlowerStudioLayoutStore()
  return {
    device: layout.device,
    unit: layout.unit,
    navigationStatusTop: layout.navigationStatusTop,
    navigationHeight: layout.navigationHeight,
    safeBottom: layout.safeBottom,
    pageActionsTop: layout.pageActionsTop,
    toolbarBottom: layout.toolbarBottom,
    stageTop: layout.stageTop,
    stageBottom: layout.stageBottom,
    boardScale: computed(() => layout.boardScale),
    boardPosition: computed(() => layout.boardPosition),
    artworkStyle: computed(() => layout.artworkStyle),
    flowerToolsStyle: computed(() => layout.flowerToolsStyle),
  }
}
