<script setup lang="ts">
import type { FlowerCardText } from '@/models/flower-creation'
import { ref } from 'vue'

const props = defineProps<{ text: FlowerCardText, standalone?: boolean }>()
const emit = defineEmits<{ cancel: [], skip: [], preview: [text: FlowerCardText] }>()
const blessing = ref(props.text.blessing)
const signature = ref(props.text.signature)
function preview() {
  emit('preview', { blessing: blessing.value, signature: signature.value })
}
</script>

<template>
  <view class="creation-sheet card-editor" :class="{ 'card-editor-standalone': standalone }">
    <view v-if="!standalone" class="card-header">
      <view class="card-title">
        制作贺卡
      </view>
      <button class="card-close" aria-label="关闭贺卡编辑" @click="$emit('cancel')">
        <view class="i-carbon-close" />
      </button>
    </view>
    <view class="card-note">
      给这束花留句话，把心意一起送出。
    </view>
    <view class="card-field">
      <view class="card-label">
        祝福语<text class="card-optional">
          选填
        </text>
      </view>
      <view class="card-input-area">
        <textarea v-model="blessing" class="card-input card-blessing" :maxlength="120" placeholder="愿你的每一天，都有花开。" placeholder-class="card-placeholder" :adjust-position="true" />
        <view class="card-count">
          {{ blessing.length }}/120
        </view>
      </view>
    </view>
    <view class="card-field">
      <view class="card-label">
        署名<text class="card-optional">
          选填
        </text>
      </view>
      <view class="card-input-area card-signature-area">
        <input v-model="signature" class="card-input card-signature" :maxlength="24" placeholder="写下你的名字" placeholder-class="card-placeholder">
        <text class="card-signature-limit">
          最多24字
        </text>
      </view>
    </view>
    <view class="card-hint">
      留空也可以，直接分享你的插花作品。
    </view>
    <view class="creation-actions card-actions">
      <button class="creation-button card-secondary" @click="$emit('skip')">
        直接分享作品
      </button>
      <button class="creation-button creation-primary" @click="preview">
        预览贺卡
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-creation.scss';
.card-editor-standalone { border: none; background: transparent; }
.card-editor { padding: 32rpx; border-color: rgba(134, 148, 120, .2); }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.card-title { font-size: 34rpx; font-weight: 600; }
.card-close { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 64rpx; height: 64rpx; margin: -8rpx -8rpx -8rpx 0; padding: 0; border-radius: 50%; background: #e7eadf; color: #74806b; font-size: 32rpx; }
.card-close::after { border: none; }
.card-note { margin: 14rpx 0 30rpx; color: #7c8474; font-size: 25rpx; line-height: 1.6; }
.card-field + .card-field { margin-top: 24rpx; }
.card-label { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; font-size: 27rpx; font-weight: 500; }
.card-optional { color: #909787; font-size: 22rpx; font-weight: 400; }
.card-input-area { overflow: hidden; background: #fffdf7; border: 2rpx solid #e1e5d9; border-radius: 20rpx; }
.card-input { width: 100%; box-sizing: border-box; padding: 20rpx; font-size: 28rpx; color: #3f463d; }
.card-blessing { height: 190rpx; line-height: 1.7; }
.card-placeholder { color: #a0a595; }
.card-count { padding: 0 20rpx 14rpx; text-align: right; color: #909787; font-size: 22rpx; }
.card-signature-area { display: flex; align-items: center; }
.card-signature { flex: 1; min-width: 0; height: 88rpx; }
.card-signature-limit { flex-shrink: 0; padding-right: 20rpx; color: #909787; font-size: 22rpx; }
.card-hint { margin-top: 20rpx; color: #909787; font-size: 23rpx; line-height: 1.6; }
.card-actions { flex-wrap: nowrap; margin-top: 28rpx; gap: 16rpx; }
.card-actions .creation-button { min-width: 0; padding: 0 12rpx; font-size: 27rpx; }
.card-secondary { background: transparent; box-shadow: inset 0 0 0 2rpx #d5dccb; }
</style>
