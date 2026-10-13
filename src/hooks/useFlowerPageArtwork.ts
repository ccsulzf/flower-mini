import type { CreationDraft } from '@/models/flower-creation'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getCurrentInstance, ref } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { validateDraft } from '@/utils/flower/creation-storage'
import { useArtworkImage } from './useArtworkImage'

export function useFlowerPageArtwork(options: { savedOnly?: boolean } = {}) {
  const draft = ref<CreationDraft>()
  const title = ref('这束花')
  const description = ref('')
  const loading = ref(true)
  const error = ref('')
  const saved = ref(false)
  const instance = getCurrentInstance()
  let alive = true
  let workId = ''
  const images = useArtworkImage(() => {
    if (!draft.value)
      throw new Error('作品尚未准备好')
    return draft.value.artwork
  }, () => workId ? `work:${workId}` : '')
  const userInfo = useUserInfoStore()
  function channel() {
    return (instance?.proxy as unknown as { getOpenerEventChannel?: () => UniApp.EventChannel })?.getOpenerEventChannel?.()
  }
  async function prepare(value?: CreationDraft) {
    loading.value = true
    error.value = ''
    try {
      await userInfo.requireUid('请先登录后查看作品')
      if (workId) {
        const work = await useFlowerWorksStore().get(workId)
        value = work.draft
        title.value = work.title
        description.value = work.description
        saved.value = true
      }
      if (!alive)
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
      channel()?.on('artwork', (value: { draft: CreationDraft }) => {
        void prepare(value.draft)
      })
    }
  })
  onUnload(() => {
    alive = false
    images.invalidate()
  })
  return { draft, title, description, loading, error, saved, images, channel, retry: () => prepare(draft.value) }
}
