const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')
function roseFixture() {
  const loader = createLoader({ uni: { arrayBufferToBase64: buffer => Buffer.from(buffer).toString('base64') } })
  const rose = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(m => m.id === 'rose')
  return { loader, rose }
}
test('深红玫瑰使用浅暖轮廓，让卷心与花瓣仍可辨认', () => {
  const { loader, rose } = roseFixture()
  const svg = loader.load('src/utils/flower/material-render.ts').cloudPlantSvg(rose, { color: '#b82b36', stemHeight: 410, leafMode: 'without' })
  assert.ok(svg.includes('fill="#b82b36"'))
  assert.equal((svg.match(/stroke="#e8a39d" stroke-opacity=".65"/g) || []).length, 7)
})
test('珊瑚红、粉色和奶白玫瑰保留原有花瓣描边和明暗', () => {
  const { loader, rose } = roseFixture()
  const { cloudPlantSvg } = loader.load('src/utils/flower/material-render.ts')
  for (const color of ['#ed6965', '#ce7e8b', '#f4f0e6']) {
    const svg = cloudPlantSvg(rose, { color, stemHeight: 410, leafMode: 'without' })
    const body = rose.sources.flower.trim().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replaceAll('__COLOR__', color)
    assert.ok(svg.includes(body), color)
  }
})
test('本地素材详情与工作台使用相同的深色玫瑰描边', () => {
  const { loader, rose } = roseFixture()
  const uri = loader.load('src/subpackages/material-admin/lib/local-materials.ts').localPreviewSource(rose.sources.flower, '#B82B36')
  const svg = Buffer.from(uri.split(',')[1], 'base64').toString('utf8')
  assert.equal((svg.match(/stroke="#e8a39d" stroke-opacity=".65"/g) || []).length, 7)
})
test('正式及测试云渲染与本地采用相同的玫瑰配色结果', () => {
  const fs = require('node:fs'), vm = require('node:vm')
  const { loader, rose } = roseFixture()
  const { colorizeMaterialSvg } = loader.load('src/utils/flower/material-color.ts')
  for (const name of ['flower-render', 'flower-render-test']) {
    const source = fs.readFileSync(`uniCloud-alipay/cloudfunctions/${name}/index.obj.js`, 'utf8')
    const start = source.indexOf('function colorizeMaterialSvg(')
    const end = source.indexOf('\nfunction ', start + 9)
    const cloudColorize = vm.runInNewContext(source.slice(start, end) + '; colorizeMaterialSvg')
    for (const color of rose.colors) assert.equal(cloudColorize(rose.sources.flower, color.value), colorizeMaterialSvg(rose.sources.flower, color.value), `${name}: ${color.value}`)
  }
})
