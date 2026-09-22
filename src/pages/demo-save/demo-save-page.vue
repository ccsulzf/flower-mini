<script setup lang="ts">
import { onReady, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { useDevice } from '@/hooks/useDevice'

import {
  createSpreadUnlockOrder,
  generatePuzzle,
  getCoverCrop,
  tracePiecePath,
  type PuzzlePiece,
} from './puzzle'

const ROWS = 12
const COLS = 12
const TOTAL = ROWS * COLS

const CANVAS_ID = 'puzzleCanvas'
const PAGE_HORIZONTAL_PADDING = 64

const { contentWidth, rpxUnit } = useDevice()
const CANVAS_SIZE = contentWidth(PAGE_HORIZONTAL_PADDING)
const PUZZLE_INSET = 2
const PUZZLE_SIZE = CANVAS_SIZE - PUZZLE_INSET * 2
const PUZZLE_RADIUS = 28 * rpxUnit.value

/**
 * Demo 目标金额
 */
const TARGET_AMOUNT = 10000

/**
 * 网络测试图片,这个图片暂时不要去动，因为要配置
 */
const IMAGE_SRC
  = 'https://qiniu-web-assets.dcloud.net.cn/unidoc/zh/shuijiao.jpg'

/**
 * 当前已攒金额
 */
const savedAmount = ref(0)

/**
 * 拼图结构
 */
const pieces = generatePuzzle(
  ROWS,
  COLS,
  20260914,
)

function roundedCornersFor(piece: PuzzlePiece) {
  return {
    topLeft: piece.row === 0 && piece.col === 0,
    topRight: piece.row === 0 && piece.col === COLS - 1,
    bottomRight: piece.row === ROWS - 1 && piece.col === COLS - 1,
    bottomLeft: piece.row === ROWS - 1 && piece.col === 0,
  }
}

/**
 * 邻近扩散式解锁顺序
 *
 * 不是完全随机散落，
 * 每一块都会尽量从已经解锁的区域向周围扩散。
 */
const unlockOrder = createSpreadUnlockOrder(
  ROWS,
  COLS,
  20260914,
)

/**
 * 当前真实进度
 */
const progress = computed(() => {
  if (TARGET_AMOUNT <= 0)
    return 0

  return Math.min(
    savedAmount.value / TARGET_AMOUNT,
    1,
  )
})

const progressPercent = computed(() => {
  return Math.round(progress.value * 1000) / 10
})

/**
 * 按金额计算“理论上应该已经解锁多少块”
 */
const targetUnlockedCount = computed(() => {
  const amountPerPiece = TARGET_AMOUNT / TOTAL
  return Math.min(Math.floor(savedAmount.value / amountPerPiece), TOTAL)
})

const partialProgress = computed(() => {
  if (savedAmount.value >= TARGET_AMOUNT)
    return 0

  const amountPerPiece = TARGET_AMOUNT / TOTAL
  return (savedAmount.value % amountPerPiece) / amountPerPiece
})

const partialPieceId = computed(() => {
  if (!partialProgress.value || targetUnlockedCount.value >= TOTAL)
    return null

  return unlockOrder[targetUnlockedCount.value] ?? null
})

/**
 * Canvas 当前实际已经显示出来多少块。
 *
 * 它不会瞬间等于 targetUnlockedCount，
 * 而是通过动画逐块追上去。
 */
const displayedUnlockedCount = ref(0)

/**
 * 当前正在淡入的拼图块
 */
const animatingPieceId = ref<number | null>(null)

/**
 * 当前正在淡入块的透明度
 */
const animatingAlpha = ref(0)
const animatingOffsetY = ref(-12)
const animatingScale = ref(1)

/**
 * 是否正在播放解锁动画
 */
const isAnimating = ref(false)

const partialPulse = ref(0.7)
let partialPulseTimer: ReturnType<typeof setInterval> | null = null

/**
 * 下一块还差多少钱
 */
const nextUnlockAmount = computed(() => {
  if (savedAmount.value >= TARGET_AMOUNT)
    return 0

  const currentCount = targetUnlockedCount.value

  /**
   * 第 N 块对应的金额阈值
   */
  const nextThreshold = Math.ceil(
    ((currentCount + 1) / TOTAL)
    * TARGET_AMOUNT,
  )

  return Math.max(
    0,
    nextThreshold - savedAmount.value,
  )
})

const isCompleted = computed(() => {
  return savedAmount.value >= TARGET_AMOUNT
})

/**
 * Canvas 图片信息
 */
let imagePath = ''
let imageWidth = 0
let imageHeight = 0

/**
 * 用于终止旧动画。
 */
let animationVersion = 0

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * 加载图片
 */
function loadImage() {
  uni.getImageInfo({
    src: IMAGE_SRC,

    success(res) {
      imagePath = res.path
      imageWidth = res.width
      imageHeight = res.height

      /**
       * 首次进入页面，
       * 直接同步当前状态，不播放历史动画。
       */
      displayedUnlockedCount.value
        = targetUnlockedCount.value

      drawPuzzle()
    },

    fail(err) {
      console.error(
        '读取测试图片失败：',
        err,
      )

      uni.showToast({
        title: '图片读取失败',
        icon: 'none',
      })
    },
  })
}

/**
 * 绘制一个已经解锁的图片块
 */
function drawImagePiece(
  ctx: UniApp.CanvasContext,
  piece: PuzzlePiece,
  alpha: number,
  visibleRatio = 1,
  offsetY = 0,
  scale = 1,
) {
  const cellWidth
    = PUZZLE_SIZE / COLS

  const cellHeight
    = PUZZLE_SIZE / ROWS

  const x
    = PUZZLE_INSET + piece.col * cellWidth

  const y
    = PUZZLE_INSET + piece.row * cellHeight

  const crop = getCoverCrop(
    imageWidth,
    imageHeight,
    CANVAS_SIZE,
    CANVAS_SIZE,
  )

  ctx.save()

  if (offsetY || scale !== 1) {
    const centerX = x + cellWidth / 2
    const centerY = y + cellHeight / 2
    ctx.translate(centerX, centerY + offsetY)
    ctx.scale(scale, scale)
    ctx.translate(-centerX, -centerY)
  }

  tracePiecePath(
    ctx,
    piece,
    x,
    y,
    cellWidth,
    cellHeight,
    roundedCornersFor(piece),
  )

  ctx.clip()

  if (visibleRatio < 1) {
    ctx.beginPath()
    ctx.rect(
      0,
      PUZZLE_INSET + PUZZLE_SIZE * (1 - visibleRatio),
      CANVAS_SIZE,
      PUZZLE_SIZE * visibleRatio,
    )
    ctx.clip()
  }

  /**
   * 用于解锁淡入动画
   */
  ctx.setGlobalAlpha(alpha)

  ctx.drawImage(
    imagePath,

    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,

    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
  )

  ctx.restore()
}

function clipPuzzleBoard(ctx: UniApp.CanvasContext) {
  const radius = PUZZLE_RADIUS
  const right = CANVAS_SIZE
  const bottom = CANVAS_SIZE
  const curve = 0.552

  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(right - radius, 0)
  ctx.bezierCurveTo(right - radius + radius * curve, 0, right, radius - radius * curve, right, radius)
  ctx.lineTo(right, bottom - radius)
  ctx.bezierCurveTo(right, bottom - radius + radius * curve, right - radius + radius * curve, bottom, right - radius, bottom)
  ctx.lineTo(radius, bottom)
  ctx.bezierCurveTo(radius - radius * curve, bottom, 0, bottom - radius + radius * curve, 0, bottom - radius)
  ctx.lineTo(0, radius)
  ctx.bezierCurveTo(0, radius - radius * curve, radius - radius * curve, 0, radius, 0)
  ctx.closePath()
  ctx.clip()
}

/**
 * 绘制完整拼图
 */
function drawPuzzle() {
  if (!imagePath)
    return

  const ctx = uni.createCanvasContext(
    CANVAS_ID,
  )

  const cellWidth
    = PUZZLE_SIZE / COLS

  const cellHeight
    = PUZZLE_SIZE / ROWS

  const crop = getCoverCrop(
    imageWidth,
    imageHeight,
    CANVAS_SIZE,
    CANVAS_SIZE,
  )

  /**
   * 当前真正已经显示完成的拼图。
   */
  const unlocked = new Set(
    unlockOrder.slice(
      0,
      displayedUnlockedCount.value,
    ),
  )

  ctx.clearRect(
    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
  )

  /**
   * 底图始终保留一层很淡的预览，
   * 这样 0% 时也能看到拼图最终要组成的背景。
   */
  ctx.save()
  clipPuzzleBoard(ctx)
  ctx.setGlobalAlpha(0.08)
  ctx.drawImage(
    imagePath,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
  )
  ctx.restore()

  /**
   * ------------------------
   * 第一层
   * 已经解锁完成的图片
   * ------------------------
   */
  pieces.forEach((piece) => {
    if (!unlocked.has(piece.id))
      return

    drawImagePiece(
      ctx,
      piece,
      1,
    )
  })

  /**
   * ------------------------
   * 第二层
   * 当前正在解锁的图片
   * ------------------------
   */
  if (animatingPieceId.value !== null) {
    const piece = pieces.find(
      item =>
        item.id === animatingPieceId.value,
    )

    if (piece) {
      drawImagePiece(
        ctx,
        piece,
        animatingAlpha.value,
        1,
        animatingOffsetY.value,
        animatingScale.value,
      )
    }
  }

  if (partialPieceId.value !== null) {
    const piece = pieces.find(item => item.id === partialPieceId.value)
    if (piece)
      // 未满一块时，只显示该块对应比例的图片，其余区域保持灰白背景。
      drawImagePiece(ctx, piece, 1, partialProgress.value)
  }

  /**
   * ------------------------
   * 第三层
   * 拼图轮廓
   * ------------------------
   *
   * 无论 0% 还是 100%，
   * 拼图结构始终存在。
   */
  pieces.forEach((piece) => {
    const x
      = PUZZLE_INSET + piece.col * cellWidth

    const y
      = PUZZLE_INSET + piece.row * cellHeight

    ctx.save()

    tracePiecePath(
      ctx,
      piece,
      x,
      y,
      cellWidth,
      cellHeight,
      roundedCornersFor(piece),
    )

    const isPartial = piece.id === partialPieceId.value
    ctx.setStrokeStyle(isPartial
      ? `rgba(71, 85, 105, ${0.14 + partialPulse.value * 0.12})`
      : 'rgba(71, 85, 105, 0.14)')
    ctx.setLineWidth(isPartial ? 1 : 0.8)
    ctx.stroke()

    ctx.restore()
  })

  ctx.draw(false)
}

/**
 * 播放逐块解锁动画
 */
async function animateUnlockPieces() {
  /**
   * 已经有动画在运行，
   * 新金额只需要改变 targetUnlockedCount，
   * 当前动画循环会自动继续。
   */
  if (isAnimating.value)
    return

  if (
    displayedUnlockedCount.value
    >= targetUnlockedCount.value
  ) {
    drawPuzzle()
    return
  }

  isAnimating.value = true

  const currentVersion = animationVersion
  const batchMode = targetUnlockedCount.value - displayedUnlockedCount.value > 12

  try {
    while (
      displayedUnlockedCount.value
      < targetUnlockedCount.value
      ) {
      if (
        currentVersion
        !== animationVersion
      ) {
        return
      }

      if (batchMode) {
        displayedUnlockedCount.value = Math.min(
          targetUnlockedCount.value,
          displayedUnlockedCount.value + 4,
        )
        drawPuzzle()
        await wait(0)
        continue
      }

      /**
       * 下一个应该出现的拼图 ID
       */
      const nextPieceId
        = unlockOrder[
        displayedUnlockedCount.value
        ]

      animatingPieceId.value
        = nextPieceId

      /**
       * 大额存入会跨过很多拼图块：压缩逐块动画，
       * 小额存入仍保留完整的落位反馈。
       */
      const pendingCount = targetUnlockedCount.value - displayedUnlockedCount.value
      const frames = pendingCount > 12 ? 2 : pendingCount > 5 ? 4 : 7
      const frameDuration = pendingCount > 12 ? 8 : pendingCount > 5 ? 10 : 12
      const pieceDelay = pendingCount > 12 ? 0 : pendingCount > 5 ? 6 : 16

      for (
        let frame = 1;
        frame <= frames;
        frame++
      ) {
        if (
          currentVersion
          !== animationVersion
        ) {
          return
        }

        const progress = frame / frames
        const falling = Math.min(progress / 0.75, 1)
        animatingAlpha.value
          = Math.min(1, progress * 2)
        animatingOffsetY.value = progress < 0.75
          ? -24 * (1 - falling) ** 2
          : 2 * (1 - (progress - 0.75) / 0.25)
        animatingScale.value = progress < 0.7
          ? 1.08 - 0.12 * (progress / 0.7)
          : 0.96 + 0.04 * ((progress - 0.7) / 0.3)

        drawPuzzle()

        await wait(frameDuration)
      }

      /**
       * 当前块正式进入已解锁状态
       */
      displayedUnlockedCount.value += 1

      animatingPieceId.value = null
      animatingAlpha.value = 0
      animatingOffsetY.value = -12
      animatingScale.value = 1

      drawPuzzle()

      await wait(pieceDelay)
    }
  }
  finally {
    if (
      currentVersion
      === animationVersion
    ) {
      isAnimating.value = false

      animatingPieceId.value = null
      animatingAlpha.value = 0

      drawPuzzle()
    }
  }
}

/**
 * 攒一笔
 */
function saveMoney(amount: number) {
  if (isCompleted.value) {
    uni.showToast({
      title: '目标已经完成啦',
      icon: 'none',
    })

    return
  }

  savedAmount.value = Math.min(
    TARGET_AMOUNT,
    savedAmount.value + amount,
  )

  /**
   * 如果跨过了解锁阈值，
   * 开始逐块播放。
   *
   * 没跨阈值则 Canvas 不发生变化。
   */
  if (
    targetUnlockedCount.value
    > displayedUnlockedCount.value
  ) {
    animateUnlockPieces()
  }
}

/**
 * Demo 快速修改进度。
 *
 * 不播放动画，
 * 用于测试不同状态。
 */
function setProgress(value: number) {
  /**
   * 停止旧动画
   */
  animationVersion += 1
  isAnimating.value = false

  animatingPieceId.value = null
  animatingAlpha.value = 0
  animatingOffsetY.value = -12
  animatingScale.value = 1

  savedAmount.value = Math.round(
    TARGET_AMOUNT * value,
  )

  displayedUnlockedCount.value
    = targetUnlockedCount.value

  drawPuzzle()
}

/**
 * 重置
 */
function reset() {
  animationVersion += 1
  isAnimating.value = false

  savedAmount.value = 0

  displayedUnlockedCount.value = 0

  animatingPieceId.value = null
  animatingAlpha.value = 0
  animatingOffsetY.value = -12
  animatingScale.value = 1

  drawPuzzle()
}

onReady(() => {
  partialPulseTimer = setInterval(() => {
    partialPulse.value = partialPulse.value > 0.9 ? 0.35 : partialPulse.value + 0.08
    drawPuzzle()
  }, 180)
  loadImage()
})

onUnload(() => {
  if (partialPulseTimer) {
    clearInterval(partialPulseTimer)
    partialPulseTimer = null
  }
})
</script>

<template>
  <view class="page">
    <view class="title">
      日本旅行
    </view>

    <view class="subtitle">
      把想要的生活，一块一块拼出来
    </view>

    <!-- 拼图 -->
    <view
      class="canvas-wrap"
      :style="{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }"
    >
      <canvas
        id="puzzleCanvas"
        canvas-id="puzzleCanvas"
        class="puzzle-canvas"
        :width="CANVAS_SIZE"
        :height="CANVAS_SIZE"
        :style="{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }"
      />

      <view
        v-if="isCompleted"
        class="completed-badge"
      >
        攒到了 ✓
      </view>
    </view>

    <!-- 金额 -->
    <view class="money-card">
      <view class="money-row">
        <text class="saved">
          ¥{{ savedAmount }}
        </text>

        <text class="target">
          / ¥{{ TARGET_AMOUNT }}
        </text>
      </view>

      <!-- 普通百分比进度 -->
      <view class="progress-track">
        <view
          class="progress-bar"
          :style="{
            width: `${progressPercent}%`,
          }"
        />
      </view>

      <view class="progress-info">
        <text>
          {{ progressPercent }}%
        </text>

        <text>
          {{ displayedUnlockedCount }}
          /
          {{ TOTAL }} 块
        </text>
      </view>

      <!-- 下一块 -->
      <view
        v-if="!isCompleted"
        class="next-piece"
      >
        再攒
        <text class="next-money">
          ¥{{ nextUnlockAmount }}
        </text>
        解锁下一块
      </view>

      <view
        v-else
        class="next-piece completed-text"
      >
        🎉 目标已经完成
      </view>
    </view>

    <!-- 攒一笔 -->
    <view class="section-title">
      攒一笔
    </view>

    <view class="saving-buttons">
      <button
        class="saving-btn"
        @tap="saveMoney(50)"
      >
        + ¥50
      </button>

      <button
        class="saving-btn"
        @tap="saveMoney(200)"
      >
        + ¥200
      </button>

      <button
        class="saving-btn"
        @tap="saveMoney(500)"
      >
        + ¥500
      </button>

      <button
        class="saving-btn main"
        @tap="saveMoney(1000)"
      >
        + ¥1000
      </button>
    </view>

    <!-- 技术验证 -->
    <view class="dev-title">
      Demo 快速测试
    </view>

    <view class="dev-buttons">
      <button
        size="mini"
        @tap="setProgress(0)"
      >
        0%
      </button>

      <button
        size="mini"
        @tap="setProgress(0.2)"
      >
        20%
      </button>

      <button
        size="mini"
        @tap="setProgress(0.4)"
      >
        40%
      </button>

      <button
        size="mini"
        @tap="setProgress(0.6)"
      >
        60%
      </button>

      <button
        size="mini"
        @tap="setProgress(0.8)"
      >
        80%
      </button>

      <button
        size="mini"
        @tap="setProgress(1)"
      >
        100%
      </button>

      <button
        size="mini"
        @tap="reset"
      >
        重置
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  box-sizing: border-box;

  padding:
    44rpx
    32rpx
    80rpx;

  background: #f7f8fa;
}

.title {
  font-size: 42rpx;
  font-weight: 700;

  color: #171717;
}

.subtitle {
  margin-top: 8rpx;

  font-size: 26rpx;

  color: #8a8a8a;
}

/**
 * 拼图区域
 */
.canvas-wrap {
  position: relative;

  margin: 40rpx auto 0;

  overflow: hidden;

  border-radius: 28rpx;

  background: #fff;

  box-shadow:
    0 10rpx 36rpx rgba(0, 0, 0, 0.06);
}

.puzzle-canvas {
  display: block;
  background: transparent;
}

.completed-badge {
  position: absolute;

  right: 24rpx;
  bottom: 24rpx;

  padding:
    12rpx
    22rpx;

  border-radius: 999rpx;

  background:
    rgba(0, 0, 0, 0.68);

  color: #fff;

  font-size: 24rpx;
  font-weight: 600;
}

/**
 * 金额信息
 */
.money-card {
  margin-top: 36rpx;

  padding: 30rpx;

  border-radius: 24rpx;

  background: #fff;
}

.money-row {
  display: flex;
  align-items: baseline;
}

.saved {
  font-size: 44rpx;
  font-weight: 700;

  color: #171717;
}

.target {
  margin-left: 8rpx;

  font-size: 26rpx;

  color: #a3a3a3;
}

/**
 * 普通金额进度条
 */
.progress-track {
  height: 10rpx;

  margin-top: 24rpx;

  overflow: hidden;

  border-radius: 999rpx;

  background: #f0f0f0;
}

.progress-bar {
  height: 100%;

  border-radius: 999rpx;

  background: #171717;

  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;

  margin-top: 14rpx;

  font-size: 24rpx;

  color: #999;
}

/**
 * 下一块提醒
 */
.next-piece {
  margin-top: 26rpx;

  text-align: center;

  font-size: 27rpx;

  color: #737373;
}

.next-money {
  margin:
    0
    8rpx;

  font-size: 32rpx;
  font-weight: 700;

  color: #171717;
}

.completed-text {
  font-weight: 600;

  color: #171717;
}

.section-title {
  margin-top: 40rpx;

  font-size: 28rpx;
  font-weight: 600;

  color: #404040;
}

/**
 * 攒钱按钮
 */
.saving-buttons {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 20rpx;

  margin-top: 20rpx;
}

.saving-btn {
  width: 100%;

  margin: 0;

  border-radius: 18rpx;

  background: #fff;

  font-size: 28rpx;

  color: #333;
}

.saving-btn::after {
  border: none;
}

.saving-btn.main {
  background: #171717;

  color: #fff;
}

/**
 * Demo
 */
.dev-title {
  margin-top: 50rpx;

  font-size: 24rpx;

  color: #aaa;
}

.dev-buttons {
  display: flex;

  flex-wrap: wrap;

  gap: 16rpx;

  margin-top: 18rpx;
}

.dev-buttons button {
  margin: 0;
}
</style>
