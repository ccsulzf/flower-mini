import type { CreationDraft, FlowerCardText } from '@/models/flower-creation'
import { parseArtwork } from './artwork'

export function validateCard(value: unknown): FlowerCardText {
  const text = value as Partial<FlowerCardText> | null
  if (!text || typeof text.blessing !== 'string' || typeof text.signature !== 'string' || text.blessing.length > 120 || text.signature.length > 24)
    throw new Error('花卡文字格式无效')
  return { blessing: text.blessing.trim(), signature: text.signature.trim() }
}
export function validateDraft(value: unknown): CreationDraft {
  const draft = value as Partial<CreationDraft> | null
  if (!draft || draft.version !== 1 || !Number.isFinite(draft.updatedAt) || (draft.updatedAt ?? -1) < 0
    || (draft.workId !== undefined && !/^[a-f\d]{32}$/.test(draft.workId))
    || (draft.workRevision !== undefined && (!Number.isSafeInteger(draft.workRevision) || draft.workRevision < 1))) {
    throw new Error('恢复草稿格式无效')
  }
  return { version: 1, artwork: parseArtwork(JSON.stringify(draft.artwork)), card: validateCard(draft.card), updatedAt: draft.updatedAt!, ...(draft.workId ? { workId: draft.workId, workRevision: draft.workRevision } : {}) }
}
function key(owner: string) {
  if (!owner)
    throw new Error('请先登录后恢复创作')
  return `flower-creation-draft:v1:${encodeURIComponent(owner)}`
}
export function readDraft(owner: string): CreationDraft | null {
  try {
    const value = uni.getStorageSync(key(owner))
    return value ? validateDraft(typeof value === 'string' ? JSON.parse(value) : value) : null
  }
  catch {
    throw new Error('恢复草稿读取失败，请重新开始或稍后重试')
  }
}
export function writeDraft(owner: string, draft: CreationDraft) {
  const value = validateDraft(draft)
  try {
    uni.setStorageSync(key(owner), JSON.stringify(value))
  }
  catch {
    throw new Error('草稿保存失败，请检查手机存储空间')
  }
}
export function clearDraft(owner: string) {
  try {
    uni.removeStorageSync(key(owner))
  }
  catch {
    throw new Error('草稿清除失败，请重试')
  }
}
