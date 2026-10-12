const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('SVG 花茎从花头连接点开始，避免经过 PNG 留白裁剪后产生间隙', () => {
  for (const name of ['rose-stem.svg', 'tulip-stem.svg', 'daisy-stem.svg']) {
    const svg = fs.readFileSync(path.join(__dirname, '../src/utils/flower/svg', name), 'utf8')
    assert.match(svg, /[ML]\s*55\s+0(?:\D|$)/)
  }
})

test('SVG 花材让花头和花茎共用以瓶口为原点的缩放层', () => {
  const component = fs.readFileSync(path.join(__dirname, '../src/components/flower/flower-stem.vue'), 'utf8')
  assert.match(component, /class="flower-instance"/)
  assert.match(component, /const flowerInstanceStyle = computed\(\(\) =>/)
})


test('每一枝花材使用统一的 FlowerInstance 变换层', () => {
  const component = fs.readFileSync(path.join(__dirname, '../src/components/flower/flower-stem.vue'), 'utf8')
  assert.match(component, /class="flower-instance"/)
  assert.match(component, /const flowerInstanceStyle = computed\(\(\) =>/)
  assert.doesNotMatch(component, /class="flower-touch"[^>]*:style="(?:studioStemStyle|flowerInstanceStyle)"/)
})

test('花材模板的动态样式使用 WXML 兼容的 CSS 字符串', () => {
  const component = fs.readFileSync(path.join(__dirname, '../src/components/flower/flower-stem.vue'), 'utf8')
  assert.doesNotMatch(component, /:style="\{/)
})

test('不同花材使用各自的花头连接点', () => {
  const artwork = fs.readFileSync(path.join(__dirname, '../src/utils/flower/svg-artwork.ts'), 'utf8')
  const component = fs.readFileSync(path.join(__dirname, '../src/components/flower/flower-stem.vue'), 'utf8')
  assert.match(artwork, /export function flowerConnectionY\(kind: FlowerKind\)/)
  assert.match(component, /flowerConnectionY\(props\.stem\.kind\)/)
})

test('SVG 花材输出整枝素材，花头和花径在同一张图内合成', () => {
  const artwork = fs.readFileSync(path.join(__dirname, '../src/utils/flower/svg-artwork.ts'), 'utf8')
  const component = fs.readFileSync(path.join(__dirname, '../src/components/flower/flower-stem.vue'), 'utf8')
  assert.match(artwork, /export function plantSvgSource\(kind: FlowerKind, color: string, stemHeight: number, withoutLeaves = false\)/)
  assert.match(component, /plantSvgSource\(props\.stem\.kind, props\.stem\.color, props\.stem\.stemHeight, true\)/)
})

