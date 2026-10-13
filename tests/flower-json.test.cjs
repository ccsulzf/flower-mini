const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')
const loader = createLoader()
const { parseArtwork } = loader.load('src/utils/flower/artwork.ts')
const artwork = { version: 2, vase: '陶瓶', background: 'warm', stems: [{ id: 1, kind: 'rose', x: 350, y: 747, angle: 0, flowerScale: 1.2, stemHeight: 350, color: '#b82b36' }] }

test('普通 JSON 和转义 JSON 字符串生成相同的花束', () => {
  const raw = JSON.stringify(artwork)
  for (const text of [raw, JSON.stringify(raw)]) {
    const result = parseArtwork(text)
    assert.equal(result.vase, '陶瓶')
    assert.equal(result.stems.length, 1)
    assert.equal(result.stems[0].kind, 'rose')
    assert.equal(result.stems[0].stemHeight, 350)
    assert.equal(result.stems[0].color, '#b82b36')
  }
})

test('转义字符串仍执行花材校验，不接受重复 ID 或画板外坐标', () => {
  for (const stems of [[artwork.stems[0], artwork.stems[0]], [{ ...artwork.stems[0], x: 699 }]]) {
    assert.throws(() => parseArtwork(JSON.stringify(JSON.stringify({ ...artwork, stems }))), /花材数据无效/)
  }
})

test('作品和容器布局允许超过48枝花材', () => {
  const stems = Array.from({ length: 60 }, (_, index) => ({ ...artwork.stems[0], id: index + 1 }))
  const containerLayouts = {
    'builtin:陶瓶': stems.map(({ id }) => ({ id, x: 350, angle: 0, flowerScale: 1, stemHeight: 350 })),
  }
  const result = parseArtwork(JSON.stringify({ ...artwork, stems, containerLayouts }))
  assert.equal(result.stems.length, 60)
  assert.equal(result.containerLayouts['builtin:陶瓶'].length, 60)
})

test('此前生成的花束横坐标自动收拢到瓶口，普通和转义 JSON 都能导入', () => {
  const raw = JSON.stringify({
    ...artwork,
    stems: [330, 335, 338, 350, 362, 365, 370].map((x, index) => ({ ...artwork.stems[0], id: index + 1, x })),
  })
  for (const text of [raw, JSON.stringify(raw)]) {
    const result = parseArtwork(text)
    assert.deepEqual(Array.from(result.stems, stem => stem.x), [338, 338, 338, 350, 362, 362, 362])
    assert.equal(result.stems[0].stemHeight, 350)
    assert.equal(result.stems[0].color, '#b82b36')
  }
})

test('不合法的 JSON 提示语法错误，空输入和过大输入被拒绝', () => {
  assert.throws(() => parseArtwork('{broken'), /JSON/)
  assert.throws(() => parseArtwork('  '), /JSON/)
  assert.throws(() => parseArtwork(' '.repeat(65537)), /过大/)
})

test('导入圆花器时按瓶口重设纵坐标', () => {
  const result = parseArtwork(JSON.stringify({ ...artwork, vase: '圆花器' }))
  assert.equal(result.stems[0].y, 777)
})

test('手绑花束能导入和再次保存，切换形式保留花材姿态', () => {
  const result = parseArtwork(JSON.stringify({ ...artwork, vase: '花束' }))
  assert.equal(result.vase, '花束')
  assert.equal(result.stems[0].y, 747)
  assert.equal(result.stems[0].angle, 0)
  assert.equal(result.stems[0].stemHeight, 350)
  assert.equal(parseArtwork(JSON.stringify(result)).vase, '花束')
})

test('花束图片导出绘制豆沙粉丝带，而不是花瓶的瓶口', async () => {
  const { renderArtwork } = loader.load('src/utils/flower/render-artwork.ts')
  const colors = []
  const ctx = new Proxy({}, {
    get: (_, key) => {
      if (key === 'setFillStyle') return color => colors.push(color)
      if (key === 'createLinearGradient') return () => ({ addColorStop() {} })
      if (key === 'draw') return (_, done) => done()
      return () => {}
    },
  })
  await renderArtwork(ctx, { ...artwork, vase: '花束', stems: [] })
  assert.ok(colors.includes('#c98b94'))
  assert.ok(!colors.includes('#84917b'))
})

test('内置 SVG 花材导出复用编辑器中的整枝素材，避免 Canvas 近似产生额外纹理', async () => {
  const isolated = createLoader({
    uni: {
      getImageInfo: ({ fail }) => fail(new Error('SVG 花材导出不应加载 PNG 花茎')),
    },
  })
  const artworkModule = isolated.load('src/utils/flower/svg-artwork.ts')
  const renderer = isolated.load('src/utils/flower/render-artwork.ts')
  const svgCanvas = isolated.load('src/utils/flower/svg-canvas.ts')
  const rendered = []
  svgCanvas.drawSvg = (_, source) => rendered.push(source)
  const ctx = new Proxy({}, {
    get: (_, key) => {
      if (key === 'draw') return (_, done) => done()
      if (key === 'createLinearGradient') return () => ({ addColorStop() {} })
      return () => {}
    },
  })

  for (const [index, kind] of ['rose', 'daisy', 'tulip'].entries()) {
    const stem = { ...artwork.stems[0], id: index + 1, kind, color: '#b82b36' }
    const expected = artworkModule.plantSvgMarkup(kind, stem.color, stem.stemHeight, true)
    await renderer.renderArtwork(ctx, { ...artwork, stems: [stem] })
    assert.ok(rendered.includes(expected))
  }
  assert.equal(rendered.length, 3)
})

test('页面内置示例能生成 12 枝无叶花束', () => {
  const { exampleJson } = loader.load('src/pages/flower-json/example.ts')
  const result = parseArtwork(exampleJson)
  assert.equal(result.stems.length, 12)
  assert.equal(result.stems.some(stem => stem.kind === 'leaf'), false)
  assert.equal(new Set(result.stems.map(stem => stem.id)).size, 12)
})

test('默认作品每次生成独立花枝对象', () => {
  const { createDefaultArtwork } = loader.load('src/config/flower-materials.ts')
  const a = createDefaultArtwork(); const b = createDefaultArtwork()
  a.stems[0].color = '#ffffff'
  assert.equal(b.stems[0].color, '#f1e5bd')
})
