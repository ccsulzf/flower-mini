import type { CreationDraft } from '@/models/flower-creation'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getCurrentInstance, ref } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { validateDraft } from '@/utils/flower/creation-storage'
import { useArtworkImage } from './useArtworkImage'

export interface FlowerPageDailyInput {
  draft: CreationDraft
  imagePath: string
  title: string
  description: string
}

export function useFlowerPageArtwork(options: {
  savedOnly?: boolean
  loadDailyFlower?: (date: string) => Promise<FlowerPageDailyInput>
} = {}) {
  const draft = ref<CreationDraft>()
  const title = ref('这束花')
  const description = ref('')
  const loading = ref(true)
  const error = ref('')
  const saved = ref(false)
  const instance = getCurrentInstance()
  let alive = true
  let workId = ''
  let dailyFlowerDate = ''
  let existingArtworkImagePath = ''
  let imageScope = ''
  const images = useArtworkImage(() => {
    if (!draft.value)
      throw new Error('作品尚未准备好')
    return draft.value.artwork
  }, () => workId ? `work:${workId}` : imageScope, () => workId
    ? { id: workId }
    : undefined, () => existingArtworkImagePath)
  const userInfo = useUserInfoStore()
  function channel() {
    return (instance?.proxy as unknown as { getOpenerEventChannel?: () => UniApp.EventChannel })?.getOpenerEventChannel?.()
  }
  async function prepareDailyFlower(date: string) {
    if (!options.loadDailyFlower)
      return
    loading.value = true
    error.value = ''
    try {
      await userInfo.requireUid('请先登录后制作今日花束贺卡')
      const value = await options.loadDailyFlower(date)
      if (!alive)
        return
      draft.value = validateDraft(value.draft)
      title.value = value.title
      description.value = value.description
      existingArtworkImagePath = value.imagePath
      imageScope = `daily:${date}`
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
      const refs = [
        ...art.materials.map(row => row.materialId),
        art.container.materialId,
        art.background.materialId,
      ]
      await Promise.all(refs.map(id => catalog.ensure(id)))
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
    dailyFlowerDate = String(query?.dailyFlowerDate || '')
    if (dailyFlowerDate && options.loadDailyFlower) {
      void prepareDailyFlower(dailyFlowerDate)
      return
    }
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
  return {
    draft,
    title,
    description,
    loading,
    error,
    saved,
    images,
    channel,
    retry: () => dailyFlowerDate && options.loadDailyFlower
      ? prepareDailyFlower(dailyFlowerDate)
      : prepare(draft.value),
  }
}
