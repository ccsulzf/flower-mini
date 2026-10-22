const idPattern = /^[a-z][a-z0-9-]{0,63}$/
const groups = new Set(['main', 'filler', 'foliage'])
const containerTypes = new Set(['vase', 'bouquet'])

function invalid(message = '每日花束数据无效') {
  throw { errCode: 'INVALID_DAILY_FLOWER', errMsg: message }
}

function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function reference(value) {
  return typeof value === 'string' && idPattern.test(value)
}

function point(value) {
  if (!record(value) || !finite(value.x, 0, 698) || !finite(value.y, 0, 1000))
    invalid('花材落点无效')
  return { x: value.x, y: value.y }
}

function transform(value) {
  if (!record(value) || !finite(value.angle, -65, 65) || !finite(value.height, 120, 620)
    || !finite(value.scale, 0.65, 1.35) || typeof value.mirrored !== 'boolean')
    invalid('花材变换无效')
  return { anchor: point(value.anchor), angle: value.angle, height: value.height, scale: value.scale, mirrored: value.mirrored }
}

function validateArtwork(artwork) {
  let serialized
  try {
    serialized = JSON.stringify(artwork)
  }
  catch {
    invalid('花束 JSON 无效')
  }
  if (typeof serialized !== 'string' || !record(artwork) || serialized.length > 65536
    || !record(artwork.background) || !reference(artwork.background.materialId)
    || !record(artwork.container) || !reference(artwork.container.materialId) || !containerTypes.has(artwork.container.type)
    || !Array.isArray(artwork.materials) || artwork.materials.length < 1 || !record(artwork.containerLayouts))
    invalid('花束格式无效，需包含花材')

  const ids = new Set()
  const materials = artwork.materials.map((material) => {
    if (!record(material) || !Number.isSafeInteger(material.id) || material.id < 1 || ids.has(material.id)
      || !reference(material.materialId) || !groups.has(material.group)
      || typeof material.color !== 'string' || !/^#[\da-f]{6}$/i.test(material.color))
      invalid('花束花材数据无效')
    ids.add(material.id)
    return { id: material.id, materialId: material.materialId, group: material.group, color: material.color, transform: transform(material.transform) }
  })

  const result = {
    background: { materialId: artwork.background.materialId },
    container: { materialId: artwork.container.materialId, type: artwork.container.type },
    materials,
    containerLayouts: {},
  }

  for (const [key, layout] of Object.entries(artwork.containerLayouts)) {
      if (!reference(key) || !Array.isArray(layout))
      invalid('容器布局记录无效')
      const layoutIds = new Set()
      result.containerLayouts[key] = layout.map((row) => {
        if (!record(row) || !Number.isSafeInteger(row.materialInstanceId) || !ids.has(row.materialInstanceId)
          || layoutIds.has(row.materialInstanceId) || !finite(row.angle, -65, 65)
          || !finite(row.height, 120, 620) || !finite(row.scale, 0.65, 1.35))
          invalid('容器布局记录无效')
        layoutIds.add(row.materialInstanceId)
        return { materialInstanceId: row.materialInstanceId, anchor: point(row.anchor), angle: row.angle, height: row.height, scale: row.scale }
      })
  }
  return result
}

function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    invalid('日期格式应为 YYYY-MM-DD')
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
    invalid('日期无效')
  return date
}

function validateDescription(description) {
  if (typeof description !== 'string' || !description.trim() || description.trim().length > 160)
    invalid('花束描述不能为空且最多 160 字')
  return description.trim()
}

module.exports = { validateArtwork, validateDate, validateDescription, invalid }
