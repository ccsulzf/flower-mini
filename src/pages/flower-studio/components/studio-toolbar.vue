<script setup lang="ts">
import type { StudioTab } from '../studio-types'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'

const studio = useFlowerStudioStore()
const artwork = useCreationArtworkStore()
const { activeTab } = storeToRefs(studio)
const { materials } = storeToRefs(artwork)
const emit = defineEmits<{ select: [tab: StudioTab] }>()
const tabs = computed<{ value: StudioTab, label: string, icon: string, disabled?: boolean }[]>(() => [
  { value: 'flowers', label: '花材', icon: 'i-carbon-sprout' },
  { value: 'vases', label: '容器', icon: 'i-carbon-chemistry' },
  { value: 'backgrounds', label: '背景', icon: 'i-carbon-color-palette' },
  { value: 'selection', label: '选取', icon: 'i-carbon-cursor-1', disabled: !materials.value.length },
])
</script>

<template>
  <view class="studio-toolbar" :class="{ 'toolbar-open': activeTab }">
    <view class="toolbar-materials">
      <button
        v-for="tab in tabs" :key="tab.value" class="tool-button"
        :class="{ 'tool-active': activeTab === tab.value }" :disabled="tab.disabled" @click="emit('select', tab.value)"
      >
        <view class="tool-icon" :class="tab.icon" /><text>{{ tab.label }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;

.studio-toolbar {
  @include studio-toolbar-shell;
  position: relative;
  border: 1rpx solid rgba(112, 91, 68, .18);
  border-radius: 10rpx 14rpx 0 0;
  background: rgba(255, 253, 247, .97);
  box-shadow: 0 -5rpx 16rpx rgba(88, 74, 55, .045);
}
.studio-toolbar.toolbar-open { border-top-color:transparent; border-radius:0; box-shadow:none; }

.toolbar-materials {
  display: flex;
  align-items: center;
  gap: 10rpx;
  width: 100%;
}

.tool-button {
  @include studio-toolbar-button;
  position: relative;
}

.tool-active {
  background: transparent;
  color: #4f5b49;
  font-weight: 600;
  box-shadow: none;
}
.tool-active::after { position:absolute; right:28rpx; bottom:2rpx; left:28rpx; height:4rpx; border:0; border-radius:50%; background:rgba(127,146,116,.62); content:''; }

.tool-button[disabled] {
  opacity: 0.36;
}

.tool-icon {
  @include studio-toolbar-icon;
}
</style>
