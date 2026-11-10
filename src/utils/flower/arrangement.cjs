// 编辑、拖动、JSON 校验和导出共用同一套逻辑坐标。
const studioMetrics = { width: 698, height: 1000, minMaterialHeight: 120, maxMaterialHeight: 620, operableMargin: 32 }

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }
function materialHeadPoint(transform) {
  const radians = transform.angle * Math.PI / 180
  return { x: transform.anchor.x + Math.sin(radians) * transform.height, y: transform.anchor.y - Math.cos(radians) * transform.height }
}
function materialVisualBounds(transform, geometry) {
  const head = materialHeadPoint(transform)
  const radians = transform.angle * Math.PI / 180
  const width = Math.max(1, geometry && geometry.width || 110) * transform.scale
  const height = Math.max(1, geometry && geometry.flowerHeight || 110) * transform.scale
  const halfWidth = (Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * height) / 2
  const halfHeight = (Math.abs(Math.sin(radians)) * width + Math.abs(Math.cos(radians)) * height) / 2
  return { left: head.x - halfWidth, right: head.x + halfWidth, top: head.y - halfHeight, bottom: head.y + halfHeight }
}
function maxMaterialHeight(transform) {
  const radians = transform.angle * Math.PI / 180
  const sin = Math.sin(radians)
  const cos = Math.cos(radians)
  const vertical = cos <= 0 ? studioMetrics.maxMaterialHeight : (transform.anchor.y - studioMetrics.operableMargin) / cos
  let horizontal = studioMetrics.maxMaterialHeight
  if (sin < -0.001) horizontal = (transform.anchor.x - studioMetrics.operableMargin) / Math.abs(sin)
  else if (sin > 0.001) horizontal = (studioMetrics.width - studioMetrics.operableMargin - transform.anchor.x) / sin
  return Math.max(studioMetrics.minMaterialHeight, Math.min(studioMetrics.maxMaterialHeight, vertical, horizontal))
}
function constrainMaterialTransform(transform, geometry, mouthBounds) {
  const angle = clamp(Number(transform.angle), -65, 65)
  const scale = clamp(Number(transform.scale), 0.65, 1.35)
  const left = Math.min(mouthBounds.left, mouthBounds.right)
  const right = Math.max(mouthBounds.left, mouthBounds.right)
  const anchor = { x: clamp(Number(transform.anchor.x), left, right), y: Number(mouthBounds.y) }
  const base = { anchor, angle, height: Number(transform.height), scale, mirrored: Boolean(transform.mirrored) }
  const result = { ...base, height: clamp(base.height, studioMetrics.minMaterialHeight, maxMaterialHeight(base)) }
  const bounds = materialVisualBounds(result, geometry)
  if (!Object.values(bounds).every(Number.isFinite)) throw new Error('花材几何无效')
  return result
}
module.exports = { constrainMaterialTransform, materialHeadPoint, materialVisualBounds, maxMaterialHeight, studioMetrics }
