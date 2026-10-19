<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { chrysanthemumRay, type FlowerKind } from '@/utils/flower/artwork'
import { bloomSvgSource } from '@/utils/flower/svg-artwork'

const props = defineProps<{ kind: FlowerKind, color: string }>()
const svgSource = computed(() => bloomSvgSource(props.kind, props.color))
const svgFailed = ref(false)
watch(svgSource, () => { svgFailed.value = false })
// 仅负责造型；选中、拖动和修改颜色由外层组件/页面处理。
const rays = Array.from({ length: 64 }, (_, index) => chrysanthemumRay(index))
</script>

<template>
  <view class="bloom-art">
    <image
      v-if="svgSource && !svgFailed" class="svg-bloom" :src="svgSource" mode="scaleToFill"
      @error="svgFailed = true"
    />
    <template v-else>
      <view v-if="kind === 'chrysanthemum'" class="mum-art">
        <view
          v-for="(ray, index) in rays" :key="index" class="mum-ray"
          :style="{ width: `${ray.length}rpx`, height: `${ray.width}rpx`, transform: `rotate(${ray.angle}deg)`, background: `linear-gradient(90deg, #bd7e3c 0%, ${color} 74%)` }"
        />
        <view class="mum-heart" :style="{ backgroundColor: color }" />
      </view>
      <view v-else-if="kind === 'rose'" class="rose-art">
        <view
          v-for="n in 8" :key="n" class="rose-petal"
          :style="{ transform: `rotate(${n * 45}deg)`, backgroundColor: color }"
        />
        <view class="rose-middle" :style="{ backgroundColor: color }">
          <view class="rose-coil coil-outer">
            <view class="rose-coil coil-inner">
              <view class="rose-coil coil-heart" />
            </view>
          </view>
        </view>
      </view>
      <view v-else-if="kind === 'tulip'" class="tulip-art">
        <view class="tulip-petal tulip-back" :style="{ backgroundColor: color }" />
        <view class="tulip-petal tulip-right" :style="{ backgroundColor: color }" />
        <view class="tulip-petal tulip-left" :style="{ backgroundColor: color }" />
        <view class="tulip-edge edge-left" />
        <view class="tulip-edge edge-right" />
        <view class="tulip-leaf" />
        <view class="tulip-leaf leaf-right" />
      </view>
      <view v-else-if="kind === 'leaf'" class="foliage-art">
        <view
          v-for="n in 6" :key="n" class="foliage-leaf"
          :style="{ top: `${n * 23}rpx`, left: n % 2 ? '24rpx' : '55rpx', transform: `rotate(${n % 2 ? -35 : 35}deg)`, backgroundColor: color }"
        />
      </view>
      <view v-else class="simple-art" :class="{ 'poppy-art': kind === 'poppy' }">
        <view
          v-for="n in (kind === 'daisy' ? 8 : 5)" :key="n" class="simple-petal"
          :style="{ backgroundColor: color, transform: `rotate(${n * (kind === 'daisy' ? 45 : 72)}deg)` }"
        />
        <view class="simple-heart" />
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.svg-bloom {
  width: 110rpx;
  height: 110rpx;
  pointer-events: none;
}

.bloom-art {
  position: relative;
  width: 110rpx;
  height: 110rpx;
  pointer-events: none;
}

.mum-art {
  position: absolute;
  left: 55rpx;
  top: 55rpx;
}

.mum-ray {
  position: absolute;
  left: 0;
  top: -1rpx;
  transform-origin: 0 50%;
  border-radius: 3rpx;
}

.mum-heart {
  position: absolute;
  left: -6rpx;
  top: -6rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.rose-art {
  position: absolute;
  inset: 0;
}

.rose-petal {
  position: absolute;
  left: 25rpx;
  top: -6rpx;
  width: 60rpx;
  height: 64rpx;
  border-radius: 48% 52% 45% 55%;
  transform-origin: 50% 61rpx;
}

.rose-middle {
  position: absolute;
  left: 16rpx;
  top: 16rpx;
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  box-shadow: inset 0 0 0 12rpx rgba(95, 15, 30, .2);
}

.rose-coil {
  border: 6rpx solid rgba(95, 15, 30, .38);
  border-radius: 48% 50% 44% 52%;
  box-sizing: border-box;
}

.coil-outer {
  width: 54rpx;
  height: 54rpx;
  margin: 12rpx;
  transform: rotate(-20deg);
}

.coil-inner {
  width: 34rpx;
  height: 34rpx;
  margin: 4rpx;
  border-width: 5rpx;
  transform: rotate(35deg);
}

.coil-heart {
  width: 15rpx;
  height: 16rpx;
  margin: 4rpx;
  border-width: 4rpx;
  border-left-color: transparent;
}

.tulip-art {
  position: absolute;
  inset: 0;
}

.tulip-petal {
  position: absolute;
  transform-origin: 50% 100%;
  border-radius: 55% 55% 38% 38%;
}

.tulip-back {
  left: 26rpx;
  top: -20rpx;
  width: 64rpx;
  height: 130rpx;
  transform: rotate(14deg);
  opacity: .92;
}

.tulip-left {
  left: 14rpx;
  top: -30rpx;
  width: 52rpx;
  height: 140rpx;
  transform: rotate(-12deg);
  border-top: 3rpx solid #b394db;
}

.tulip-right {
  left: 40rpx;
  top: -10rpx;
  width: 55rpx;
  height: 120rpx;
  transform: rotate(26deg);
}

.tulip-edge {
  position: absolute;
  width: 37rpx;
  height: 30rpx;
  border-top: 3rpx solid #b394db;
  border-right: 3rpx solid #b394db;
  border-radius: 50%;
}

.edge-left {
  left: 16rpx;
  top: 9rpx;
  transform: rotate(-20deg);
}

.edge-right {
  left: 51rpx;
  top: 24rpx;
  transform: rotate(15deg);
}

.tulip-leaf {
  position: absolute;
  width: 48rpx;
  height: 18rpx;
  left: 12rpx;
  top: 103rpx;
  background: #849b71;
  border-radius: 90% 10% 90% 10%;
  transform: rotate(38deg);
}

.leaf-right {
  left: 51rpx;
  transform: rotate(-35deg);
}

.foliage-leaf {
  position: absolute;
  width: 40rpx;
  height: 28rpx;
  border-radius: 50%;
}

.simple-petal {
  position: absolute;
  left: 40rpx;
  top: 3rpx;
  width: 30rpx;
  height: 54rpx;
  border-radius: 70% 70% 45% 45%;
  transform-origin: 50% 52rpx;
}

.poppy-art .simple-petal {
  width: 56rpx;
  height: 62rpx;
  left: 27rpx;
  top: -7rpx;
  border-radius: 70% 60% 40% 50%;
  transform-origin: 50% 62rpx;
  opacity: .9;
}

.simple-heart {
  position: absolute;
  top: 42rpx;
  left: 42rpx;
  width: 26rpx;
  height: 26rpx;
  background: #c1a14e;
  border-radius: 50%;
}

.poppy-art .simple-heart {
  background: #666b47;
  width: 22rpx;
  height: 22rpx;
  top: 44rpx;
  left: 44rpx;
}
</style>
