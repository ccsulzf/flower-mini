// 将 SVG 中的图形直接绘制到 uni Canvas，避免微信 Canvas 对 SVG 图片解码的限制。
// 支持生成素材常用的路径/基本图形/分组/嵌套 viewBox/线性渐变；不支持的元素明确报错。
type Attributes = Record<string, string>
interface Node { tag: string, attrs: Attributes, children: Node[] }
function parse(source: string): Node {
  const stack: Node[] = [], roots: Node[] = []
  for (const token of source.match(/<!--[\s\S]*?-->|<[^>]+>/g) || []) {
    if (token.startsWith('<!--')) continue
    if (token.startsWith('</')) { const tag = token.match(/^<\/([\w:-]+)/)?.[1]; if (stack.pop()?.tag !== tag) throw new Error('SVG 标签不匹配'); continue }
    const tag = token.match(/^<([\w:-]+)/)?.[1]
    if (!tag) throw new Error('SVG 标记不受支持')
    const attrs: Attributes = {}
    for (const match of token.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attrs[match[1]] = match[3]
    const node = { tag, attrs, children: [] }
    if (stack.length) stack[stack.length - 1].children.push(node)
    else roots.push(node)
    if (!token.endsWith('/>')) stack.push(node)
  }
  if (stack.length || roots.length !== 1 || roots[0].tag !== 'svg') throw new Error('SVG 根元素无效')
  return roots[0]
}
const number = (value: string | undefined, fallback = 0) => value === undefined ? fallback : Number(value)
const numbers = (value: string) => (value.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || []).map(Number)
function ellipse(ctx: UniApp.CanvasContext, x: number, y: number, rx: number, ry: number) {
  const k = .5522847498
  ctx.moveTo(x + rx, y)
  ctx.bezierCurveTo(x + rx, y + k * ry, x + k * rx, y + ry, x, y + ry)
  ctx.bezierCurveTo(x - k * rx, y + ry, x - rx, y + k * ry, x - rx, y)
  ctx.bezierCurveTo(x - rx, y - k * ry, x - k * rx, y - ry, x, y - ry)
  ctx.bezierCurveTo(x + k * rx, y - ry, x + rx, y - k * ry, x + rx, y); ctx.closePath()
}
function arc(ctx: UniApp.CanvasContext, x: number, y: number, rx: number, ry: number, rotation: number, large: number, sweep: number, endX: number, endY: number) {
  rx = Math.abs(rx); ry = Math.abs(ry)
  if (!rx || !ry) { ctx.lineTo(endX, endY); return }
  if (x === endX && y === endY) return
  const phi = rotation * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi)
  const xp = cos * (x - endX) / 2 + sin * (y - endY) / 2, yp = -sin * (x - endX) / 2 + cos * (y - endY) / 2
  const size = xp * xp / (rx * rx) + yp * yp / (ry * ry)
  if (size > 1) { rx *= Math.sqrt(size); ry *= Math.sqrt(size) }
  const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp) / (rx * rx * yp * yp + ry * ry * xp * xp)))
  const cxp = factor * rx * yp / ry, cyp = -factor * ry * xp / rx
  const cx = cos * cxp - sin * cyp + (x + endX) / 2, cy = sin * cxp + cos * cyp + (y + endY) / 2
  const start = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx), end = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx)
  let delta = end - start
  if (!sweep && delta > 0) delta -= 2 * Math.PI
  if (sweep && delta < 0) delta += 2 * Math.PI
  const count = Math.ceil(Math.abs(delta) / (Math.PI / 2))
  const point = (angle: number) => [cx + rx * cos * Math.cos(angle) - ry * sin * Math.sin(angle), cy + rx * sin * Math.cos(angle) + ry * cos * Math.sin(angle)]
  const derivative = (angle: number) => [-rx * cos * Math.sin(angle) - ry * sin * Math.cos(angle), -rx * sin * Math.sin(angle) + ry * cos * Math.cos(angle)]
  for (let i = 0; i < count; i++) {
    const a = start + delta * i / count, b = start + delta * (i + 1) / count, k = 4 / 3 * Math.tan((b - a) / 4)
    const coordinates = point(a), q = point(b), d = derivative(a), e = derivative(b)
    ctx.bezierCurveTo(coordinates[0] + k * d[0], coordinates[1] + k * d[1], q[0] - k * e[0], q[1] - k * e[1], q[0], q[1])
  }
}
function path(ctx: UniApp.CanvasContext, data: string) {
  const tokens = data.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g) || []
  let i = 0, command = '', previous = '', x = 0, y = 0, startX = 0, startY = 0, controlX = 0, controlY = 0
  const sizes: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++]
    const op = command.toUpperCase(), relative = command !== op
    if (op === 'Z') { ctx.closePath(); x = startX; y = startY; previous = 'Z'; command = ''; continue }
    const count = sizes[op]
    if (!count || i + count > tokens.length) throw new Error('SVG 路径命令无效')
    const coordinates = tokens.slice(i, i + count).map(Number); i += count
    if (coordinates.some(value => !Number.isFinite(value))) throw new Error('SVG 路径参数无效')
    const coordinateX = (index: number) => coordinates[index] + (relative ? x : 0), coordinateY = (index: number) => coordinates[index] + (relative ? y : 0)
    let endX = x, endY = y
    if (op === 'M' || op === 'L' || op === 'T') {
      endX = coordinateX(0); endY = coordinateY(1)
      if (op === 'M') { ctx.moveTo(endX, endY); startX = endX; startY = endY; command = relative ? 'l' : 'L' }
      else if (op === 'L') ctx.lineTo(endX, endY)
      else { const cx = /[QT]/.test(previous) ? 2 * x - controlX : x, cy = /[QT]/.test(previous) ? 2 * y - controlY : y; ctx.quadraticCurveTo(cx, cy, endX, endY); controlX = cx; controlY = cy }
    } else if (op === 'H') { endX = coordinateX(0); ctx.lineTo(endX, y) }
    else if (op === 'V') { endY = coordinateY(0); ctx.lineTo(x, endY) }
    else if (op === 'C') { endX = coordinateX(4); endY = coordinateY(5); ctx.bezierCurveTo(coordinateX(0), coordinateY(1), coordinateX(2), coordinateY(3), endX, endY); controlX = coordinateX(2); controlY = coordinateY(3) }
    else if (op === 'S') { endX = coordinateX(2); endY = coordinateY(3); ctx.bezierCurveTo(/[CS]/.test(previous) ? 2 * x - controlX : x, /[CS]/.test(previous) ? 2 * y - controlY : y, coordinateX(0), coordinateY(1), endX, endY); controlX = coordinateX(0); controlY = coordinateY(1) }
    else if (op === 'Q') { endX = coordinateX(2); endY = coordinateY(3); ctx.quadraticCurveTo(coordinateX(0), coordinateY(1), endX, endY); controlX = coordinateX(0); controlY = coordinateY(1) }
    else if (op === 'A') { endX = coordinateX(5); endY = coordinateY(6); arc(ctx, x, y, coordinates[0], coordinates[1], coordinates[2], coordinates[3], coordinates[4], endX, endY) }
    x = endX; y = endY; previous = op
  }
}
export function drawSvg(ctx: UniApp.CanvasContext, source: string, width: number, height: number, strokeOpacityScale = 1) {
  const root = parse(source), gradients = new Map<string, Node>()
  const scan = (node: Node) => { if (node.tag === 'linearGradient' && node.attrs.id) gradients.set(node.attrs.id, node); node.children.forEach(scan) }
  scan(root)
  function paint(value: string, areaWidth: number, areaHeight: number) {
    if (!value.startsWith('url(')) return value
    const gradient = gradients.get(value.match(/url\(#([^)]*)\)/)?.[1] || '')
    if (!gradient) throw new Error('SVG 渐变未定义')
    const a = gradient.attrs, user = a.gradientUnits === 'userSpaceOnUse'
    if (!user || a.gradientTransform) throw new Error('SVG 渐变需使用 userSpaceOnUse，且不支持 gradientTransform')
    const coordinate = (value: string | undefined, fallback: number, size: number) => value?.endsWith('%') ? Number.parseFloat(value) * size / 100 : number(value, fallback) * (user ? 1 : size)
    const result = ctx.createLinearGradient(coordinate(a.x1, 0, areaWidth), coordinate(a.y1, 0, areaHeight), coordinate(a.x2, 1, areaWidth), coordinate(a.y2, 0, areaHeight))
    for (const stop of gradient.children) { if (stop.tag !== 'stop' || stop.attrs.style || (stop.attrs['stop-opacity'] !== undefined && Number(stop.attrs['stop-opacity']) !== 1)) throw new Error('SVG 渐变不受支持'); const raw = stop.attrs.offset || '0'; result.addColorStop(raw.endsWith('%') ? Number.parseFloat(raw) / 100 : Number(raw), stop.attrs['stop-color'] || '#000') }
    return result
  }
  function draw(node: Node, inherited: Attributes, alpha: number, areaWidth: number, areaHeight: number, isRoot = false) {
    const { tag, attrs: own } = node
    if (own.display === 'none' || own.visibility === 'hidden') return
    if (own['vector-effect']) throw new Error('SVG vector-effect 暂不支持图片导出')
    if (['defs', 'linearGradient', 'stop'].includes(tag)) return
    if (!['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polygon', 'polyline'].includes(tag)) throw new Error(`SVG 元素 ${tag} 暂不支持图片导出`)
    if (own.style || own.filter || own['clip-path'] || own.mask) throw new Error('SVG 样式/滤镜暂不支持图片导出')
    const attrs = { ...inherited, ...own }, opacity = alpha * number(own.opacity, 1)
    ctx.save()
    if (own.transform) {
      const parts = [...own.transform.matchAll(/(\w+)\s*\(([^)]*)\)/g)]
      if (!parts.length) throw new Error('SVG 变换无效')
      for (const part of parts) { const coordinates = numbers(part[2]); if (part[1] === 'translate') ctx.translate(coordinates[0], coordinates[1] || 0); else if (part[1] === 'scale') ctx.scale(coordinates[0], coordinates[1] ?? coordinates[0]); else if (part[1] === 'rotate') { ctx.translate(coordinates[1] || 0, coordinates[2] || 0); ctx.rotate(coordinates[0] * Math.PI / 180); ctx.translate(-(coordinates[1] || 0), -(coordinates[2] || 0)) } else throw new Error('SVG 变换暂不支持') }
    }
    if (tag === 'svg') {
      const box = numbers(own.viewBox || '')
      if (box.length !== 4 || box[2] <= 0 || box[3] <= 0) throw new Error('SVG viewBox 无效')
      ctx.translate(number(own.x), number(own.y))
      ctx.scale((isRoot ? width : number(own.width, box[2])) / box[2], (isRoot ? height : number(own.height, box[3])) / box[3]); ctx.translate(-box[0], -box[1])
      areaWidth = box[2]; areaHeight = box[3]
    }
    if (tag === 'svg' || tag === 'g') node.children.forEach(child => draw(child, attrs, opacity, areaWidth, areaHeight))
    else {
      ctx.beginPath()
      if (tag === 'path') path(ctx, own.d || '')
      else if (tag === 'circle' || tag === 'ellipse') ellipse(ctx, number(own.cx), number(own.cy), number(own.rx, number(own.r)), number(own.ry, number(own.r)))
      else if (tag === 'rect') { const x = number(own.x), y = number(own.y), w = number(own.width), h = number(own.height), rx = Math.min(w / 2, number(own.rx, number(own.ry))), ry = Math.min(h / 2, number(own.ry, rx)); if (!rx || !ry) ctx.rect(x, y, w, h); else { ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.quadraticCurveTo(x + w, y, x + w, y + ry); ctx.lineTo(x + w, y + h - ry); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h); ctx.lineTo(x + rx, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - ry); ctx.lineTo(x, y + ry); ctx.quadraticCurveTo(x, y, x + rx, y); ctx.closePath() } }
      else if (tag === 'line') { ctx.moveTo(number(own.x1), number(own.y1)); ctx.lineTo(number(own.x2), number(own.y2)) }
      else { const coordinates = numbers(own.points || ''); if (coordinates.length < 4 || coordinates.length % 2) throw new Error('SVG 点坐标无效'); ctx.moveTo(coordinates[0], coordinates[1]); for (let i = 2; i < coordinates.length; i += 2) ctx.lineTo(coordinates[i], coordinates[i + 1]); if (tag === 'polygon') ctx.closePath() }
      if ((attrs.fill || '#000') !== 'none') { ctx.setGlobalAlpha(opacity * number(attrs['fill-opacity'], 1)); ctx.setFillStyle(paint(attrs.fill || '#000', areaWidth, areaHeight)); if (attrs['fill-rule'] === 'evenodd') throw new Error('SVG evenodd 填充暂不支持'); ctx.fill() }
      if (attrs.stroke && attrs.stroke !== 'none') { ctx.setGlobalAlpha(opacity * number(attrs['stroke-opacity'], 1) * strokeOpacityScale); if (attrs.stroke.startsWith('url(')) throw new Error('SVG 渐变描边暂不支持'); ctx.setStrokeStyle(attrs.stroke); ctx.setLineWidth(number(attrs['stroke-width'], 1)); ctx.setLineCap((attrs['stroke-linecap'] || 'butt') as 'butt'); ctx.setLineJoin((attrs['stroke-linejoin'] || 'miter') as 'miter'); if (attrs['stroke-dasharray']) throw new Error('SVG 虚线暂不支持'); ctx.stroke() }
    }
    ctx.restore()
  }
  draw(root, {}, 1, width, height, true)
}
