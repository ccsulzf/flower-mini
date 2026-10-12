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
const showSave = ref(false)
const editingExisting = computed(() => Boolean(draft.value?.workId))
watch(editingExisting, (editing) => {
  uni.setNavigationBarTitle({ title: editing ? '保存修改' : '完成作品' })
}, { immediate: true })
const workName = ref('')
const displayImage = computed(() => imagePath.value || thumbnail.value)
const note = computed(() => draft.value?.workId ? '保存本次调整，或制作贺卡送出心意。' : '保存到我的作品，或制作贺卡送出心意。')
function makeCard() {
  if (!draft.value)
    return
  const value = JSON.parse(JSON.stringify(draft.value))
  uni.navigateTo({ url: '/pages/flower-card/flower-card-page', success: result => result.eventChannel.emit('artwork', { draft: value, owner: owner.value }) })
}
async function requestSave() {
  if (!draft.value || saving.value)
    return
  saving.value = true
  try {
    if (draft.value.workId) {
      const works = useFlowerWorksStore()
      const original = works.items.find(work => work.id === draft.value!.workId) || await works.get(draft.value.workId)
      if (!current())
        return
      workName.value = original.title
    }
    else {
      workName.value = `花意 ${new Date().getMonth() + 1}月${new Date().getDate()}日`
    }
    showSave.value = true
  }
  catch (error) {
    uni.showToast({ title: creationFailure(error), icon: 'none' })
  }
  finally {
    saving.value = false
  }
}
async function save() {
  if (!draft.value || saving.value)
    return
  saving.value = true
  try {
    const value = { ...draft.value }
    const image = await images.exportThumbnail()
    if (!current())
      throw new Error('账号已切换，请重新打开作品')
    const work = await useFlowerWorksStore().save({ draft: value, title: workName.value, imagePath: image, workId: value.workId, expectedRevision: value.workRevision })
    if (!current())
      return
    // 先通知插花页停止草稿自动写入，再清除本地恢复缓存。
    channel()?.emit('saved', work)
    clearDraft(owner.value)
    showSave.value = false
    uni.showToast({ title: '作品已保存', icon: 'none' })
    uni.reLaunch({ url: '/pages/flower-works/flower-works-page' })
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
        <text>{{ editingExisting ? '保存本次修改' : '作品已完成' }}</text>
      </view>
      <text class="detail-note">
        {{ note }}
      </text>
    </view>
    <view class="detail-actions detail-footer">
      <button :disabled="loading || exportingImage || saving || !imagePath" @click="requestSave()">
        {{ editingExisting ? '保存修改' : '保存作品' }}
      </button>
      <button class="primary" :disabled="loading || exportingImage || saving || !imagePath" @click="makeCard">
        制作贺卡
      </button>
    </view>
    <view v-if="showSave" class="save-overlay">
      <view class="save-sheet">
        <text class="save-title">
          {{ editingExisting ? '保存修改' : '为作品取个名字' }}
        </text><input v-model="workName" :maxlength="40" :disabled="saving" placeholder="作品名称"><view class="detail-actions">
          <button :disabled="saving" @click="showSave = false">
            取消
          </button><button class="primary" :disabled="saving" @click="save">
            {{ saving ? '正在保存…' : editingExisting ? '保存修改' : '保存作品' }}
          </button>
        </view>
      </view>
    </view>
    <canvas :id="exportCanvasId" :canvas-id="exportCanvasId" class="export-canvas" :style="{ height: `${canvasHeight}px` }" />
  </view>
</template>

<style scoped lang="scss">
.detail-page { display: flex; flex-direction: column; box-sizing: border-box; padding: 16rpx 28rpx calc(24rpx + env(safe-area-inset-bottom)); background: #f6f3eb; color: #3f463d; }
.detail-artwork { flex: 1; min-height: 0; border-radius: 24rpx; overflow: hidden; background: #f6f3eb; }
.detail-image { width: 100%; height: 100%; }
.detail-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; font-size: 26rpx; }
.detail-info { flex-shrink: 0; padding: 22rpx 6rpx 28rpx; }
.detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; font-size: 30rpx; font-weight: 600; }
.detail-heading text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-heading button { background: transparent; color: #79816e; font-size: 26rpx; padding: 0; margin: 0; line-height: 52rpx; flex-shrink: 0; }
.detail-note { display: block; margin-top: 6rpx; color: #858b7c; font-size: 24rpx; }
button::after { border: none; }
.detail-footer { flex-shrink: 0; }
.detail-actions { display: flex; gap: 20rpx; }
.detail-actions button { flex: 1; margin: 0; background: #e5e9dd; color: #3f463d; font-size: 30rpx; border-radius: 20rpx; line-height: 88rpx; }
.detail-actions .primary { background: #c8d6bd; font-weight: 600; }
.save-overlay { position: fixed; inset: 0; background: rgba(30,35,25,.25); display: flex; align-items: center; padding: 32rpx; z-index: 10; }
.save-sheet { width: 100%; padding: 32rpx; box-sizing: border-box; border-radius: 28rpx; background: #f6f3eb; }
.save-title { font-size: 32rpx; font-weight: 600; }
.save-sheet input { margin: 28rpx 0; background: #fffdf7; border-radius: 16rpx; padding: 20rpx; height: 56rpx; }
.export-canvas { position: fixed; left: -2000px; top: 0; width: 698px; pointer-events: none; }
</style>
