<script setup lang="ts">
import type { StudioTab } from '../studio-types'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'

const emit = defineEmits<{ select: [tab: StudioTab], generate: [] }>()
const studio = useFlowerStudioStore()
const artwork = useCreationArtworkStore()
const { activeTab } = storeToRefs(studio)
const { materials } = storeToRefs(artwork)
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
      <view class="tool-target tool-generate-target">
        <button class="tool-button tool-generate" aria-label="一句话生花" @click="emit('generate')">
          <text class="bloom-mark" aria-hidden="true">✿</text>
          <text>生花</text>
        </button>
      </view>
      <view class="tool-divider" aria-hidden="true" />
      <view v-for="tab in tabs" :key="tab.value" class="tool-target">
        <button
          class="tool-button" :class="{ 'tool-active': activeTab === tab.value }" :disabled="tab.disabled" @click="emit('select', tab.value)"
        >
          <view class="tool-icon" :class="tab.icon" /><text>{{ tab.label }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;

.studio-toolbar {
  @include studio-toolbar-shell;
  position: relative;
  height: 88rpx;
  padding: 10rpx 16rpx 12rpx;
  border: 1rpx solid rgba(var(--app-ink-rgb), .19);
  border-radius: 24rpx 19rpx 14rpx 20rpx;
  background: rgba(var(--app-surface-rgb), .96);
  box-shadow: 3rpx 4rpx 0 rgba(var(--app-ink-rgb), .05), 0 -4rpx 14rpx rgba(var(--app-ink-rgb), .035);
}
.studio-toolbar::before { position:absolute; top:5rpx; right:20rpx; left:18rpx; height:1rpx; background:rgba(var(--app-ink-rgb), .1); content:''; transform:rotate(-.12deg); }
.studio-toolbar.toolbar-open { border-top-color:transparent; border-radius:0 0 14rpx 20rpx; box-shadow:3rpx 4rpx 0 rgba(var(--app-ink-rgb), .045); }
.studio-toolbar.toolbar-open::before { display:none; }

.toolbar-materials {
  display: flex;
  align-items: center;
  gap: 10rpx;
  width: 100%;
}

.tool-target { position:relative; flex:1; min-width:0; }
.tool-target .tool-button { width:100%; }
.tool-generate-target { flex: 1.15; }
.tool-divider { width: 1rpx; height: 30rpx; flex-shrink: 0; background: rgba(var(--app-ink-rgb), .18); transform: rotate(3deg); }
.bloom-mark { color: var(--app-sage); font-size: 32rpx; line-height: 1; transform: rotate(-8deg); }
.tool-button.tool-generate { color: var(--app-brandStrong); gap: 9rpx; white-space: nowrap; }

.tool-button {
  @include studio-toolbar-button;
  position: relative;
  height: 60rpx;
  border-radius: 13rpx 10rpx 14rpx 11rpx;
}

.tool-active {
  background: rgba(var(--app-sageSoft-rgb), .54);
  color: var(--app-brandStrong);
  font-weight: 600;
  box-shadow: 2rpx 3rpx 0 rgba(var(--app-ink-rgb), .045);
}
.tool-active::after { position:absolute; right:24rpx; bottom:3rpx; left:27rpx; height:3rpx; border:0; border-radius:50%; background:rgba(var(--app-brandStrong-rgb), .54); content:''; transform:rotate(-1.4deg); }

.tool-button[disabled] {
  opacity: 0.36;
}

.tool-icon {
  @include studio-toolbar-icon;
  color: var(--app-inkMuted);
  transform: rotate(-2deg);
}
.tool-button:nth-child(even) .tool-icon { transform:rotate(2deg); }
.tool-active .tool-icon { color:var(--app-brandStrong); }
</style>
