const { parseOutput } = require('./optimization')
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
function assert(condition, message) { if (!condition) throw new Error(message) }

function parsePlan(text, source) {
  const data = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
  assert(data && !Array.isArray(data) && typeof data.changed === 'boolean', '构图方案缺少 changed')
  const reason = typeof data.reason === 'string' ? data.reason.trim().slice(0, 240) : ''
  if (!data.changed) return { changed: false, reason, placements: [], orderedIds: source.materials.map(item => item.id) }
  const ids = new Set(source.materials.map(item => item.id))
  assert(Array.isArray(data.placements) && data.placements.length === ids.size, '构图方案必须保留全部花叶')
  const seen = new Set()
  const placements = data.placements.map(item => {
    assert(item && ids.has(item.id) && !seen.has(item.id), '构图方案存在重复或未知实例')
    seen.add(item.id)
    assert(item.center && finite(item.center.x, 0, 698) && finite(item.center.y, 0, 700), '目标花头坐标无效')
    assert(finite(item.scale, 0.65, 1.35), '目标花材缩放超出范围')
    assert(typeof item.color === 'string' && /^#[a-f\d]{6}$/i.test(item.color), '目标颜色格式无效')
    return { id: item.id, center: { x: item.center.x, y: item.center.y }, scale: item.scale, color: item.color }
  })
  assert(Array.isArray(data.orderedIds) && data.orderedIds.length === ids.size
    && new Set(data.orderedIds).size === ids.size && data.orderedIds.every(id => ids.has(id)), '前后层次必须包含全部实例且不能重复')
  return { changed: true, reason, placements, orderedIds: data.orderedIds }
}

function generateLayout(plan, source, mouth) {
  if (!plan.changed) return { optimization: parseOutput(JSON.stringify({ changed: false, reason: plan.reason }), source, mouth), plan }
  const byId = new Map(source.materials.map(item => [item.id, item]))
  const convertedIds = []
  const adjustments = plan.placements.map(item => {
    const material = byId.get(item.id)
    // 保留原插入口落点；不使用花群模板覆盖AI给出的目标。
    const x = clamp(material.transform.anchor.x, mouth.left, mouth.right)
    const dx = item.center.x - x
    const dy = 747 - item.center.y
    const rawAngle = Math.atan2(dx, dy) * 180 / Math.PI
    const rawHeight = Math.hypot(dx, dy) / item.scale
    const angle = clamp(rawAngle, -65, 65)
    const height = clamp(rawHeight, 120, 620)
    if (rawAngle !== angle || rawHeight !== height) convertedIds.push(item.id)
    return { id: item.id, anchor: { x, y: 747 }, angle, height, scale: item.scale, color: item.color }
  })
  const optimization = parseOutput(JSON.stringify({ changed: true, reason: plan.reason, adjustments, orderedIds: plan.orderedIds }), source, mouth)
  optimization.boundaryAdjustedIds = [...new Set([...convertedIds, ...optimization.boundaryAdjustedIds])]
  return { optimization, plan }
}
module.exports = { parsePlan, generateLayout }
