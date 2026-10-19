import type { Artwork } from '@/models/artwork'
import type { DailyFlowerHistoryPage, DailyFlowerRecord } from '@/models/daily-flower'
import { callCloud } from '@/api/cloud-client'
import { parseDailyFlower, parseDailyFlowerSummary } from '@/utils/flower/daily-flower'

interface FlowerResponse<T> {
  flower: T | null
}

interface DailyFlowerPayload {
  date: string
  description: string
  artwork: Artwork
  imageFileId?: string
  imageUrl?: string
}

function parseRecord(value: DailyFlowerPayload, requestedDate: string): DailyFlowerRecord {
  if (value.date !== requestedDate || typeof value.imageFileId !== 'string' || !value.imageFileId
    || typeof value.imageUrl !== 'string' || !/^https:\/\//.test(value.imageUrl)) {
    throw new Error('每日花束记录无效')
  }
  const parsed = parseDailyFlower(JSON.stringify(value))
  return { ...parsed, imageFileId: value.imageFileId, imageUrl: value.imageUrl }
}

export async function getDailyFlowerByDate(date: string): Promise<DailyFlowerRecord | null> {
  const result = await callCloud<{ date: string }, FlowerResponse<DailyFlowerPayload>>({
    object: 'flower-daily',
    method: 'getByDate',
    auth: 'public',
    operation: 'read',
    payload: { date },
    fallbackMessage: '每日花束加载失败',
  })
  return result.flower ? parseRecord(result.flower, date) : null
}

export async function getDailyFlowerArtwork(date: string): Promise<Artwork | null> {
  const result = await callCloud<{ date: string }, FlowerResponse<DailyFlowerPayload>>({
    object: 'flower-daily',
    method: 'getArtwork',
    auth: 'public',
    operation: 'read',
    payload: { date },
    fallbackMessage: '每日花束作品加载失败',
  })
  if (!result.flower)
    return null
  if (result.flower.date !== date)
    throw new Error('每日花束记录无效')
  return parseDailyFlower(JSON.stringify(result.flower)).artwork
}

export async function listDailyFlowerHistory(input: {
  page: number
  pageSize: number
  date?: string
}): Promise<DailyFlowerHistoryPage> {
  const result = await callCloud<typeof input, { items: unknown[], hasMore: unknown }>({
    object: 'flower-daily',
    method: 'listHistory',
    auth: 'public',
    operation: 'read',
    payload: { ...input },
    fallbackMessage: '历史花束加载失败',
  })
  if (!Array.isArray(result.items) || typeof result.hasMore !== 'boolean')
    throw new Error('历史花束数据格式无效')
  const items = result.items.map(item => parseDailyFlowerSummary(JSON.stringify(item)))
  if (new Set(items.map(item => item.date)).size !== items.length)
    throw new Error('历史花束包含重复日期')
  return { items, hasMore: result.hasMore }
}
