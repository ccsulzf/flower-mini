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
  <view class="studio-toolbar">
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
}

.toolbar-materials {
  display: flex;
  align-items: center;
  gap: 10rpx;
  width: 100%;
}

.tool-button {
  @include studio-toolbar-button;
}

.tool-active {
  background: $studio-accent;
  color: #3f463d;
  font-weight: 600;
}

.tool-button[disabled] {
  opacity: 0.36;
}

.tool-icon {
  @include studio-toolbar-icon;
}
</style>
