import { ref } from 'vue'

export type StudioGuideStep = 'open-flowers' | 'flowers' | 'arrange' | 'save'

const storageKey = 'flower-studio-guide-v1'
let dismissedInSession = false

export function useStudioGuide() {
  const step = ref<StudioGuideStep | null>(null)

  function start(automatic = false, initialStep: StudioGuideStep = 'open-flowers') {
    if (automatic && !import.meta.env.DEV) {
      if (dismissedInSession)
        return
      try {
        if (uni.getStorageSync(storageKey) === true)
          return
      }
      catch { /* 本地存储不可用时仍可体验引导。 */ }
    }
    step.value = initialStep
  }

  function dismiss() {
    step.value = null
    dismissedInSession = true
    try { uni.setStorageSync(storageKey, true) }
    catch { /* 记忆失败不阻止创作，本次会话不再自动展示。 */ }
  }

  function added() {
    if (step.value === 'flowers')
      step.value = 'arrange'
  }

  function arranged() {
    if (step.value === 'arrange')
      step.value = 'save'
  }

  return { step, start, dismiss, added, arranged }
}
