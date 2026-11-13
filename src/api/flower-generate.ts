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

export function generateFlower(prompt: string, recentBackgroundIds: string[] = []) {
  return callCloud<{ prompt: string, recentBackgroundIds: string[] }, FlowerGenerationResult>({
    object: 'flower-generate', method: 'generate', auth: 'authenticated', operation: 'write',
    payload: { prompt, recentBackgroundIds }, fallbackMessage: '花束生成失败',
  })
}

export function getFlowerGenerationQuota() {
  return callCloud<undefined, { available: boolean }>({
    object: 'flower-generate', method: 'quota', auth: 'authenticated', operation: 'read',
    payload: undefined, fallbackMessage: '暂时无法生花，请稍后重试',
  })
}
