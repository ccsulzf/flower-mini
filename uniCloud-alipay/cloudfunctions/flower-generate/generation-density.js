// 花量由服务端确定并验收；花名、配色和枝条位置仍由模型设计。
function generationDensity(prompt = '') {
  const explicitCount = /(?:[0-9]+|[一二两三四五六七八九十百]+)\s*[枝支朵]/u.test(prompt)
  const leavesOnly = /(?:只要|只用|仅用|纯)(?:叶材|绿叶|叶子)/u.test(prompt)
  if (explicitCount || leavesOnly)
    return { kind: 'specified', minTotal: 1, maxTotal: 96, minFlowers: leavesOnly ? 0 : 1, target: null, minWidth: 0, minHeight: 0 }

  // 排除否定的体量词，避免“不要一大束”反而落入大束档。
  const positive = prompt.replace(/(?:不要|不用|不必|不想要|避免)(?:太过?|很|那么|特别)?(?:丰盛|丰盈|饱满|热闹|一大束|大束|小小一束|小束|极简|疏朗|松散)/gu, '')
  if (/极简|单枝|一枝|一支|一朵/u.test(positive))
    return { kind: 'minimal', minTotal: 1, maxTotal: 3, minFlowers: 1, target: 3, minWidth: 0, minHeight: 0 }
  if (/小小一束|小束|少量|少一些|少一点|几枝|几朵/u.test(positive))
    return { kind: 'small', minTotal: 4, maxTotal: 12, minFlowers: 3, target: 10, minWidth: 0, minHeight: 0 }
  if (/丰盛|丰盈|饱满|热闹|一大束|大束/u.test(positive))
    return { kind: 'abundant', minTotal: 56, maxTotal: 80, minFlowers: 44, target: 64, minWidth: 320, minHeight: 140 }
  if (/疏朗|松散|留白/u.test(positive))
    return { kind: 'airy', minTotal: 12, maxTotal: 24, minFlowers: 9, target: 18, minWidth: 0, minHeight: 0 }
  if (/庆祝|祝贺|送给|送朋友|送礼|新工作|乔迁/u.test(positive))
    return { kind: 'celebration', minTotal: 40, maxTotal: 56, minFlowers: 30, target: 48, minWidth: 240, minHeight: 120 }
  return { kind: 'everyday', minTotal: 32, maxTotal: 48, minFlowers: 24, target: 40, minWidth: 220, minHeight: 100 }
}

function validateDensity(materials, density, silhouette) {
  const flowerCount = materials.filter(item => item.group !== 'foliage').length
  const countInvalid = materials.length < density.minTotal || materials.length > density.maxTotal
    || flowerCount < density.minFlowers
  const shapeInvalid = silhouette && (silhouette.width < density.minWidth || silhouette.height < density.minHeight)
  if (!countInvalid && !shapeInvalid) return
  const error = new Error(countInvalid
    ? `本次${density.kind}花量要求花叶总数${density.minTotal}至${density.maxTotal}枝、花朵至少${density.minFlowers}枝；实际花叶${materials.length}枝、花朵${flowerCount}枝。叶材不能代替花量`
    : `本次花面宽度至少${density.minWidth}、高低跨度至少${density.minHeight}；实际宽度${silhouette.width}、跨度${silhouette.height}。请增加花头之间的自然展开和中低层衔接，不要只堆在顶部或同一点`)
  error.code = countInvalid ? 'STEM_COUNT_INVALID' : 'MODEL_DENSITY_INVALID'
  error.actualCount = materials.length
  throw error
}

module.exports = { generationDensity, validateDensity }
