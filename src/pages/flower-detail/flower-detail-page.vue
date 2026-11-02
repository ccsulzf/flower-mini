<script setup lang="ts">
import { computed, ref } from 'vue'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import FlowerMaterialListModal from '@/components/flower/flower-material-list-modal.vue'
import { useDevice } from '@/hooks/useDevice'
import { useFlowerPageArtwork } from '@/hooks/useFlowerPageArtwork'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

definePage({ style: { navigationBarTitleText: '作品详情', navigationBarBackgroundColor: '#f6f3eb', disableScroll: true } })
const { draft, title, description, loading, error, images, retry } = useFlowerPageArtwork({ savedOnly: true })
const { exportingImage, imageError } = images
const { deviceWidth, deviceHeight } = useDevice()
const artworkScale = computed(() => {
  const width = deviceWidth.value
  const height = deviceHeight.value
  const rpx = width / 750
  return Math.max(0.1, Math.min(
    1,
    (width - 100 * rpx) / studioMetrics.width,
    (height - 390 * rpx) / studioMetrics.height,
  ))
})
const showMetadataEditor = ref(false)
const showMaterials = ref(false)
const savingMetadata = ref(false)
const imageAction = ref<'share' | 'save' | ''>('')
const editTitle = ref('')
const editDescription = ref('')
function edit() {
  if (draft.value?.workId)
    uni.navigateTo({ url: `/pages/flower-studio/flower-studio-page?workId=${draft.value.workId}&edit=1` })
  else
    uni.navigateBack()
}
async function shareArtwork() {
  if (!draft.value || exportingImage.value)
    return
  imageAction.value = 'share'
  try {
    if (await images.exportImage())
      images.shareImage()
  }
  finally {
    imageAction.value = ''
  }
}
function makeCard() {
  if (!draft.value?.workId)
    return
  uni.navigateTo({ url: `/pages/flower-card/flower-card-page?workId=${draft.value.workId}` })
}
function editMetadata() {
  if (loading.value || savingMetadata.value)
    return
  editTitle.value = title.value
  editDescription.value = description.value
  showMetadataEditor.value = true
}
async function saveMetadata() {
  if (!draft.value?.workId || savingMetadata.value)
    return
  savingMetadata.value = true
  try {
    const work = await useFlowerWorksStore().save({
      draft: draft.value,
      title: editTitle.value,
      description: editDescription.value,
      workId: draft.value.workId,
    })
    draft.value = work.draft
    title.value = work.title
    description.value = work.description
    showMetadataEditor.value = false
    uni.showToast({ title: '作品信息已更新', icon: 'none' })
  }
  catch (value) {
    uni.showToast({ title: creationFailure(value), icon: 'none' })
  }
  finally {
    savingMetadata.value = false
  }
}
</script>

<template>
  <view class="detail-page">
    <view class="detail-top-actions">
      <view class="detail-action-group">
        <button :disabled="loading || savingMetadata" @click="edit">
          <view class="i-carbon-edit" />
          编辑
        </button>
      </view>
      <view class="detail-action-group">
        <button :disabled="loading || !draft" @click="showMaterials = true"><view class="i-carbon-list" />花材</button>
        <button :disabled="loading || exportingImage || !draft" @click="shareArtwork">
          <view class="i-carbon-share" />
          分享
        </button>
        <button :disabled="loading || exportingImage || savingMetadata || !draft" @click="makeCard">
          <view class="i-carbon-image" />
          贺卡
        </button>
      </view>
    </view>
    <FlowerMaterialListModal :visible="showMaterials" :artwork="draft?.artwork" @close="showMaterials = false" />
    <view class="detail-artwork">
      <view class="detail-tape detail-tape-left" aria-hidden="true" />
      <view class="detail-tape detail-tape-right" aria-hidden="true" />
      <FlowerArtworkPreview v-if="draft && !loading && !error" :artwork="draft.artwork" :scale="artworkScale" />
      <view v-else class="detail-state">
        <text>{{ loading || exportingImage ? '正在准备作品…' : error || imageError || '作品尚未准备好' }}</text>
        <button v-if="!loading && !exportingImage" @click.stop="retry">
          重新加载
        </button>
      </view>
      <text v-if="imageError" class="image-export-error">{{ imageError }}</text>
    </view>
    <view class="detail-info">
      <text class="detail-kicker">花作小记</text>
      <view class="detail-heading" @click="editMetadata">
        <text>{{ title }}</text>
        <view class="i-carbon-edit detail-heading-edit" />
      </view>
      <text v-if="description" class="detail-description">
        {{ description }}
      </text>
    </view>
    <view v-if="showMetadataEditor" class="metadata-overlay" @click="!savingMetadata && (showMetadataEditor = false)">
      <view class="metadata-sheet" @click.stop>
        <view class="metadata-tape" aria-hidden="true" />
        <view class="metadata-heading">
          <view>
            <text class="metadata-kicker">FLOWER NOTE</text>
            <text class="metadata-title">修改作品信息</text>
          </view>
          <button class="metadata-close" aria-label="关闭" :disabled="savingMetadata" @click="showMetadataEditor = false">
            <view class="i-carbon-close" />
          </button>
        </view>
        <uni-forms class="metadata-form" label-position="top">
          <uni-forms-item name="title" label="名字">
            <view class="metadata-field metadata-name-field">
              <input
                v-model="editTitle" class="metadata-input" :maxlength="40" :disabled="savingMetadata"
                placeholder="给作品取个名字"
              >
            </view>
          </uni-forms-item>
          <uni-forms-item name="description" label="介绍">
            <view class="metadata-field metadata-description-field">
              <view class="metadata-rule metadata-rule-one" aria-hidden="true" />
              <view class="metadata-rule metadata-rule-two" aria-hidden="true" />
              <view class="metadata-rule metadata-rule-three" aria-hidden="true" />
              <textarea
                v-model="editDescription" class="metadata-textarea" :maxlength="160" :disabled="savingMetadata"
                placeholder="写一段作品介绍"
              />
            </view>
            <view class="metadata-field-footer">
              <text>写下花材、心情或创作灵感</text>
              <text>{{ editDescription.length }}/160</text>
            </view>
          </uni-forms-item>
        </uni-forms>
        <view class="detail-actions">
          <button :disabled="savingMetadata" @click="showMetadataEditor = false">
            <view class="detail-action-content">
              <view class="i-carbon-close" />
              <text>取消</text>
            </view>
          </button>
          <button class="primary" :disabled="savingMetadata || editTitle.length > 40 || editDescription.length > 160"
            @click="saveMetadata">
            <view class="detail-action-content">
              <view class="i-carbon-checkmark" />
              <text>{{ savingMetadata ? '正在保存…' : '保存修改' }}</text>
            </view>
          </button>
        </view>
      </view>
    </view>
    <view v-if="exportingImage && imageAction" class="image-preparing-overlay" @touchmove.stop.prevent>
      <view class="image-preparing-sheet">
        <view class="image-preparing-bloom" aria-hidden="true">✿</view>
        <text>正在生成作品图片…</text>
        <text class="image-preparing-note">图片准备好后将自动继续</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  padding: 12rpx 28rpx 8rpx;
  padding-bottom: env(safe-area-inset-bottom, 0);
  color: #3f463d;
  height: 100%;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 18% 8%, rgba(193, 171, 139, .07) 0 2rpx, transparent 3rpx),
    radial-gradient(circle at 72% 28%, rgba(193, 171, 139, .05) 0 2rpx, transparent 3rpx),
    #f8f3e9;
  background-size: 34rpx 34rpx, 46rpx 46rpx, auto;
}

.image-preparing-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:32rpx;box-sizing:border-box;background:rgba(63,55,45,.34)}
.image-preparing-sheet{display:flex;width:560rpx;flex-direction:column;align-items:center;padding:48rpx 36rpx;border:2rpx solid rgba(112,91,68,.24);border-radius:24rpx;background:#fffaf0;box-shadow:7rpx 9rpx 0 rgba(143,124,95,.15);color:#4f594b;font-size:28rpx}
.image-preparing-bloom{margin-bottom:22rpx;color:#829174;font-size:76rpx;line-height:1;animation:image-preparing-bloom 1.6s ease-in-out infinite}
.image-preparing-note{margin-top:12rpx;color:#817665;font-size:23rpx}
@keyframes image-preparing-bloom{0%,100%{transform:scale(.92) rotate(-5deg);opacity:.7}50%{transform:scale(1.08) rotate(5deg);opacity:1}}

.detail-top-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  flex-shrink: 0;
  padding: 0 6rpx 10rpx;
}

.detail-action-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.detail-artwork {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  margin: 14rpx 2rpx 12rpx;
  padding: 18rpx;
  border: 2rpx solid rgba(184, 168, 139, .22);
  border-radius: 18rpx 26rpx 20rpx 30rpx;
  background: rgba(255, 253, 246, .9);
  box-shadow: 0 14rpx 34rpx rgba(88, 74, 55, .075);
}

.detail-tape {
  position: absolute;
  z-index: 3;
  top: -17rpx;
  width: 104rpx;
  height: 32rpx;
  opacity: .74;
  pointer-events: none;
}

.detail-tape-left { left: 36rpx; transform: rotate(-8deg); background: #cbd2af; }
.detail-tape-right { right: 48rpx; transform: rotate(7deg); background: #e4cfaf; }

.detail-image {
  width: 100%;
  height: 100%;
}

.image-export-error {
  position: absolute;
  bottom: 8rpx;
  left: 0;
  width: 100%;
  color: #995c50;
  font-size: 22rpx;
  text-align: center;
}

.detail-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  font-size: 26rpx;
}

.detail-state button {
  margin: 0;
  padding: 8rpx 18rpx;
  border-radius: 12rpx;
  background: transparent;
  color: #75806c;
  font-size: 24rpx;
  line-height: 48rpx;
}

.detail-info {
  position: relative;
  flex-shrink: 0;
  margin: 0 20rpx 10rpx;
  padding: 19rpx 28rpx 18rpx;
  transform: rotate(-.35deg);
  background: rgba(245, 234, 215, .78);
  box-shadow: 0 7rpx 18rpx rgba(92, 74, 51, .05);
}

.detail-info::before {
  position: absolute;
  top: -11rpx;
  left: 50%;
  width: 82rpx;
  height: 23rpx;
  transform: translateX(-50%) rotate(2deg);
  background: rgba(218, 180, 173, .55);
  content: '';
}

.detail-kicker {
  display: block;
  margin-bottom: 4rpx;
  color: #a08a70;
  font-family: Georgia, serif;
  font-size: 15rpx;
  letter-spacing: 2rpx;
}

.detail-heading {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  font-family: Georgia, 'Songti SC', 'STSong', serif;
}

.detail-heading text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-heading-edit {
  flex-shrink: 0;
  color: #737b6c;
  font-size: 28rpx;
}

.detail-description {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 8rpx;
  color: #737b6c;
  font-size: 25rpx;
  line-height: 1.5;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.detail-top-actions button {
  display: flex;
  align-items: center;
  gap: 8rpx;
  border: 2rpx solid rgba(105, 88, 68, .32);
  background: #f3ead8;
  color: #596451;
  font-size: 24rpx;
  padding: 8rpx 15rpx;
  margin: 0;
  line-height: 44rpx;
  border-radius: 18rpx 12rpx 20rpx 14rpx;
  box-shadow: 3rpx 4rpx 0 rgba(105, 88, 68, .06);
  flex-shrink: 0;
}

.detail-top-actions button view {
  font-size: 28rpx;
  transform: rotate(-4deg);
}

button::after {
  border: none;
}

.detail-actions {
  display: flex;
  justify-content: center;
  gap: 12rpx;
}

.detail-actions button {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  height: 78rpx;
  border: 2rpx solid rgba(105, 88, 68, .48);
  border-radius: 9rpx 14rpx 8rpx 12rpx;
  background: #f5e7dc;
  box-shadow: 3rpx 4rpx 0 rgba(91, 75, 57, .06);
  color: #665c50;
  font-size: 24rpx;
  line-height: 1;
  white-space: nowrap;
  transform: rotate(-.25deg);
}

.detail-actions button::before {
  position: absolute;
  top: -5rpx;
  right: 3rpx;
  bottom: 4rpx;
  left: -4rpx;
  border: 2rpx solid rgba(105, 88, 68, .28);
  border-radius: 13rpx 8rpx 15rpx 7rpx;
  content: '';
  pointer-events: none;
}

.detail-action-content {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.detail-actions .primary {
  border-color: rgba(99, 108, 87, .58);
  border-radius: 13rpx 8rpx 14rpx 9rpx;
  background: #e4eadc;
  color: #515c49;
  font-weight: 600;
  transform: rotate(.25deg);
}

.detail-actions .primary::before {
  top: -4rpx;
  right: -4rpx;
  bottom: 3rpx;
  left: 4rpx;
  border-color: rgba(99, 108, 87, .34);
  border-radius: 8rpx 15rpx 9rpx 13rpx;
}

.detail-actions button:not([disabled]):active .detail-action-content,
.detail-top-actions button:not([disabled]):active {
  transform: translate(2rpx, 3rpx);
}

.detail-actions button[disabled],
.detail-top-actions button[disabled] {
  opacity: .42;
}

.detail-state button:not([disabled]):active {
  background: #e9ecdf;
}

.metadata-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 32rpx;
  box-sizing: border-box;
  background: rgba(55, 50, 42, .34);
}

.metadata-sheet {
  position: relative;
  width: 100%;
  overflow: visible;
  padding: 40rpx 34rpx 36rpx;
  box-sizing: border-box;
  border: 2rpx solid rgba(112, 91, 68, .3);
  border-radius: 22rpx 30rpx 20rpx 28rpx;
  background:
    radial-gradient(circle at 18% 16%, rgba(174, 147, 111, .08) 0 1rpx, transparent 2rpx),
    radial-gradient(circle at 76% 34%, rgba(174, 147, 111, .06) 0 1rpx, transparent 2rpx),
    #fffaf0;
  background-size: 32rpx 32rpx, 46rpx 46rpx, auto;
  box-shadow: 8rpx 12rpx 0 rgba(101, 83, 61, .07), 0 24rpx 46rpx rgba(54, 46, 37, .12);
}

.metadata-tape {
  position: absolute;
  top: -14rpx;
  left: 50%;
  width: 106rpx;
  height: 28rpx;
  background: rgba(218, 180, 173, .62);
  transform: translateX(-50%) rotate(2deg);
}

.metadata-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 30rpx;
}

.metadata-kicker {
  display: block;
  margin-bottom: 5rpx;
  color: #a08a70;
  font-family: Georgia, serif;
  font-size: 15rpx;
  letter-spacing: 2rpx;
}

.metadata-title {
  display: block;
  color: #4d5148;
  font-size: 32rpx;
  font-weight: 600;
  font-family: Georgia, 'Songti SC', 'STSong', serif;
}

.metadata-close {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  align-items: center;
  justify-content: center;
  margin: -6rpx -8rpx 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7c796d;
  font-size: 30rpx;
  line-height: 1;
  transform: rotate(3deg);
}

.metadata-form :deep(.uni-forms-item) {
  margin-bottom: 22rpx;
}

.metadata-form :deep(.uni-forms-item__label) {
  height: auto;
  padding: 0 0 11rpx;
  color: #67695f;
  font-size: 26rpx;
}

.metadata-form :deep(.uni-forms-item__content) {
  width: 100%;
}

.metadata-field {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  border: 2rpx solid rgba(124, 113, 92, .24);
  border-radius: 9rpx 13rpx 8rpx 11rpx;
  background: rgba(255, 253, 247, .78);
  box-shadow: inset 0 -2rpx 0 rgba(167, 153, 125, .06);
}

.metadata-name-field {
  height: 78rpx;
}

.metadata-input {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 0 22rpx;
  color: #4d5148;
  font-size: 27rpx;
}

.metadata-description-field {
  height: 190rpx;
}

.metadata-textarea {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 17rpx 22rpx;
  color: #55584f;
  font-size: 25rpx;
  line-height: 46rpx;
}

.metadata-rule {
  position: absolute;
  right: 18rpx;
  left: 18rpx;
  height: 1rpx;
  background: rgba(140, 153, 129, .17);
}

.metadata-rule-one { top: 60rpx; }
.metadata-rule-two { top: 106rpx; }
.metadata-rule-three { top: 152rpx; }

.metadata-field-footer {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 10rpx 5rpx 0;
  color: #9a8f7f;
  font-family: 'Kaiti SC', 'STKaiti', serif;
  font-size: 20rpx;
}

.metadata-sheet .detail-actions {
  margin-top: 28rpx;
}

</style>
