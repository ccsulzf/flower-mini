<script setup lang="ts">
defineProps<{ imagePath: string, exporting: boolean, error: string }>()
defineEmits<{ back: [], editText: [], retry: [], previewImage: [], saveImage: [], share: [] }>()
</script>

<template>
  <view class="creation-preview">
    <view class="creation-title">
      花卡预览
    </view>
    <view class="creation-image-area">
      <image v-if="imagePath" class="creation-image" :src="imagePath" mode="aspectFit" @click="$emit('previewImage')" />
      <view v-else class="creation-state">
        <view v-if="exporting">
          正在生成花卡…
        </view>
        <view v-else class="creation-error">
          {{ error || '花卡尚未生成' }}
        </view>
        <button v-if="!exporting" class="creation-button" @click="$emit('retry')">
          重新生成
        </button>
      </view>
    </view>
    <view class="creation-actions">
      <button class="creation-button" @click="$emit('back')">
        返回作品
      </button>
      <button class="creation-button" :disabled="exporting" @click="$emit('editText')">
        修改祝福或署名
      </button>
      <button class="creation-button" :disabled="!imagePath || exporting" @click="$emit('saveImage')">
        保存图片
      </button>
      <button class="creation-button creation-primary" :disabled="!imagePath || exporting" @click="$emit('share')">
        分享花卡
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-creation.scss';
</style>
