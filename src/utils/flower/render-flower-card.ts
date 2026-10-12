import type { FlowerCardText } from '@/models/flower-creation'
import { validateCard } from './creation-storage'

export async function renderFlowerCard(ctx: UniApp.CanvasContext, artworkImagePath: string, text: FlowerCardText & { recipient?: string }, resize?: (height: number) => Promise<void>) {
  const card = validateCard(text)
  const width = 698
  ctx.setFontSize(26)
  const lines: string[] = []
  for (const paragraph of card.blessing.split('\n')) {
    let line = ''
    for (const char of paragraph) {
      if (line && ctx.measureText(line + char).width > width - 96) {
        lines.push(line)
        line = ''
      }
      line += char
    }
    lines.push(line)
  }
  if (!card.blessing)
    lines.length = 0
  if (text.recipient !== undefined) {
    if (typeof text.recipient !== 'string' || text.recipient.length > 24)
      throw new Error('送给最多填写24字')
    if (lines.length > 3)
      throw new Error('祝福语最多三行，自动换行也计入行数，请缩短文字')
    const height = 1260
    if (resize)
      await resize(height)
    ctx.setFillStyle('#f6f3eb')
    ctx.fillRect(0, 0, width, height)
    ctx.setFillStyle('#3f463d')
    ctx.setTextAlign('left')
    ctx.setFontSize(24)
    if (text.recipient.trim()) {
      const recipient = `送给 ${text.recipient.trim()}`
      ctx.setFontSize(Math.min(24, 24 * (width - 96) / Math.max(1, ctx.measureText(recipient).width)))
      ctx.fillText(recipient, 48, 64)
    }
    ctx.drawImage(artworkImagePath, 32, 88, 634, 908)
    ctx.setFontSize(26)
    lines.forEach((line, i) => ctx.fillText(line, 48, 1044 + i * 42))
    if (card.signature) {
      ctx.setTextAlign('right')
      ctx.setFontSize(22)
      ctx.fillText(card.signature, width - 48, height - 48)
    }
    await new Promise<void>(resolve => ctx.draw(false, () => resolve()))
    return { width, height }
  }
  const height = 1000 + Math.max(150, 80 + lines.length * 42 + (card.signature ? 54 : 0))
  if (resize)
    await resize(height)
  ctx.setFillStyle('#f6f3eb')
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(artworkImagePath, 0, 0, width, 1000)
  ctx.setFillStyle('#3f463d')
  ctx.setTextAlign('left')
  ctx.setFontSize(26)
  lines.forEach((line, i) => ctx.fillText(line, 48, 1048 + i * 42))
  if (card.signature) {
    ctx.setTextAlign('right')
    ctx.setFontSize(22)
    ctx.fillText(card.signature, width - 48, height - 40)
  }
  await new Promise<void>(resolve => ctx.draw(false, () => resolve()))
  return { width, height }
}
