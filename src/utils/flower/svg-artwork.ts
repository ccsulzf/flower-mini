import type { FlowerKind } from './artwork'
import daisyBloom from './svg/daisy-bloom.svg?raw'
import daisyStem from './svg/daisy-stem.svg?raw'
import roseBloom from './svg/rose-bloom.svg?raw'
import roseStem from './svg/rose-stem.svg?raw'
import tulipBloom from './svg/tulip-bloom.svg?raw'
import tulipStem from './svg/tulip-stem.svg?raw'

const materials: Partial<Record<FlowerKind, { bloom: string, stem: string }>> = {
  rose: { bloom: roseBloom, stem: roseStem },
  tulip: { bloom: tulipBloom, stem: tulipStem },
  daisy: { bloom: daisyBloom, stem: daisyStem },
}

// SVG 仅含 ASCII；不依赖小程序环境中不存在的 window/btoa。
function imageSource(svg: string) {
  const bytes = new Uint8Array(svg.length)
  for (let index = 0; index < svg.length; index++)
    bytes[index] = svg.charCodeAt(index)
  return `data:image/svg+xml;base64,${uni.arrayBufferToBase64(bytes.buffer)}`
}

function innerSvg(svg: string) {
  return svg.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

function safeFlowerColor(color: string) {
  // 导入颜色和页面调色均只允许六位十六进制，避免将任意文本插进 XML。
  return /^#[\da-f]{6}$/i.test(color) ? color : '#f1e5bd'
}

export function bloomSvgMarkup(kind: FlowerKind, color: string) {
  const material = materials[kind]
  return material?.bloom.replace(/__COLOR__/g, safeFlowerColor(color))
}

export function bloomSvgSource(kind: FlowerKind, color: string) {
  const markup = bloomSvgMarkup(kind, color)
  return markup ? imageSource(markup) : undefined
}

export function stemSvgSource(kind: FlowerKind) {
  const material = materials[kind]
  return material ? imageSource(material.stem) : undefined
}

export function isSvgFlower(kind: FlowerKind) {
  return Boolean(materials[kind])
}

// 按 x=55 处的可见底部校准，花茎藏入花头约 2–4rpx，避免透明留白造成缝隙。
export function flowerConnectionY(kind: FlowerKind) {
  if (kind === 'daisy') return 102
  if (kind === 'tulip') return 93
  if (kind === 'rose') return 101
  return 55
}

export function plantSvgMarkup(kind: FlowerKind, color: string, stemHeight: number) {
  const material = materials[kind]
  if (!material) return undefined
  const safeColor = safeFlowerColor(color)
  const connection = flowerConnectionY(kind)
  const height = stemHeight + 55
  const stemScale = (height - connection) / 260
  const bloom = innerSvg(material.bloom.replace(/__COLOR__/g, safeColor))
  const stem = innerSvg(material.stem)
  // 花茎先绘制，花头盖住少量重叠；高度仍使花茎底端准确落在瓶口。
  return `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="${height}" viewBox="0 0 110 ${height}"><g transform="translate(0 ${connection}) scale(1 ${stemScale})">${stem}</g>${bloom}</svg>`
}

export function plantSvgSource(kind: FlowerKind, color: string, stemHeight: number) {
  const markup = plantSvgMarkup(kind, color, stemHeight)
  return markup ? imageSource(markup) : undefined
}
