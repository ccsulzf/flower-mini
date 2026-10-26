import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'

export function useStudioSelectionActions(endDrag: () => void, invalidateImages: () => void) {
  const artwork = useCreationArtworkStore()
  const catalog = useFlowerCatalogStore()
  const studio = useFlowerStudioStore()
  const { container, materials } = storeToRefs(artwork)
  const { selectedMaterialId, selectionMaterialId } = storeToRefs(studio)

  watch(() => materials.value.map(item => item.materialId).join('|'), () => {
    const materialId = selectionMaterialId.value
    if (!materials.value.length)
      studio.clearSelection()
    else if (materialId && !materials.value.some(item => item.materialId === materialId))
      studio.clearSelectionFocus()
  }, { flush: 'sync' })

  function closeFlowerTools() {
    artwork.endEdit()
    studio.clearSelection()
  }

  function openFlowerTools(id: number) {
    const instance = artwork.getMaterial(id)
    if (!instance)
      return
    const group = instance.group === 'foliage' ? 'foliage' : 'flowers'
    const count = materials.value.filter(item => item.materialId === instance.materialId).length
    studio.activateSelectionMaterial(instance.materialId, group, count > 1)
    studio.selectSelectionInstance(id)
    invalidateImages()
  }

  function selectedContext() {
    const id = selectedMaterialId.value
    if (id === null)
      return null
    const instance = artwork.getMaterial(id)
    const source = instance ? catalog.get(instance.materialId) : undefined
    const containerMaterial = catalog.get(container.value.materialId)
    return instance && source && containerMaterial ? { id, instance, source, containerMaterial } : null
  }

  function setColor(color: string) {
    if (selectedMaterialId.value !== null)
      artwork.setMaterialColor(selectedMaterialId.value, color)
  }

  function setLayer(direction: 'forward' | 'backward') {
    studio.colorsExpanded = false
    if (selectedMaterialId.value !== null)
      artwork.moveMaterialLayer(selectedMaterialId.value, direction)
  }

  function mirrorSelected() {
    if (selectedMaterialId.value !== null)
      artwork.setMaterialMirror(selectedMaterialId.value)
  }

  function duplicateSelected() {
    endDrag()
    const context = selectedContext()
    if (!context)
      return
    const id = artwork.duplicateMaterial(context.id, context.source, context.containerMaterial)
    if (id === null)
      return
    studio.activateSelectionMaterial(context.instance.materialId, context.instance.group === 'foliage' ? 'foliage' : 'flowers', true)
    studio.selectSelectionInstance(id)
  }

  function removeSelected() {
    endDrag()
    const id = selectedMaterialId.value
    if (id === null)
      return
    const removed = artwork.getMaterial(id)
    if (!removed)
      return
    const sameMaterialIndex = materials.value.filter(item => item.materialId === removed.materialId).findIndex(item => item.id === id)
    if (!artwork.removeMaterial(id))
      return
    const remaining = materials.value.filter(item => item.materialId === removed.materialId)
    if (!remaining.length) {
      studio.clearSelectionFocus()
      return
    }
    const next = remaining[Math.min(sameMaterialIndex, remaining.length - 1)]
    studio.activateSelectionMaterial(removed.materialId, removed.group === 'foliage' ? 'foliage' : 'flowers', remaining.length > 1)
    studio.selectSelectionInstance(next.id)
  }

  function focusSelectionMaterial(materialId: string, group: 'flowers' | 'foliage', expanded: boolean) {
    endDrag()
    studio.focusSelectionMaterial(materialId, group, expanded)
    invalidateImages()
  }

  function selectSelectionInstance(id: number) {
    endDrag()
    studio.selectSelectionInstance(id)
    invalidateImages()
  }

  function undo() {
    endDrag()
    artwork.undo()
    studio.clearSelectionIfMissing(materials.value.map(item => item.id))
  }

  function redo() {
    endDrag()
    artwork.redo()
    studio.clearSelectionIfMissing(materials.value.map(item => item.id))
  }

  return {
    closeFlowerTools,
    openFlowerTools,
    setColor,
    setLayer,
    mirrorSelected,
    duplicateSelected,
    removeSelected,
    focusSelectionMaterial,
    selectSelectionInstance,
    undo,
    redo,
  }
}
