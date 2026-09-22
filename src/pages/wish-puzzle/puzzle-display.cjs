function formatWishAmount(amount) {
  return `¥${Math.max(0, Math.round(amount)).toLocaleString('en-US')}`
}

module.exports = { formatWishAmount }
