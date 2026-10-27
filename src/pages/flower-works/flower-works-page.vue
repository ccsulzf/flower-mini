<script setup lang="ts">
import type { SavedFlowerWorkSummary } from '@/models/flower-creation'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { useDevice } from '@/hooks/useDevice'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'

definePage({ layout: 'default', style: { navigationBarTitleText: '我的作品', navigationBarBackgroundColor: '#f6f3eb', backgroundColor: '#f6f3eb' } })
const works = useFlowerWorksStore()
const { deviceWidth } = useDevice()
const deletingId = ref('')
const copyingId = ref('')
const artworkScale = computed(() => {
  const width = deviceWidth.value
  const rpx = width / 750
  const cardWidth = (width - (56 + 8 + 22) * rpx) / 2 - 24 * rpx
  return Math.max(0.1, Math.min(1, cardWidth / studioMetrics.width))
})
onShow(() => {
  void works.load(true)
})
onReachBottom(() => {
  if (works.hasMore)
    void works.load()
})
function open(work: SavedFlowerWorkSummary) {
  if (!deletingId.value && !copyingId.value)
    uni.navigateTo({ url: `/pages/flower-detail/flower-detail-page?workId=${work.id}` })
}
function edit(work: SavedFlowerWorkSummary) {
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
async function copy(work: SavedFlowerWorkSummary) {
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
function remove(work: SavedFlowerWorkSummary) {
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
        await works.remove(work.id)
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
      <view class="works-heading-copy">
        <text class="works-kicker">MY FLOWER JOURNAL</text>
        <text class="works-subtitle">留住每一份花意</text>
      </view>
      <view class="heading-sprig" aria-hidden="true">
        <view class="sprig-stem" />
        <view class="sprig-leaf sprig-leaf-one" />
        <view class="sprig-leaf sprig-leaf-two" />
      </view>
      <button class="creation-button" hover-class="creation-button-pressed" @click="back">
        <view class="i-carbon-add" />
        <text>去插花</text>
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
      <view
        v-for="(work, index) in works.items"
        :key="work.id"
        class="work-card"
        :class="index % 2 ? 'work-card-even' : 'work-card-odd'"
      >
        <view class="work-tape" aria-hidden="true" />
        <view class="work-cover">
          <FlowerArtworkPreview :work-id="work.id" :scale="artworkScale" />
          <view class="work-cover-hitarea" @tap="open(work)" />
        </view>
        <view class="work-title" @click="open(work)">
          {{ work.title }}
        </view>
        <view class="work-title-line" aria-hidden="true" />
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
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 18% 8%, rgba(193, 171, 139, .07) 0 2rpx, transparent 3rpx),
    radial-gradient(circle at 72% 28%, rgba(193, 171, 139, .05) 0 2rpx, transparent 3rpx),
    #f8f3e9;
  background-size: 34rpx 34rpx, 46rpx 46rpx, auto;
  padding: 34rpx 28rpx calc(42rpx + env(safe-area-inset-bottom));
  color: #514a40;
}

.works-heading {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 88rpx;
  margin-bottom: 12rpx;
  padding: 8rpx 4rpx 14rpx;
}

.works-heading::after {
  position: absolute;
  right: 172rpx;
  bottom: 0;
  left: 4rpx;
  height: 12rpx;
  transform: rotate(-.8deg);
  border-top: 2rpx solid rgba(112, 91, 68, .48);
  border-radius: 50%;
  content: '';
}

.works-heading-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.works-kicker,
.works-subtitle {
  display: block;
}

.works-kicker {
  margin-bottom: 3rpx;
  color: #9b846b;
  font-family: Georgia, serif;
  font-size: 16rpx;
  letter-spacing: 2rpx;
}

.works-subtitle {
  color: #776b5d;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
  font-size: 22rpx;
}

.heading-sprig {
  position: relative;
  width: 44rpx;
  height: 66rpx;
  flex: none;
  transform: rotate(8deg);
}

.sprig-stem {
  position: absolute;
  top: 3rpx;
  left: 22rpx;
  width: 2rpx;
  height: 60rpx;
  background: #829178;
}

.sprig-leaf {
  position: absolute;
  width: 24rpx;
  height: 13rpx;
  border-radius: 100% 0 100% 0;
  background: #a4af91;
}

.sprig-leaf-one { top: 15rpx; left: 1rpx; transform: rotate(28deg); }
.sprig-leaf-two { top: 34rpx; right: 0; transform: rotate(-28deg) scaleX(-1); }

.works-heading button {
  display: flex;
  min-width: 142rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 7rpx;
  border-radius: 18rpx 12rpx 21rpx 14rpx;
  background: #e3e9d7;
  box-shadow: 4rpx 5rpx 0 rgba(105, 88, 68, .08);
  font-size: 23rpx;
  line-height: 66rpx;
  flex: none;
  margin-left: auto;
  transform: rotate(.7deg);
}

.works-heading button view { font-size: 25rpx; transform: rotate(-5deg); }
.creation-button-pressed { transform: translate(2rpx, 3rpx) rotate(.7deg) !important; opacity: .8; }

.creation-note {
  margin: 0 4rpx 28rpx;
  color: #8b7b69;
  font-size: 24rpx;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30rpx 22rpx;
  padding: 8rpx 4rpx 18rpx;
}

.work-card {
  position: relative;
  overflow: hidden;
  border: 2rpx solid rgba(113, 94, 70, .36);
  border-radius: 15rpx 23rpx 18rpx 27rpx;
  background: rgba(255, 253, 246, .94);
  box-shadow: 7rpx 10rpx 0 rgba(101, 83, 61, .055), 0 15rpx 28rpx rgba(88, 74, 55, .065);
  clip-path: polygon(.7% 1.5%, 98.8% .3%, 100% 97.5%, 96.8% 100%, 1.2% 98.7%, 0 3%);
}

.work-card-odd { transform: rotate(-.55deg); }
.work-card-even { transform: translateY(10rpx) rotate(.65deg); }

.work-tape {
  position: absolute;
  z-index: 4;
  top: -7rpx;
  left: 50%;
  width: 76rpx;
  height: 27rpx;
  transform: translateX(-50%) rotate(-4deg);
  background: rgba(228, 207, 175, .76);
  pointer-events: none;
}

.work-card-even .work-tape {
  transform: translateX(-50%) rotate(5deg);
  background: rgba(203, 210, 175, .76);
}

.work-cover {
  position: relative;
  height: 420rpx;
  margin: 12rpx 12rpx 0;
  overflow: hidden;
  border: 1rpx solid rgba(153, 138, 113, .17);
  border-radius: 10rpx 16rpx 12rpx 19rpx;
  background: #f2f0e7;
}

.work-cover-hitarea {
  position: absolute;
  z-index: 2;
  inset: 0;
  background: transparent;
}

.work-title {
  padding: 18rpx 18rpx 0;
  color: #5f5345;
  font-family: Georgia, 'Songti SC', 'STSong', serif;
  font-size: 27rpx;
  font-weight: 500;
  line-height: 1.5;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.work-title-line {
  width: 48%;
  height: 8rpx;
  margin: 4rpx 0 0 18rpx;
  transform: rotate(-1deg);
  border-top: 2rpx solid rgba(111, 91, 70, .38);
  border-radius: 50%;
}

.work-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 1rpx 16rpx 16rpx;
  gap: 6rpx;
  color: #8a7a68;
  font-size: 20rpx;
}

.work-actions {
  display: flex;
  width: 100%;
  justify-content: flex-end;
  gap: 10rpx;
  margin-top: 4rpx;
  border-top: 1rpx dashed rgba(119, 101, 78, .2);
  padding-top: 3rpx;
}

.work-edit,
.work-copy {
  margin: 0;
  padding: 0 10rpx;
  font-size: 24rpx;
  color: #6f7b66;
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

.work-edit:not([disabled]):active,
.work-copy:not([disabled]):active,
.work-delete:not([disabled]):active { opacity: .55; transform: translateY(2rpx); }

.work-delete::after {
  border: none;
}

.works-empty {
  margin: 38rpx 14rpx;
  padding: 92rpx 42rpx;
  transform: rotate(-.5deg);
  border: 2rpx dashed rgba(125, 109, 87, .28);
  background: rgba(255, 253, 246, .55);
  line-height: 1.8;
  text-align: center;
  font-size: 28rpx;
  color: #827665;
  font-family: 'Kaiti SC', 'STKaiti', 'Songti SC', serif;
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
