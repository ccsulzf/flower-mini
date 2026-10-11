import type { Artwork } from './artwork'

export interface FlowerCardText { blessing: string, signature: string }
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
  createdAt: number
  updatedAt: number
  draft: CreationDraft
  thumbnailFileId: string
  thumbnailUrl?: string
  revision: number
}
