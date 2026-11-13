import type { Artwork, MaterialLayout } from '@/models/artwork'
import { callCloud } from '@/api/cloud-client'

export function probeFlowerAi() {
  return callCloud<Record<string, never>, { model: string, elapsedMs: number, status: string, text: string }>({
    object: 'flower-ai', method: 'probe', auth: 'authenticated', operation: 'write',
    payload: {}, fallbackMessage: '最小请求失败',
  })
}

export interface FlowerOptimization {
  changed: boolean
  reason?: string
  boundaryAdjustedIds?: number[]
  adjustments: (Omit<MaterialLayout, 'materialInstanceId'> & { id: number, color: string })[]
  orderedIds: number[]
}
export interface FlowerAiResult {
  valid: boolean
  validationError: string
  optimization: FlowerOptimization | null
  debug: {
    promptVersion?: string
    plan?: {
      changed: boolean
      reason: string
      placements: { id: number, center: { x: number, y: number }, scale: number, color: string }[]
      orderedIds: number[]
    }
    model: string
    responseId: string
    elapsedMs: number
    usage: { inputTokens: number | null, outputTokens: number | null }
    rawText: string
    mouth: { left: number, right: number, y: number }
  }
}
export function optimizeFlower(artwork: Artwork) {
  return callCloud<{ artwork: Artwork }, FlowerAiResult>({
    object: 'flower-ai',
    method: 'optimize',
    auth: 'authenticated',
    operation: 'write',
    payload: { artwork },
    fallbackMessage: 'AI 优化失败',
  })
}
