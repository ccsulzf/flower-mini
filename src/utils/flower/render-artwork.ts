import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { bouquetLayers, cloudPlantSvg, vasePlacement } from './material-render'
import { backgroundOffset, backgroundSceneSource } from './background-render'
import { drawSvg } from './svg-canvas'
import { plantSvgMarkup } from './svg-artwork'
import { studioMetrics } from './arrangement.cjs'
import { anchorY, artworkBackground, chrysanthemumRay, curveFor, type Artwork, type Stem } from './artwork'

const flowerStrokeOpacityScale = 0.25

// 此文件只负责导出：编辑器使用普通节点，导出按同样的坐标重绘作品。
// 画板逻辑尺寸为 698 × 1000；花材优先使用与编辑器相同的 SVG。
function oval(ctx: UniApp.CanvasContext, x: number, y: number, rx: number, ry: number) {
  // 四段三次贝塞尔近似椭圆，兼容旧版 CanvasContext，不依赖 ellipse()。
  const k = 0.55228475
  ctx.beginPath()
  ctx.moveTo(x + rx, y)
  ctx.bezierCurveTo(x + rx, y + k * ry, x + k * rx, y + ry, x, y + ry)
  ctx.bezierCurveTo(x - k * rx, y + ry, x - rx, y + k * ry, x - rx, y)
  ctx.bezierCurveTo(x - rx, y - k * ry, x - k * rx, y - ry, x, y - ry)
  ctx.bezierCurveTo(x + k * rx, y - ry, x + rx, y - k * ry, x + rx, y)
  ctx.closePath()
  ctx.fill()
}
// save/restore 隔离每片叶子的旋转与颜色，避免影响后续图形。
function leaf(ctx: UniApp.CanvasContext, x: number, y: number, angle: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle * Math.PI / 180)
  ctx.setFillStyle(color)
  oval(ctx, 0, 0, 20, 14)
  ctx.restore()
}
function drawFlower(ctx: UniApp.CanvasContext, stem: Stem) {
  if (stem.kind === 'chrysanthemum') {
    ctx.save()
    ctx.translate(55, 55)
    ctx.setLineCap('round')
    for (let index = 0; index < 64; index++) {
      const ray = chrysanthemumRay(index)
      ctx.save()
      ctx.rotate(ray.angle * Math.PI / 180)
      const gradient = ctx.createLinearGradient(0, 0, ray.length, 0)
      gradient.addColorStop(0, '#bd7e3c'); gradient.addColorStop(0.74, stem.color)
      ctx.setFillStyle(gradient)
      ctx.fillRect(0, -ray.width / 2, ray.length, ray.width)
      ctx.restore()
    }
    ctx.setFillStyle(stem.color); oval(ctx, 0, 0, 6, 6)
    ctx.restore()
    return
  }
  if (stem.kind === 'rose') {
    ctx.save(); ctx.translate(55, 55); ctx.setFillStyle(stem.color)
    for (let n = 1; n <= 8; n++) {
      ctx.save(); ctx.rotate(n * 45 * Math.PI / 180)
      oval(ctx, 0, -29, 30, 32); ctx.restore()
    }
    oval(ctx, 0, 0, 39, 39)
    ctx.setStrokeStyle('rgba(95,15,30,.3)')
    for (const radius of [33, 24, 14, 5]) {
      ctx.setLineWidth(radius === 33 ? 12 : 5)
      ctx.beginPath(); ctx.arc(0, 0, radius, -0.5, Math.PI * 1.55, false); ctx.stroke()
    }
    ctx.restore()
    return
  }
  if (stem.kind === 'tulip') {
    for (const petal of [{ x: 58, height: 130, width: 64, angle: 14 }, { x: 67.5, height: 120, width: 55, angle: 26 }, { x: 40, height: 140, width: 52, angle: -12 }]) {
      ctx.save(); ctx.translate(petal.x, 110); ctx.rotate(petal.angle * Math.PI / 180)
      ctx.setFillStyle(stem.color); oval(ctx, 0, -petal.height / 2, petal.width / 2, petal.height / 2)
      if (petal.angle === -12) {
        ctx.setStrokeStyle('#b394db'); ctx.setLineWidth(3)
        ctx.beginPath(); ctx.moveTo(-petal.width / 2, -petal.height * 0.7)
        ctx.bezierCurveTo(-petal.width / 2, -petal.height, petal.width / 2, -petal.height, petal.width / 2, -petal.height * 0.7); ctx.stroke()
      }
      ctx.restore()
    }
    ctx.setStrokeStyle('#b394db'); ctx.setLineWidth(3)
    ctx.beginPath(); ctx.moveTo(16, 28); ctx.bezierCurveTo(28, 0, 51, 12, 53, 28); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(51, 34); ctx.bezierCurveTo(70, 12, 95, 27, 88, 49); ctx.stroke()
    leaf(ctx, 36, 112, 38, '#849b71'); leaf(ctx, 75, 112, -35, '#849b71')
    return
  }
  if (stem.kind === 'leaf') {
    for (let n = 1; n <= 6; n++)
      leaf(ctx, 20 + (n % 2 ? 4 : 35) + 20, n * 23 + 14, n % 2 ? -35 : 35, stem.color)
    return
  }
  const poppy = stem.kind === 'poppy'
  ctx.save()
  // 对齐页面 110 × 110 花头的中心，花瓣围绕该点旋转。
  ctx.translate(55, 55)
  for (let n = 1; n <= (poppy ? 5 : 8); n++) {
    ctx.save()
    ctx.rotate(n * (poppy ? 72 : 45) * Math.PI / 180)
    ctx.setFillStyle(stem.color)
    ctx.setGlobalAlpha(poppy ? 0.9 : 1)
    oval(ctx, 0, poppy ? -31 : -25, poppy ? 28 : 15, poppy ? 31 : 27)
    ctx.restore()
  }
  ctx.setFillStyle(poppy ? '#666b47' : '#c1a14e')
  oval(ctx, 0, 0, poppy ? 11 : 13, poppy ? 11 : 13)
  ctx.restore()
}
// 花器尺寸与页面样式保持对应，瓶身渐变、瓶口和高光分开绘制。
function drawVase(ctx: UniApp.CanvasContext, artwork: Artwork) {
  if (artwork.vase === '花束') {
    drawBouquet(ctx)
    return
  }
  const round = artwork.vase === '圆花器'
  const glass = artwork.vase === '玻璃瓶'
  const left = round ? 260 : 280
  const top = round ? 765 : 735
  const width = round ? 180 : 140
  const height = round ? 140 : 170
  const gradient = ctx.createLinearGradient(left, 0, left + width, 0)
  const palette = glass ? ['rgba(126,164,158,.65)', 'rgba(225,240,229,.55)', 'rgba(121,158,151,.6)']
    : round ? ['#bfa18f', '#e5cbbc', '#c4a18d'] : ['#e6e2d7', '#dedacf', '#cdc9bd']
  palette.forEach((color, index) => gradient.addColorStop(index / 2, color))
  ctx.setFillStyle(gradient)
  ctx.beginPath()
  ctx.moveTo(left + width * 0.18, top)
  ctx.bezierCurveTo(left, top, left, top + height * 0.15, left, top + height * 0.42)
  ctx.bezierCurveTo(left, top + height, left + width * 0.18, top + height, left + width * 0.5, top + height)
  ctx.bezierCurveTo(left + width * 0.82, top + height, left + width, top + height, left + width, top + height * 0.42)
  ctx.bezierCurveTo(left + width, top + height * 0.15, left + width, top, left + width * 0.82, top)
  ctx.closePath()
  ctx.fill()
  ctx.setGlobalAlpha(glass ? 0.2 : 1)
  ctx.setFillStyle(glass ? '#78958b' : '#667568')
  oval(ctx, 350, top + 2, round ? 45 : 70, 7.5)
  ctx.setGlobalAlpha(0.2)
  ctx.setFillStyle('#ffffff')
  oval(ctx, left + 30, top + 81, 4, 49)
  ctx.setGlobalAlpha(1)
}

function drawBouquet(ctx: UniApp.CanvasContext) {
  // 与页面一致的三层包装纸，按各自底端旋转后绘制三角形。
  for (const paper of [
    { left: 180, top: 615, width: 340, height: 275, apex: 170, angle: 0, color: '#ded5c5' },
    { left: 190, top: 643, width: 285, height: 235, apex: 150, angle: 12, color: '#f1e9d9' },
    { left: 227, top: 650, width: 260, height: 235, apex: 115, angle: -12, color: '#e8decb' },
  ]) {
    ctx.save()
    ctx.translate(paper.left + paper.width / 2, paper.top + paper.height)
    ctx.rotate(paper.angle * Math.PI / 180)
    ctx.setFillStyle(paper.color)
    ctx.beginPath()
    ctx.moveTo(-paper.width / 2, -paper.height)
    ctx.lineTo(paper.width / 2, -paper.height)
    ctx.lineTo(paper.apex - paper.width / 2, 0)
    ctx.closePath(); ctx.fill(); ctx.restore()
  }
  ctx.setStrokeStyle('rgba(163,145,118,.25)'); ctx.setLineWidth(1)
  ctx.beginPath(); ctx.moveTo(350, 695); ctx.lineTo(372, 850); ctx.stroke()
  ctx.setFillStyle('#c98b94')
  ctx.fillRect(292, 778, 116, 20)
  for (const tail of [{ x: 332, angle: 21, height: 74 }, { x: 352, angle: -23, height: 64 }]) {
    ctx.save(); ctx.translate(tail.x + 11.5, 800); ctx.rotate(tail.angle * Math.PI / 180)
    ctx.fillRect(-11.5, 0, 23, tail.height); ctx.restore()
  }
  for (const loop of [{ x: 317, angle: 20 }, { x: 384, angle: -20 }]) {
    ctx.save(); ctx.translate(loop.x, 781); ctx.rotate(loop.angle * Math.PI / 180)
    ctx.setFillStyle('#c98b94'); oval(ctx, 0, 0, 32, 18)
    ctx.setFillStyle('#e8decb'); oval(ctx, 0, 0, 23, 9)
    ctx.restore()
  }
  ctx.setFillStyle('#c98b94'); oval(ctx, 351.5, 787, 13.5, 15)
}
export async function renderArtwork(ctx: UniApp.CanvasContext, artwork: Artwork) {
  // 同一种花茎素材只加载一次，加载失败时中止导出而不是生成缺失花茎的图片。
  const catalog = useFlowerCatalogStore()
  const cloudAssets = new Map<string, Awaited<ReturnType<typeof catalog.ensure>>>()
  for (const stem of artwork.stems) {
    if (!stem.materialId) continue
    const key = stem.materialId
    if (!cloudAssets.has(key)) cloudAssets.set(key, await catalog.ensure(stem.materialId))
  }
  const cloudVase = artwork.vaseMaterialId ? await catalog.ensure(artwork.vaseMaterialId) : undefined
  const cloudBackground = artwork.backgroundMaterialId ? await catalog.ensure(artwork.backgroundMaterialId) : undefined
  if (cloudBackground && (cloudBackground.category !== 'background' || !cloudBackground.sources.background)) throw new Error('背景素材不可用')
  const paths = [...new Set(artwork.stems.filter(stem => !stem.materialId && !plantSvgMarkup(stem.kind, stem.color, stem.stemHeight)).map(stem => curveFor(stem).image))]
  const loaded = await Promise.all(paths.map(src => new Promise<[string, string]>((resolve, reject) => {
    // getImageInfo 返回的包内路径可能丢失开头的 /，这里继续使用原始根路径。
    // 否则 Canvas 会错误地从当前页面目录中查找 static 素材。
    uni.getImageInfo({ src, success: () => resolve([src, src]), fail: reject })
  })))
  const images = new Map(loaded)
  // 绘制顺序：背景 → 桌面/阴影 → 花材 → 花器 → 落款，后绘制内容遮住前层。
  ctx.setFillStyle(artworkBackground(artwork.background))
  ctx.fillRect(0, 0, studioMetrics.width, studioMetrics.height)
  if (cloudBackground) drawSvg(ctx, backgroundSceneSource(cloudBackground), studioMetrics.width, studioMetrics.height)
  ctx.save(); ctx.translate(0, backgroundOffset(cloudBackground, cloudVase, artwork.vase))
  if (artwork.vase !== '花束' && cloudVase?.category !== 'bouquet') {
    ctx.setFillStyle('rgba(0,0,0,.12)')
    oval(ctx, 350, 910, 109, 15)
  }
  if (cloudVase?.category === 'bouquet') {
    const placement = vasePlacement(cloudVase)
    ctx.save(); ctx.translate(placement.x, placement.y)
    drawSvg(ctx, bouquetLayers(cloudVase).back, placement.width, placement.height); ctx.restore()
  }
  for (const stem of artwork.stems) {
    if (stem.materialId) {
      const asset = cloudAssets.get(stem.materialId)!
      ctx.save(); ctx.translate(stem.x, anchorY(artwork.vase)); ctx.rotate(stem.angle * Math.PI / 180)
      ctx.scale(stem.mirrored ? -stem.flowerScale : stem.flowerScale, stem.flowerScale); ctx.translate(-55, -stem.stemHeight - 55)
      drawSvg(ctx, cloudPlantSvg(asset, stem), 110, stem.stemHeight + 55, flowerStrokeOpacityScale)
      ctx.restore(); continue
    }
    const plant = plantSvgMarkup(stem.kind, stem.color, stem.stemHeight)
    if (plant) {
      ctx.save()
      ctx.translate(stem.x, anchorY(artwork.vase))
      ctx.rotate(stem.angle * Math.PI / 180)
      ctx.scale(stem.mirrored ? -stem.flowerScale : stem.flowerScale, stem.flowerScale)
      ctx.translate(-55, -stem.stemHeight - 55)
      drawSvg(ctx, plant, 110, stem.stemHeight + 55, flowerStrokeOpacityScale)
      ctx.restore()
      continue
    }
    const curve = curveFor(stem)
    ctx.save()
    // 先移动到瓶口固定点并旋转，再回到动态高度的花材左上角；不做整枝缩放。
    ctx.translate(stem.x, anchorY(artwork.vase))
    ctx.rotate(stem.angle * Math.PI / 180)
    if (stem.mirrored) ctx.scale(-1, 1)
    ctx.translate(-55, -stem.stemHeight - 55)
    // 素材为 4 倍分辨率，裁掉上方 55rpx 留白，只拉伸花茎到目标长度。
    ctx.drawImage(images.get(curve.image)!, 0, 220, 440, 820, 0, 55, 110, stem.stemHeight)

    // 花头绕自己的花心单独缩放，改变大小不会移动花心或瓶口固定点。
    ctx.save()
    ctx.translate(55, 55)
    ctx.scale(stem.flowerScale, stem.flowerScale)
    ctx.translate(-55, -55)
    drawFlower(ctx, stem)
    ctx.restore()
    ctx.restore()
  }
  // 花器最后盖住花茎底部，视觉上呈现插入瓶内的效果。
  if (cloudVase) {
    const placement = vasePlacement(cloudVase)
    ctx.save(); ctx.translate(placement.x, placement.y)
    const source = cloudVase.category === 'bouquet' ? bouquetLayers(cloudVase).front : cloudVase.sources.vase!
    drawSvg(ctx, source, placement.width, placement.height); ctx.restore()
  } else drawVase(ctx, artwork)
  ctx.restore()
  ctx.setFillStyle(artwork.background === 'cocoa' ? '#a9ad98' : '#898e79')
  ctx.setFontSize(18)
  ctx.setTextAlign('center')
  ctx.fillText('一枝花，一点日常', 349, 960)
  // draw 是异步提交；必须等回调后再 canvasToTempFilePath，避免导出空白。
  await new Promise<void>(resolve => ctx.draw(false, () => resolve()))
}
