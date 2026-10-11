// 页面、拖动、JSON 校验和导出共用画板尺寸，避免各处范围不一致。
const studioMetrics = { width: 698, height: 1000, minStemHeight: 120, maxStemHeight: 620, headMargin: 112 }

function maxStemHeight(position) {
  const radians = position.angle * Math.PI / 180
  const sin = Math.sin(radians)
  const cos = Math.cos(radians)
  const horizontal = sin < 0 ? position.x - studioMetrics.headMargin : studioMetrics.width - studioMetrics.headMargin - position.x
  return Math.max(studioMetrics.minStemHeight, Math.min(
    studioMetrics.maxStemHeight,
    (position.y - studioMetrics.headMargin) / cos,
    Math.abs(sin) < 0.001 ? Infinity : horizontal / Math.abs(sin),
  ))
}
function constrainStem(position) {
  const angle = Math.max(-65, Math.min(65, position.angle))
  return {
    x: position.x, y: position.y, angle,
    stemHeight: Math.max(studioMetrics.minStemHeight, Math.min(maxStemHeight({ ...position, angle }), position.stemHeight)),
  }
}
// origin 是触摸开始时的姿态，delta 是累计触摸位移（px），unit 是屏幕每 rpx 对应的 px。
function moveStem(origin, delta, unit, mouth) {
  const radians = origin.angle * Math.PI / 180
  const absoluteHeadX = origin.x + Math.sin(radians) * origin.stemHeight + delta.x / unit
  const center = mouth ? (mouth.left + mouth.right) / 2 : origin.x
  // 花头左右移动时落点在瓶口内缓慢跟随；花束束口窄，跟随幅度也更小。
  const x = mouth ? center + Math.max(-1, Math.min(1, (absoluteHeadX - center) / 240)) * (mouth.right - mouth.left) / 2 : origin.x
  const headX = absoluteHeadX - x
  const headY = Math.cos(radians) * origin.stemHeight - delta.y / unit
  // 改变落点后重新计算花枝姿态，花头仍跟随手指，不因落点移动而跳动。
  return constrainStem({
    x, y: origin.y,
    angle: Math.atan2(headX, headY) * 180 / Math.PI,
    stemHeight: Math.hypot(headX, headY),
  })
}
module.exports = { moveStem, constrainStem, maxStemHeight, studioMetrics }
