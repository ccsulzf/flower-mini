import type { Artwork, MaterialLayout } from './artwork'

function copyLayout(layout: MaterialLayout): MaterialLayout { return { ...layout, anchor: { ...layout.anchor } } }
export function copyContainerLayouts(layouts: Artwork['containerLayouts']): Artwork['containerLayouts'] { return Object.fromEntries(Object.entries(layouts).map(([key, rows]) => [key, rows.map(copyLayout)])) }
export function copyArtwork(artwork: Artwork): Artwork {
  return {
    background: { ...artwork.background },
    container: { ...artwork.container },
    materials: artwork.materials.map(material => ({ ...material, transform: { ...material.transform, anchor: { ...material.transform.anchor } } })),
    containerLayouts: copyContainerLayouts(artwork.containerLayouts),
  }
}
export class ArtworkHistory {
  past: Artwork[] = []
  future: Artwork[] = []
  remember(current: Artwork) { this.pushPast(current); this.future = [] }
  undo(current: Artwork): Artwork | undefined { const previous = this.past.pop(); if (!previous) return; this.future.push(copyArtwork(current)); return previous }
  redo(current: Artwork): Artwork | undefined { const next = this.future.pop(); if (!next) return; this.pushPast(current); return next }
  private pushPast(current: Artwork) { this.past.push(copyArtwork(current)); if (this.past.length > 30) this.past.shift() }
}
