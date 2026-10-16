// 花型保持同一套路径；深色花瓣使用较浅的轮廓，避免卷心融入底色。
export function colorizeMaterialSvg(svg: string, color: string) {
  const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : '#f1e5bd'
  let source = svg.replace(/__COLOR__/g, safeColor)
  if (!svg.includes('<!-- adaptive-petal-outline -->')) return source
  const channels = [1, 3, 5].map(offset => Number.parseInt(safeColor.slice(offset, offset + 2), 16) / 255)
  const brightness = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
  if (brightness < .38) {
    source = source.replace(/stroke="#9d4b4f" stroke-opacity="\.5"/g, 'stroke="#e8a39d" stroke-opacity=".65"')
  }
  return source
}
