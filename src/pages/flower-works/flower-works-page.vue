<script setup lang="ts">
import type { SavedFlowerWork } from '@/models/flower-creation'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'

definePage({ layout: 'default', style: { navigationBarTitleText: '我的作品', navigationBarBackgroundColor: '#f6f3eb', backgroundColor: '#f6f3eb' } })
const works = useFlowerWorksStore()
const deletingId = ref('')
const copyingId = ref('')
onShow(() => {
  void works.load(true)
})
onReachBottom(() => {
  if (works.hasMore)
    void works.load()
})
function open(work: SavedFlowerWork) {
  if (!deletingId.value && !copyingId.value)
    uni.navigateTo({ url: `/pages/flower-detail/flower-detail-page?workId=${work.id}` })
}
function edit(work: SavedFlowerWork) {
  if (!deletingId.value && !copyingId.value)
    uni.navigateTo({ url: `/pages/flower-studio/flower-studio-page?workId=${work.id}&edit=1` })
}
function date(value: number) {
  const d = new Date(value)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
function back() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/flower-studio/flower-studio-page' }) })
}
async function copy(work: SavedFlowerWork) {
  if (copyingId.value || deletingId.value)
    return
  copyingId.value = work.id
  try {
    await works.duplicate(work.id)
    uni.showToast({ title: '已复制作品', icon: 'none' })
  }
  catch (error) {
    uni.showToast({ title: creationFailure(error), icon: 'none' })
  }
  finally {
    copyingId.value = ''
  }
}
function remove(work: SavedFlowerWork) {
  if (deletingId.value || copyingId.value)
    return
  uni.showModal({
    title: '删除作品',
    content: `确定删除“${work.title}”吗？删除后无法恢复。`,
    confirmText: '删除',
    success: async (result) => {
      if (!result.confirm)
        return
      deletingId.value = work.id
      try {
        await works.remove(work.id, work.revision)
        uni.showToast({ title: '作品已删除', icon: 'none' })
      }
      catch (error) {
        uni.showToast({ title: creationFailure(error), icon: 'none' })
      }
      finally {
        deletingId.value = ''
      }
    },
  })
}
</script>

<template>
  <view class="works-page">
    <view class="works-heading">
      <text class="works-subtitle">
        留住每一份花意
      </text><button class="creation-button" @click="back">
        去插花
      </button>
    </view>
    <view class="creation-note">
      每一份花意，都可以继续创作。
    </view>
    <view v-if="works.error" class="creation-error">
      {{ works.error }}<button class="creation-button" :disabled="works.loading" @click="works.load(true)">
        重试
      </button>
    </view>
    <view v-if="!works.items.length && !works.loading && !works.error" class="works-empty">
      还没有保存的作品。完成插花后，点击“保存作品”就能在这里找到。
    </view>
    <view class="works-grid">
      <view v-for="work in works.items" :key="work.id" class="work-card">
        <view class="work-cover">
          <FlowerArtworkPreview :artwork="work.draft.artwork" :scale="0.44" />
          <view class="work-cover-hitarea" @tap="open(work)" />
        </view>
        <view class="work-title" @click="open(work)">
          {{ work.title }}
        </view>
        <view class="work-meta">
          <text>{{ date(work.updatedAt) }}</text>
          <view class="work-actions">
            <button class="work-edit" :disabled="!!deletingId || !!copyingId" @click="edit(work)">
              编辑
            </button>
            <button class="work-copy" :disabled="!!deletingId || !!copyingId" @click="copy(work)">
              {{ copyingId === work.id ? '复制中' : '复制' }}
            </button>
            <button class="work-delete" :disabled="!!deletingId || !!copyingId" @click="remove(work)">
              {{ deletingId === work.id ? '删除中' : '删除' }}
            </button>
          </view>
        </view>
      </view>
    </view>
    <view v-if="works.loading" class="works-state">
      正在加载作品…
    </view>
    <button v-else-if="works.hasMore && works.items.length" class="creation-button load-more" @click="works.load()">
      加载更多
    </button>
    <view v-else-if="works.items.length" class="works-state">
      已经看完所有作品了
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-creation.scss';

.works-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #f6f3eb;
  padding: 30rpx 26rpx calc(30rpx + env(safe-area-inset-bottom));
  color: #3f463d;
}

.works-heading {
  display: flex;
  align-items: center;
  gap: 30rpx;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.works-heading button {
  min-width: 140rpx;
  line-height: 68rpx;
  font-size: 26rpx;
  flex: none;
  margin-left: auto;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22rpx;
}

.work-card {
  background: #fffdf7;
  border: 2rpx solid #e4e8dd;
  border-radius: 22rpx;
  overflow: hidden;
}

.work-cover {
  position: relative;
  height: 440rpx;
  background: #eeeee5;
}

.work-cover-hitarea {
  position: absolute;
  z-index: 2;
  inset: 0;
  background: transparent;
}

.work-title {
  padding: 18rpx 16rpx 8rpx;
  font-size: 28rpx;
  line-height: 1.5;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.work-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 16rpx 16rpx;
  gap: 6rpx;
  color: #7c8474;
  font-size: 22rpx;
}

.work-actions {
  display: flex;
  width: 100%;
  justify-content: flex-end;
  gap: 20rpx;
}

.work-edit,
.work-copy {
  margin: 0;
  padding: 0 10rpx;
  font-size: 24rpx;
  color: #74806b;
  background: transparent;
  line-height: 56rpx;
}

.work-edit {
  margin-right: auto;
}

.work-edit::after,
.work-copy::after {
  border: none;
}

.work-delete {
  margin: 0;
  padding: 0 10rpx;
  font-size: 22rpx;
  color: #995c50;
  background: transparent;
  line-height: 52rpx;
}

.work-delete::after {
  border: none;
}

.works-empty {
  padding: 100rpx 36rpx;
  line-height: 1.8;
  text-align: center;
  font-size: 28rpx;
  color: #7c8474;
}

.works-state {
  padding: 30rpx;
  text-align: center;
  color: #7c8474;
  font-size: 24rpx;
}

.load-more {
  margin-top: 30rpx;
}
</style>
