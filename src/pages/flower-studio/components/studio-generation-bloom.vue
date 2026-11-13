<script setup lang="ts">
withDefaults(defineProps<{ revealing: boolean, message?: string }>(), { message: '正在为你搭配花束' })
const flowers = [
  { name: 'sage-left', petals: 0 },
  { name: 'rose', petals: 6 },
  { name: 'cream', petals: 8 },
  { name: 'lilac', petals: 5 },
  { name: 'sage-right', petals: 0 },
]
</script>

<template>
  <view class="bloom-note" :class="{ 'bloom-settling': revealing }">
    <view class="bloom-illustration" aria-hidden="true">
      <view class="bloom-drawing">
        <view v-for="flower in flowers" :key="flower.name" class="bloom-branch" :class="`branch-${flower.name}`">
          <view class="branch-growth">
            <view class="branch-sway">
              <view class="pencil-stem" />
              <view class="leaf-left pencil-leaf" /><view class="pencil-leaf leaf-right" />
              <view v-if="!flower.petals" class="pencil-leaf leaf-tip" />
              <view v-if="flower.petals" class="flower-opening">
                <view class="flower-breath">
                  <view v-for="petal in flower.petals" :key="petal" class="pencil-petal" :style="{ transform: `rotate(${(petal - 1) * 360 / flower.petals}deg)` }" />
                  <view class="pencil-center" />
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="bouquet-tie">
          <view class="tie-loop loop-left" /><view class="tie-loop loop-right" />
          <view class="tie-knot" /><view class="tie-tail" />
        </view>
        <view class="pencil-ground" />
      </view>
    </view>
    <view class="bloom-caption">
      <text>{{ message }}</text>
      <view class="waiting-dots" aria-hidden="true">
        <view /><view /><view />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bloom-note { position: relative; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 20rpx; width: 100%; height: 88rpx; padding: 0 24rpx; pointer-events: none; opacity: 1; transition: opacity .65s ease, transform .65s ease; }
.bloom-settling { opacity: 0; transform: translateY(6rpx); }
.bloom-illustration { position: relative; width: 148rpx; height: 88rpx; flex-shrink: 0; }
.bloom-drawing { position: absolute; top: -26rpx; left: -42rpx; width: 232rpx; height: 140rpx; transform: scale(.6); transform-origin: 50% 50%; }
.bloom-branch { position: absolute; bottom: 12rpx; left: 96rpx; width: 40rpx; transform-origin: 50% 100%; }
.branch-sage-left { height: 103rpx; transform: rotate(-35deg); }
.branch-rose { height: 107rpx; transform: rotate(-18deg); }
.branch-cream { height: 126rpx; transform: rotate(2deg); }
.branch-lilac { height: 108rpx; transform: rotate(24deg); }
.branch-sage-right { height: 89rpx; transform: rotate(43deg); }
.branch-growth, .branch-sway { position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform-origin: 50% 100%; }
.branch-growth { animation-duration: 6.4s; animation-timing-function: cubic-bezier(.2,.7,.3,1); animation-iteration-count: infinite; animation-fill-mode: both; }
.branch-sway { animation: branch-sway 3.8s ease-in-out infinite; }
.branch-cream .branch-sway { animation-duration: 4.6s; animation-delay: -.8s; }
.branch-lilac .branch-sway { animation-duration: 4.1s; animation-delay: -1.7s; }
.pencil-stem { position: absolute; top: 4rpx; bottom: 0; left: 20rpx; width: 1rpx; border-left: 2rpx solid #89967b; border-radius: 40%; }
.pencil-leaf { position: absolute; box-sizing: border-box; width: 24rpx; height: 12rpx; border: 1rpx solid #8e9d7d; background: #d2dcc2; border-radius: 90% 10% 85% 15%; }
.leaf-left { left: -3rpx; bottom: 30rpx; transform: rotate(27deg); transform-origin: 100% 100%; }
.leaf-right { left: 20rpx; bottom: 54rpx; transform: rotate(-22deg); transform-origin: 0 100%; }
.leaf-tip { left: 5rpx; top: 3rpx; width: 17rpx; height: 28rpx; border-radius: 80% 20% 80% 20%; transform: rotate(-28deg); }
.flower-opening { position: absolute; top: -10rpx; left: 0; width: 40rpx; height: 40rpx; transform-origin: 50% 100%; animation-duration: 6.4s; animation-timing-function: ease-out; animation-iteration-count: infinite; animation-fill-mode: both; }
.flower-breath { position: relative; width: 40rpx; height: 40rpx; animation: flower-breathe 4.8s ease-in-out 2.6s infinite; }
.branch-cream .flower-breath { animation-delay: 3.4s; }
.branch-lilac .flower-breath { animation-delay: 4s; }
.pencil-petal { position: absolute; top: -5rpx; left: 13rpx; box-sizing: border-box; width: 14rpx; height: 24rpx; border: 1rpx solid #b28d83; border-radius: 53% 47% 44% 56%; background: #e3bfb4; transform-origin: 50% 24rpx; }
.branch-cream .pencil-petal { width: 12rpx; left: 14rpx; border-color: #b09b6d; background: #e9d6a5; }
.branch-lilac .pencil-petal { border-color: #a495b1; background: #dcd1e3; }
.pencil-center { position: absolute; top: 14rpx; left: 14rpx; box-sizing: border-box; width: 12rpx; height: 12rpx; border: 1rpx solid #ad946e; border-radius: 48% 52% 45% 55%; background: #d4ba84; }
.bouquet-tie { position: absolute; bottom: 10rpx; left: 115rpx; width: 1rpx; height: 1rpx; animation: tie-appear 6.4s ease-in-out infinite; }
.tie-loop { position: absolute; top: -5rpx; box-sizing: border-box; width: 22rpx; height: 12rpx; border: 2rpx solid #ad9279; border-radius: 65% 35% 60% 40%; }
.loop-left { right: -1rpx; transform: rotate(24deg); }
.loop-right { left: -1rpx; transform: rotate(-24deg); }
.tie-knot { position: absolute; top: 0; left: -3rpx; width: 6rpx; height: 5rpx; border-radius: 40%; background: #ad9279; }
.tie-tail { position: absolute; top: 5rpx; left: -5rpx; width: 10rpx; height: 12rpx; border-right: 1rpx solid #ad9279; border-left: 1rpx solid #ad9279; transform: rotate(14deg); }
.pencil-ground { position: absolute; bottom: -8rpx; left: 70rpx; width: 92rpx; height: 4rpx; border-bottom: 1rpx solid rgba(145, 130, 106, .28); border-radius: 50%; transform: rotate(-2deg); }
.bloom-caption { display: flex; align-items: center; gap: 9rpx; color: #786d5c; font-family: STKaiti, KaiTi, serif; font-size: 25rpx; line-height: 1.6; letter-spacing: 2rpx; }
.waiting-dots { display: flex; gap: 5rpx; }
.waiting-dots view { width: 5rpx; height: 5rpx; border-radius: 50%; background: #8f9e7b; animation: waiting-pulse 1.5s ease-in-out infinite; }
.waiting-dots view:nth-child(2) { animation-delay: .2s; }
.waiting-dots view:nth-child(3) { animation-delay: .4s; }
// 各花枝共享同一轮时间轴，展开从左到右，收拢从右到左。
@mixin branch-cycle($name, $open, $close) {
  .branch-#{$name} .branch-growth { animation-name: stem-#{$name}; }
  .branch-#{$name} .flower-opening { animation-name: flower-#{$name}; }
  @keyframes stem-#{$name} {
    0%, #{$open} { opacity: 0; transform: scaleY(.15); }
    #{$open + 20%}, #{$close} { opacity: 1; transform: scaleY(1); }
    #{$close + 12%}, 100% { opacity: 0; transform: scaleY(.15); }
  }
  @keyframes flower-#{$name} {
    0%, #{$open + 12%} { opacity: 0; transform: scale(.2) rotate(-24deg); }
    #{$open + 30%}, #{$close - 3%} { opacity: 1; transform: scale(1) rotate(0); }
    #{$close + 7%}, 100% { opacity: 0; transform: scale(.2) rotate(-24deg); }
  }
}
@include branch-cycle(sage-left, 4%, 78%);
@include branch-cycle(rose, 8%, 74%);
@include branch-cycle(cream, 12%, 70%);
@include branch-cycle(lilac, 16%, 66%);
@include branch-cycle(sage-right, 20%, 62%);
@keyframes tie-appear { 0%, 42%, 100% { opacity: 0; transform: scale(.5); } 53%, 57% { opacity: 1; transform: scale(1); } 62% { opacity: 0; transform: scale(.5); } }
@keyframes branch-sway { 0%, 100% { transform: rotate(-3.5deg); } 50% { transform: rotate(3.5deg); } }
@keyframes flower-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.09); } }
@keyframes waiting-pulse { 0%, 100% { opacity: .25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3rpx); } }
@media (prefers-reduced-motion: reduce) { .branch-growth, .branch-sway, .flower-opening, .flower-breath, .bouquet-tie, .waiting-dots view { animation: none; } }
</style>
