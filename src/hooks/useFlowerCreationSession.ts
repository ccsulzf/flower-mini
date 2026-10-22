import type { CreationDraft, FlowerCardText, SavedFlowerWork } from '@/models/flower-creation'
import type { useArtworkStore } from '@/stores/artworkStore'
import { ref } from 'vue'
import { clearDraft, readDraft, validateCard, validateDraft, writeDraft } from '@/utils/flower/creation-storage'

export type CreationView = 'edit' | 'artwork' | 'card'
export function useFlowerCreationSession(store: ReturnType<typeof useArtworkStore>) {
  const view = ref<CreationView>('edit')
  const card = ref<FlowerCardText>({ blessing: '', signature: '' })
  const pendingDraft = ref<CreationDraft | null>(null)
  const workId = ref<string>()
  const dirty = ref(false)
  const hasUnsavedChanges = ref(false)
  const storageError = ref('')
  const readonly = ref(false)
  const initialized = ref(false)
  const draftReadFailed = ref(false)
  let owner = ''
  let baselineSnapshot = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  function cancelTimer() {
    if (timer !== undefined)
      clearTimeout(timer)
    timer = undefined
  }
  function snapshot(): CreationDraft {
    return { artwork: store.snapshot(), card: { ...card.value }, updatedAt: Date.now(), ...(workId.value ? { workId: workId.value } : {}) }
  }
  function refreshBaseline() {
    baselineSnapshot = JSON.stringify(snapshot())
    dirty.value = false
    hasUnsavedChanges.value = false
  }
  function initialize(uid: string, detail = false) {
    if (initialized.value)
      return
    cancelTimer()
    card.value = { blessing: '', signature: '' }
    workId.value = undefined
    view.value = 'edit'
    owner = uid
    initialized.value = true
    readonly.value = detail
    baselineSnapshot = ''
    dirty.value = false
    hasUnsavedChanges.value = false
    pendingDraft.value = null
    storageError.value = ''
    draftReadFailed.value = false
    if (detail)
      return
    retryDraft()
  }
  function retryDraft() {
    if (!owner || readonly.value)
      return false
    try {
      pendingDraft.value = readDraft(owner)
      draftReadFailed.value = false
      storageError.value = ''
      return true
    }
    catch (error) {
      draftReadFailed.value = true
      storageError.value = (error as Error).message
      return false
    }
  }
  function apply(draft: CreationDraft) {
    const value = validateDraft(draft)
    store.initialize(value.artwork)
    card.value = value.card
    workId.value = value.workId
    baselineSnapshot = JSON.stringify(snapshot())
    dirty.value = false
    hasUnsavedChanges.value = false
  }
  function continueDraft() {
    if (!pendingDraft.value)
      return
    apply(pendingDraft.value)
    pendingDraft.value = null
    view.value = 'edit'
    dirty.value = false
    hasUnsavedChanges.value = false
  }
  function restart() {
    cancelTimer()
    // Failed removal leaves the current session recoverable and never reports success.
    if (owner) {
      try {
        clearDraft(owner)
      }
      catch (error) {
        storageError.value = (error as Error).message
        return false
      }
    }
    store.initialize({
      background: { materialId: '' },
      container: { materialId: '', type: 'vase' },
      materials: [],
      containerLayouts: {},
    })
    card.value = { blessing: '', signature: '' }
    workId.value = undefined
    pendingDraft.value = null
    view.value = 'edit'
    baselineSnapshot = JSON.stringify(snapshot())
    dirty.value = false
    hasUnsavedChanges.value = false
    readonly.value = false
    draftReadFailed.value = false
    storageError.value = ''
    return true
  }
  function flushDraft() {
    cancelTimer()
    if (!owner || !dirty.value || readonly.value || pendingDraft.value || draftReadFailed.value)
      return
    try {
      writeDraft(owner, snapshot())
      dirty.value = false
      baselineSnapshot = JSON.stringify(snapshot())
      storageError.value = ''
    }
    catch (error) {
      storageError.value = (error as Error).message
    }
  }
  function markEdited() {
    if (!initialized.value || readonly.value || pendingDraft.value || draftReadFailed.value)
      return
    const current = JSON.stringify(snapshot())
    const changed = current !== baselineSnapshot
    dirty.value = changed
    hasUnsavedChanges.value = true
    cancelTimer()
    timer = setTimeout(flushDraft, 300)
  }
  function openWork(work: SavedFlowerWork) {
    cancelTimer()
    readonly.value = true
    dirty.value = false
    hasUnsavedChanges.value = false
    pendingDraft.value = null
    apply({ ...work.draft, workId: work.id })
    baselineSnapshot = JSON.stringify(snapshot())
    view.value = 'artwork'
  }
  function editWork() {
    readonly.value = false
    view.value = 'edit'
    refreshBaseline()
  }
  function commitCard(text: FlowerCardText) {
    card.value = validateCard(text)
    markEdited()
  }
  function saved(work?: Pick<SavedFlowerWork, 'id'>) {
    if (work) {
      cancelTimer()
      workId.value = work.id
      dirty.value = false
      hasUnsavedChanges.value = false
    }
    const cleared = restart()
    if (!cleared && work) {
      try {
        writeDraft(owner, snapshot())
      }
      catch (error) {
        storageError.value = (error as Error).message
      }
    }
    return cleared
  }
  function dispose() {
    flushDraft()
    cancelTimer()
  }
  return { view, card, pendingDraft, workId, dirty, hasUnsavedChanges, storageError, readonly, initialized, draftReadFailed, retryDraft, initialize, continueDraft, restart, markEdited, flushDraft, openWork, editWork, commitCard, saved, snapshot, dispose }
}
