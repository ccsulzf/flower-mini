// 逻辑坐标与 SVG viewBox 一致；仅裁切开口以下，上部花冠保持自由展开。
const boundaryCache = new WeakMap()
function bouquetBoundary(material) {
  const geometry = material.geometry
  const source = material.sources.bouquet
  const key = geometry && [geometry.width, geometry.height, geometry.mouthX, geometry.mouthY, geometry.mouthWidth].join(',')
  const cached = boundaryCache.get(material)
  if (cached && cached.source === source && cached.key === key) return cached.value
  const value = readBouquetBoundary(material)
  boundaryCache.set(material, { source, key, value })
  return value
}
function readBouquetBoundary(material) {
  if (material.category !== 'bouquet' || !material.geometry || !material.sources.bouquet) return null
  const geometry = material.geometry
  const front = material.sources.bouquet.match(/<!-- bouquet-front:start -->([\s\S]*?)<!-- bouquet-front:end -->/)?.[1]
  if (!front) return null
  const starts = [...front.matchAll(/<path\b[^>]*\bd="M([\d.]+)[ ,]+([\d.]+)/g)]
    .map(match => ({ x: Number(match[1]), y: Number(match[2]) }))
    .filter(point => point.y < geometry.mouthY - 80)
  const left = starts.filter(point => point.x < geometry.mouthX - 60).sort((a, b) => a.x - b.x)[0]
  const right = starts.filter(point => point.x > geometry.mouthX + 60).sort((a, b) => b.x - a.x)[0]
  if (!left || !right) return null
  const mouthY = geometry.mouthY < geometry.height * .65 ? geometry.height * .86 : geometry.mouthY
  const offsetX = 350 - geometry.mouthX
  const offsetY = 747 - mouthY
  const openingY = Math.min(left.y, right.y) + offsetY
  const half = Math.min(geometry.mouthWidth, 24) / 2
  const points = [[0, 0], [698, 0], [698, openingY], [right.x + offsetX, openingY],
    [350 + half, 755], [350 - half, 755], [left.x + offsetX, openingY], [0, openingY]]
  return { left: left.x + offsetX, right: right.x + offsetX, openingY, points }
}
function fitBouquetTransform(transform, material, container) {
  const boundary = bouquetBoundary(container)
  if (!boundary) return transform
  const half = Math.max(0, Math.min(container.geometry.mouthWidth, 24) / 2 - 4)
  const anchor = { x: Math.max(350 - half, Math.min(350 + half, transform.anchor.x)), y: 747 }
  const depth = anchor.y - boundary.openingY
  if (depth <= 0) return transform
  // 留出枝条弧度和纸边余量，避免沿纸张侧边穿出。
  const minAngle = Math.atan2(boundary.left + 28 - anchor.x, depth) * 180 / Math.PI
  const maxAngle = Math.atan2(boundary.right - 28 - anchor.x, depth) * 180 / Math.PI
  const angle = Math.max(minAngle, Math.min(maxAngle, transform.angle))
  const radians = angle * Math.PI / 180
  const scale = Math.max(.65, Math.min(1.35, transform.scale))
  const geometry = material.geometry
  const headHeight = material.group === 'foliage' ? 110 : geometry.flowerHeight * 110 / geometry.width
  const clearance = (Math.abs(Math.cos(radians)) * headHeight + Math.abs(Math.sin(radians)) * 110) / 2 + 12
  const minHeight = (depth / scale + clearance) / Math.cos(radians)
  const height = Math.min(620, Math.max(transform.height, minHeight))
  if (anchor.x === transform.anchor.x && anchor.y === transform.anchor.y && angle === transform.angle && scale === transform.scale && height === transform.height) return transform
  return { ...transform, anchor, angle, scale, height }
}
const instanceCache = new WeakMap()
function fitBouquetInstance(instance, material, container) {
  const transform = fitBouquetTransform(instance.transform, material, container)
  if (transform === instance.transform) return instance
  const key = [instance.id, instance.materialId, instance.group, instance.color, transform.anchor.x, transform.anchor.y,
    transform.angle, transform.height, transform.scale, transform.mirrored].join('|')
  const cached = instanceCache.get(instance)
  if (cached && cached.key === key) return cached.value
  const value = { ...instance, transform }
  instanceCache.set(instance, { key, value })
  return value
}
module.exports = { bouquetBoundary, fitBouquetTransform, fitBouquetInstance }
