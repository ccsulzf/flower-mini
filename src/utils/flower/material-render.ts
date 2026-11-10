import { colorizeMaterialSvg } from './material-color'
import type { CachedMaterial, FlowerGeometry, VaseGeometry } from '@/models/material'
import type { MaterialInstance } from '@/models/artwork'
import { fitStemJoin, naturalStemSource, smoothStemTip } from './stem-curves'
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

function foliageSvg(source: string, total: number, color: string) {
  const viewBox = source.match(/<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/)?.[1]
  const box = viewBox?.trim().split(/[\s,]+/).map(Number)
  if (!box || box.length !== 4 || box.some(value => !Number.isFinite(value)) || box[2] <= 0 || box[3] <= 0)
    throw new Error('叶材素材 viewBox 无效')
  const naturalHeight = box[3] * 110 / box[2]
  const extension = total > naturalHeight
    ? `<path d="M55 ${naturalHeight}L55 ${total}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" opacity=".82"/>`
    : ''
  // 叶冠保持素材的天然尺寸：变短时从瓶口端裁去，变长时只延长底部枝条。
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 ${total}">${extension}${nested(source, 0, 0, 110, naturalHeight)}</svg>`
}

export function cloudPlantSvg(material: CachedMaterial, instance: Pick<MaterialInstance, 'color' | 'transform'>) {
  if (material.category !== 'flower' || !material.geometry) throw new Error('花材几何信息缺失')
  const total = instance.transform.height + 55
  const safeColor = /^#[\da-f]{6}$/i.test(instance.color) ? instance.color : material.colors[0].value
  if (material.group === 'foliage') return foliageSvg(material.sources.foliage!.replace(/__COLOR__/g, safeColor), total, safeColor)
  const geometry = material.geometry as FlowerGeometry
  const headHeight = geometry.flowerHeight * 110 / geometry.width
  const connection = geometry.connectionY * 110 / geometry.width
  const stemSource = material.sources.stemWithoutLeaves
  if (!stemSource || !material.sources.flower) throw new Error('花材文件缺失')
  // 花心保持 y=55，花茎连接点由素材提供，花器盖住底端。
  const headTop = 55 - headHeight / 2
  // 银莲花档案连接点落在透明留白里，让茎顶藏进花瓣。
  const overlap = stemSource.includes('<!-- continuous-stem-join -->') ? 0 : 8
  const join = Math.max(headTop, headTop + (material.id === 'anemone' ? Math.min(connection, 84) : connection) - overlap)
  const shapedStem = smoothStemTip(naturalStemSource(stemSource, material.id))
  const fittedStem = fitStemJoin(shapedStem, (total - join) / geometry.stemHeight / (110 / geometry.width))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 ${total}">${nested(fittedStem, 0, join, 110, total - join)}${nested(colorizeMaterialSvg(material.sources.flower, safeColor), 0, headTop, 110, headHeight)}</svg>`
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

function clippedSvg(source: string, id: string, x: number, y: number, width: number, height: number) {
  const root = source.match(/<svg\b[^>]*>/)?.[0]
  if (!root) throw new Error('花瓶 SVG 根节点缺失')
  const content = source.slice(source.indexOf(root) + root.length).replace(/<\/svg>\s*$/, '')
  return `${root}<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}" /></clipPath></defs><g clip-path="url(#${id})">${content}</g></svg>`
}

export function vaseLayers(material: CachedMaterial) {
  if (material.category !== 'vase' || !material.sources.vase || !material.geometry) throw new Error('花瓶素材不可用')
  const geometry = material.geometry as VaseGeometry
  const splitY = Math.max(0, Math.min(geometry.height, geometry.mouthY))
  const clipId = material.id.replace(/[^a-z0-9_-]/gi, '-')
  return {
    back: clippedSvg(material.sources.vase, `${clipId}-vase-back`, 0, 0, geometry.width, splitY),
    front: clippedSvg(material.sources.vase, `${clipId}-vase-front`, 0, splitY, geometry.width, geometry.height - splitY),
  }
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
  throw new Error('花束素材缺少前后分层标记')
}
