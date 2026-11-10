import type { StudioSelectionState, StudioTab } from '@/models/flower-studio'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'

export type MaterialPickerGroup = 'recent' | 'main' | 'filler' | 'foliage'

const recentStorageKey = 'flower-studio-recent-materials'

function readRecentMaterials() {
  try {
    const value: unknown = uni.getStorageSync(recentStorageKey)
    if (!Array.isArray(value))
      return []
    return value.filter((id): id is string => typeof id === 'string').slice(0, 12)
  }
  catch {
    return []
  }
}

export const useFlowerStudioStore = defineStore('flowerStudio', () => {
  const catalog = useFlowerCatalogStore()
  const pageReady = ref(false)
  const finishing = ref(false)
  const startupError = ref('')
  const pendingMaterialId = ref<string | null>(null)
  const lastAddedMaterialId = ref('')
  const selection = ref<StudioSelectionState>({ mode: 'closed' })
  const activePanel = ref<StudioTab | null>(null)
  const activeMaterialGroup = ref<MaterialPickerGroup>('main')
  const materialKeyword = ref('')
  const colorsExpanded = ref(false)
  const recentMaterialIds = ref<string[]>(readRecentMaterials())
  const materialsLoading = computed(() => catalog.loading || catalog.preparing || catalog.downloading > 0)
  const selectedMaterialId = computed(() => selection.value.mode === 'instance' ? selection.value.instanceId : null)
  const selectionFilter = computed(() => selection.value.mode === 'closed' ? 'all' : selection.value.filter)
  const selectionMaterialId = computed(() => selection.value.mode === 'material' || selection.value.mode === 'instance' ? selection.value.materialId : null)
  const selectionMenuLevel = computed(() => selection.value.mode === 'material' || selection.value.mode === 'instance' ? selection.value.menuLevel : 'closed')
  const activeTab = computed<StudioTab | null>({
    get: () => activePanel.value,
    set: (tab) => tab ? openTab(tab) : closePanel(),
  })

  function reset() {
    pageReady.value = false
    finishing.value = false
    startupError.value = ''
    pendingMaterialId.value = null
    lastAddedMaterialId.value = ''
    selection.value = { mode: 'closed' }
    activePanel.value = null
    materialKeyword.value = ''
    colorsExpanded.value = false
  }

  function closePanel() {
    activePanel.value = null
    selection.value = { mode: 'closed' }
    colorsExpanded.value = false
  }

  function openTab(tab: StudioTab) {
    activePanel.value = tab
    if (tab !== 'selection') {
      selection.value = { mode: 'closed' }
    }
    else if (selection.value.mode === 'closed')
      selection.value = { mode: 'browse', filter: 'all' }
    colorsExpanded.value = false
  }

  function focusSelectionMaterial(id: string, group: 'flowers' | 'foliage', expanded: boolean) {
    const sameMaterial = selectionMaterialId.value === id
    if (sameMaterial) {
      clearSelectionFocus()
      return
    }
    activateSelectionMaterial(id, group, expanded)
  }

  function activateSelectionMaterial(id: string, group: 'flowers' | 'foliage', expanded: boolean) {
    selection.value = { mode: 'material', filter: group, materialId: id, menuLevel: expanded ? 'material' : 'closed' }
    activePanel.value = 'selection'
    colorsExpanded.value = false
  }

  function selectSelectionInstance(id: number) {
    const current = selection.value
    if (current.mode !== 'material' && current.mode !== 'instance')
      return
    selection.value = { ...current, mode: 'instance', instanceId: id }
    activePanel.value = 'selection'
    colorsExpanded.value = false
  }

  function clearSelection() {
    selection.value = { mode: 'closed' }
    activePanel.value = null
    colorsExpanded.value = false
  }

  function clearSelectionFocus() {
    selection.value = { mode: 'browse', filter: 'all' }
    activePanel.value = 'selection'
    colorsExpanded.value = false
  }

  function clearSelectionIfMissing(ids: number[]) {
    if (selectedMaterialId.value !== null && !ids.includes(selectedMaterialId.value))
      clearSelection()
  }

  function recordRecentMaterial(id: string) {
    recentMaterialIds.value = [id, ...recentMaterialIds.value.filter(value => value !== id)].slice(0, 12)
    try { uni.setStorageSync(recentStorageKey, recentMaterialIds.value) }
    catch { /* 最近使用失败不影响作品编辑。 */ }
  }

  return {
    pageReady,
    finishing,
    startupError,
    pendingMaterialId,
    lastAddedMaterialId,
    selectedMaterialId,
    selectionFilter,
    selectionMaterialId,
    selectionMenuLevel,
    activeTab,
    activeMaterialGroup,
    materialKeyword,
    colorsExpanded,
    recentMaterialIds,
    materialsLoading,
    reset,
    closePanel,
    openTab,
    focusSelectionMaterial,
    activateSelectionMaterial,
    selectSelectionInstance,
    clearSelection,
    clearSelectionFocus,
    clearSelectionIfMissing,
    recordRecentMaterial,
  }
})
