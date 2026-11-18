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
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  function cancelScheduledSave() {
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
  }
  function contentSnapshot(draft: CreationDraft) {
    return JSON.stringify({ artwork: draft.artwork, card: draft.card, workId: draft.workId })
  }
  function snapshot(): CreationDraft {
    return { artwork: store.snapshot(), card: { ...card.value }, updatedAt: Date.now(), ...(workId.value ? { workId: workId.value } : {}), hasUnsavedChanges: hasUnsavedChanges.value }
  }
  function refreshBaseline() {
    cancelScheduledSave()
    baselineSnapshot = contentSnapshot(snapshot())
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
    cancelScheduledSave()
    const value = validateDraft(draft)
    store.initialize(value.artwork)
    card.value = value.card
    workId.value = value.workId
    baselineSnapshot = contentSnapshot(snapshot())
    dirty.value = false
    hasUnsavedChanges.value = false
  }
  function continueDraft() {
    if (!pendingDraft.value)
      return
    // 旧草稿缺少标记时保留离开提示，避免静默丢弃尚未保存的修改。
    const unsaved = pendingDraft.value.hasUnsavedChanges ?? true
    apply(pendingDraft.value)
    pendingDraft.value = null
    view.value = 'edit'
    dirty.value = false
    hasUnsavedChanges.value = unsaved
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
    cancelScheduledSave()
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
    baselineSnapshot = contentSnapshot(snapshot())
    dirty.value = false
    hasUnsavedChanges.value = false
    readonly.value = false
    draftReadFailed.value = false
    storageError.value = ''
    return true
  }
  function discard() {
    cancelScheduledSave()
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
    baselineSnapshot = contentSnapshot(snapshot())
    dirty.value = false
    hasUnsavedChanges.value = false
    readonly.value = false
    draftReadFailed.value = false
    storageError.value = ''
    return true
  }
  function flushDraft() {
    cancelScheduledSave()
    if (!owner || !dirty.value || readonly.value || pendingDraft.value || draftReadFailed.value)
      return
    try {
      const draft = snapshot()
      const current = contentSnapshot(draft)
      if (current === baselineSnapshot) {
        dirty.value = false
        return
      }
      writeDraft(owner, draft)
      console.info('[flower-draft] saved', { materials: draft.artwork.materials.length })
      dirty.value = false
      baselineSnapshot = current
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
    dirty.value = true
    hasUnsavedChanges.value = true
    // 连续编辑合并保存，拖动结束和页面退出时由调用方立即补存。
    cancelScheduledSave()
    saveTimer = setTimeout(flushDraft, 400)
  }
  function openWork(work: SavedFlowerWork) {
    cancelScheduledSave()
    readonly.value = true
    dirty.value = false
    hasUnsavedChanges.value = false
    pendingDraft.value = null
    apply({ ...work.draft, workId: work.id })
    baselineSnapshot = contentSnapshot(snapshot())
    view.value = 'artwork'
  }
  function editWork() {
    readonly.value = false
    view.value = 'edit'
    refreshBaseline()
    // 编译器刷新不保证触发退出钩子，进入编辑时就保存作品身份。
    try {
      writeDraft(owner, snapshot())
      storageError.value = ''
    }
    catch (error) {
      storageError.value = (error as Error).message
    }
  }
  function commitCard(text: FlowerCardText) {
    card.value = validateCard(text)
    markEdited()
  }
  function saved(work?: Pick<SavedFlowerWork, 'id'>, keepEditing = false) {
    cancelScheduledSave()
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
