import type { StudioSelectionFilter, StudioSelectionMenuLevel, StudioTab } from '@/models/flower-studio'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'

export type MaterialPickerGroup = 'recent' | 'main' | 'filler' | 'foliage'
export type StudioPanel = StudioTab | 'flower-tools' | null

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
  const selectedMaterialId = ref<number | null>(null)
  const selectionFilter = ref<StudioSelectionFilter>('all')
  const selectionMaterialId = ref<string | null>(null)
  const selectionMenuLevel = ref<StudioSelectionMenuLevel>('closed')
  const activePanel = ref<StudioPanel>(null)
  const activeMaterialGroup = ref<MaterialPickerGroup>('main')
  const materialKeyword = ref('')
  const colorsExpanded = ref(false)
  const recentMaterialIds = ref<string[]>(readRecentMaterials())
  const materialsLoading = computed(() => catalog.loading || catalog.preparing || catalog.downloading > 0)
  const activeTab = computed<StudioTab | null>({
    get: () => activePanel.value && activePanel.value !== 'flower-tools' ? activePanel.value : null,
    set: (tab) => tab ? openTab(tab) : closePanel(),
  })
  const showFlowerTools = computed(() => activePanel.value === 'flower-tools')

  function reset() {
    pageReady.value = false
    finishing.value = false
    startupError.value = ''
    pendingMaterialId.value = null
    lastAddedMaterialId.value = ''
    selectedMaterialId.value = null
    selectionFilter.value = 'all'
    selectionMaterialId.value = null
    selectionMenuLevel.value = 'closed'
    activePanel.value = null
    materialKeyword.value = ''
    colorsExpanded.value = false
  }

  function closePanel() {
    activePanel.value = null
    colorsExpanded.value = false
  }

  function openTab(tab: StudioTab) {
    activePanel.value = tab
    if (tab !== 'selection') {
      selectedMaterialId.value = null
      selectionFilter.value = 'all'
      selectionMaterialId.value = null
      selectionMenuLevel.value = 'closed'
    }
    colorsExpanded.value = false
  }

  function toggleTab(tab: StudioTab) {
    if (activePanel.value === tab)
      closePanel()
    else
      openTab(tab)
  }

  function selectMaterial(id: number | null) {
    selectedMaterialId.value = id
    activePanel.value = id === null ? null : 'selection'
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
    selectionFilter.value = group
    selectionMaterialId.value = id
    selectedMaterialId.value = null
    activePanel.value = 'selection'
    selectionMenuLevel.value = expanded ? 'material' : 'closed'
    colorsExpanded.value = false
  }

  function selectSelectionInstance(id: number) {
    selectedMaterialId.value = id
    activePanel.value = 'selection'
    colorsExpanded.value = false
  }

  function clearSelection() {
    selectedMaterialId.value = null
    selectionFilter.value = 'all'
    selectionMaterialId.value = null
    selectionMenuLevel.value = 'closed'
    activePanel.value = null
    colorsExpanded.value = false
  }

  function clearSelectionFocus() {
    selectedMaterialId.value = null
    selectionFilter.value = 'all'
    selectionMaterialId.value = null
    selectionMenuLevel.value = 'closed'
    activePanel.value = 'selection'
    colorsExpanded.value = false
  }

  function setSelectionFilter(filter: StudioSelectionFilter) {
    selectionFilter.value = filter
    selectionMaterialId.value = null
    selectionMenuLevel.value = filter === 'all' ? 'closed' : 'material'
  }

  function setSelectionMaterial(id: string) {
    selectionMaterialId.value = id
    selectionMenuLevel.value = 'closed'
  }

  function openSelectionCategories() {
    selectionMenuLevel.value = 'category'
  }

  function openSelectionMaterials() {
    if (selectionFilter.value === 'all') {
      selectionMenuLevel.value = 'category'
      return
    }
    selectedMaterialId.value = null
    activePanel.value = null
    colorsExpanded.value = false
    selectionMaterialId.value = null
    selectionMenuLevel.value = 'material'
  }

  function closeSelectionMenu() {
    selectionMenuLevel.value = 'closed'
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
    activePanel,
    activeTab,
    activeMaterialGroup,
    materialKeyword,
    colorsExpanded,
    recentMaterialIds,
    materialsLoading,
    showFlowerTools,
    reset,
    closePanel,
    openTab,
    toggleTab,
    selectMaterial,
    focusSelectionMaterial,
    activateSelectionMaterial,
    selectSelectionInstance,
    clearSelection,
    clearSelectionFocus,
    setSelectionFilter,
    setSelectionMaterial,
    openSelectionCategories,
    openSelectionMaterials,
    closeSelectionMenu,
    clearSelectionIfMissing,
    recordRecentMaterial,
  }
})
