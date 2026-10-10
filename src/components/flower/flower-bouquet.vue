<template>
  <view class="bouquet-wrap">
    <view class="paper-back" />
    <view class="paper-left" />
    <view class="paper-right" />
    <view class="paper-fold" />
    <view class="ribbon-band" />
    <view class="ribbon-tail tail-left" />
    <view class="ribbon-tail tail-right" />
    <view class="ribbon-loop loop-left" />
    <view class="ribbon-loop loop-right" />
    <view class="ribbon-knot" />
  </view>
</template>

<style scoped lang="scss">
// 使用边框三角形，避免依赖小程序不稳定的 clip-path 或本地 SVG。
.bouquet-wrap { position: absolute; left: 175rpx; top: 615rpx; width: 350rpx; height: 290rpx; pointer-events: none; }
.paper-back { position: absolute; left: 5rpx; top: 0; width: 0; height: 0; border-left: 170rpx solid transparent; border-right: 170rpx solid transparent; border-top: 275rpx solid #ded5c5; }
.paper-left { position: absolute; left: 15rpx; top: 28rpx; width: 0; height: 0; border-left: 150rpx solid transparent; border-right: 135rpx solid transparent; border-top: 235rpx solid #f1e9d9; transform: rotate(12deg); transform-origin: 50% 100%; }
.paper-right { position: absolute; left: 52rpx; top: 35rpx; width: 0; height: 0; border-left: 115rpx solid transparent; border-right: 145rpx solid transparent; border-top: 235rpx solid #e8decb; transform: rotate(-12deg); transform-origin: 50% 100%; }
.paper-fold { position: absolute; left: 175rpx; top: 80rpx; width: 1rpx; height: 155rpx; background: rgba(163,145,118,.25); transform: rotate(-8deg); }
.ribbon-band { position: absolute; left: 117rpx; top: 163rpx; width: 116rpx; height: 20rpx; border-radius: 7rpx; background: #c98b94; transform: rotate(-3deg); }
.ribbon-tail { position: absolute; top: 185rpx; width: 23rpx; height: 74rpx; border-radius: 2rpx 2rpx 7rpx 2rpx; background: linear-gradient(90deg, #c98b94, #dba5ad); transform-origin: 50% 0; }
.tail-left { left: 157rpx; transform: rotate(21deg); }
.tail-right { left: 177rpx; transform: rotate(-23deg); height: 64rpx; }
.ribbon-loop { position: absolute; top: 148rpx; width: 64rpx; height: 36rpx; box-sizing: border-box; border: 9rpx solid #c98b94; background: #e8decb; }
.loop-left { left: 110rpx; border-radius: 65% 45% 45% 65%; transform: rotate(20deg); }
.loop-right { left: 177rpx; border-radius: 45% 65% 65% 45%; transform: rotate(-20deg); }
.ribbon-knot { position: absolute; left: 163rpx; top: 157rpx; width: 27rpx; height: 30rpx; border-radius: 8rpx; background: linear-gradient(90deg, #b87580, #dba5ad, #c98b94); transform: rotate(-5deg); }
</style>
