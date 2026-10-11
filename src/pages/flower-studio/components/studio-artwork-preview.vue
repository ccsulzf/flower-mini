<script setup lang="ts">
defineProps<{ imagePath: string, exporting: boolean, error: string, readOnly?: boolean, busy?: boolean }>()
defineEmits<{ edit: [], retry: [], previewImage: [], saveImage: [], share: [], saveWork: [], end: [], close: [], deleteWork: [] }>()
</script>

<template>
  <view class="creation-preview">
    <view class="creation-title">
      {{ readOnly ? '作品详情' : '作品预览' }}
    </view>
    <view class="creation-image-area">
      <image v-if="imagePath" class="creation-image" :src="imagePath" mode="aspectFit" @click="$emit('previewImage')" />
      <view v-else class="creation-state">
        <view v-if="exporting">
          正在生成作品图片…
        </view>
        <view v-else class="creation-error">
          {{ error || '作品图片尚未生成' }}
        </view>
        <button v-if="!exporting" class="creation-button" @click="$emit('retry')">
          重新生成
        </button>
      </view>
    </view>
    <view class="creation-actions">
      <button class="creation-button" :disabled="busy" @click="$emit('edit')">
        {{ readOnly ? '继续编辑' : '返回编辑' }}
      </button>
      <button class="creation-button" :disabled="!imagePath || exporting || busy" @click="$emit('saveImage')">
        保存图片
      </button>
      <button class="creation-button creation-primary" :disabled="!imagePath || exporting || busy" @click="$emit('share')">
        分享
      </button>
      <button v-if="!readOnly" class="creation-button creation-primary" :disabled="exporting || busy" @click="$emit('saveWork')">
        保存作品
      </button>
      <button v-if="!readOnly" class="creation-button" :disabled="busy" @click="$emit('end')">
        结束本次创作
      </button>
      <button v-if="readOnly" class="creation-button" :disabled="busy" @click="$emit('deleteWork')">
        删除作品
      </button>
      <button v-if="readOnly" class="creation-button" :disabled="busy" @click="$emit('close')">
        返回我的作品
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-creation.scss';
</style>
