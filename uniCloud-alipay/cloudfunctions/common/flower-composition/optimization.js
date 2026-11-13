const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
function assert(condition, message) {
  if (!condition) throw new Error(message)
}
function pose(value) {
  assert(record(value) && record(value.anchor), '花材变换格式无效')
  assert(finite(value.anchor.x, 0, 698) && value.anchor.y === 747, '花材插入口必须位于 y=747，x 在画布内')
  assert(finite(value.angle, -65, 65) && finite(value.height, 120, 620) && finite(value.scale, 0.65, 1.35), '花材角度或尺寸超出范围')
  return { anchor: { x: value.anchor.x, y: 747 }, angle: value.angle, height: value.height, scale: value.scale }
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
module.exports = { parseOutput }
