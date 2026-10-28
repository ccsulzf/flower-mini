import type { FlowerGreetingText } from '@/models/flower-creation'
import type { Artwork } from '@/models/artwork'
import { renderArtwork } from './render-artwork'

const canvasId = 'flower-card-canvas'
const canvasWidth = 698
const canvasHeight = 1260

export function greetingLines(blessing: string) {
  const lines: string[] = []
  for (const paragraph of blessing.split('\n')) {
    const characters = Array.from(paragraph)
    for (let offset = 0; offset < characters.length; offset += 20)
      lines.push(characters.slice(offset, offset + 20).join(''))
  }
  return lines
}

export async function renderFlowerCard(
  artworkPath: string,
  text: FlowerGreetingText,
  artwork?: Artwork,
): Promise<string> {
  const context = uni.createCanvasContext(canvasId)
  context.setFillStyle('#f8f2e6')
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  context.setStrokeStyle('#d5c5a6')
  context.setLineWidth(1)
  context.strokeRect(16, 17, 663, 1225)
  context.setStrokeStyle('#dfd1b8')
  context.strokeRect(26, 27, 645, 1206)

  context.setFillStyle('#e4e7da')
  context.fillRect(284, 48, 130, 36)
  context.setFillStyle('#64705b')
  context.setTextAlign('center')
  context.setFontSize(20)
  context.fillText('花间寄语', 349, 73)

  context.setFillStyle('#565247')
  context.setTextAlign('left')
  context.setFontSize(23)
  if (text.recipient)
    context.fillText(`送给 ${text.recipient}`, 69, 128)

  if (artwork) {
    context.save()
    context.translate(77, 140)
    context.scale(.78, .78)
    await renderArtwork(context, artwork, { drawBackground: false, drawCaption: false, flush: false })
    context.restore()
  }
  else {
    context.drawImage(artworkPath, 69, 150, 560, 800)
  }

  context.setStrokeStyle('#cdbb95')
  context.beginPath()
  context.moveTo(69, 970)
  context.lineTo(629, 970)
  context.stroke()
  context.setFillStyle('#b99f71')
  context.beginPath()
  context.arc(349, 970, 3.5, 0, Math.PI * 2)
  context.fill()

  context.setFillStyle('#3f463d')
  context.setTextAlign('left')
  context.setFontSize(25)
  greetingLines(text.blessing).forEach((line, index) => {
    context.fillText(line, 80, 1026 + index * 34)
  })
  if (text.signature) {
    context.setFontSize(22)
    context.setTextAlign('right')
    context.fillText(`—— ${text.signature}`, 646, 1232)
  }
  await new Promise<void>(resolve => context.draw(false, () => resolve()))
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      destWidth: canvasWidth,
      destHeight: canvasHeight,
      fileType: 'png',
      success: result => resolve(result.tempFilePath),
      fail: reject,
    })
  })
}
