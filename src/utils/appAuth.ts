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
  // 首次启动已有等待者；只在上一轮完成后创建下一轮登录屏障。
  if (!resolveAuthReady) createAuthReadyPromise()
}

export function markAppAuthReady() {
  resolveAuthReady?.({ ok: true })
  resolveAuthReady = null
}

export function markAppAuthFailed(error: unknown) {
  const authError = authFailure(error)
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
  const { code } = await uni.login({ provider: 'weixin' })
  if (!code) throw new Error('未获取到微信登录凭证，请重试')
  const uniIdCo = uniCloud.importObject('uni-id-co', { customUI: true })
  const result = await uniIdCo.loginByWeixin({ code })
  if (result?.errCode) throw authFailure(result)
  const token = result?.newToken
  if (!token || typeof token.token !== 'string' || !token.token
    || typeof token.tokenExpired !== 'number' || !Number.isFinite(token.tokenExpired) || token.tokenExpired <= Date.now()) {
    throw new Error('登录服务未返回有效 Token，请检查云端配置')
  }
  uni.setStorageSync('uni_id_token', token.token)
  uni.setStorageSync('uni_id_token_expired', token.tokenExpired)
}

function authFailure(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'object' && error !== null && 'errMsg' in error && typeof error.errMsg === 'string' && error.errMsg) {
    return new Error(error.errMsg)
  }
  return new Error('登录失败，请稍后重试')
}

export function initializeAppAuth(force = false) {
  if (authInitializingPromise)
    return authInitializingPromise

  resetAppAuthReady()
  authInitializingPromise = Promise.resolve().then(async () => {

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
      const failure = authFailure(error)
      markAppAuthFailed(failure)
      throw failure
    }
  }).finally(() => { authInitializingPromise = null })

  return authInitializingPromise
}
