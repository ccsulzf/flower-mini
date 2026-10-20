const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')
const old = '<svg viewBox="0 0 110 260"><path d="M55 0C51 65 59 157 55 260" fill="none"/><path d="M54.6 1C50.6 65 58.6 157 54.6 260" fill="none"/></svg>'
test('旧直茎即时改成左右自然弧线，两端固定，重复处理不重复弯曲', () => {
  const { naturalStemSource } = createLoader().load('src/utils/flower/stem-curves.ts')
  const left = naturalStemSource(old, 'tulip'), right = naturalStemSource(old, 'gerbera')
  assert.match(left, /M55 0C18 76 12 180 55 260/)
  assert.match(right, /M55 0C92 76 99 180 55 260/)
  assert.match(left, /M54\.6 1C17\.6 76 11\.6 180 54\.6 260/)
  assert.equal(naturalStemSource(left, 'tulip'), left)
  assert.equal(naturalStemSource(right, 'gerbera'), right)
  const offCenter = old.replace('M55 0C51 65', 'M29 0C34 65')
  assert.match(naturalStemSource(offCenter, 'bird-of-paradise'), /M29 0C[\d.]+ 76 [\d.]+ 180 55 260/)
})
test('全部无叶花茎使用克制的自然弧度，茎顶连续且不被运行时放大', () => {
  const loader = createLoader(), catalog = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog
  assert.equal(catalog.errors.length, 0)
  const flowers = catalog.items.filter(row => row.category === 'flower' && row.group !== 'foliage')
  assert.equal(flowers.length, 68)
  for (const item of flowers) {
    if (item.sources.stemWithoutLeaves.includes('<!-- continuous-stem-join -->')) {
      const d = item.sources.stemWithoutLeaves.match(/d="(M[^"]+)"/)[1]
      const values = d.match(/-?\d*\.?\d+/g).map(Number)
      assert.equal(values.length, 14, item.id)
      assert.equal(values[0], item.id === 'bird-of-paradise' ? 29 : 55); assert.equal(values[1], 0)
      assert.equal(values.at(-2), 55); assert.equal(values.at(-1), 260)
      // 两段曲线在中间共用位置和方向，顶端顺着花序的倾斜角度。
      assert.ok(Math.abs((values[6]-values[4]) - (values[8]-values[6])) < .001, item.id)
      assert.ok(Math.abs((values[7]-values[5]) - (values[9]-values[7])) < .001, item.id)
      const angle = Number(item.sources.flower.match(/<g transform="rotate\((-?[\d.]+) (?:55|29)/)[1])
      assert.ok(Math.abs((values[2]-values[0])/values[3] + Math.tan(angle*Math.PI/180)) < .002, item.id)
      const { naturalStemSource, smoothStemTip } = loader.load('src/utils/flower/stem-curves.ts')
      assert.equal(smoothStemTip(naturalStemSource(item.sources.stemWithoutLeaves, item.id)), item.sources.stemWithoutLeaves)
      continue
    }
    const d = item.sources.stemWithoutLeaves.match(/d="M([\d.]+) ([\d.]+)C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/)
    assert.ok(d, item.id)
    const [x0, y0, x1, , x2, , x3, y3] = d.slice(1).map(Number)
    assert.equal(x0, item.id === 'bird-of-paradise' ? 29 : 55, item.id)
    assert.equal(y0, 0); assert.equal(x3, 55); assert.equal(y3, 260)
    const midpoint = (x0 + 3*x1 + 3*x2 + x3)/8
    assert.equal(x1, x0, `${item.id}: 茎顶切线连续`)
    const bow = Math.abs(midpoint - (x0+x3)/2)
    assert.ok(bow > 1.5 && bow < 10, `${item.id}: 中段弯曲 ${bow}`)
    const { naturalStemSource } = loader.load('src/utils/flower/stem-curves.ts')
    assert.equal(naturalStemSource(item.sources.stemWithoutLeaves, item.id), item.sources.stemWithoutLeaves, item.id)
  }
})

test('银莲花连接点藏进花瓣后，茎顶切线平顺，茎底仍落在原瓶口', () => {
  const loader = createLoader()
  const item = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.id === 'anemone')
  const { cloudPlantSvg } = loader.load('src/utils/flower/material-render.ts')
  const source = cloudPlantSvg({ ...item, sources: { ...item.sources, stemWithoutLeaves: old }, geometry: { ...item.geometry, connectionY: 104 } }, { color: '#abcdef', stemHeight: 410 })
  const stem = source.match(/<svg x="0" y="([\d.]+)" width="110" height="([\d.]+)"[^>]*viewBox="0 0 110 260"[^>]*>/)
  assert.ok(stem)
  assert.ok(Number(stem[1]) <= 80)
  assert.equal(Number(stem[1]) + Number(stem[2]), 465)
  assert.match(source, /M55 0C55 76/)
})

test('已绘制垂直茎顶的柔弯素材不被旧版自动曲线放大', () => {
  const { naturalStemSource } = createLoader().load('src/utils/flower/stem-curves.ts')
  const authored = '<svg viewBox="0 0 110 260"><path d="M55 0C55 76 61 180 55 260" fill="none"/><path d="M54.6 0C54.6 76 60.6 180 54.6 260" fill="none"/></svg>'
  assert.equal(naturalStemSource(authored, 'king-protea'), authored)
})

test('倾斜花序的接头按显示高度保持切线，曲线中段和瓶口不动', () => {
  const { fitStemJoin } = createLoader().load('src/utils/flower/stem-curves.ts')
  const authored = '<svg viewBox="0 0 110 260"><!-- continuous-stem-join --><path d="M55 0C59.9 28 80 92 79 145C78 198 65 236 55 260" fill="none"/></svg>'
  const fitted = fitStemJoin(authored, 2)
  assert.match(fitted, /M55 0C64\.8 28 80 92 79 145C78 198 65 236 55 260/)
  assert.equal(fitStemJoin(old, 2), old)
})

test('明确绘制的花序接头按锚点拼接，调整高度不改变衔接角度', () => {
  const loader = createLoader(), catalog = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog
  const rose = catalog.items.find(item => item.id === 'rose')
  const sources = { ...rose.sources, stemWithoutLeaves: '<svg viewBox="0 0 110 260"><!-- continuous-stem-join --><path d="M55 0C59.9 28 80 92 79 145C78 198 65 236 55 260" fill="none"/></svg>' }
  const { cloudPlantSvg } = loader.load('src/utils/flower/material-render.ts')
  for (const height of [260, 510]) {
    const svg = cloudPlantSvg({ ...rose, sources }, { color: '#abcdef', stemHeight: height })
    const node = svg.match(/<svg x="0" y="([\d.]+)" width="110" height="([\d.]+)"[^>]*viewBox="0 0 110 260"/)
    assert.equal(Number(node[1]), rose.geometry.connectionY)
    const controls = svg.match(/M55 0C([\d.]+) 28/)
    const slope = (Number(controls[1]) - 55) / (28 * Number(node[2]) / 260)
    assert.ok(Math.abs(slope - 4.9 / 28) < 0.0001)
  }
})
