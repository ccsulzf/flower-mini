const test = require('node:test')
const assert = require('node:assert/strict')
const { createLoader } = require('./helpers/load-ts.cjs')
const component = 'src/pages/flower-studio/components/studio-artwork-preview.vue'

test('更多按可用操作映射，生成中不会误触保存，忙碌时不响应迟到选择', () => {
  const sheets = [], events = []
  const props = { imagePath: '', exporting: true, error: '', busy: false }
  const page = createLoader({ uni: { showActionSheet: sheet => sheets.push(sheet) }, emit: event => events.push(event) }).setup(component, props)
  page.openMore()
  assert.deepEqual(Array.from(sheets[0].itemList), ['结束创作'])
  sheets[0].success({ tapIndex: 0 })
  assert.deepEqual(events, ['end'])
  props.imagePath = '/art.png'; props.exporting = false
  page.openMore()
  assert.deepEqual(Array.from(sheets[1].itemList), ['保存到相册', '结束创作'])
  sheets[1].success({ tapIndex: 0 })
  assert.deepEqual(events, ['end', 'saveImage'])
  props.busy = true
  sheets[1].success({ tapIndex: 1 })
  page.openMore()
  assert.equal(sheets.length, 2)
  assert.equal(events.length, 2)
})

test('作品详情更多提供相册和删除，取消不会删除', () => {
  const sheets = [], events = []
  const page = createLoader({ uni: { showActionSheet: sheet => sheets.push(sheet) }, emit: event => events.push(event) }).setup(component, { imagePath: '/art.png', exporting: false, error: '', readOnly: true })
  page.openMore()
  assert.deepEqual(Array.from(sheets[0].itemList), ['保存到相册', '删除作品'])
  sheets[0].fail?.({ errMsg: 'showActionSheet:fail cancel' })
  assert.deepEqual(events, [])
  sheets[0].success({ tapIndex: 1 })
  assert.deepEqual(events, ['deleteWork'])
})
