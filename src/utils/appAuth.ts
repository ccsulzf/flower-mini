import type { AuthReadyResult } from '@/models/auth.interface'

let authReadyPromise: Promise<AuthReadyResult> | null = null
let resolveAuthReady: ((result: AuthReadyResult) => void) | null = null
let authInitializingPromise: Promise<{ hasNewLogin: boolean }> | null = null

function createAuthReadyPromise() {
  authReadyPromise = new Promise<AuthReadyResult>((resolve) => {
    resolveAuthReady = resolve
  })
}

createAuthReadyPromise()

export function resetAppAuthReady() {
  createAuthReadyPromise()
}

export function markAppAuthReady() {
  resolveAuthReady?.({ ok: true })
  resolveAuthReady = null
}

export function markAppAuthFailed(error: unknown) {
  const authError = error instanceof Error ? error : new Error('登录失败，请稍后重试')
  resolveAuthReady?.({ ok: false, error: authError })
  resolveAuthReady = null
}

export async function waitForAppAuthReady() {
  if (!authReadyPromise) {
    createAuthReadyPromise()
  }

  const readyPromise = authReadyPromise
  if (!readyPromise)
    throw new Error('登录状态初始化失败')

  const result = await readyPromise
  if (!result.ok)
    throw result.error || new Error('登录失败，请稍后重试')
}

async function weixinLogin() {
  const { code } = await uni.login()
  const uniIdCo = uniCloud.importObject('uni-id-co', { customUI: true })
  await uniIdCo.loginByWeixin({ code })
}

export function initializeAppAuth(force = false) {
  if (authInitializingPromise)
    return authInitializingPromise

  authInitializingPromise = (async () => {
    resetAppAuthReady()

    try {
      const localToken = uni.getStorageSync('uni_id_token')
      let hasNewLogin = false

      if (!localToken || force) {
        await weixinLogin()
        hasNewLogin = true
      }
      else {
        const token = uniCloud.importObject('token', { customUI: true })
        const res = await token.checkToken()
        if (!res?.valid) {
          await weixinLogin()
          hasNewLogin = true
        }
      }

      markAppAuthReady()
      return { hasNewLogin }
    }
    catch (error) {
      markAppAuthFailed(error)
      throw error
    }
    finally {
      authInitializingPromise = null
    }
  })()

  return authInitializingPromise
}
