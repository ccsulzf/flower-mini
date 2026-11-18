import type { Artwork } from '@/models/artwork'
import { parseArtwork } from './artwork'

let pending: { key: string, uid: string, artwork: Artwork } | null = null
let sequence = 0

export function stageGeneratedArtwork(uid: string, artwork: Artwork) {
  const key = `${Date.now()}-${++sequence}`
  pending = { key, uid, artwork: parseArtwork(JSON.stringify(artwork)) }
  return key
}

export function takeGeneratedArtwork(uid: string, key: string) {
  if (!pending || pending.key !== key || pending.uid !== uid)
    throw new Error('生成花束已失效，请返回生成页重新带入')
  const artwork = pending.artwork
  pending = null
  return artwork
}
