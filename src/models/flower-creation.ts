import type { Artwork } from './artwork'

export interface FlowerCardText { blessing: string, signature: string }
// 贺卡页的收件人仅用于图片制作，不写入作品或恢复草稿。
export interface FlowerGreetingText extends FlowerCardText { recipient: string }
export interface CreationDraft {
  version: 1
  artwork: Artwork
  card: FlowerCardText
  updatedAt: number
  workId?: string
  workRevision?: number
}
export interface SavedFlowerWork {
  id: string
  title: string
  description: string
  createdAt: number
  updatedAt: number
  draft: CreationDraft
  revision: number
}
