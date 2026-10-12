const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { parse } = require('@vue/compiler-sfc')

const { createLoader } = require('./helpers/load-ts.cjs')
function setupComponent(relative, props = {}, deviceOverrides = {}) {
  const target = relative.startsWith('components/') ? `src/components/flower/${relative.slice(11)}` : `src/pages/flower-studio/${relative}`
  const page = createLoader({ device: deviceOverrides }).setup(target, props)
  if (relative === 'flower-studio-page.vue') { page.store.initialize(); page.pageReady.value = true } // Interaction fixture explicitly supplies three branches.
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
  assert.equal(page.activeTab.value, 'flowers')
  await page.addCloudMaterial(material.id)
  assert.equal(page.stems.value.length, 5)
  assert.equal(page.activeTab.value, 'flowers')
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

test('自定义导航预留状态栏，长屏画板略上移，短屏不越界', () => {
  for (const windowHeight of [480, 800]) {
    const page = setupComponent('flower-studio-page.vue', {}, { windowHeight, screenHeight: windowHeight })
    assert.equal(page.pageActionsTop, 76, '自定义导航包含24像素状态栏和44像素导航栏')
    const board = page.layout.boardPosition.value
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
  assert.equal(page.showFlowerTools.value, true)
  assert.equal(page.canUndo.value, false)
  page.startDrag({ touches: [{ clientX: 100, clientY: 100 }] }, stem)
  page.moveDrag({ touches: [{ clientX: 110, clientY: 90 }] })
  page.moveDrag({ touches: [{ clientX: 120, clientY: 80 }] })
  page.endDrag(false)
  page.undo()
  assert.equal(JSON.stringify(page.stems.value), before)
  assert.equal(page.canUndo.value, false)
})

test('不同屏幕上工具栏固定在底部，切换花材不跳动且不超出屏幕', () => {
  for (const windowHeight of [480, 800]) {
    const page = setupComponent('flower-studio-page.vue', {}, { windowHeight, screenHeight: windowHeight })
    for (const stem of page.stems.value) {
      page.openFlowerTools(stem.id)
      const style = page.flowerToolsStyle.value
      const left = Number.parseFloat(style.left), bottom = Number.parseFloat(style.bottom), width = Number.parseFloat(style.width)
      assert.ok(left >= 12 && left + width <= 363)
      assert.equal(bottom, page.stageBottom)
      assert.ok(windowHeight - bottom - 400 * 0.5 >= page.stageTop)
      const before = JSON.stringify(style)
      page.store.selectAdjacent('next')
      assert.equal(JSON.stringify(page.flowerToolsStyle.value), before)
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

test('轻点花头不会先关闭再打开工具栏，重复点同一枝保持色板；真正拖动才收起', () => {
  const page = setupComponent('flower-studio-page.vue')
  const stem = page.stems.value[0]
  page.openFlowerTools(stem.id); page.toolsColorsOpen.value = true
  const touch = (x, y) => ({ touches: [{ clientX: x, clientY: y }] })
  page.startDrag(touch(100, 200), stem)
  assert.equal(page.showFlowerTools.value, true)
  assert.equal(page.toolsColorsOpen.value, true)
  page.endDrag(false)
  assert.equal(page.showFlowerTools.value, true)
  assert.equal(page.toolsColorsOpen.value, true)
  page.startDrag(touch(100, 200), stem)
  page.moveDrag(touch(110, 200))
  assert.equal(page.showFlowerTools.value, false)
  page.endDrag(false)
  assert.equal(page.showFlowerTools.value, false)
})

test('肾蕨等云端叶材点击区覆盖整枝，主花保持花头点击区', () => {
  const loader = createLoader()
  const items = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  const catalog = loader.load('src/stores/flowerCatalogStore.ts').useFlowerCatalogStore()
  for (const id of ['boston-fern', 'eucalyptus', 'rose']) {
    const material = items.find(item => item.id === id)
    catalog.prepared[`${material.id}:${material.revision}`] = material
    const stem = { id: 1, kind: 'rose', materialId: material.id, materialRevision: material.revision, x: 350, angle: 12, stemHeight: 410, flowerScale: 1, color: '#849c81' }
    const state = loader.setup('src/components/flower/flower-stem.vue', { stem, anchor: 747, selected: true })
    assert.equal(state.isFoliage.value, material.group === 'foliage')
    assert.equal(state.touchAreaStyle.value, material.group === 'foliage' ? 'height:489rpx;' : '')
  }
})

test('已有缓存花瓶立即使用，冷目录先准备花瓶再后台准备其他素材', async () => {
  const loader = createLoader(), page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const vase = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.category === 'vase')
  page.catalog.materials = [vase]
  page.catalog.prepared[`${vase.id}:${vase.revision}`] = vase
  let release
  page.catalog.load = () => new Promise(resolve => { release = resolve })
  page.catalog.preload = async () => {}
  const warm = page.loadMaterials()
  assert.equal(page.vaseMaterialId.value, vase.id)
  release(); await warm
  page.store.initialize({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })
  page.catalog.prepared = {}
  const order = []
  page.catalog.load = async () => { order.push('directory') }
  page.catalog.ensure = async () => { order.push('vase'); return vase }
  page.catalog.preload = async () => { order.push('background preload') }
  await page.loadMaterials()
  assert.deepEqual(order, ['directory', 'vase', 'background preload'])
})

test('拖到左侧时瓶口落点跟随到左侧，拖到右侧随到右侧，撤销恢复整枝', () => {
  const loader = createLoader(), page = loader.setup('src/pages/flower-studio/flower-studio-page.vue')
  const items = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  const vase = items.find(item => item.id === 'ceramic-vase')
  page.catalog.prepared[`${vase.id}:${vase.revision}`] = vase
  page.store.setVaseMaterial(vase)
  page.store.addFlower('rose')
  const stem = page.stems.value[0]
  stem.x = 375; stem.angle = 0; stem.stemHeight = 300
  const before = JSON.stringify(stem)
  const drag = (dx) => {
    page.startDrag({ touches: [{ clientX: 200, clientY: 200 }] }, stem)
    page.moveDrag({ touches: [{ clientX: 200 + dx, clientY: 200 }] })
    page.endDrag(false)
  }
  drag(-85)
  assert.ok(stem.x < 350)
  const bounds = page.store.stemLandingBounds()
  assert.ok(stem.x >= bounds.left && stem.x <= bounds.right)
  const headX = stem.x + Math.sin(stem.angle * Math.PI / 180) * stem.stemHeight
  assert.ok(Math.abs(headX - (375 - 85 / (page.unit * page.boardScale.value))) < .001)
  page.undo(); assert.equal(JSON.stringify(page.stems.value[0]), before)
  const current = page.stems.value[0]
  page.startDrag({ touches: [{ clientX: 200, clientY: 200 }] }, current)
  page.moveDrag({ touches: [{ clientX: 240, clientY: 200 }] }); page.endDrag(false)
  assert.ok(current.x > 350 && current.x <= bounds.right)
})
