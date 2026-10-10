<script setup lang="ts">
import type { StudioTab } from '../studio-types'
defineProps<{ activeTab: StudioTab | null }>()
const emit = defineEmits<{ select: [tab: StudioTab] }>()
const tabs: { value: StudioTab, label: string, icon: string }[] = [
  { value: 'flowers', label: '花材', icon: 'i-carbon-sprout' },
  { value: 'vases', label: '花瓶 / 花束', icon: 'i-carbon-chemistry' },
  { value: 'backgrounds', label: '背景', icon: 'i-carbon-color-palette' },
]
</script>
<template>
  <view class="studio-toolbar">
    <view class="toolbar-materials">
      <button v-for="tab in tabs" :key="tab.value" class="tool-button" :class="{ 'tool-active': activeTab === tab.value }" @click="emit('select', tab.value)"><view class="tool-icon" :class="tab.icon" /><text>{{ tab.label }}</text></button>
    </view>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.studio-toolbar { @include studio-toolbar-shell; }
.toolbar-materials { display: flex; align-items: center; gap: 10rpx; width: 100%; }
.tool-button { @include studio-toolbar-button; }
.tool-active { background: $studio-accent; color: #2d3427; font-weight: 500; }
.tool-icon { @include studio-toolbar-icon; }
</style>
