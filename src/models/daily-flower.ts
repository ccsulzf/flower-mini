import type { Artwork } from '@/models/artwork'

export interface DailyFlowerSummary {
  date: string
  description: string
}

export interface DailyFlowerRecord extends DailyFlowerSummary {
  artwork: Artwork
  imageFileId: string
  imageUrl: string
}

export interface LocalDailyFlower extends DailyFlowerRecord {
  imagePath: string
}

export interface DailyFlowerHistoryPage {
  items: DailyFlowerSummary[]
  hasMore: boolean
}
