import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { StudioTab } from '@/models/flower-studio'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'

export type StudioPanel = StudioTab | 'flower-tools' | null

export const useFlowerStudioStore = defineStore('flowerStudio', () => {
  const catalog = useFlowerCatalogStore()
  const pageReady = ref(false)
  const finishing = ref(false)
  const startupError = ref('')
  const addingMaterial = ref(false)
  const addedMaterialId = ref('')
  const activePanel = ref<StudioPanel>(null)
  const toolsColorsOpen = ref(false)
  const materialsLoading = computed(() => catalog.loading || catalog.preparing || catalog.downloading > 0)
  const activeTab = computed<StudioTab | null>({
    get: () => activePanel.value && activePanel.value !== 'flower-tools' ? activePanel.value : null,
    set: (tab) => {
      if (tab) {
        activePanel.value = tab
        toolsColorsOpen.value = false
      }
      else if (activePanel.value !== 'flower-tools') {
        closePanel()
      }
    },
  })
  const showFlowerTools = computed({
    get: () => activePanel.value === 'flower-tools',
    set: (show) => {
      if (show)
        openFlowerTools()
      else
        closeFlowerTools()
    },
  })

  function reset() {
    pageReady.value = false
    finishing.value = false
    startupError.value = ''
    addingMaterial.value = false
    addedMaterialId.value = ''
    activePanel.value = null
    toolsColorsOpen.value = false
  }

  function closePanel() {
    activePanel.value = null
    toolsColorsOpen.value = false
  }

  function toggleTab(tab: StudioTab) {
    activePanel.value = activePanel.value === tab ? null : tab
    toolsColorsOpen.value = false
  }

  function openFlowerTools() {
    activePanel.value = 'flower-tools'
    toolsColorsOpen.value = false
  }

  function closeFlowerTools() {
    if (showFlowerTools.value)
      closePanel()
    else
      toolsColorsOpen.value = false
  }

  return {
    pageReady,
    finishing,
    startupError,
    addingMaterial,
    addedMaterialId,
    activePanel,
    activeTab,
    showFlowerTools,
    toolsColorsOpen,
    materialsLoading,
    reset,
    closePanel,
    toggleTab,
    openFlowerTools,
    closeFlowerTools,
  }
})
