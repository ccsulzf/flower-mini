<script setup lang="ts">
const props = defineProps<{ imagePath: string, exporting: boolean, error: string, readOnly?: boolean, busy?: boolean }>()
const emit = defineEmits<{ edit: [], retry: [], previewImage: [], saveImage: [], share: [], saveWork: [], end: [], close: [], deleteWork: [] }>()

function openMore() {
  if (props.busy)
    return
  const actions: { label: string, run: () => void }[] = []
  if (props.imagePath && !props.exporting) {
    actions.push({ label: '保存到相册', run: () => {
      if (props.imagePath && !props.exporting)
        emit('saveImage')
    } })
  }
  actions.push(props.readOnly
    ? { label: '删除作品', run: () => emit('deleteWork') }
    : { label: '结束创作', run: () => emit('end') })
  uni.showActionSheet({
    itemList: actions.map(action => action.label),
    success: ({ tapIndex }) => {
      if (!props.busy)
        actions[tapIndex]?.run()
    },
  })
}
</script>

<template>
  <view class="creation-preview">
    <view class="preview-header" :class="{ 'preview-header-detail': readOnly }">
      <button v-if="!readOnly" class="preview-link" :disabled="busy" @click="$emit('edit')">
        返回编辑
      </button>
      <button class="preview-link" :disabled="busy" @click="openMore">
        更多
      </button>
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
    <view class="creation-actions preview-primary-actions">
      <button class="creation-button" :disabled="busy || (!readOnly && exporting)" @click="readOnly ? $emit('edit') : $emit('saveWork')">
        {{ readOnly ? '继续编辑' : '保存作品' }}
      </button>
      <button class="creation-button creation-primary" :disabled="!imagePath || exporting || busy" @click="$emit('share')">
        制作贺卡
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-creation.scss';
</style>
