const fs = require('node:fs')
const resolveAuth = require('auth')
const { initWasm, Resvg } = require('@resvg/resvg-wasm')

let wasmReady

function colorizeMaterialSvg(svg, color) {
  const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : '#f1e5bd';
  let source = svg.replace(/__COLOR__/g, safeColor);
  if (!svg.includes('<!-- adaptive-petal-outline -->')) return source;
  const channels = [1, 3, 5].map(offset => Number.parseInt(safeColor.slice(offset, offset + 2), 16) / 255);
  const brightness = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  if (brightness < .38) source = source.replace(/stroke="#9d4b4f" stroke-opacity="\.5"/g, 'stroke="#e8a39d" stroke-opacity=".65"');
  return source;
}

function assertReference(id, revision) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(id)
    || typeof revision !== 'string' || !/^[a-f\d]{16}$/.test(revision))
    throw new Error('作品中的云素材引用无效')
}

function nested(source, x, y, width, height) {
  const root = source.match(/<svg\b[^>]*>/i)?.[0]
  const viewBox = root?.match(/\bviewBox=["']([^"']+)["']/i)?.[1]
  if (!root || !viewBox)
    throw new Error('云素材 SVG 缺少 viewBox')
  return source.replace(root, `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" preserveAspectRatio="none">`)
}

function safeSvg(source, materialName) {
  if (typeof source !== 'string' || source.length > 512 * 1024
    || !/^\s*<svg\b/i.test(source) || !/<\/svg>\s*$/i.test(source)
    || /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=|@import|url\(\s*["']?(?!#)[^)]+\)/i.test(source))
    throw new Error(`${materialName}的云端 SVG 无效`)
  return source
}

function builtInVase(name) {
  if (name === '花束')
    return '<g><path d="M180 615H520L350 890Z" fill="#ded5c5"/><path d="M205 643H490L350 878Z" fill="#f1e9d9"/></g>'
  const round = name === '圆花器'
  const left = round ? 260 : 280
  const top = round ? 765 : 735
  const width = round ? 180 : 140
  const height = round ? 140 : 170
  return `<g><ellipse cx="350" cy="910" rx="109" ry="15" fill="#000" opacity=".12"/><path d="M${left + width * .18} ${top} C${left} ${top} ${left} ${top + height * .15} ${left} ${top + height * .42} C${left} ${top + height} ${left + width * .18} ${top + height} ${left + width * .5} ${top + height} C${left + width * .82} ${top + height} ${left + width} ${top + height} ${left + width} ${top + height * .42} C${left + width} ${top + height * .15} ${left + width * .82} ${top} ${left + width * .82} ${top} Z" fill="#dedacf"/></g>`
}

function backgroundColor(name) {
  return { warm: '#f4efe5', sage: '#e7eadf', cocoa: '#e8ded3', mist: '#edf0ed', blush: '#f2e4e3', sand: '#eee6d6' }[name]
}

async function loadMaterial(id, revision) {
  assertReference(id, revision)
  const result = await uniCloud.database().collection('flower-material-assets').doc(id).get()
  const material = result.data?.[0]
  if (!material || material.id !== id || material.revision !== revision)
    throw new Error(`素材 ${id} 不存在或版本已变化`)
  return material
}

async function loadSource(fileId, materialName) {
  if (typeof fileId !== 'string' || !fileId.startsWith('cloud://') || fileId.length > 1024)
    throw new Error(`${materialName}的云文件引用无效`)
  const result = await uniCloud.downloadFile({ fileID: fileId })
  if (!Buffer.isBuffer(result?.fileContent))
    throw new Error(`${materialName}的云文件下载失败`)
  return safeSvg(result.fileContent.toString('utf8'), materialName)
}

async function materialWithSources(material, parts) {
  const sources = {}
  for (const part of parts) {
    const asset = material.assets?.[part]
    if (!asset?.fileId)
      throw new Error(`${material.name}缺少 ${part} 素材文件`)
    sources[part] = await loadSource(asset.fileId, material.name)
  }
  return { ...material, sources }
}

async function artworkSvg(artwork) {
  if (!artwork || artwork.version !== 2 || !Array.isArray(artwork.stems) || artwork.stems.length > 64
    || !['陶瓶', '玻璃瓶', '圆花器', '花束'].includes(artwork.vase)
    || !backgroundColor(artwork.background))
    throw new Error('作品数据无效或超出云端测试范围')

  const references = new Map()
  const add = (id, revision) => {
    assertReference(id, revision)
    const key = `${id}:${revision}`
    references.set(key, { id, revision })
  }
  for (const stem of artwork.stems) {
    if (!stem || !Number.isFinite(stem.x) || stem.x < 0 || stem.x > 698
      || !Number.isFinite(stem.angle) || stem.angle < -65 || stem.angle > 65
      || !Number.isFinite(stem.flowerScale) || stem.flowerScale < .65 || stem.flowerScale > 1.35
      || !Number.isFinite(stem.stemHeight) || stem.stemHeight < 120 || stem.stemHeight > 620
      || typeof stem.color !== 'string' || !/^#[\da-f]{6}$/i.test(stem.color)
      || !stem.materialId || !stem.materialRevision
      || (stem.leafMode !== undefined && !['with', 'without'].includes(stem.leafMode))
      || (stem.mirrored !== undefined && typeof stem.mirrored !== 'boolean'))
      throw new Error('云端测试要求每枝花都引用有效的云端素材')
    add(stem.materialId, stem.materialRevision)
  }
  if (artwork.vaseMaterialId)
    add(artwork.vaseMaterialId, artwork.vaseMaterialRevision)
  if (artwork.backgroundMaterialId)
    add(artwork.backgroundMaterialId, artwork.backgroundMaterialRevision)

  const materials = new Map()
  for (const { id, revision } of references.values()) {
    const material = await loadMaterial(id, revision)
    materials.set(`${id}:${revision}`, material)
  }
  const requestedParts = new Map()
  const requirePart = (id, revision, part) => {
    const key = `${id}:${revision}`
    const parts = requestedParts.get(key) || new Set()
    parts.add(part)
    requestedParts.set(key, parts)
  }
  for (const stem of artwork.stems) {
    const material = materials.get(`${stem.materialId}:${stem.materialRevision}`)
    if (!material || material.category !== 'flower')
      throw new Error('作品引用的云端花材类型无效')
    if (material.group === 'foliage') {
      requirePart(material.id, material.revision, 'foliage')
    }
    else {
      requirePart(material.id, material.revision, 'flower')
      requirePart(material.id, material.revision, stem.leafMode === 'with' ? 'stemWithLeaves' : 'stemWithoutLeaves')
    }
  }
  if (artwork.vaseMaterialId) {
    const material = materials.get(`${artwork.vaseMaterialId}:${artwork.vaseMaterialRevision}`)
    if (!material || !['vase', 'bouquet'].includes(material.category))
      throw new Error('作品引用的云端花器类型无效')
    requirePart(material.id, material.revision, material.category === 'bouquet' ? 'bouquet' : 'vase')
  }
  if (artwork.backgroundMaterialId) {
    const material = materials.get(`${artwork.backgroundMaterialId}:${artwork.backgroundMaterialRevision}`)
    if (!material || material.category !== 'background')
      throw new Error('作品引用的云端背景类型无效')
    requirePart(material.id, material.revision, 'background')
  }
  for (const [key, parts] of requestedParts) {
    materials.set(key, await materialWithSources(materials.get(key), [...parts]))
  }
  const getMaterial = (id, revision) => materials.get(`${id}:${revision}`)
  let anchorOffset = 0
  if (artwork.backgroundMaterialId) {
    const backgroundMaterial = getMaterial(artwork.backgroundMaterialId, artwork.backgroundMaterialRevision)
    if (backgroundMaterial.geometry?.surfaceY !== undefined) {
      let vaseBottom = artwork.vase === '花束' ? 915 : 905
      if (artwork.vaseMaterialId) {
        const vaseMaterial = getMaterial(artwork.vaseMaterialId, artwork.vaseMaterialRevision)
        let mouthY = vaseMaterial.geometry.mouthY
        if (vaseMaterial.category === 'bouquet' && mouthY < vaseMaterial.geometry.height * .65)
          mouthY = vaseMaterial.geometry.height * .86
        vaseBottom = 747 - mouthY + vaseMaterial.geometry.height
      }
      const surfaceY = ['scene-ivory-table', 'scene-sage-table'].includes(backgroundMaterial.id)
        ? 820
        : backgroundMaterial.geometry.surfaceY
      anchorOffset = surfaceY * 1000 / backgroundMaterial.geometry.height - vaseBottom
    }
  }
  const anchorY = (artwork.vase === '圆花器' ? 777 : 747) + anchorOffset
  let background = ''
  if (artwork.backgroundMaterialId) {
    const material = getMaterial(artwork.backgroundMaterialId, artwork.backgroundMaterialRevision)
    background = nested(material.sources.background, 0, 0, 698, 1000)
  }
  const stems = artwork.stems.map((stem) => {
    const material = getMaterial(stem.materialId, stem.materialRevision)
    if (!material || material.category !== 'flower' || !material.geometry)
      throw new Error('作品引用的云端花材类型或几何信息无效')
    const geometry = material.geometry
    const total = stem.stemHeight + 55
    if (material.group === 'foliage') {
      const foliage = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 ${total}">${nested(material.sources.foliage.replace(/__COLOR__/g, stem.color), 0, 0, 110, total)}</svg>`
      const scaleX = stem.mirrored ? -stem.flowerScale : stem.flowerScale
      return `<g transform="translate(${stem.x} ${anchorY}) rotate(${stem.angle}) scale(${scaleX} ${stem.flowerScale}) translate(-55 ${-total})">${foliage.replace(/^\s*<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')}</g>`
    }
    const headHeight = geometry.flowerHeight * 110 / geometry.width
    const connection = geometry.connectionY * 110 / geometry.width
    const headTop = 55 - headHeight / 2
    const join = Math.max(headTop, headTop + connection - 8)
    const stemSource = stem.leafMode === 'with' ? material.sources.stemWithLeaves : material.sources.stemWithoutLeaves
    const flowerSource = material.sources.flower
    const plant = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 ${total}">${nested(stemSource, 0, join, 110, total - join)}${nested(colorizeMaterialSvg(flowerSource, stem.color), 0, headTop, 110, headHeight)}</svg>`
    const scaleX = stem.mirrored ? -stem.flowerScale : stem.flowerScale
    return `<g transform="translate(${stem.x} ${anchorY}) rotate(${stem.angle}) scale(${scaleX} ${stem.flowerScale}) translate(-55 ${-total})">${plant.replace(/^\s*<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')}</g>`
  }).join('')
  let vase = builtInVase(artwork.vase)
  if (artwork.vaseMaterialId) {
    const material = getMaterial(artwork.vaseMaterialId, artwork.vaseMaterialRevision)
    if (!material?.geometry || !material.sources.vase)
      throw new Error('作品引用的云端花器素材无效')
    const { width, height, mouthX } = material.geometry
    let { mouthY } = material.geometry
    if (material.category === 'bouquet' && mouthY < height * .65)
      mouthY = height * .86
    vase = nested(material.sources.vase || material.sources.bouquet, 350 - mouthX, 747 - mouthY, width, height)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000" viewBox="0 0 698 1000"><rect width="698" height="1000" fill="${backgroundColor(artwork.background)}"/>${background}<g>${stems}${vase}</g></svg>`
}

async function renderSvg(svg) {
  const startedAt = Date.now()
  const root = typeof svg === 'string' ? svg.match(/^\s*(<svg\b[^>]*>)/i)?.[1] : undefined
  if (typeof svg !== 'string' || svg.length > 1024 * 1024
    || !root || !/<\/svg>\s*$/i.test(svg)
    || /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=|@import|url\(\s*["']?(?!#)[^)]+\)/i.test(svg)
    || !/\bwidth=["']698["']/i.test(root) || !/\bheight=["']1000["']/i.test(root))
    throw new Error('作品 SVG 无效或尺寸不符合要求')
  if (!wasmReady) {
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm')
    wasmReady = initWasm(fs.readFileSync(wasmPath)).catch((error) => {
      if (error?.message === 'Already initialized. The `initWasm()` function can be used only once.')
        return
      wasmReady = undefined
      throw error
    })
  }
  await wasmReady
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: false },
  })
  let image
  let png
  let width
  let height
  try {
    image = renderer.render()
    width = image.width
    height = image.height
    png = image.asPng()
  }
  finally {
    image?.free()
    renderer.free()
  }
  return {
    width,
    height,
    pngBase64: Buffer.from(png).toString('base64'),
    pngBytes: png.length,
    renderMs: Date.now() - startedAt,
  }
}

module.exports = {
  async _before() {
    const auth = await resolveAuth(this)
    if (!auth?.uid)
      throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后进行云端渲染测试' }
    this.auth = auth
  },
  _after(error, result) {
    if (error)
      throw error
    if (this.auth.newToken)
      result.newToken = this.auth.newToken
    return result
  },
  async renderArtwork({ artwork } = {}) {
    const svg = await artworkSvg(artwork)
    const result = await renderSvg(svg)
    const assetCount = new Set([
      ...artwork.stems.map(stem => `${stem.materialId}:${stem.materialRevision}`),
      artwork.vaseMaterialId && `${artwork.vaseMaterialId}:${artwork.vaseMaterialRevision}`,
      artwork.backgroundMaterialId && `${artwork.backgroundMaterialId}:${artwork.backgroundMaterialRevision}`,
    ].filter(Boolean)).size
    return { ...result, assetCount }
  },
  async render({ svg } = {}) { return renderSvg(svg) },
}
