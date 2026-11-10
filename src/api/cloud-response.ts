import type { CloudResponse } from '@/api/cloud-types'

export class CloudApiError extends Error {
  code: string
  override cause?: unknown

  constructor(code: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'CloudApiError'
    this.code = code
    this.cause = cause
  }
}

export function unwrapCloudResponse<T>(value: unknown): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || !('code' in value) || value.code !== 0) {
    throw new CloudApiError('INVALID_RESPONSE', '云服务响应协议无效', value)
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'data'))
    throw new CloudApiError('INVALID_RESPONSE_DATA', '云服务响应数据无效', value)
  return (value as CloudResponse<T>).data
}

export function toCloudApiError(error: unknown, fallbackMessage = '云服务请求失败'): CloudApiError {
  if (error instanceof CloudApiError)
    return error
  if (error instanceof Error)
    return new CloudApiError('CLOUD_REQUEST_FAILED', error.message || fallbackMessage, error)
  if (typeof error === 'object' && error !== null) {
    const code = 'errCode' in error && typeof error.errCode === 'string' && error.errCode
      ? error.errCode
      : 'CLOUD_REQUEST_FAILED'
    const message = 'errMsg' in error && typeof error.errMsg === 'string' && error.errMsg
      ? error.errMsg
      : fallbackMessage
    return new CloudApiError(code, message, error)
  }
  return new CloudApiError('CLOUD_REQUEST_FAILED', fallbackMessage, error)
}
