<script setup lang="ts">
import { onReady } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { useDevice } from '@/hooks/useDevice'
import { generatePuzzle, getCoverCrop, tracePiecePath } from '../demo-save/puzzle'

// @ts-ignore CommonJS helper is also covered by the node test.
import { formatWishAmount } from './puzzle-display.cjs'

definePage({
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '心愿拼图',
  },
})

const { deviceWidth } = useDevice()
const boardWidth = deviceWidth.value
const boardHeight = uni.getSystemInfoSync().windowHeight
const cols = 16
const cellSize = boardWidth / cols
const rows = Math.ceil(boardHeight / cellSize)
const pieces = generatePuzzle(rows, cols, 3280)
const canvasId = 'wishPuzzleCanvas'
const imageSrc = 'https://qiniu-web-assets.dcloud.net.cn/unidoc/zh/shuijiao.jpg'
let imagePath = ''
let imageWidth = 0
let imageHeight = 0

const amount = ref(3280)
const liked = ref(false)
const amountText = computed(() => formatWishAmount(amount.value))

function showMessage(message: string) {
  uni.showToast({ title: message, icon: 'none' })
}

function saveOne() {
  amount.value += 157
  showMessage('已攒一笔 ¥157')
}

function drawPuzzle() {
  const ctx = uni.createCanvasContext(canvasId)
  const cellWidth = cellSize
  const cellHeight = cellSize
  const coverCrop = getCoverCrop(imageWidth, imageHeight, boardWidth, boardHeight)

  ctx.clearRect(0, 0, boardWidth, boardHeight)
  ctx.setFillStyle('#d5d2d0')
  ctx.fillRect(0, 0, boardWidth, boardHeight)
  ctx.setGlobalAlpha(0.9)
  ctx.drawImage(
    imagePath,
    coverCrop.sx,
    coverCrop.sy,
    coverCrop.sWidth,
    coverCrop.sHeight,
    0,
    0,
    boardWidth,
    boardHeight,
  )
  ctx.setGlobalAlpha(0.23)
  ctx.setStrokeStyle('#ffffff')
  ctx.setLineWidth(0.7)

  pieces.forEach((piece) => {
    tracePiecePath(ctx, piece, piece.col * cellWidth, piece.row * cellHeight, cellWidth, cellHeight, {
      topLeft: piece.row === 0 && piece.col === 0,
      topRight: piece.row === 0 && piece.col === cols - 1,
      bottomRight: piece.row === rows - 1 && piece.col === cols - 1,
      bottomLeft: piece.row === rows - 1 && piece.col === 0,
    })
    ctx.stroke()
  })

  ctx.draw(false)
}

onReady(() => {
  uni.getImageInfo({
    src: imageSrc,
    success: (res) => {
      imagePath = res.path
      imageWidth = res.width
      imageHeight = res.height
      drawPuzzle()
    },
    fail: () => showMessage('图片读取失败'),
  })
})
</script>

<template>
  <view class="wish-page">
    <canvas :id="canvasId" class="puzzle-canvas" :canvas-id="canvasId" :style="{ width: `${boardWidth}px`, height: `${boardHeight}px` }" />

    <view class="phone-heading">
      <text class="trip-title">日本旅行⌄</text>
      <text class="trip-subtitle">想和她一起去北海道看雪</text>
    </view>
    <!-- <view class="phone-tools">
      <view class="tool-round">▧</view>
      <view class="tool-round plus">＋</view>
    </view> -->

    <view class="amount-card">
      <text class="amount">{{ amountText }}</text>
      <view class="amount-bottom">
        <text class="amount-note">● 已攒 <text class="amount-small">¥157</text> 解锁下一块</text>
        <button class="save-button" @tap="saveOne">攒一笔 →</button>
      </view>
    </view>
    <view class="home-indicator" />
  </view>
</template>

<style scoped lang="scss">
.wish-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: #f4f3f3;
  background-color: #1f2022;
  background-image: radial-gradient(#6e7072 1.5rpx, transparent 1.5rpx);
  background-size: 24rpx 24rpx;
}
.topbar { position: absolute; z-index: 5; top: 0; right: 30rpx; left: 30rpx; height: 68rpx; display: flex; align-items: center; justify-content: space-between; font-size: 34rpx; }
.topbar-title, .topbar-actions { display: flex; align-items: center; gap: 20rpx; }
.mini-icon { font-size: 30rpx; }
.action-star { font-size: 58rpx; line-height: 1; }
.action-like, .action-dislike { font-size: 46rpx; transform: rotate(180deg); }
.phone-status { position: absolute; z-index: 5; top: 76rpx; left: 38rpx; font-size: 24rpx; }
.phone-heading { position: absolute; z-index: 5; top: 128rpx; left: 38rpx; text-shadow: 0 2rpx 5rpx rgba(0,0,0,.25); }
.trip-title { display: block; font-size: 40rpx; }
.trip-subtitle { display: block; margin-top: 14rpx; color: rgba(255,255,255,.65); font-size: 22rpx; }
.phone-tools { position: absolute; z-index: 5; top: 70rpx; right: 28rpx; display: flex; flex-wrap: wrap; justify-content: flex-end; width: 150rpx; gap: 16rpx; }
.tool-pill { width: 132rpx; padding: 11rpx 0; border-radius: 30rpx; background: rgba(65,65,68,.62); text-align: center; font-size: 22rpx; }
.tool-round { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(65,65,68,.62); text-align: center; line-height: 64rpx; font-size: 30rpx; }
.plus { font-size: 44rpx; }
.puzzle-canvas { position: absolute; z-index: 1; inset: 0; width: 100%; height: 100%; opacity: .94; }
.amount-card { position: absolute; z-index: 5; right: 26rpx; bottom: 132rpx; left: 26rpx; box-sizing: border-box; padding: 28rpx 28rpx 22rpx; border: 2rpx solid rgba(255,255,255,.35); border-radius: 28rpx; background: rgba(199,198,198,.72); box-shadow: 0 10rpx 26rpx rgba(0,0,0,.13); color: #222328; }
.amount { display: block; font-family: Georgia, serif; font-size: 48rpx; }
.amount-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 22rpx; }
.amount-note { color: rgba(43,44,48,.48); font-size: 19rpx; }
.amount-note:first-letter { color: #86a58f; }
.amount-small { color: #3e4042; }
.save-button { margin: 0; padding: 0 24rpx; border: 0; background: rgba(177,177,177,.38); color: #222328; font-size: 22rpx; line-height: 58rpx; }
.home-indicator { position: absolute; z-index: 5; bottom: 28rpx; left: 50%; width: 150rpx; height: 8rpx; transform: translateX(-50%); border-radius: 8rpx; background: rgba(255,255,255,.7); }
</style>
