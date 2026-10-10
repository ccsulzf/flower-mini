import type { Artwork } from './artwork'

function copyArtwork(artwork: Artwork): Artwork {
  return { ...artwork, stems: artwork.stems.map(stem => ({ ...stem })) }
}

export class ArtworkHistory {
  past: Artwork[] = []
  future: Artwork[] = []

  remember(current: Artwork) {
    this.pushPast(current)
    this.future = []
  }

  undo(current: Artwork): Artwork | undefined {
    const previous = this.past.pop()
    if (!previous) return
    this.future.push(copyArtwork(current))
    return previous
  }

  redo(current: Artwork): Artwork | undefined {
    const next = this.future.pop()
    if (!next) return
    this.pushPast(current)
    return next
  }

  private pushPast(current: Artwork) {
    this.past.push(copyArtwork(current))
    if (this.past.length > 30) this.past.shift()
  }
}
