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
        <view class="pencil-vase">
          <view class="vase-rim" />
          <view class="vase-highlight" />
        </view>
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
.bloom-note { position: relative; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40rpx; width: 100%; height: 430rpx; padding: 0 24rpx; pointer-events: none; opacity: 1; transition: opacity .65s ease, transform .65s ease; }
.bloom-settling { opacity: 0; transform: translateY(6rpx); }
.bloom-illustration { position: relative; width: 360rpx; height: 310rpx; flex-shrink: 0; }
.bloom-drawing { position: absolute; top: 84rpx; left: 64rpx; width: 232rpx; height: 140rpx; transform: scale(1.6); transform-origin: 50% 50%; }
.bloom-branch { position: absolute; bottom: 12rpx; left: 96rpx; width: 40rpx; transform-origin: 50% 100%; }
.branch-sage-left { height: 103rpx; transform: rotate(-35deg); }
.branch-rose { height: 107rpx; transform: rotate(-18deg); }
.branch-cream { height: 126rpx; transform: rotate(2deg); }
.branch-lilac { height: 108rpx; transform: rotate(24deg); }
.branch-sage-right { height: 89rpx; transform: rotate(43deg); }
.branch-growth, .branch-sway { position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform-origin: 50% 100%; }
.branch-growth { opacity: 1; }
.branch-sway { animation: branch-sway 3.8s ease-in-out infinite; }
.branch-cream .branch-sway { animation-duration: 4.6s; animation-delay: -.8s; }
.branch-lilac .branch-sway { animation-duration: 4.1s; animation-delay: -1.7s; }
.pencil-stem { position: absolute; top: 4rpx; bottom: 0; left: 20rpx; width: 1rpx; border-left: 2rpx solid var(--app-sage); border-radius: 40%; }
.pencil-leaf { position: absolute; box-sizing: border-box; width: 24rpx; height: 12rpx; border: 1rpx solid var(--app-sage); background: var(--app-sageSoft); border-radius: 90% 10% 85% 15%; }
.leaf-left { left: -3rpx; bottom: 30rpx; transform: rotate(27deg); transform-origin: 100% 100%; }
.leaf-right { left: 20rpx; bottom: 54rpx; transform: rotate(-22deg); transform-origin: 0 100%; }
.leaf-tip { left: 5rpx; top: 3rpx; width: 17rpx; height: 28rpx; border-radius: 80% 20% 80% 20%; transform: rotate(-28deg); }
.flower-opening { position: absolute; top: -10rpx; left: 0; width: 40rpx; height: 40rpx; transform-origin: 50% 100%;  }
.flower-breath { position: relative; width: 40rpx; height: 40rpx; animation: flower-breathe 4.8s ease-in-out 2.6s infinite; }
.branch-cream .flower-breath { animation-delay: 3.4s; }
.branch-lilac .flower-breath { animation-delay: 4s; }
.pencil-petal { position: absolute; top: -5rpx; left: 13rpx; box-sizing: border-box; width: 14rpx; height: 24rpx; border: 1rpx solid var(--app-danger); border-radius: 53% 47% 44% 56%; background: #dfb4a5; transform-origin: 50% 24rpx; }
.branch-cream .pencil-petal { width: 12rpx; left: 14rpx; border-color: #b5a17c; background: #f5e7be; }
.branch-lilac .pencil-petal { border-color: #a99caf; background: #d9cbdc; }
.pencil-center { position: absolute; top: 14rpx; left: 14rpx; box-sizing: border-box; width: 12rpx; height: 12rpx; border: 1rpx solid var(--app-danger); border-radius: 48% 52% 45% 55%; background: var(--app-subtle); }
.pencil-vase { position: absolute; bottom: -49rpx; left: 89rpx; box-sizing: border-box; width: 55rpx; height: 70rpx; border: 1.5rpx solid #a89a80; border-radius: 8rpx 10rpx 20rpx 18rpx; background: #eee3cb; transform: rotate(-2deg); }
.vase-rim { position: absolute; top: -4rpx; left: -2rpx; box-sizing: border-box; width: 56rpx; height: 9rpx; border: 1.5rpx solid #a89a80; border-radius: 50%; background: #d8d5bc; }
.vase-highlight { position: absolute; top: 12rpx; bottom: 12rpx; left: 9rpx; width: 5rpx; border-left: 2rpx solid #faf4e5; border-radius: 50%; }
.bloom-caption { display: flex; align-items: center; gap: 9rpx; color: var(--app-inkMuted); font-family: STKaiti, KaiTi, serif; font-size: 25rpx; line-height: 1.6; letter-spacing: 2rpx; }
.waiting-dots { display: flex; gap: 5rpx; }
.waiting-dots view { width: 5rpx; height: 5rpx; border-radius: 50%; background: var(--app-sage); animation: waiting-pulse 1.5s ease-in-out infinite; }
.waiting-dots view:nth-child(2) { animation-delay: .2s; }
.waiting-dots view:nth-child(3) { animation-delay: .4s; }
@keyframes branch-sway { 0%, 100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }
@keyframes flower-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
@keyframes waiting-pulse { 0%, 100% { opacity: .25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3rpx); } }
@media (prefers-reduced-motion: reduce) { .branch-sway, .flower-breath, .waiting-dots view { animation: none; } }
</style>
