import type { CloudCallOptions } from '@/api/cloud-types'
import { CloudApiError, toCloudApiError, unwrapCloudResponse } from '@/api/cloud-response'
import { initializeAppAuth, waitForAppAuthReady } from '@/utils/appAuth'

type CloudMethod = (payload: unknown) => Promise<unknown>

async function invoke<TInput, TOutput>(options: CloudCallOptions<TInput>): Promise<TOutput> {
  const cloud = uniCloud.importObject(options.object, { customUI: true }) as Record<string, unknown>
  const method = cloud[options.method]
  if (typeof method !== 'function') {
    throw new CloudApiError(
      'CLIENT_METHOD_MISSING',
      `云对象 ${options.object} 缺少方法 ${options.method}`,
    )
  }
  const response = await (method as CloudMethod).call(cloud, options.payload)
  return unwrapCloudResponse<TOutput>(response)
}

export async function callCloud<TInput, TOutput>(options: CloudCallOptions<TInput>): Promise<TOutput> {
  if (options.auth !== 'public')
    await waitForAppAuthReady()

  try {
    return await invoke<TInput, TOutput>(options)
  }
  catch (error) {
    const failure = toCloudApiError(error, options.fallbackMessage)
    if (failure.code !== 'AUTH_REQUIRED' || options.auth === 'public' || options.operation !== 'read')
      throw failure
    await initializeAppAuth(true)
    try {
      return await invoke<TInput, TOutput>(options)
    }
    catch (retryError) {
      throw toCloudApiError(retryError, options.fallbackMessage)
    }
  }
}
