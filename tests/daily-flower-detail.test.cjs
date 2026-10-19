const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')

test('每日花束详情顶部提供贺卡、分享、复制操作', async () => {
  const lifecycle = { onLoad: [], onUnload: [] }
  const routes = []
  const loader = createLoader({
    lifecycle,
    uni: {
      navigateTo: value => routes.push(value),
      redirectTo: value => routes.push(value),
      showToast() {},
    },
  })
  const page = loader.setup('src/pages/daily-flower-detail/daily-flower-detail-page.vue')
  const artwork = {
    version: 2,
    vase: '陶瓶',
    background: 'sage',
    stems: [{
      id: 1,
      kind: 'rose',
      x: 350,
      y: 747,
      angle: 0,
      flowerScale: 1,
      stemHeight: 260,
      color: '#d85f70',
    }],
  }
  page.dailyFlowers.loadDate = async date => ({
    date,
    description: '秋日花束',
    artwork,
    imagePath: '/daily-flower.png',
  })
  lifecycle.onLoad[0]({ date: '2026-10-16' })
  await new Promise(resolve => setTimeout(resolve, 0))

  page.makeCard()
  assert.equal(routes[0].url, '/pages/flower-card/flower-card-page?dailyFlowerDate=2026-10-16')
  page.shareFlower()

  let saved
  page.works.save = async input => {
    saved = input
    return { id: 'a'.repeat(32) }
  }
  await page.copyToStudio()
  assert.equal(saved.title, '每日花束 2026-10-16')
  assert.deepEqual(JSON.parse(JSON.stringify(saved.draft.artwork)), artwork)
  assert.equal(routes[1].url, `/pages/flower-studio/flower-studio-page?workId=${'a'.repeat(32)}&edit=1`)
  lifecycle.onUnload[0]()

  const source = fs.readFileSync('src/pages/daily-flower-detail/daily-flower-detail-page.vue', 'utf8')
  assert.match(source, /detail-top-actions[\s\S]*贺卡[\s\S]*分享[\s\S]*复制/)
  assert.doesNotMatch(source, /变成我的|detail-footer/)
})
