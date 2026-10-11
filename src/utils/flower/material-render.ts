import type { CachedMaterial, FlowerGeometry, VaseGeometry } from '@/models/material'
import type { Stem } from '@/models/artwork'
import { naturalStemSource, smoothStemTip } from './stem-curves'
export function svgImageSource(source: string) {
  const encoded = encodeURIComponent(source).replace(/%([\dA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
  return `data:image/svg+xml;base64,${uni.arrayBufferToBase64(Uint8Array.from(encoded, char => char.charCodeAt(0)).buffer)}`
}
function nested(source: string, x: number, y: number, width: number, height: number) {
  return source.replace(/<svg\b[^>]*>/, root => {
    const viewBox = root.match(/viewBox\s*=\s*["']([^"']+)["']/)?.[1]
    if (!viewBox) throw new Error('素材缺少 viewBox')
    return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" preserveAspectRatio="none">`
  })
}
export function cloudPlantSvg(material: CachedMaterial, stem: Pick<Stem, 'color' | 'stemHeight' | 'leafMode'>) {
  if (material.category !== 'flower' || !material.geometry) throw new Error('花材几何信息缺失')
  const total = stem.stemHeight + 55
  const safeColor = /^#[\da-f]{6}$/i.test(stem.color) ? stem.color : material.colors[0].value
  if (material.group === 'foliage') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 ${total}">${nested(material.sources.foliage!.replace(/__COLOR__/g, safeColor), 0, 0, 110, total)}</svg>`
  const geometry = material.geometry as FlowerGeometry
  const headHeight = geometry.flowerHeight * 110 / geometry.width
  const connection = geometry.connectionY * 110 / geometry.width
  const stemSource = stem.leafMode === 'without' ? material.sources.stemWithoutLeaves : material.sources.stemWithLeaves
  if (!stemSource || !material.sources.flower) throw new Error('花材文件缺失')
  // 花心保持 y=55，花茎连接点由素材提供，花器盖住底端。
  const headTop = 55 - headHeight / 2
  // 旧银莲花档案连接点落在透明留白里；兼容旧云版本并让茎顶藏进花瓣。
  const join = Math.max(headTop, headTop + (material.id === 'anemone' ? Math.min(connection, 84) : connection) - 8)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 ${total}">${nested(smoothStemTip(stem.leafMode === 'without' ? naturalStemSource(stemSource, material.id) : stemSource), 0, join, 110, total - join)}${nested(material.sources.flower.replace(/__COLOR__/g, safeColor), 0, headTop, 110, headHeight)}</svg>`
}
export function vasePlacement(material: CachedMaterial) {
  if ((material.category !== 'vase' && material.category !== 'bouquet') || !material.geometry || !(material.sources.vase || material.sources.bouquet)) throw new Error('花瓶素材不可用')
  const geometry = material.geometry as VaseGeometry
  // 旧花束档案将包装中部当作瓶口；花枝实际应在下方束口收拢。
  const mouthY = material.category === 'bouquet' && geometry.mouthY < geometry.height * .65
    ? geometry.height * .86 : geometry.mouthY
  const mouthWidth = material.category === 'bouquet' ? Math.min(geometry.mouthWidth, 24) : geometry.mouthWidth
  return { x: 350 - geometry.mouthX, y: 747 - mouthY, width: geometry.width, height: geometry.height, mouthLeft: 350 - mouthWidth / 2, mouthRight: 350 + mouthWidth / 2 }
}

export function bouquetLayers(material: CachedMaterial) {
  if (material.category !== 'bouquet' || !material.sources.bouquet || !material.geometry) throw new Error('花束素材不可用')
  const source = material.sources.bouquet
  const authoredBack = source.match(/<!-- bouquet-back:start -->([\s\S]*?)<!-- bouquet-back:end -->/)?.[1]
  const authoredFront = source.match(/<!-- bouquet-front:start -->([\s\S]*?)<!-- bouquet-front:end -->/)?.[1]
  if (authoredBack && authoredFront) {
    const root = source.match(/<svg\b[^>]*>/)![0]
    const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0] || ''
    return { back: `${root}${defs}${authoredBack}</svg>`, front: `${root}${defs}${authoredFront}</svg>` }
  }
  const colors = Array.from(source.matchAll(/stop-color="(#[\da-f]{6})"/gi), match => match[1])
  const light = colors[0] || '#eee8d9', shade = colors[1] || '#c7beab'
  const geometry = material.geometry as VaseGeometry
  // 后纸衬在花枝后面；前纸两翼留出深 V 形开口，只在束口遮住茎底。
  const front = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.width} ${geometry.height}"><g transform="scale(${geometry.width / 350} ${geometry.height / 290})">
    <path d="M35 38Q95 112 164 210L181 254L115 213Q65 132 35 38Z" fill="${light}" stroke="${shade}" stroke-width=".6"/>
    <path d="M320 47Q265 132 185 207L169 254L229 210Q279 135 320 47Z" fill="${shade}" stroke="${light}" stroke-width=".6"/>
    <path d="M52 58Q110 154 173 243M301 67Q255 158 181 243" fill="none" stroke="${light}" stroke-width="1"/>
    <path d="M164 232Q177 218 190 232L185 252Q200 267 202 286Q176 292 152 286Q153 267 168 251Z" fill="${light}" stroke="${shade}" stroke-width=".5"/>
    <path d="M176 249C153 230 139 245 158 253Q169 256 176 249C189 228 214 240 196 252Q186 257 176 249Z" fill="${shade}"/>
    <path d="M173 252L161 280L169 275L174 281L179 253M181 252L195 275L187 272L185 279L176 254" fill="${shade}"/>
    <ellipse cx="177" cy="251" rx="5" ry="4" fill="${shade}"/>
  </g></svg>`
  return { back: source, front }
}
