import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { waitForAppAuthReady } from '@/utils/appAuth'

export const useUserInfoStore = defineStore('userInfo', () => {
  const uid = ref('')
  const loading = ref(false)
  const isLoggedIn = computed(() => Boolean(uid.value))
  let refreshTask: Promise<string> | null = null

  function readCurrentUid() {
    const currentUid = uniCloud.getCurrentUserInfo().uid
    uid.value = typeof currentUid === 'string' ? currentUid : ''
    return uid.value
  }

  function refresh(): Promise<string> {
    if (refreshTask)
      return refreshTask
    loading.value = true
    refreshTask = waitForAppAuthReady()
      .then(readCurrentUid)
      .finally(() => {
        loading.value = false
        refreshTask = null
      })
    return refreshTask
  }

  async function requireUid(message = '请先登录') {
    const currentUid = await refresh()
    if (!currentUid)
      throw new Error(message)
    return currentUid
  }

  return { uid, loading, isLoggedIn, refresh, requireUid }
})
