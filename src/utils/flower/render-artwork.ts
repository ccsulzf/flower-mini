import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import type { VaseGeometry } from '@/models/material'
import { bouquetLayers, cloudPlantSvg, vasePlacement } from './material-render'
import { backgroundOffset, backgroundSceneSource } from './background-render'
import { drawSvg } from './svg-canvas'
import { studioMetrics } from './arrangement.cjs'
import type { Artwork } from './artwork'

const flowerStrokeOpacityScale = 0.25

interface RenderArtworkOptions {
  drawBackground?: boolean
  drawCaption?: boolean
  flush?: boolean
}

export async function renderArtwork(
  ctx: UniApp.CanvasContext,
  artwork: Artwork,
  options: RenderArtworkOptions = {},
) {
  const { drawBackground = true, drawCaption = true, flush = true } = options
  const catalog = useFlowerCatalogStore()
  const cloudAssets = new Map<string, Awaited<ReturnType<typeof catalog.ensure>>>()
  for (const instance of artwork.materials) {
    const asset = await catalog.ensure(instance.materialId)
    if (asset.category !== 'flower')
      throw new Error('花材素材不可用')
    cloudAssets.set(instance.materialId, asset)
  }
  const cloudVase = await catalog.ensure(artwork.container.materialId)
  if (cloudVase.category !== artwork.container.type)
    throw new Error('花器素材不可用')
  const cloudBackground = await catalog.ensure(artwork.background.materialId)
  if (cloudBackground.category !== 'background' || !cloudBackground.sources.background)
    throw new Error('背景素材不可用')

  if (drawBackground) {
    ctx.setFillStyle('#f6f3eb')
    ctx.fillRect(0, 0, studioMetrics.width, studioMetrics.height)
    drawSvg(ctx, backgroundSceneSource(cloudBackground), studioMetrics.width, studioMetrics.height)
  }
  ctx.save()
  ctx.translate(0, backgroundOffset(cloudBackground, cloudVase))

  const placement = vasePlacement(cloudVase)
  const vaseGeometry = cloudVase.geometry as VaseGeometry
  if (cloudVase.category === 'bouquet') {
    ctx.save()
    ctx.translate(placement.x, placement.y)
    drawSvg(ctx, bouquetLayers(cloudVase).back, placement.width, placement.height)
    ctx.restore()
  }
  else {
    ctx.save()
    ctx.translate(placement.x, placement.y)
    ctx.beginPath()
    ctx.rect(0, 0, placement.width, vaseGeometry.mouthY)
    ctx.clip()
    drawSvg(ctx, cloudVase.sources.vase!, placement.width, placement.height)
    ctx.restore()
  }

  for (const instance of artwork.materials) {
    const asset = cloudAssets.get(instance.materialId)!
    const { anchor, angle, height, scale, mirrored } = instance.transform
    ctx.save()
    ctx.translate(anchor.x, anchor.y)
    ctx.rotate(angle * Math.PI / 180)
    ctx.scale(mirrored ? -scale : scale, scale)
    ctx.translate(-55, -height - 55)
    drawSvg(ctx, cloudPlantSvg(asset, instance), 110, height + 55, flowerStrokeOpacityScale)
    ctx.restore()
  }

  ctx.save()
  ctx.translate(placement.x, placement.y)
  const source = cloudVase.category === 'bouquet' ? bouquetLayers(cloudVase).front : cloudVase.sources.vase
  if (!source)
    throw new Error('花器素材不可用')
  if (cloudVase.category === 'vase') {
    ctx.beginPath()
    ctx.rect(0, vaseGeometry.mouthY, placement.width, placement.height - vaseGeometry.mouthY)
    ctx.clip()
  }
  drawSvg(ctx, source, placement.width, placement.height)
  ctx.restore()
  ctx.restore()

  if (drawCaption) {
    ctx.setFillStyle('#898e79')
    ctx.setFontSize(18)
    ctx.setTextAlign('center')
    ctx.fillText('一枝花，一点日常', 349, 960)
  }
  if (flush)
    await new Promise<void>(resolve => ctx.draw(false, () => resolve()))
}
