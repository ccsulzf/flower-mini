import type { CreationDraft } from '@/models/flower-creation'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getCurrentInstance, ref } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { validateDraft } from '@/utils/flower/creation-storage'
import { useArtworkImage } from './useArtworkImage'

export function useFlowerPageArtwork(options: { savedOnly?: boolean } = {}) {
  const draft = ref<CreationDraft>()
  const title = ref('这束花')
  const thumbnail = ref('')
  const loading = ref(true)
  const error = ref('')
  const saved = ref(false)
  const owner = ref('')
  const instance = getCurrentInstance()
  const images = useArtworkImage(() => {
    if (!draft.value)
      throw new Error('作品尚未准备好')
    return draft.value.artwork
  })
  let alive = true
  let workId = ''
  function channel() {
    return (instance?.proxy as unknown as { getOpenerEventChannel?: () => UniApp.EventChannel })?.getOpenerEventChannel?.()
  }
  async function prepare(value?: CreationDraft, sourceOwner?: string) {
    loading.value = true
    error.value = ''
    try {
      await waitForAppAuthReady()
      const uid = uniCloud.getCurrentUserInfo().uid
      if (!uid)
        throw new Error('请先登录后查看作品')
      if (sourceOwner && sourceOwner !== uid)
        throw new Error('账号已切换，请重新打开作品')
      owner.value = uid
      if (workId) {
        const work = await useFlowerWorksStore().get(workId)
        value = work.draft
        title.value = work.title
        thumbnail.value = work.thumbnailUrl || ''
        saved.value = true
      }
      if (!alive || uid !== uniCloud.getCurrentUserInfo().uid)
        return
      if (!value)
        throw new Error('作品已失效，请返回重新打开')
      draft.value = validateDraft(value)
      const catalog = useFlowerCatalogStore()
      if (!catalog.loaded)
        await catalog.load()
      const art = draft.value.artwork
      const refs = [...art.stems.filter(row => row.materialId).map(row => [row.materialId!, row.materialRevision!]), ...(art.vaseMaterialId ? [[art.vaseMaterialId, art.vaseMaterialRevision!]] : []), ...(art.backgroundMaterialId ? [[art.backgroundMaterialId, art.backgroundMaterialRevision!]] : [])]
      await Promise.all(refs.map(([id, revision]) => catalog.ensure(id, revision)))
      if (!alive || uid !== uniCloud.getCurrentUserInfo().uid)
        return
      await images.exportImage()
    }
    catch (value) {
      if (alive)
        error.value = creationFailure(value)
    }
    finally {
      if (alive)
        loading.value = false
    }
  }
  onLoad((query) => {
    workId = String(query?.workId || '')
    if (workId) {
      void prepare()
    }
    else if (options.savedOnly) {
      loading.value = false
      error.value = '请选择已保存的作品'
    }
    else {
      channel()?.on('artwork', (value: { draft: CreationDraft, owner: string }) => {
        void prepare(value.draft, value.owner)
      })
    }
  })
  onUnload(() => {
    alive = false
    images.invalidate()
  })
  return { draft, title, thumbnail, loading, error, saved, owner, images, channel, current: () => alive && owner.value === uniCloud.getCurrentUserInfo().uid, retry: () => prepare(draft.value, owner.value) }
}
