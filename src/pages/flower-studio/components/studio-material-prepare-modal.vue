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
.prepare-backdrop{position:fixed;top:0;right:0;bottom:0;left:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:40rpx;background:rgba(53,46,38,.3);box-sizing:border-box}.prepare-modal{display:flex;flex-direction:column;align-items:center;width:100%;padding:52rpx 42rpx;border:1rpx solid rgba(112,91,68,.25);border-radius:24rpx;background:#fffdf7;box-shadow:0 18rpx 42rpx rgba(88,74,55,.12)}.prepare-mark{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;border-radius:50%;background:#e3e9d7;color:#718069;font-size:40rpx}.prepare-title{margin-top:24rpx;color:#574d40;font-family:'Kaiti SC','STKaiti','Songti SC',serif;font-size:32rpx;font-weight:600}.prepare-message{margin-top:14rpx;color:#7f7465;font-size:25rpx;text-align:center}.prepare-track{width:100%;height:14rpx;margin-top:34rpx;overflow:hidden;border:1rpx solid rgba(112,91,68,.18);border-radius:8rpx;background:#ece6da}.prepare-value{height:100%;border-radius:8rpx;background:#8fa083;transition:width .18s ease}.prepare-retry{min-width:220rpx;margin-top:34rpx;border:0;border-radius:14rpx;background:#7f9274;color:#fffdf7;font-size:27rpx}.prepare-retry::after{border:none}
</style>
