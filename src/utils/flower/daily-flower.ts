import type { Artwork } from '@/models/artwork'
import { parseArtwork } from '@/utils/flower/artwork'

export interface DailyFlowerDraft {
  date: string
  description: string
  artwork: Artwork
}

export function parseDailyFlower(text: string): DailyFlowerDraft {
  if (text.length > 70_000)
    throw new Error('每日花束 JSON 文件过大')

  let value: unknown
  try {
    value = JSON.parse(text)
  }
  catch {
    throw new Error('JSON 语法错误，请检查引号、逗号和括号')
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('JSON 顶层必须是包含 date、description 和 artwork 的对象')

  const input = value as Record<string, unknown>
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    throw new Error('请提供 YYYY-MM-DD 格式的日期')
  const date = new Date(`${input.date}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.date)
    throw new Error('日期无效')

  if (typeof input.description !== 'string' || !input.description.trim() || input.description.trim().length > 160)
    throw new Error('花束描述不能为空且最多 160 字')
  if (typeof input.artwork !== 'object' || input.artwork === null || Array.isArray(input.artwork))
    throw new Error('JSON 中缺少有效的 artwork 花束数据')

  const artwork = parseArtwork(JSON.stringify(input.artwork))
  if (!artwork.stems.length)
    throw new Error('花束至少需要包含一枝花材')

  return {
    date: input.date,
    description: input.description.trim(),
    artwork,
  }
}
