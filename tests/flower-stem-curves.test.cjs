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
test('全部无叶花茎有可见中段弧度，保持各自连接点，叶材不参与改造', () => {
  const loader = createLoader(), catalog = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog
  assert.equal(catalog.errors.length, 0)
  const flowers = catalog.items.filter(row => row.category === 'flower' && row.group !== 'foliage')
  assert.equal(flowers.length, 47)
  for (const item of flowers) {
    const d = item.sources.stemWithoutLeaves.match(/d="M([\d.]+) ([\d.]+)C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/)
    assert.ok(d, item.id)
    const [x0, y0, x1, , x2, , x3, y3] = d.slice(1).map(Number)
    assert.equal(x0, item.id === 'bird-of-paradise' ? 29 : 55, item.id)
    assert.equal(y0, 0); assert.equal(x3, 55); assert.equal(y3, 260)
    const midpoint = (x0 + 3*x1 + 3*x2 + x3)/8
    assert.ok(Math.abs(midpoint - (x0+x3)/2) > 5, item.id)
  }
})

test('银莲花连接点藏进花瓣后，茎顶切线平顺，茎底仍落在原瓶口', () => {
  const loader = createLoader()
  const item = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.id === 'anemone')
  const { cloudPlantSvg } = loader.load('src/utils/flower/material-render.ts')
  const source = cloudPlantSvg({ ...item, geometry: { ...item.geometry, connectionY: 104 } }, { color: '#abcdef', stemHeight: 410, leafMode: 'without' })
  const stem = source.match(/<svg x="0" y="([\d.]+)" width="110" height="([\d.]+)"[^>]*viewBox="0 0 110 260"[^>]*>/)
  assert.ok(stem)
  assert.ok(Number(stem[1]) <= 80)
  assert.equal(Number(stem[1]) + Number(stem[2]), 465)
  assert.match(source, /M55 0C55 76/)
  assert.match(source, /M54\.6 1C54\.6 76/)
})
