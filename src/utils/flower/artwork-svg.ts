import type { CachedMaterial } from '@/models/material'
import type { Artwork } from '@/models/artwork'
import { backgroundOffset, backgroundSceneSource } from './background-render'
import { bouquetLayers, cloudPlantSvg, vaseLayers, vasePlacement } from './material-render'

type MaterialResolver = (id: string) => CachedMaterial | undefined

function nested(source: string, x: number, y: number, width: number, height: number) {
  const root = source.match(/<svg\b[^>]*>/)?.[0]
  const viewBox = root?.match(/\bviewBox\s*=\s*["']([^"']+)["']/)?.[1]
  if (!root || !viewBox)
    throw new Error('SVG 素材缺少 viewBox')
  return source.replace(root, `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" preserveAspectRatio="none">`)
}

function resolveMaterial(getMaterial: MaterialResolver, id: string, categories: CachedMaterial['category'][]) {
  const material = getMaterial(id)
  if (!material || !categories.includes(material.category))
    throw new Error(`素材 ${id} 尚未准备好`)
  return material
}

function vaseSvg(material: CachedMaterial, layer: 'back' | 'front') {
  const placement = vasePlacement(material)
  if (material.category !== 'bouquet') {
    const layers = vaseLayers(material)
    return nested(layers[layer], placement.x, placement.y, placement.width, placement.height)
  }
  const layers = bouquetLayers(material)
  return nested(layers[layer], placement.x, placement.y, placement.width, placement.height)
}

export function renderArtworkSvg(artwork: Artwork, getMaterial: MaterialResolver) {
  const vase = resolveMaterial(getMaterial, artwork.container.materialId, [artwork.container.type])
  const background = resolveMaterial(getMaterial, artwork.background.materialId, ['background'])
  const backgroundSvg = nested(backgroundSceneSource(background), 0, 0, 698, 1000)
  const offset = backgroundOffset(background, vase)
  const vaseBack = vaseSvg(vase, 'back')
  const vaseFront = vaseSvg(vase, 'front')
  const materials = artwork.materials.map((instance) => {
    const material = resolveMaterial(getMaterial, instance.materialId, ['flower'])
    const source = cloudPlantSvg(material, instance).replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    const { anchor, angle, height, scale, mirrored } = instance.transform
    const mirror = mirrored ? -scale : scale
    return `<g transform="translate(${anchor.x} ${anchor.y}) rotate(${angle}) scale(${mirror} ${scale}) translate(-55 ${-(height + 55)})">${source}</g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000" viewBox="0 0 698 1000"><rect width="698" height="1000" fill="#f6f3eb"/>${backgroundSvg}<g transform="translate(0 ${offset})">${vaseBack}${materials}${vaseFront}</g></svg>`
}
