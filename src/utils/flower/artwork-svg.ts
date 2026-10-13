import type { CachedMaterial } from '@/models/material'
import type { Artwork, Stem } from '@/models/artwork'
import { anchorY, artworkBackground } from './artwork'
import { backgroundOffset, backgroundSceneSource } from './background-render'
import { bouquetLayers, cloudPlantSvg, vasePlacement } from './material-render'
import { plantSvgMarkup } from './svg-artwork'

type MaterialResolver = (id: string, revision: string) => CachedMaterial | undefined

function nested(source: string, x: number, y: number, width: number, height: number) {
  const root = source.match(/<svg\b[^>]*>/)?.[0]
  const viewBox = root?.match(/\bviewBox\s*=\s*["']([^"']+)["']/)?.[1]
  if (!root || !viewBox)
    throw new Error('SVG 素材缺少 viewBox')
  return source.replace(root, `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" preserveAspectRatio="none">`)
}

function builtInVase(vase: Artwork['vase']) {
  if (vase === '花束')
    return '<g><path d="M180 615H520L350 890Z" fill="#ded5c5"/><path d="M205 643H490L350 878Z" fill="#f1e9d9"/><path d="M235 650H475L350 885Z" fill="#e8decb"/><path d="M292 778H408V798H292Z" fill="#c98b94"/></g>'
  const round = vase === '圆花器'
  const glass = vase === '玻璃瓶'
  const left = round ? 260 : 280
  const top = round ? 765 : 735
  const width = round ? 180 : 140
  const height = round ? 140 : 170
  const colors = glass ? ['#7ea49e', '#e1f0e5', '#799e97'] : round ? ['#bfa18f', '#e5cbbc', '#c4a18d'] : ['#e6e2d7', '#dedacf', '#cdc9bd']
  const opacity = glass ? ' opacity=".72"' : ''
  return `<g><ellipse cx="350" cy="910" rx="109" ry="15" fill="#000" opacity=".12"/><path d="M${left + width * 0.18} ${top} C${left} ${top} ${left} ${top + height * 0.15} ${left} ${top + height * 0.42} C${left} ${top + height} ${left + width * 0.18} ${top + height} ${left + width * 0.5} ${top + height} C${left + width * 0.82} ${top + height} ${left + width} ${top + height} ${left + width} ${top + height * 0.42} C${left + width} ${top + height * 0.15} ${left + width * 0.82} ${top} ${left + width * 0.82} ${top} Z" fill="url(#vase)"${opacity}/><ellipse cx="350" cy="${top + 2}" rx="${round ? 45 : 70}" ry="7.5" fill="${glass ? '#a4beb0' : '#84917b'}"/><ellipse cx="${left + 30}" cy="${top + 81}" rx="4" ry="49" fill="#fff" opacity=".2"/></g>`
}

function vaseSvg(material: CachedMaterial, layer: 'back' | 'front') {
  const source = material.sources.vase || material.sources.bouquet
  if (!source)
    throw new Error('花器 SVG 素材缺失')
  const placement = vasePlacement(material)
  if (material.category !== 'bouquet')
    return layer === 'front' ? nested(source, placement.x, placement.y, placement.width, placement.height) : ''
  const layers = bouquetLayers(material)
  if (layer === 'back')
    return nested(layers.back, placement.x, placement.y, placement.width, placement.height)
  const front = layers.front
  if (front !== source)
    return nested(front, placement.x, placement.y, placement.width, placement.height)
  const colors = Array.from(source.matchAll(/stop-color="(#[\da-f]{6})"/gi), match => match[1])
  const light = colors[0] || '#eee8d9'
  const shade = colors[1] || '#c7beab'
  const geometry = material.geometry
  const wrap = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.width} ${geometry.height}"><g transform="scale(${geometry.width / 350} ${geometry.height / 290})">
    <path d="M35 38Q95 112 164 210L181 254L115 213Q65 132 35 38Z" fill="${light}" stroke="${shade}" stroke-width=".6"/>
    <path d="M320 47Q265 132 185 207L169 254L229 210Q279 135 320 47Z" fill="${shade}" stroke="${light}" stroke-width=".6"/>
    <path d="M52 58Q110 154 173 243M301 67Q255 158 181 243" fill="none" stroke="${light}" stroke-width="1"/>
    <path d="M164 232Q177 218 190 232L185 252Q200 267 202 286Q176 292 152 286Q153 267 168 251Z" fill="${light}" stroke="${shade}" stroke-width=".5"/>
    <path d="M176 249C153 230 139 245 158 253Q169 256 176 249C189 228 214 240 196 252Q186 257 176 249Z" fill="${shade}"/>
    <path d="M173 252L161 280L169 275L174 281L179 253M181 252L195 275L187 272L185 279L176 254" fill="${shade}"/>
    <ellipse cx="177" cy="251" rx="5" ry="4" fill="${shade}"/>
  </g></svg>`
  return nested(wrap, placement.x, placement.y, placement.width, placement.height)
}

function plantSvg(stem: Stem, getMaterial: MaterialResolver) {
  if (stem.materialId) {
    const material = getMaterial(stem.materialId, stem.materialRevision || '')
    if (!material || material.revision !== stem.materialRevision)
      throw new Error(`花材 ${stem.materialId} 的 SVG 尚未准备好`)
    return cloudPlantSvg(material, { ...stem, leafMode: 'without' })
  }
  const svg = plantSvgMarkup(stem.kind, stem.color, stem.stemHeight, true)
  if (!svg)
    throw new Error(`暂不支持“${stem.kind}”花材的 SVG`)
  return svg
}

export function renderArtworkSvg(artwork: Artwork, getMaterial: MaterialResolver) {
  const vase = artwork.vaseMaterialId ? getMaterial(artwork.vaseMaterialId, artwork.vaseMaterialRevision || '') : undefined
  const background = artwork.backgroundMaterialId ? getMaterial(artwork.backgroundMaterialId, artwork.backgroundMaterialRevision || '') : undefined
  if (artwork.vaseMaterialId && !vase)
    throw new Error('花器 SVG 尚未准备好')
  if (artwork.backgroundMaterialId && !background)
    throw new Error('背景 SVG 尚未准备好')
  const backgroundSvg = background?.sources.background
    ? nested(backgroundSceneSource(background), 0, 0, 698, 1000)
    : ''
  const offset = background ? backgroundOffset(background, vase, artwork.vase) : 0
  const vaseBack = vase ? vaseSvg(vase, 'back') : ''
  const vaseFront = vase ? vaseSvg(vase, 'front') : builtInVase(artwork.vase)
  const stems = artwork.stems.map((stem) => {
    const source = plantSvg(stem, getMaterial).replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    const mirror = stem.mirrored ? -stem.flowerScale : stem.flowerScale
    const height = stem.stemHeight + 55
    return `<g transform="translate(${stem.x} ${anchorY(artwork.vase) + offset}) rotate(${stem.angle}) scale(${mirror} ${stem.flowerScale}) translate(-55 ${-height})">${source}</g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000" viewBox="0 0 698 1000"><defs><linearGradient id="vase" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6e2d7"/><stop offset=".58" stop-color="#dedacf"/><stop offset="1" stop-color="#cdc9bd"/></linearGradient></defs><rect width="698" height="1000" fill="${artworkBackground(artwork.background)}"/>${backgroundSvg}<g>${vaseBack}${stems}${vaseFront}</g></svg>`
}
