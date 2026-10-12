<script setup lang="ts">
defineProps<{ canUndo: boolean, canRedo: boolean, canClear: boolean, editingExisting?: boolean }>()
const emit = defineEmits<{ undo: [], redo: [], reset: [], finish: [] }>()
</script>

<template>
  <view class="page-actions">
    <button class="action-button" :disabled="!canUndo" aria-label="撤销上一步" @click="emit('undo')">
      <view class="action-icon i-carbon-undo" /><text>撤销</text>
    </button>
    <button class="action-button" :disabled="!canRedo" aria-label="重做上一步" @click="emit('redo')">
      <view class="action-icon i-carbon-redo" /><text>重做</text>
    </button>
    <button class="action-button" :disabled="!canClear" @click="emit('reset')">
      <view class="action-icon i-carbon-trash-can" /><text>清空花材</text>
    </button>
    <button class="action-button finish-button" @click="emit('finish')">
      {{ editingExisting ? '保存' : '完成' }}
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.page-actions { @include studio-toolbar-shell; }
.action-button { @include studio-toolbar-button; }
.action-icon { @include studio-toolbar-icon; }
.finish-button { background: $studio-accent; color: #2d3427; font-weight: 500; }
</style>
