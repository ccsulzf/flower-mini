<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFlowerPageArtwork } from '@/hooks/useFlowerPageArtwork'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { clearDraft } from '@/utils/flower/creation-storage'

definePage({ style: { navigationBarTitleText: '完成作品', navigationBarBackgroundColor: '#f6f3eb' } })
const { draft, thumbnail, loading, error, owner, images, channel, current, retry } = useFlowerPageArtwork()
const { imagePath, exportingImage, imageError, exportCanvasId, canvasHeight } = images
const pageHeight = uni.getSystemInfoSync().windowHeight
const saving = ref(false)
const editingExisting = computed(() => Boolean(draft.value?.workId))
watch(editingExisting, (editing) => {
  uni.setNavigationBarTitle({ title: editing ? '保存修改' : '完成作品' })
}, { immediate: true })
const displayImage = computed(() => imagePath.value || thumbnail.value)
const note = computed(() => draft.value?.workId ? '保存本次调整后，可在作品详情继续创作。' : '保存到我的作品后，可在作品详情继续创作。')

async function save() {
  if (!draft.value || saving.value)
    return
  saving.value = true
  try {
    const value = { ...draft.value }
    const works = useFlowerWorksStore()
    let title = `花意 ${new Date().getMonth() + 1}月${new Date().getDate()}日`
    let description = ''
    if (value.workId) {
      const original = await works.get(value.workId)
      if (!current())
        throw new Error('账号已切换，请重新打开作品')
      title = original.title
      description = original.description
    }
    const image = await images.exportThumbnail()
    if (!current())
      throw new Error('账号已切换，请重新打开作品')
    const work = await works.save({ draft: value, title, description, imagePath: image, workId: value.workId, expectedRevision: value.workRevision })
    if (!current())
      return
    channel()?.emit('saved', work)
    clearDraft(owner.value)
    uni.showToast({ title: '作品已保存', icon: 'none' })
    uni.reLaunch({ url: `/pages/flower-detail/flower-detail-page?workId=${work.id}` })
  }
  catch (value) {
    uni.showToast({ title: creationFailure(value), icon: 'none' })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="detail-page" :style="{ height: `${pageHeight}px` }">
    <view class="detail-artwork" @click="images.previewImage()">
      <image v-if="displayImage" :src="displayImage" mode="aspectFit" class="detail-image" />
      <view v-else class="detail-state">
        <text>{{ loading || exportingImage ? '正在准备作品…' : error || imageError || '作品尚未生成' }}</text>
        <button v-if="!loading && !exportingImage" @click.stop="retry">
          重新加载
        </button>
      </view>
    </view>
    <view class="detail-info">
      <view class="detail-heading">
        <text>{{ editingExisting ? '保存本次修改' : '把这束花留存下来' }}</text>
      </view>
      <text class="detail-note">
        {{ note }}
      </text>
    </view>
    <view class="detail-footer">
      <button class="app-primary-btn" :disabled="loading || exportingImage || saving || !imagePath" @click="save">
        {{ saving ? '正在保存…' : editingExisting ? '保存修改' : '保存作品' }}
      </button>
    </view>
    <canvas :id="exportCanvasId" :canvas-id="exportCanvasId" class="export-canvas" :style="{ height: `${canvasHeight}px` }" />
  </view>
</template>

<style scoped lang="scss">
.detail-page { display: flex; flex-direction: column; box-sizing: border-box; padding: 16rpx 28rpx 0; background: #f6f3eb; color: #3f463d; }
.detail-artwork { flex: 1; min-height: 0; border-radius: 28rpx; overflow: hidden; background: #f0efe6; }
.detail-image { width: 100%; height: 100%; }
.detail-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; font-size: 26rpx; }
.detail-info { flex-shrink: 0; padding: 24rpx 6rpx 20rpx; }
.detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; font-size: 30rpx; font-weight: 600; }
.detail-note { display: block; margin-top: 8rpx; color: #737b6c; font-size: 24rpx; line-height: 1.55; }
button::after { border: none; }
.detail-footer { flex-shrink: 0; padding: 0 0 calc(24rpx + env(safe-area-inset-bottom)); }
.detail-footer button { width: 100%; margin: 0; }
.detail-footer button[disabled] { opacity: .42; }
.export-canvas { position: fixed; left: -2000px; top: 0; width: 698px; pointer-events: none; }
</style>
