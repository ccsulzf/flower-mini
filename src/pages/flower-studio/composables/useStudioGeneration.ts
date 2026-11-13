import type { Artwork } from '@/models/artwork'
import { computed, ref } from 'vue'
import { generateFlower } from '@/api/flower-generate'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { parseArtwork } from '@/utils/flower/artwork'

export function useStudioGeneration() {
  const store = useCreationArtworkStore()
  const catalog = useFlowerCatalogStore()
  const user = useUserInfoStore()
  const visible = ref(false)
  const prompt = ref('')
  const error = ref('')
  const phase = ref<'idle' | 'thinking' | 'preparing' | 'revealing'>('idle')
  const preview = ref<Artwork | null>(null)
  const busy = computed(() => phase.value !== 'idle')
  let version = 0
  let finishReveal: (() => void) | undefined
  let recentBackgroundIds: string[] = []
  let historyOwner = ''

  function cancel() {
    version++
    finishReveal?.()
    finishReveal = undefined
    preview.value = null
    phase.value = 'idle'
    visible.value = false
  }

  async function generate() {
    if (busy.value)
      return
    const text = prompt.value.trim()
    error.value = ''
    if (!text || text.length > 1000) {
      error.value = '写下 1 至 1000 字的心情，再让花开出来'
      return
    }
    const request = ++version
    const before = JSON.stringify(store.snapshot())
    phase.value = 'thinking'
    try {
      await waitForAppAuthReady()
      if (request !== version)
        return
      const uid = await user.requireUid('请先登录后生成花束')
      if (request !== version)
        return
      if (historyOwner !== uid) {
        recentBackgroundIds = []
        historyOwner = uid
      }
      const response = await generateFlower(text, recentBackgroundIds)
      if (request !== version)
        return
      const next = parseArtwork(JSON.stringify(response.artwork))
      if (!next.materials.length)
        throw new Error('这一束还没有搭配好，请再试一次')
      phase.value = 'preparing'
      await catalog.prepareFor([next.background.materialId, next.container.materialId, ...next.materials.map(item => item.materialId)])
      if (request !== version)
        return
      if (await user.requireUid() !== uid)
        throw new Error('账号已变化，请重新生成')
      if (request !== version)
        return
      preview.value = next
      phase.value = 'revealing'
      await new Promise<void>((resolve) => {
        const timer = setTimeout(done, 950 + Math.min(next.materials.length - 1, 24) * 90)
        function done() {
          clearTimeout(timer)
          finishReveal = undefined
          resolve()
        }
        finishReveal = done
      })
      if (request !== version)
        return
      if (await user.requireUid() !== uid)
        throw new Error('账号已变化，请重新生成')
      if (request !== version)
        return
      if (JSON.stringify(store.snapshot()) !== before)
        throw new Error('画布已变化，请重新生成')
      // 仅在完整结果可用后写入一次，撤销和草稿都不会记录半束花。
      store.replaceArtwork(next)
      recentBackgroundIds = [next.background.materialId, ...recentBackgroundIds.filter(id => id !== next.background.materialId)].slice(0, 3)
      visible.value = false
      return true
    }
    catch (cause) {
      if (request === version)
        error.value = cause instanceof Error ? cause.message : '生成失败，请稍后重试'
    }
    finally {
      if (request === version) {
        preview.value = null
        phase.value = 'idle'
      }
    }
  }

  return { visible, prompt, error, phase, preview, busy, generate, cancel }
}
