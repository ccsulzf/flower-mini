<script setup lang="ts">
import type { FlowerCardText } from '@/models/flower-creation'
import { ref } from 'vue'

const props = defineProps<{ text: FlowerCardText }>()
const emit = defineEmits<{ cancel: [], skip: [], preview: [text: FlowerCardText] }>()
const blessing = ref(props.text.blessing)
const signature = ref(props.text.signature)
function preview() {
  emit('preview', { blessing: blessing.value, signature: signature.value })
}
</script>

<template>
  <view class="creation-sheet">
    <view class="creation-title">
      给这束花留句话
    </view>
    <view class="creation-note">
      祝福和署名都可以留空，直接分享原作品。
    </view>
    <textarea v-model="blessing" class="card-input card-blessing" :maxlength="120" placeholder="写下祝福（最多 120 字）" :adjust-position="true" />
    <view class="card-count">
      {{ blessing.length }}/120
    </view>
    <input v-model="signature" class="card-input" :maxlength="24" placeholder="署名（最多 24 字）">
    <view class="creation-actions card-actions">
      <button class="creation-button" @click="$emit('cancel')">
        取消
      </button>
      <button class="creation-button" @click="$emit('skip')">
        跳过
      </button>
      <button class="creation-button creation-primary" @click="preview">
        预览花卡
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-creation.scss';
.card-input { width: 100%; box-sizing: border-box; background: #fffdf7; border-radius: 16rpx; padding: 20rpx; font-size: 28rpx; height: 84rpx; }
.card-blessing { height: 210rpx; }
.card-count { text-align: right; color: #7c8474; font-size: 22rpx; margin: 8rpx 0 18rpx; }
.card-actions { margin-top: 24rpx; }
</style>
