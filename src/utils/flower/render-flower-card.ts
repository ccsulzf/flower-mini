import type { FlowerGreetingText } from '@/models/flower-creation'

const canvasId = 'flower-card-canvas'
const canvasWidth = 698
const canvasHeight = 1260

function greetingLines(blessing: string) {
  const lines: string[] = []
  for (const paragraph of blessing.split('\n')) {
    const characters = Array.from(paragraph)
    for (let offset = 0; offset < characters.length; offset += 22)
      lines.push(characters.slice(offset, offset + 22).join(''))
  }
  return lines
}

export function renderFlowerCard(artworkPath: string, text: FlowerGreetingText): Promise<string> {
  return new Promise((resolve, reject) => {
    const context = uni.createCanvasContext(canvasId)
    context.setFillStyle('#f6f3eb')
    context.fillRect(0, 0, canvasWidth, canvasHeight)
    context.drawImage(artworkPath, 32, 88, 634, 908)
    context.setFillStyle('#3f463d')
    context.setTextAlign('left')
    context.setFontSize(24)
    if (text.recipient)
      context.fillText(`送给 ${text.recipient}`, 48, 64)
    context.setFontSize(26)
    greetingLines(text.blessing).forEach((line, index) => {
      context.fillText(line, 48, 1044 + index * 42)
    })
    if (text.signature) {
      context.setFontSize(22)
      context.setTextAlign('right')
      context.fillText(text.signature, 650, 1212)
    }
    context.draw(false, () => {
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
  })
}
