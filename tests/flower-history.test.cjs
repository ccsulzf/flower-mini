const assert = require('node:assert/strict')
const test = require('node:test')

function createHistory() {
  const { createLoader } = require('./helpers/load-ts.cjs')
  return new (createLoader().load('src/utils/flower/artwork-history.ts').ArtworkHistory)()
}
function artwork(count) {
  return {
    vase: '花束', background: 'warm',
    stems: Array.from({ length: count }, (_, index) => ({ id: index + 1, kind: 'rose', x: 350, y: 747, angle: 0, flowerScale: 1.2, stemHeight: 350, color: '#b82b36' })),
  }
}

test('清空花材可以撤销和重做，空记录操作不改变作品', () => {
  const history = createHistory()
  assert.equal(history.undo(artwork(2)), undefined)
  assert.equal(history.redo(artwork(2)), undefined)
  history.remember(artwork(2))
  const restored = history.undo(artwork(0))
  assert.equal(restored.stems.length, 2)
  assert.equal(restored.vase, '花束')
  assert.equal(history.redo(restored).stems.length, 0)
  assert.equal(history.future.length, 0)
})

test('连续撤销和重做保持先后顺序，重新编辑清除重做记录', () => {
  const history = createHistory()
  history.remember(artwork(1))
  history.remember(artwork(2))
  let current = history.undo(artwork(3))
  current = history.undo(current)
  assert.equal(current.stems.length, 1)
  current = history.redo(current)
  assert.equal(current.stems.length, 2)
  history.remember(current)
  assert.equal(history.redo(artwork(4)), undefined)
})

test('历史快照不会被后续花材修改污染，并限制到最近 30 步', () => {
  const history = createHistory()
  const current = artwork(1)
  history.remember(current)
  current.stems[0].color = '#ffffff'
  assert.equal(history.undo(current).stems[0].color, '#b82b36')
  for (let index = 0; index < 35; index++) history.remember({ ...artwork(1), background: index % 2 ? 'warm' : 'sage' })
  assert.equal(history.past.length, 30)
})
