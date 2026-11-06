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
      console.info('[flower-draft] read', { found: Boolean(pendingDraft.value), materials: pendingDraft.value?.artwork.materials.length ?? 0 })
      draftReadFailed.value = false
      storageError.value = ''
      return true
    }
    catch (error) {
      draftReadFailed.value = true
      console.error('[flower-draft] read failed', error)
      storageError.value = ''
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
  function startFreshDraft() {
    // 恢复失败不删除原草稿，后续实际编辑时才写入新草稿。
    pendingDraft.value = null
    card.value = { blessing: '', signature: '' }
    workId.value = undefined
    view.value = 'edit'
    readonly.value = false
    draftReadFailed.value = false
    storageError.value = ''
    refreshBaseline()
  }
  function restart() {
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
  function discard() {
    // Leaving an existing work must not replace the live store with the
    // intentionally incomplete restart placeholder. Page watchers and hide
    // hooks may otherwise try to validate that placeholder as an artwork.
    if (owner) {
      try {
        clearDraft(owner)
      }
      catch (error) {
        storageError.value = (error as Error).message
        return false
      }
    }
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
    if (!owner || !dirty.value || readonly.value || pendingDraft.value || draftReadFailed.value)
      return
    try {
      const draft = snapshot()
      writeDraft(owner, draft)
      console.info('[flower-draft] saved', { materials: draft.artwork.materials.length })
      dirty.value = false
      baselineSnapshot = JSON.stringify(snapshot())
      storageError.value = ''
    }
    catch (error) {
      console.error('[flower-draft] save failed', error)
      storageError.value = (error as Error).message
    }
  }
  function markEdited() {
    if (!initialized.value || readonly.value || pendingDraft.value || draftReadFailed.value) {
      console.warn('[flower-draft] save blocked', { initialized: initialized.value, readonly: readonly.value, pendingDraft: Boolean(pendingDraft.value), draftReadFailed: draftReadFailed.value })
      return
    }
    const current = JSON.stringify(snapshot())
    const changed = current !== baselineSnapshot
    dirty.value = changed
    hasUnsavedChanges.value = true
    // 重新编译或进程被终止时不保证触发退出钩子，编辑后立即持久化。
    flushDraft()
  }
  function openWork(work: SavedFlowerWork) {
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
  function saved(work?: Pick<SavedFlowerWork, 'id'>, keepEditing = false) {
    if (work) {
      workId.value = work.id
      dirty.value = false
      hasUnsavedChanges.value = false
    }
    if (keepEditing) {
      readonly.value = false
      view.value = 'edit'
      try {
        writeDraft(owner, snapshot())
        refreshBaseline()
        storageError.value = ''
        return true
      }
      catch (error) {
        storageError.value = (error as Error).message
        return false
      }
    }
    const cleared = discard()
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
  }
  return { view, card, pendingDraft, workId, dirty, hasUnsavedChanges, storageError, readonly, initialized, draftReadFailed, retryDraft, initialize, continueDraft, startFreshDraft, restart, discard, markEdited, flushDraft, openWork, editWork, commitCard, saved, snapshot, dispose }
}
