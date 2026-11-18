const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const reference = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value)
function assert(condition, message) {
  if (!condition) throw new Error(message)
}
function pose(value) {
  assert(record(value) && record(value.anchor), '花材变换格式无效')
  assert(finite(value.anchor.x, 0, 698) && value.anchor.y === 747, '花材插入口必须位于 y=747，x 在画布内')
  assert(finite(value.angle, -65, 65) && finite(value.height, 120, 620) && finite(value.scale, 0.65, 1.35), '花材角度或尺寸超出范围')
  return { anchor: { x: value.anchor.x, y: 747 }, angle: value.angle, height: value.height, scale: value.scale }
}
function parseInput(input) {
  assert(record(input) && JSON.stringify(input).length <= 65536, '请求格式无效或数据过大')
  const artwork = input.artwork
  assert(record(artwork) && record(artwork.container) && reference(artwork.container.materialId)
    && ['vase', 'bouquet'].includes(artwork.container.type), '花器格式无效')
  assert(Array.isArray(artwork.materials) && artwork.materials.length > 0 && artwork.materials.length <= 48, '请提供 1 至 48 枝花材')
  const ids = new Set()
  const materials = artwork.materials.map(item => {
    assert(record(item) && Number.isSafeInteger(item.id) && item.id > 0 && !ids.has(item.id)
      && reference(item.materialId) && ['main', 'filler', 'foliage'].includes(item.group)
      && typeof item.color === 'string' && /^#[a-f\d]{6}$/i.test(item.color), '花材信息或实例 ID 无效')
    ids.add(item.id)
    assert(record(item.transform) && typeof item.transform.mirrored === 'boolean', '花材镜像信息无效')
    return { id: item.id, materialId: item.materialId, group: item.group, color: item.color,
      transform: { ...pose(item.transform), mirrored: item.transform.mirrored } }
  })
  return { container: { materialId: artwork.container.materialId, type: artwork.container.type }, materials }
}
function parseOutput(text, source, mouth) {
  // 允许模型附带一层代码围栏，其他格式仍严格校验。
  const result = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
  assert(record(result) && typeof result.changed === 'boolean', '缺少 changed 布尔字段')
  const reason = typeof result.reason === 'string' ? result.reason.trim().slice(0, 240) : ''
  if (!result.changed) return { changed: false, reason, adjustments: [], orderedIds: source.materials.map(item => item.id) }
  const ids = new Set(source.materials.map(item => item.id))
  assert(Array.isArray(result.adjustments) && result.adjustments.length === ids.size, '必须返回每枝花材的调整，且不能增减花材')
  const sourceById = new Map(source.materials.map(item => [item.id, item]))
  const seen = new Set()
  const boundaryAdjustedIds = []
  const adjustments = result.adjustments.map(item => {
    assert(record(item) && ids.has(item.id) && !seen.has(item.id), '调整结果包含未知或重复 ID')
    seen.add(item.id)
    const next = pose(item)
    assert(next.anchor.x >= mouth.left && next.anchor.x <= mouth.right, '花材落点超出花器插入口')
    const radians = next.angle * Math.PI / 180
    const sin = Math.sin(radians)
    const cos = Math.cos(radians)
    const material = sourceById.get(item.id)
    let color = material.color
    if (item.color !== undefined) {
      const palette = [material.color, ...(Array.isArray(material.colors) ? material.colors.map(entry => entry.value) : [])]
      assert(typeof item.color === 'string' && /^#[a-f\d]{6}$/i.test(item.color)
        && palette.some(value => typeof value === 'string' && value.toLowerCase() === item.color.toLowerCase()), `花材 ${item.id} 的颜色不在可用色板内`)
      color = item.color
    }
    const geometry = material.geometry
    // 渲染将花头宽度归一为110，并围绕枝条底端缩放，中心距离也随scale变化。
    const headHeight = material.group !== 'foliage' && finite(geometry?.width, 1, 10000)
      && finite(geometry?.flowerHeight, 1, 10000) ? geometry.flowerHeight * 110 / geometry.width : 110
    const halfWidth = (Math.abs(cos) * 110 + Math.abs(sin) * headHeight) * next.scale / 2
    const halfHeight = (Math.abs(sin) * 110 + Math.abs(cos) * headHeight) * next.scale / 2
    const margin = 40
    const horizontalLimit = sin < -0.001 ? (next.anchor.x - margin - halfWidth) / (Math.abs(sin) * next.scale)
      : sin > 0.001 ? (698 - margin - halfWidth - next.anchor.x) / (sin * next.scale) : 620
    const verticalLimit = cos > 0 ? (next.anchor.y - margin - halfHeight) / (cos * next.scale) : 620
    const limit = Math.min(620, horizontalLimit, verticalLimit)
    assert(limit >= 120, `花材 ${item.id} 在当前落点和角度下没有安全摆放空间`)
    if (next.height > limit) {
      next.height = Math.floor(limit * 1000) / 1000
      boundaryAdjustedIds.push(item.id)
    }
    const x = next.anchor.x + sin * next.height * next.scale
    const y = next.anchor.y - cos * next.height * next.scale
    assert(x - halfWidth >= margin - 1e-6 && x + halfWidth <= 698 - margin + 1e-6
      && y - halfHeight >= margin - 1e-6 && y + halfHeight <= 1000 - margin + 1e-6,
    `花材 ${item.id} 的花头外缘超出画布安全范围`)
    return { id: item.id, ...next, color }
  })
  assert(Array.isArray(result.orderedIds) && result.orderedIds.length === ids.size
    && new Set(result.orderedIds).size === ids.size && result.orderedIds.every(id => ids.has(id)), '前后层次必须完整包含原有实例 ID')
  const byId = new Map(adjustments.map(item => [item.id, item]))
  const changed = source.materials.some((item, index) => {
    const next = byId.get(item.id)
    return result.orderedIds[index] !== item.id || item.color.toLowerCase() !== next.color.toLowerCase()
      || Math.abs(item.transform.anchor.x - next.anchor.x) > 0.001
      || Math.abs(item.transform.anchor.y - next.anchor.y) > 0.001
      || ['angle', 'height', 'scale'].some(key => Math.abs(item.transform[key] - next[key]) > 0.001)
  })
  return { changed, reason, adjustments, orderedIds: result.orderedIds, boundaryAdjustedIds }
}
// 提供可核对的几何事实；距离阈值仅供构图参考，不代表精确碰撞判定。
function describeComposition(materials) {
  const heads = materials.map(item => {
    const radians = item.transform.angle * Math.PI / 180
    return { id: item.id, group: item.group,
      x: Math.round(item.transform.anchor.x + Math.sin(radians) * item.transform.height * item.transform.scale),
      y: Math.round(item.transform.anchor.y - Math.cos(radians) * item.transform.height * item.transform.scale) }
  })
  const closePairs = []
  for (let index = 0; index < heads.length; index++) {
    for (let other = index + 1; other < heads.length; other++) {
      const distance = Math.hypot(heads[index].x - heads[other].x, heads[index].y - heads[other].y)
      if (distance < 55) closePairs.push({ ids: [heads[index].id, heads[other].id], distance: Math.round(distance) })
    }
  }
  const groupDistribution = {}
  for (const group of ['main', 'filler', 'foliage']) {
    const points = heads.filter(item => item.group === group)
    groupDistribution[group] = {
      count: points.length,
      left: points.filter(item => item.x < 310).length,
      center: points.filter(item => item.x >= 310 && item.x <= 390).length,
      right: points.filter(item => item.x > 390).length,
      meanX: points.length ? Math.round(points.reduce((sum, item) => sum + item.x, 0) / points.length) : null,
      meanY: points.length ? Math.round(points.reduce((sum, item) => sum + item.y, 0) / points.length) : null,
    }
  }
  return { heads, groupDistribution, closePairCount: closePairs.length, closePairs: closePairs.sort((a, b) => a.distance - b.distance).slice(0, 80),
    headSpread: { width: Math.max(...heads.map(item => item.x)) - Math.min(...heads.map(item => item.x)),
      height: Math.max(...heads.map(item => item.y)) - Math.min(...heads.map(item => item.y)) } }
}
module.exports = { parseInput, parseOutput, describeComposition }
