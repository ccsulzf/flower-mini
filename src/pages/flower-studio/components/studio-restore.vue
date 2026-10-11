<script setup lang="ts">
defineProps<{ error?: string }>()
defineEmits<{ continue: [], restart: [] }>()
</script>

<template>
  <view class="creation-sheet">
    <view class="creation-title">
      继续上次创作？
    </view>
    <view class="creation-note">
      上次的花材、容器、背景和花卡文字都已保留。
    </view>
    <view v-if="error" class="creation-error">
      {{ error }}
    </view>
    <view class="creation-actions">
      <button class="creation-button" @click="$emit('restart')">
        重新开始
      </button>
      <button class="creation-button creation-primary" @click="$emit('continue')">
        继续创作
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-creation.scss';
</style>
