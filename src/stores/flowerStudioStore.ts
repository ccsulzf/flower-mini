import type { StudioTab } from '@/models/flower-studio'
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
    selectedMaterialId.value = null
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
    activePanel.value = id === null ? null : 'flower-tools'
    colorsExpanded.value = false
  }

  function clearSelectionIfMissing(ids: number[]) {
    if (selectedMaterialId.value !== null && !ids.includes(selectedMaterialId.value))
      selectMaterial(null)
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
    clearSelectionIfMissing,
    recordRecentMaterial,
  }
})
