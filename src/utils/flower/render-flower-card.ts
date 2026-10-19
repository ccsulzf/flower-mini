import type { FlowerGreetingText } from '@/models/flower-creation'

const canvasId = 'flower-card-canvas'
const canvasWidth = 698
const canvasHeight = 1260

function greetingLines(blessing: string) {
  const lines: string[] = []
  for (const paragraph of blessing.split('\n')) {
    const characters = Array.from(paragraph)
    for (let offset = 0; offset < characters.length; offset += 24)
      lines.push(characters.slice(offset, offset + 24).join(''))
  }
  return lines
}

export function renderFlowerCard(artworkPath: string, text: FlowerGreetingText): Promise<string> {
  return new Promise((resolve, reject) => {
    const context = uni.createCanvasContext(canvasId)
    context.setFillStyle('#f6f3eb')
    context.fillRect(0, 0, canvasWidth, canvasHeight)
    context.setStrokeStyle('#cdbb95')
    context.setLineWidth(1)
    context.strokeRect(18, 18, 662, 1224)
    context.setStrokeStyle('#e2d8c2')
    context.strokeRect(27, 27, 644, 1206)

    context.setFillStyle('#64705b')
    context.setTextAlign('center')
    context.setFontSize(26)
    context.fillText('花间寄语', 349, 80)
    context.setStrokeStyle('#cdbb95')
    context.beginPath()
    context.moveTo(280, 101)
    context.lineTo(418, 101)
    context.stroke()
    context.setFillStyle('#b99f71')
    context.beginPath()
    context.arc(349, 101, 3, 0, Math.PI * 2)
    context.fill()

    context.setFillStyle('#3f463d')
    context.setTextAlign('left')
    context.setFontSize(22)
    if (text.recipient)
      context.fillText(`送给 ${text.recipient}`, 52, 145)

    context.setFillStyle('#fffdf7')
    context.fillRect(42, 160, 614, 870)
    context.drawImage(artworkPath, 52, 170, 594, 850)

    context.setStrokeStyle('#cdbb95')
    context.beginPath()
    context.moveTo(250, 1054)
    context.lineTo(448, 1054)
    context.stroke()
    context.setFillStyle('#b99f71')
    context.beginPath()
    context.arc(349, 1054, 3, 0, Math.PI * 2)
    context.fill()

    context.setFillStyle('#3f463d')
    context.setFontSize(21)
    greetingLines(text.blessing).forEach((line, index) => {
      context.fillText(line, 52, 1094 + index * 26)
    })
    if (text.signature) {
      context.setFontSize(20)
      context.setTextAlign('right')
      context.fillText(text.signature, 646, 1223)
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
