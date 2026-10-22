<script setup lang="ts">
defineProps<{ percent: number, message: string, error: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <view class="prepare-backdrop" @touchmove.stop.prevent>
    <view class="prepare-modal">
      <view class="prepare-mark">✿</view>
      <text class="prepare-title">准备创作空间</text>
      <text class="prepare-message">{{ error || message }}</text>
      <view v-if="!error" class="prepare-track" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
        <view class="prepare-value" :style="`width:${percent}%;`" />
      </view>
      <button v-else class="prepare-retry" @click="emit('retry')">重新加载</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.prepare-backdrop{position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:40rpx;background:rgba(35,39,32,.28);box-sizing:border-box}.prepare-modal{display:flex;flex-direction:column;align-items:center;width:100%;padding:52rpx 42rpx;border-radius:28rpx;background:#fffdf7;box-shadow:0 18rpx 56rpx rgba(30,34,27,.18)}.prepare-mark{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;border-radius:50%;background:#edf1e8;color:#718069;font-size:40rpx}.prepare-title{margin-top:24rpx;color:#3f463d;font-size:32rpx;font-weight:600}.prepare-message{margin-top:14rpx;color:#74806b;font-size:25rpx;text-align:center}.prepare-track{width:100%;height:14rpx;margin-top:34rpx;overflow:hidden;border-radius:999rpx;background:#e5e9df}.prepare-value{height:100%;border-radius:999rpx;background:linear-gradient(90deg,#98aa8d,#6e8068);transition:width .18s ease}.prepare-retry{min-width:220rpx;margin-top:34rpx;background:#718069;color:#fffdf7;font-size:27rpx}.prepare-retry::after{border:none}
</style>
