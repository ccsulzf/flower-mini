import type { Artwork } from '@/models/artwork'
import { callCloud } from '@/api/cloud-client'

export interface FlowerGenerationResult {
  artwork: Artwork
  reason: string
  boundaryAdjustedIds: number[]
  design: {
    warnings: string[]
    roles: { main: number, secondary: number, filler: number, foliage: number }
    speciesCount: number
    silhouette: { width: number, height: number }
    compositionAdjustedIds: number[]
    depthOrdered: boolean
  }
  debug: {
    model: string
    elapsedMs: number
    responseId: string
    promptVersion: string
    attempts: number
    usage: { inputTokens: number | null, outputTokens: number | null }
  }
}

export async function generateFlower(prompt: string, recentBackgroundIds: string[] = []) {
  try {
    return await callCloud<{ prompt: string, recentBackgroundIds: string[] }, FlowerGenerationResult>({
      object: 'flower-generate', method: 'generate', auth: 'authenticated', operation: 'write',
      payload: { prompt, recentBackgroundIds }, fallbackMessage: '花束生成失败',
    })
  }
  catch (cause) {
    // 仅透出可操作的业务提示，SDK/模型/数据库的内部错误不直接展示给用户。
    const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : ''
    if (code === 'DAILY_LIMIT_REACHED' || code === 'AUTH_REQUIRED')
      throw cause
    throw new Error('这一束暂时没能生成，请稍后重试')
  }
}

export function getFlowerGenerationQuota() {
  return callCloud<undefined, { available: boolean }>({
    object: 'flower-generate', method: 'quota', auth: 'authenticated', operation: 'read',
    payload: undefined, fallbackMessage: '暂时无法生花，请稍后重试',
  })
}
