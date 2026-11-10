import { callCloud } from '@/api/cloud-client'

export interface WorkSummary {
  id: string
  title: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface DailyFlowerSummary {
  id: string
  date: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface PageResult<T> {
  items: T[]
  hasMore: boolean
}

export interface RemovalResult {
  deleted: number
  cleanupWarnings: number
}

const object = 'flower-artwork-ops'

export function listWorks(page: number, pageSize = 20) {
  return callCloud<{ page: number, pageSize: number }, PageResult<WorkSummary>>({
    object,
    method: 'listWorks',
    payload: { page, pageSize },
    auth: 'authenticated',
    operation: 'read',
    fallbackMessage: '作品列表加载失败',
  })
}

export function listDailyFlowers(page: number, pageSize = 20) {
  return callCloud<{ page: number, pageSize: number }, PageResult<DailyFlowerSummary>>({
    object,
    method: 'listDailyFlowers',
    payload: { page, pageSize },
    auth: 'authenticated',
    operation: 'read',
    fallbackMessage: '今日花束列表加载失败',
  })
}

export function removeWorks(ids: string[]) {
  return callCloud<{ ids: string[] }, RemovalResult>({
    object,
    method: 'removeWorks',
    payload: { ids },
    auth: 'authenticated',
    operation: 'write',
    fallbackMessage: '批量删除作品失败',
  })
}

export function removeAllWorks() {
  return callCloud<Record<string, never>, RemovalResult>({
    object,
    method: 'removeAllWorks',
    payload: {},
    auth: 'authenticated',
    operation: 'write',
    fallbackMessage: '删除全部作品失败',
  })
}

export function removeDailyFlowers(ids: string[]) {
  return callCloud<{ ids: string[] }, RemovalResult>({
    object,
    method: 'removeDailyFlowers',
    payload: { ids },
    auth: 'authenticated',
    operation: 'write',
    fallbackMessage: '批量删除今日花束失败',
  })
}

export function removeAllDailyFlowers() {
  return callCloud<Record<string, never>, RemovalResult>({
    object,
    method: 'removeAllDailyFlowers',
    payload: {},
    auth: 'authenticated',
    operation: 'write',
    fallbackMessage: '删除全部今日花束失败',
  })
}
