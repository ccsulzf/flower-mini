// 保留花头连接点和茎底，调整中段弧度。旧的近直线素材也可即时呈现新版曲线。
const softLeft = new Set(['tulip', 'calla-lily', 'ranunculus', 'freesia', 'campanula', 'scabiosa', 'phalaenopsis'])
const softRight = new Set(['gerbera', 'feather-gerbera', 'lisianthus', 'single-lisianthus', 'oncidium', 'dendrobium', 'astilbe'])
const sturdy = new Set(['king-protea', 'hydrangea', 'sunflower', 'lotus', 'cotton', 'pincushion'])
export function naturalStemSource(source: string, id: string) {
  let changed = 0
  return source.replace(/(<path\b[^>]*\bd=")([^"]+)(")/g, (whole, prefix: string, path: string, suffix: string) => {
    if (changed >= 2) return whole
    const numbers = path.match(/^M([\d.]+) ([\d.]+)C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)$/)
    if (!numbers) return whole
    const [startX, startY, firstX, , secondX, , endX, endY] = numbers.slice(1).map(Number)
    if (startY > 1 || endY !== 260 || Math.abs(firstX - startX) > 8 || Math.abs(secondX - endX) > 8) return whole
    const offset = startX < 54 && id !== 'bird-of-paradise' ? -.4 : changed === 1 ? -.4 : 0
    let control1: number, control2: number
    if (softLeft.has(id)) { control1 = 18; control2 = 12 }
    else if (softRight.has(id)) { control1 = 92; control2 = 99 }
    else if (sturdy.has(id)) { control1 = 37; control2 = 35 }
    else {
      const right = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0
      control1 = right ? 83 : 25; control2 = right ? 67 : 40
    }
    changed++
    return `${prefix}M${startX} ${startY}C${control1 + offset} 76 ${control2 + offset} 180 ${endX} ${endY}${suffix}`
  })
}

// 茎顶顺着花朵轴线进入，弯曲集中在中段，避免连接处突然折向一侧。
export function smoothStemTip(source: string) {
  let matched = 0
  return source.replace(/(<path\b[^>]*\bd=")(M([\d.]+) ([\d.]+)C)([\d.]+)( [\d.]+ [\d.]+ [\d.]+ [\d.]+ 260")/g, (whole, prefix: string, start: string, x: string, y: string, _control: string, rest: string) => {
    if (matched >= 2 || Number(y) > 1) return whole
    matched++
    return `${prefix}${start}${x}${rest}`
  })
}
