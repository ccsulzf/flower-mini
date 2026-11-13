const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

// 保留AI选材和构图倾向，只收拢离散花头、建立大小主次与绘制深度。
function refineComposition(plan, materials, rolesById) {
  const byId = new Map(materials.map(item => [item.id, item]))
  const flowers = plan.placements.filter(item => byId.get(item.id).group !== 'foliage')
  const focal = flowers.filter(item => ['main', 'secondary'].includes(rolesById.get(item.id)))
  const reference = focal.length ? focal : flowers
  if (!reference.length) return { plan, adjustedIds: [] }
  const center = { x: clamp(median(reference.map(item => item.center.x)), 325, 375),
    y: clamp(median(reference.map(item => item.center.y)), 380, 420) }
  const mainCounts = new Map()
  for (const item of focal) {
    const id = byId.get(item.id).materialId
    mainCounts.set(id, (mainCounts.get(id) || 0) + 1)
  }
  const focalSpecies = [...mainCounts].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id)
  const adjustedIds = []
  const placements = plan.placements.map(item => {
    const role = rolesById.get(item.id)
    const material = byId.get(item.id)
    let x = item.center.x
    let y = item.center.y
    let scale = item.scale
    if (material.group === 'foliage') {
      scale = Math.min(scale, 0.8)
      x = clamp(x, center.x - 205, center.x + 205)
      y = clamp(y, center.y - 145, center.y + 60)
    }
    else {
      const focalIndex = focalSpecies.indexOf(material.materialId)
      if (['main', 'secondary'].includes(role) && focalIndex !== -1) {
        // 两个互相连接的焦点簇；仍保留大部分AI位置，避免同品种完全叠在一起。
        const offset = focalSpecies.length === 1 ? 0 : focalIndex === 0 ? -48 : 48
        x = x * 0.72 + (center.x + offset) * 0.28
        y = y * 0.72 + (center.y + (focalIndex === 0 ? -12 : 16)) * 0.28
      }
      const radiusX = role === 'filler' ? 195 : 185
      const radiusY = role === 'filler' ? 125 : 115
      const dx = x - center.x
      const dy = y - center.y
      const distance = Math.hypot(dx / radiusX, dy / radiusY)
      if (distance > 1) {
        x = center.x + dx / distance
        y = center.y + dy / distance
      }
      // 配花不能与主花用同样的大花头争抢面积。
      const maxScale = role === 'filler' ? 0.8 : role === 'secondary' ? 1 : 1.15
      scale = Math.min(scale, maxScale)
    }
    if (Math.abs(x - item.center.x) > 0.001 || Math.abs(y - item.center.y) > 0.001 || scale !== item.scale)
      adjustedIds.push(item.id)
    return { ...item, center: { x, y }, scale }
  })
  const originalOrder = new Map(plan.orderedIds.map((id, index) => [id, index]))
  const orderedIds = [...placements].sort((a, b) => {
    const aLeaf = byId.get(a.id).group === 'foliage'
    const bLeaf = byId.get(b.id).group === 'foliage'
    if (aLeaf !== bLeaf) return aLeaf ? -1 : 1
    // 高花先画、低花后画，使前排花朵盖住后排长茎，而非相反。
    return a.center.y - b.center.y || originalOrder.get(a.id) - originalOrder.get(b.id)
  }).map(item => item.id)
  return { plan: { ...plan, placements, orderedIds }, adjustedIds }
}

function orderByDepth(materials) {
  return materials.map((item, index) => ({ item, index,
    y: item.transform.anchor.y - Math.cos(item.transform.angle * Math.PI / 180)
      * item.transform.height * item.transform.scale,
  })).sort((a, b) => {
    const aLeaf = a.item.group === 'foliage'
    const bLeaf = b.item.group === 'foliage'
    if (aLeaf !== bLeaf) return aLeaf ? -1 : 1
    return a.y - b.y || a.index - b.index
  }).map(entry => entry.item)
}

module.exports = { refineComposition, orderByDepth }
