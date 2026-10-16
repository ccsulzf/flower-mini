<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { flowerCatalog, flowerColors, type Stem } from '@/utils/flower/artwork'

// 底部工具栏只发出编辑事件，作品和撤销记录仍由页面管理。
interface ControlBounds { positionMin: number, positionMax: number, heightMin: number, heightMax: number }
interface SliderEvent { detail: { value: number } }

const props = defineProps<{ stem: Stem, colorsOpen: boolean, canMoveBack: boolean, canMoveFront: boolean, controlBounds: ControlBounds }>()
const emit = defineEmits<{
  'close': []
  'color': [value: string]
  'toggle-colors': []
  'mirror': []
  'adjacent': [direction: 'previous' | 'next']
  'layer': [direction: 'front' | 'back']
  'duplicate': []
  'remove': []
  'controlStart': []
  'control': [field: 'position' | 'height', value: number]
  'controlEnd': []
}>()
const catalog = useFlowerCatalogStore()
const cloudMaterial = computed(() => props.stem.materialId && props.stem.materialRevision ? catalog.get(props.stem.materialId, props.stem.materialRevision) : undefined)
const colors = computed(() => cloudMaterial.value ? cloudMaterial.value.colors.map(color => color.value) : flowerColors)
const flowerName = computed(() => cloudMaterial.value?.name ?? flowerCatalog.find(item => item.kind === props.stem.kind)?.name ?? '花材')
const positionValue = computed(() => Math.round(props.stem.angle))
const controlActive = ref(false)

function beginControl() {
  if (controlActive.value)
    return
  controlActive.value = true
  emit('controlStart')
}
function changeControl(field: 'position' | 'height', event: SliderEvent) {
  beginControl()
  emit('control', field, event.detail.value)
}
function endControl() {
  if (!controlActive.value)
    return
  controlActive.value = false
  emit('controlEnd')
}
</script>

<template>
  <view class="flower-tools" @tap.stop @touchmove.stop>
    <view class="tools-heading">
      <text class="flower-name">
        {{ flowerName }}
      </text>
      <button class="close-tools" aria-label="关闭花朵工具栏" @click="emit('close')">
        <view class="i-carbon-close" />
      </button>
    </view>
    <view class="tools-actions">
      <button class="color-button" :class="{ 'tool-active': colorsOpen }" @click="emit('toggle-colors')">
        <view class="current-color" :style="`background-color:${stem.color};`" /><text>颜色</text>
      </button>
      <button class="icon-button" aria-label="左右镜像" :aria-pressed="Boolean(stem.mirrored)" @click="emit('mirror')">
        <view class="i-carbon-reflect-horizontal" />
      </button>
      <button :disabled="!canMoveBack" @click="emit('layer', 'back')">
        后移
      </button>
      <button :disabled="!canMoveFront" @click="emit('layer', 'front')">
        前移
      </button>
      <button class="icon-button" aria-label="复制花朵" @click="emit('duplicate')">
        <view class="i-carbon-copy" />
      </button>
      <button class="icon-button remove-button" aria-label="移除花朵" @click="emit('remove')">
        <view class="i-carbon-trash-can" />
      </button>
    </view>
    <view class="stem-controls">
      <view class="stem-control">
        <text class="control-label">位置</text>
        <slider
          class="control-slider" :min="controlBounds.positionMin" :max="controlBounds.positionMax"
          :value="positionValue" block-size="18" active-color="#879b79" background-color="#dfe3d7"
          @touchstart="beginControl" @changing="changeControl('position', $event)"
          @change="changeControl('position', $event); endControl()" @touchend="endControl"
        />
      </view>
      <view class="stem-control">
        <text class="control-label">高度</text>
        <slider
          class="control-slider" :min="controlBounds.heightMin" :max="controlBounds.heightMax"
          :value="Math.round(stem.stemHeight)" block-size="18" active-color="#879b79" background-color="#dfe3d7"
          @touchstart="beginControl" @changing="changeControl('height', $event)"
          @change="changeControl('height', $event); endControl()" @touchend="endControl"
        />
      </view>
    </view>
    <view v-if="colorsOpen" class="tools-colors">
      <button v-for="color in colors" :key="color" class="color-choice" :class="{ 'dot-picked': stem.color === color }" :aria-label="`选择花色 ${color}`" @click="emit('color', color)">
        <view class="color-dot" :style="`background-color:${color};`" />
      </button>
    </view>
    <view class="stem-navigation">
      <button @click="emit('adjacent', 'previous')">
        上一枝
      </button><text>切换重叠花材</text><button @click="emit('adjacent', 'next')">
        下一枝
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.flower-tools { box-sizing: border-box; width: 100%; padding: 16rpx; border: 2rpx solid $studio-border; border-radius: 22rpx; background: $studio-panel; color: $studio-ink; box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, .12); }
.tools-heading { display: flex; align-items: center; justify-content: space-between; height: 52rpx; margin-bottom: 12rpx; }
.flower-name { font-size: 28rpx; font-weight: 500; }
.close-tools { display: flex; align-items: center; justify-content: center; width: 60rpx; height: 80rpx; padding: 0; margin: 0; border-radius: 50%; background: transparent; color: $studio-muted; }
.close-tools view { width: 24rpx; height: 24rpx; }
.tools-actions { display: flex; align-items: center; gap: 8rpx; height: 80rpx; }
.tools-actions button { display: flex; align-items: center; justify-content: center; flex: 1; min-width: 0; height: 80rpx; padding: 0 4rpx; margin: 0; line-height: 1; font-size: 24rpx; white-space: nowrap; border-radius: 12rpx; background: $studio-secondary; color: $studio-ink; }
.tools-actions button[disabled] { color: $studio-muted; background: $studio-secondary; opacity: .4; }
.tools-actions .color-button { flex: 1.2; gap: 6rpx; }
.current-color { width: 22rpx; height: 22rpx; flex-shrink: 0; border-radius: 50%; border: 1rpx solid rgba(63,70,61,.2); }
.tools-actions .icon-button { flex: 1; background: transparent; }
.icon-button view { width: 26rpx; height: 26rpx; }
.tools-actions .remove-button { color: #ae626b; }
.tools-actions .leaf-button { color: $studio-muted; background: $studio-secondary; }
.tools-actions .tool-active { background: $studio-accent; color: #303829; }
.stem-navigation button::after { border: none; }.stem-navigation { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }.stem-navigation text { font-size: 23rpx; color: $studio-muted; }.stem-navigation button { padding: 0 14rpx; margin: 0; line-height: 68rpx; font-size: 24rpx; background: $studio-secondary; color: $studio-ink; }
.stem-controls { display: flex; flex-direction: column; gap: 4rpx; margin-top: 14rpx; padding: 8rpx 14rpx; border-radius: 14rpx; background: $studio-secondary; }
.stem-control { display: flex; align-items: center; min-height: 58rpx; }
.control-label { width: 72rpx; flex-shrink: 0; color: $studio-ink; font-size: 24rpx; }
.control-slider { flex: 1; margin: 0; }
.tools-colors { display: flex; justify-content: space-between; align-items: center; min-height: 64rpx; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.color-choice { display: flex; align-items: center; justify-content: center; width: 58rpx; height: 58rpx; margin: 0; padding: 0; background: transparent; border: 2rpx solid transparent; border-radius: 50%; }
.color-dot { width: 30rpx; height: 30rpx; border: 1rpx solid rgba(63,70,61,.15); border-radius: 50%; }
.dot-picked { border-color: $studio-muted; }
.tools-actions button::after, .color-choice::after, .close-tools::after { border: none; }
</style>
