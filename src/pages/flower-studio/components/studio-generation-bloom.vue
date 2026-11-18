<script setup lang="ts">
import { shallowRef, watchEffect } from 'vue'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { cloudPlantSvg, svgImageSource } from '@/utils/flower/material-render'

withDefaults(defineProps<{ revealing: boolean, message?: string }>(), { message: '让花慢慢开' })
const catalog = useFlowerCatalogStore()
const artwork = useCreationArtworkStore()
interface AnimationFlower {
  id: number
  source: string
  branchStyle: string
  arrivalStyle: string
  swayStyle: string
  foliage: boolean
}
const flowers = shallowRef<AnimationFlower[]>([])
// 缓存尚未准备好时继续等待；拿到花朵后固定这次动画，避免生成素材下载时跳变。
watchEffect(() => {
  if (flowers.value.some(flower => !flower.foliage))
    return
  flowers.value = createAnimationFlowers()
})

function createAnimationFlowers(): AnimationFlower[] {

  const selected = artwork.materials.map(instance => ({ material: catalog.get(instance.materialId), color: instance.color }))
  const cached = Object.values(catalog.prepared)
    .filter(material => material.category === 'flower')
    .map(material => ({ material, color: material.colors[0]?.value || '#a9b58e' }))
  const seen = new Set<string>()
  const pool = [...selected, ...cached].filter(({ material, color }) => {
    if (!material || material.category !== 'flower')
      return false
    const key = `${material.id}:${color}`
    if (seen.has(key))
      return false
    seen.add(key)
    return true
  })
  const flowerPool = pool.filter(item => item.material?.group !== 'foliage')
  const foliagePool = pool.filter(item => item.material?.group === 'foliage')
  // 叶材先绘制在后方，最多一枝；花朵从画布优先取材，不足时用缓存补足。
  const candidates = [...foliagePool.slice(0, 1), ...flowerPool]
  const poses = [
    { angle: -30, height: 190 },
    { angle: 23, height: 205 },
    { angle: -15, height: 225 },
    { angle: 9, height: 240 },
    { angle: 0, height: 195 },
  ]
  const flowers: AnimationFlower[] = []
  // 只有少数花种时允许自然重复；不重复添加叶材。
  const queue = [...candidates]
  for (let repeat = 0; repeat < 4; repeat++)
    queue.push(...flowerPool)
  for (const { material, color } of queue) {
    if (!material || material.category !== 'flower')
      continue
    const index = flowers.length
    const pose = poses[index]
    try {
      flowers.push({
        id: index,
        foliage: material.group === 'foliage',
        source: svgImageSource(cloudPlantSvg(material, { color, transform: { height: pose.height } })),
        branchStyle: `height:${pose.height + 55}rpx;transform:rotate(${pose.angle}deg) scale(1.25);`,
        arrivalStyle: `animation-delay:${index * 320}ms;`,
        swayStyle: `animation-delay:${index * -650}ms;animation-duration:${3800 + index * 250}ms;`,
      })
    }
    catch { /* 单枝缓存异常不影响生成请求和其余花材。 */ }
    if (flowers.length === poses.length)
      break
  }
  return flowers
}

</script>

<template>
  <view class="bloom-note" :class="{ 'bloom-settling': revealing }">
    <view class="bloom-illustration" aria-hidden="true">
      <view v-for="flower in flowers" :key="flower.id" class="bloom-branch" :style="flower.branchStyle">
        <view class="branch-arrival" :style="flower.arrivalStyle">
          <view class="branch-sway" :style="flower.swayStyle">
            <image class="branch-image" :src="flower.source" mode="scaleToFill" />
          </view>
        </view>
      </view>
    </view>
    <view class="bloom-caption">
      <text>{{ message }}</text>
      <view class="waiting-dots" aria-hidden="true">
        <view /><view /><view />
      </view>
    </view>
    <text class="bloom-subtitle">正在把你的心情，搭成一束花</text>
  </view>
</template>

<style scoped lang="scss">
.bloom-note { position: relative; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; width: 550rpx; height: 610rpx; margin: 0 auto; padding: 40rpx 24rpx 36rpx; border: 1rpx solid rgba(var(--app-ink-rgb), .18); border-radius: 3rpx 7rpx 4rpx 5rpx; background: #fcf8ef; box-shadow: 5rpx 7rpx 0 rgba(var(--app-ink-rgb), .045); pointer-events: none; opacity: 1; transition: opacity 1.2s ease, transform 1.2s ease; }
.bloom-note::before { position: absolute; top: 5rpx; right: -4rpx; bottom: -4rpx; left: 4rpx; border: 1rpx solid rgba(var(--app-ink-rgb), .12); border-radius: 6rpx 2rpx 5rpx 3rpx; transform: rotate(-.6deg); pointer-events: none; content: ''; }
.bloom-settling { opacity: 0; transform: translateY(6rpx); }
.bloom-illustration { position: relative; width: 450rpx; height: 388rpx; flex-shrink: 0; }
.bloom-branch { position: absolute; bottom: 10rpx; left: 170rpx; width: 110rpx; transform-origin: 50% 100%; }
.branch-arrival, .branch-sway { position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform-origin: 50% 100%; }
.branch-arrival { animation: branch-gather 1.8s cubic-bezier(.2,.65,.3,1) both; }
.branch-sway { animation: branch-sway 4s ease-in-out infinite; }
.branch-image { display: block; width: 100%; height: 100%; }
.bloom-caption { display: flex; align-items: center; gap: 9rpx; color: var(--app-inkMuted); font-family: STKaiti, KaiTi, serif; font-size: 25rpx; line-height: 1.6; letter-spacing: 2rpx; }
.bloom-subtitle { color: var(--app-inkMuted); font-size: 21rpx; line-height: 1.7; letter-spacing: 1rpx; }
.waiting-dots { display: flex; gap: 5rpx; }
.waiting-dots view { width: 5rpx; height: 5rpx; border-radius: 50%; background: var(--app-sage); animation: waiting-pulse 1.5s ease-in-out infinite; }
.waiting-dots view:nth-child(2) { animation-delay: .2s; }
.waiting-dots view:nth-child(3) { animation-delay: .4s; }
@keyframes branch-gather { from { opacity: 0; transform: translateY(48rpx) rotate(9deg); } to { opacity: 1; transform: translateY(0) rotate(0); } }
@keyframes branch-sway { 0%, 100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }
@keyframes waiting-pulse { 0%, 100% { opacity: .25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3rpx); } }
@media (prefers-reduced-motion: reduce) { .branch-arrival, .branch-sway, .waiting-dots view { animation: none; } .bloom-note { transition: none; } }
</style>
