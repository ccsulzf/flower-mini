const idPattern = /^[a-z][a-z0-9-]{0,63}$/
const flowerKinds = new Set(['daisy', 'poppy', 'leaf', 'chrysanthemum', 'rose', 'tulip'])
const vases = new Set(['陶瓶', '玻璃瓶', '圆花器', '花束'])
const backgrounds = new Set(['warm', 'sage', 'cocoa', 'mist', 'blush', 'sand'])

function invalid(message = '每日花束数据无效') {
  throw { errCode: 'INVALID_DAILY_FLOWER', errMsg: message }
}

function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function validateReference(value, idKey) {
  if (value[idKey] === undefined)
    return
  if (typeof value[idKey] !== 'string' || !idPattern.test(value[idKey]))
    invalid('花束素材引用无效')
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
    || !vases.has(artwork.vase) || !backgrounds.has(artwork.background)
    || !Array.isArray(artwork.stems) || artwork.stems.length < 1 || artwork.stems.length > 64)
    invalid('花束格式无效，需包含 1 至 64 枝花材')

  validateReference(artwork, 'vaseMaterialId')
  validateReference(artwork, 'backgroundMaterialId')

  const ids = new Set()
  const stems = artwork.stems.map((stem) => {
    if (!record(stem) || !Number.isSafeInteger(stem.id) || stem.id < 1 || ids.has(stem.id)
      || !flowerKinds.has(stem.kind) || !finite(stem.x, 0, 698) || !finite(stem.y, 0, 1000)
      || !finite(stem.angle, -65, 65) || !finite(stem.flowerScale, 0.65, 1.35)
      || !finite(stem.stemHeight, 120, 620) || typeof stem.color !== 'string'
      || !/^#[\da-f]{6}$/i.test(stem.color))
      invalid('花束花材数据无效')
    validateReference(stem, 'materialId')
    if (stem.mirrored !== undefined && typeof stem.mirrored !== 'boolean')
      invalid('花材镜像设置无效')
    if (!stem.materialId && stem.mirrored !== undefined)
      invalid('内置花材不支持素材专属设置')
    ids.add(stem.id)
    return {
      ...(stem.materialId ? { materialId: stem.materialId } : {}),
      ...(stem.mirrored ? { mirrored: true } : {}),
      id: stem.id,
      kind: stem.kind,
      x: stem.x,
      y: stem.y,
      angle: stem.angle,
      flowerScale: stem.flowerScale,
      stemHeight: stem.stemHeight,
      color: stem.color,
    }
  })

  const result = {
    vase: artwork.vase,
    ...(artwork.vaseMaterialId ? {
      vaseMaterialId: artwork.vaseMaterialId,
    } : {}),
    background: artwork.background,
    ...(artwork.backgroundMaterialId ? {
      backgroundMaterialId: artwork.backgroundMaterialId,
    } : {}),
    stems,
  }

  if (artwork.containerLayouts !== undefined) {
    if (!record(artwork.containerLayouts) || Object.keys(artwork.containerLayouts).length > 64)
      invalid('容器布局记录无效')
    result.containerLayouts = {}
    for (const [key, layout] of Object.entries(artwork.containerLayouts)) {
      if (!/^(?:[a-z][a-z0-9-]{0,63}|builtin:(?:陶瓶|玻璃瓶|圆花器|花束))$/.test(key)
        || !Array.isArray(layout) || layout.length > 64)
        invalid('容器布局记录无效')
      const layoutIds = new Set()
      result.containerLayouts[key] = layout.map((row) => {
        if (!record(row) || !Number.isSafeInteger(row.id) || row.id < 1 || layoutIds.has(row.id)
          || !finite(row.x, 0, 698) || !finite(row.angle, -65, 65)
          || !finite(row.stemHeight, 120, 620) || !finite(row.flowerScale, 0.65, 1.35))
          invalid('容器布局记录无效')
        layoutIds.add(row.id)
        return { id: row.id, x: row.x, angle: row.angle, stemHeight: row.stemHeight, flowerScale: row.flowerScale }
      })
    }
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
