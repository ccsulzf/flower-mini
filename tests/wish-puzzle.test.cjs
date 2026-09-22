const { test } = require('node:test')
const assert = require('node:assert/strict')

test('formats the wish puzzle amount with a yen sign and grouping', () => {
  const { formatWishAmount } = require('../src/pages/wish-puzzle/puzzle-display.cjs')

  assert.equal(formatWishAmount(3280), '¥3,280')
  assert.equal(formatWishAmount(0), '¥0')
})
