const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { parse } = require('@vue/compiler-sfc')

const { createLoader } = require('./helpers/load-ts.cjs')
function setupComponent(relative, props = {}, deviceOverrides = {}) {
  const target = relative.startsWith('components/') ? `src/components/flower/${relative.slice(11)}` : `src/pages/flower-studio/${relative}`
  const page = createLoader({ device: deviceOverrides }).setup(target, props)
  if (relative === 'flower-studio-page.vue') page.store.initialize() // Interaction fixture explicitly supplies three branches.
  return page
}

function styleNumber(style, property) {
  const values = Array.from(style.matchAll(new RegExp(`(?:^|;)\\s*${property}:\\s*(-?[\\d.]+)(rpx|px)`, 'g')))
  const value = values.at(-1)
  assert.ok(value, `missing ${property} in ${style}`)
  return Number(value[1]) * (value[2] === 'px' ? 2 : 1)
}

test('金丝菊和虞美人的 PNG 花茎从花心开始并延伸至瓶口', () => {
  for (const kind of ['chrysanthemum', 'poppy']) {
    const stem = { id: 1, kind, x: 350, y: 747, angle: 0, flowerScale: 1.2, stemHeight: 410, color: '#e1b94f' }
    const state = setupComponent('components/flower-stem.vue', { stem, anchor: 747, selected: false })
    assert.equal(state.usesSvgPlant.value, false)
    const source = fs.readFileSync(path.resolve(__dirname, '../src/components/flower/flower-stem.vue'), 'utf8')
    const css = parse(source).descriptor.styles[0].content
    const clipRule = css.match(/\.stem-image-clip\s*\{([^}]+)\}/)[1]
    const clipTop = styleNumber(`${clipRule};${state.stemClipStyle.value}`, 'top')
    const clipHeight = styleNumber(state.stemClipStyle.value, 'height')
    const imageTop = styleNumber(state.stemImageStyle.value, 'top')
    const imageHeight = styleNumber(state.stemImageStyle.value, 'height')
    // PNG 的前 55/260 是留白，裁剪后第一段可见花茎应落在花心 y=55。
    assert.ok(Math.abs(clipTop + imageTop + imageHeight * 55 / 260 - 55) < 0.001)
    assert.equal(clipTop + clipHeight, stem.stemHeight + 55)
  }
})

test('选择目录花材只添加花枝，不自动打开浮动编辑工具栏', async () => {
  const page = setupComponent('flower-studio-page.vue')
  const material = { id: 'test-flower', revision: 'a'.repeat(16), category: 'flower', name: '测试花', colors: [{ value: '#abcdef' }] }
  page.catalog.materials = [material]
  page.catalog.ensure = async () => material
  page.activeTab.value = 'flowers'
  await page.addCloudMaterial(material.id)
  assert.equal(page.stems.value.length, 4)
  assert.equal(page.stems.value[3].materialId, material.id)
  assert.equal(page.showFlowerTools.value, false)
  assert.equal(page.selectedId.value, null)
  page.openFlowerTools(page.stems.value[3].id)
  assert.equal(page.showFlowerTools.value, true)
})

test('点花默认收起色板，连续选色保持展开，其他操作收起', () => {
  const page = setupComponent('flower-studio-page.vue')
  page.openFlowerTools(1)
  assert.equal(page.toolsColorsOpen.value, false)
  page.toolsColorsOpen.value = true
  page.setColor('#b82b36')
  assert.equal(page.stems.value[0].color, '#b82b36')
  assert.equal(page.toolsColorsOpen.value, true)
  page.setColor('#b82b36')
  assert.equal(page.toolsColorsOpen.value, true)
  page.setColor('#849c81')
  assert.equal(page.stems.value[0].color, '#849c81')
  assert.equal(page.toolsColorsOpen.value, true)
  page.setLayer('front')
  assert.equal(page.toolsColorsOpen.value, false)
  page.toolsColorsOpen.value = true
  page.closeFlowerTools()
  assert.equal(page.toolsColorsOpen.value, false)
})

test('最前和最后的花材只开放可用层次方向', () => {
  const page = setupComponent('flower-studio-page.vue')
  page.openFlowerTools(1)
  assert.equal(page.canMoveBack.value, false)
  assert.equal(page.canMoveFront.value, true)
  page.setLayer('front')
  assert.equal(page.canMoveBack.value, true)
  assert.equal(page.canMoveFront.value, false)
  page.setLayer('back')
  assert.equal(page.canMoveBack.value, false)
})

test('原生导航下不重复预留导航高度，长屏画板略上移，短屏不越界', () => {
  for (const windowHeight of [480, 800]) {
    const page = setupComponent('flower-studio-page.vue', {}, { windowHeight, screenHeight: windowHeight })
    assert.ok(page.pageActionsTop < 24, '操作栏应靠近页面顶部，不能再次加状态栏和导航栏高度')
    const board = page.boardPosition.value
    const scale = page.boardScale.value
    const height = 1000 * 0.5 * scale
    const width = 698 * 0.5 * scale
    const spaceAbove = board.top - page.stageTop
    const spaceBelow = windowHeight - page.stageBottom - board.top - height
    assert.ok(spaceAbove >= -0.001)
    assert.ok(spaceBelow >= -0.001)
    assert.ok(spaceAbove <= spaceBelow + 0.001)
    if (windowHeight === 800) assert.ok(spaceAbove < spaceBelow)
    assert.ok(Math.abs(board.left - (375 - board.left - width)) < 0.001)
  }
})

test('居中画板仍支持拖动，拖动结束不弹编辑栏，点击花朵才打开', () => {
  const page = setupComponent('flower-studio-page.vue')
  const stem = page.stems.value[0]
  const previousHeight = stem.stemHeight
  page.startDrag({ touches: [{ clientX: 100, clientY: 100 }] }, stem)
  page.moveDrag({ touches: [{ clientX: 115, clientY: 80 }] })
  page.endDrag(false)
  assert.notEqual(stem.stemHeight, previousHeight)
  assert.equal(page.showFlowerTools.value, false)
  page.startDrag({ touches: [{ clientX: 115, clientY: 80 }] }, stem)
  page.endDrag(false)
  assert.equal(page.showFlowerTools.value, true)
})

test('展开收起色板或选色时浮层不跳位，花材姿态保持不变', () => {
  const page = setupComponent('flower-studio-page.vue')
  page.stems.value[2].stemHeight = 420
  page.openFlowerTools(3)
  const before = { ...page.flowerToolsStyle.value }
  const { x, y, angle, stemHeight } = page.stems.value[2]
  page.toolsColorsOpen.value = true
  assert.deepEqual({ ...page.flowerToolsStyle.value }, before)
  page.setColor('#849c81')
  assert.deepEqual({ ...page.flowerToolsStyle.value }, before)
  const stem = page.stems.value[2]
  assert.deepEqual({ x: stem.x, y: stem.y, angle: stem.angle, stemHeight: stem.stemHeight }, { x, y, angle, stemHeight })
})

test('SVG 花茎在花头后方接入真实底部，既不留缝也不穿过花瓣，底端仍在瓶口', () => {
  // 三种花头在 x=55 的实际可见底部：玫瑰曲线约104，郁金香花萼95.5，雏菊花瓣105.5。
  for (const [kind, bloomBottom] of [['rose', 104], ['tulip', 95.5], ['daisy', 105.5]]) {
    const stem = { id: 1, kind, x: 350, y: 747, angle: 0, flowerScale: 1.2, stemHeight: 410, color: '#b82b36' }
    const state = setupComponent('components/flower-stem.vue', { stem, anchor: 747, selected: false })
    const svg = Buffer.from(state.plantSource.value.split(',')[1], 'base64').toString('utf8')
    const transform = svg.match(/transform="translate\(0 ([\d.]+)\) scale\(1 ([\d.]+)\)"/)
    const connection = Number(transform[1])
    const scale = Number(transform[2])
    assert.ok(connection < bloomBottom, `${kind} 连接处不能留缝`)
    assert.ok(connection >= bloomBottom - 6, `${kind} 不能穿过花瓣`)
    assert.ok(Math.abs(connection + 260 * scale - 465) < 0.001)
    assert.ok(svg.indexOf('M55 0') < svg.indexOf('stroke-opacity'), `${kind} 花茎应先绘制，花头盖住连接处`)
  }
})

test('轻微移动仍算点击，取消触摸不弹工具栏；拖动多次只需一次撤销', () => {
  const page = setupComponent('flower-studio-page.vue')
  const before = JSON.stringify(page.stems.value)
  const stem = page.stems.value[0]
  page.startDrag({ touches: [{ clientX: 100, clientY: 100 }] }, stem)
  page.moveDrag({ touches: [{ clientX: 101, clientY: 100 }] })
  page.endDrag(false)
  assert.equal(page.showFlowerTools.value, true)
  assert.equal(page.canUndo.value, false)
  page.startDrag({ touches: [{ clientX: 100, clientY: 100 }] }, stem)
  page.endDrag(true)
  assert.equal(page.showFlowerTools.value, false)
  assert.equal(page.canUndo.value, false)
  page.startDrag({ touches: [{ clientX: 100, clientY: 100 }] }, stem)
  page.moveDrag({ touches: [{ clientX: 110, clientY: 90 }] })
  page.moveDrag({ touches: [{ clientX: 120, clientY: 80 }] })
  page.endDrag(false)
  page.undo()
  assert.equal(JSON.stringify(page.stems.value), before)
  assert.equal(page.canUndo.value, false)
})

test('不同屏幕上浮层保留完整色板高度且不超出工作区', () => {
  for (const windowHeight of [480, 800]) {
    const page = setupComponent('flower-studio-page.vue', {}, { windowHeight, screenHeight: windowHeight })
    for (const stem of page.stems.value) {
      page.openFlowerTools(stem.id)
      const style = page.flowerToolsStyle.value
      const left = Number.parseFloat(style.left), top = Number.parseFloat(style.top), width = Number.parseFloat(style.width)
      assert.ok(left >= 12 && left + width <= 363)
      assert.ok(top >= page.stageTop)
      assert.ok(top + 220 * 0.5 <= windowHeight - page.stageBottom + 0.001)
    }
  }
})

test('清空花材需确认，取消保留作品，确认可撤销，空作品不弹窗', () => {
  const dialogs = []
  const page = createLoader({ uni: { showModal: options => dialogs.push(options) } }).setup('src/pages/flower-studio/flower-studio-page.vue')
  page.store.initialize()
  const before = JSON.stringify(page.stems.value)
  page.reset()
  assert.equal(dialogs.length, 1)
  assert.equal(JSON.stringify(page.stems.value), before)
  dialogs[0].success({ confirm: false, cancel: true })
  assert.equal(JSON.stringify(page.stems.value), before)
  assert.equal(page.canUndo.value, false)
  page.reset()
  dialogs[1].success({ confirm: true, cancel: false })
  assert.equal(page.stems.value.length, 0)
  page.reset()
  assert.equal(dialogs.length, 2)
  page.undo()
  assert.equal(JSON.stringify(page.stems.value), before)
})
