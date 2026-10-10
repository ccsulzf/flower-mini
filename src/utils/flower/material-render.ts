import type { CachedMaterial, FlowerGeometry, VaseGeometry } from '@/models/material'
import type { Stem } from '@/models/artwork'
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
export function cloudPlantSvg(material: CachedMaterial, stem: Stem) {
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
  const join = headTop + connection
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 ${total}">${nested(stemSource, 0, join, 110, total - join)}${nested(material.sources.flower.replace(/__COLOR__/g, safeColor), 0, headTop, 110, headHeight)}</svg>`
}
export function vasePlacement(material: CachedMaterial) {
  if ((material.category !== 'vase' && material.category !== 'bouquet') || !material.geometry || !(material.sources.vase || material.sources.bouquet)) throw new Error('花瓶素材不可用')
  const geometry = material.geometry as VaseGeometry
  return { x: 350 - geometry.mouthX, y: 747 - geometry.mouthY, width: geometry.width, height: geometry.height, mouthLeft: 350 - geometry.mouthWidth / 2, mouthRight: 350 + geometry.mouthWidth / 2 }
}
