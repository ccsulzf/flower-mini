<script setup lang="ts">
import type { Artwork, MaterialGroup } from '@/models/artwork'
import { computed, ref, watch } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { materialThumbnailSource } from '@/utils/flower/material-thumbnail'
import { renderCloudMaterialList } from '@/utils/flower/cloud-material-list-renderer'

const props = defineProps<{ visible: boolean, artwork?: Artwork, loading?: boolean, error?: string }>()
const emit = defineEmits<{ close: [] }>()
const catalog = useFlowerCatalogStore()
const catalogLoading = ref(false)
const sharing = ref(false)
const groups: { id: MaterialGroup, title: string }[] = [
  { id: 'main', title: '主花' },
  { id: 'filler', title: '配花' },
  { id: 'foliage', title: '叶材' },
]
const rows = computed(() => {
  const counts = new Map<string, { id: string, name: string, group: MaterialGroup, color: string, count: number }>()
  for (const instance of props.artwork?.materials || []) {
    const row = counts.get(instance.materialId)
    if (row) {
      row.count++
      continue
    }
    counts.set(instance.materialId, {
      id: instance.materialId,
      name: catalog.materials.find(item => item.id === instance.materialId)?.name || '未命名花材',
      group: instance.group,
      color: instance.color,
      count: 1,
    })
  }
  return groups.map(group => ({ ...group, items: [...counts.values()].filter(item => item.group === group.id) })).filter(group => group.items.length)
})
const stemCount = computed(() => props.artwork?.materials.length || 0)
const itemCount = computed(() => rows.value.reduce((sum, group) => sum + group.items.length, 0))

function thumbnail(id: string, color: string) {
  return materialThumbnailSource(catalog.get(id), { color })
}

function failMessage(value: unknown) {
  return value instanceof Error ? value.message : '图片生成失败，请重试'
}

async function shareListImage() {
  if (!props.artwork || sharing.value || props.loading || catalogLoading.value || props.error)
    return
  sharing.value = true
  emit('close')
  try {
    const file = await renderCloudMaterialList(props.artwork)
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.showShareImageMenu === 'function' && wx.canIUse('showShareImageMenu')) {
      wx.showShareImageMenu({ path: file, fail: () => uni.showToast({ title: '分享失败，请重试', icon: 'none' }) })
      return
    }
    // #endif
    uni.previewImage({ urls: [file], current: file })
  }
  catch (value) {
    uni.showToast({ title: failMessage(value), icon: 'none' })
  }
  finally {
    sharing.value = false
  }
}

watch(() => props.visible ? props.artwork?.materials.map(item => item.materialId).join('|') || '' : '', async (materialIds) => {
  if (!materialIds || catalogLoading.value)
    return
  catalogLoading.value = true
  try {
    if (!catalog.loaded)
      await catalog.load()
    const ids = [...new Set(materialIds.split('|'))]
    await Promise.all(ids.map(id => catalog.ensure(id).catch(() => undefined)))
  }
  finally { catalogLoading.value = false }
}, { immediate: true })
</script>

<template>
  <view v-if="visible" class="material-list-overlay" @click="!sharing && emit('close')">
    <view class="material-list-sheet" @click.stop>
      <view class="list-tape" aria-hidden="true" />
      <view class="list-heading">
        <view><text class="list-title">花材清单</text></view>
        <text class="list-summary">共 {{ stemCount }} 枝 · {{ itemCount }} 种</text>
      </view>

      <view v-if="loading || catalogLoading" class="list-state">正在整理花材…</view>
      <view v-else-if="error" class="list-state">{{ error }}</view>
      <view v-else-if="!stemCount" class="list-state">这束花还没有添加花材</view>
      <scroll-view v-else scroll-y :show-scrollbar="false" class="list-scroll">
        <view v-for="group in rows" :key="group.id" class="list-group">
          <text class="group-title">{{ group.title }}</text>
          <view v-for="item in group.items" :key="item.id" class="list-row">
            <view class="list-material">
              <image v-if="thumbnail(item.id, item.color)" class="material-thumbnail" :src="thumbnail(item.id, item.color)" mode="aspectFit" />
              <view v-else class="material-thumbnail-fallback i-carbon-sprout" />
              <text>{{ item.name }}</text>
            </view>
            <text class="item-count">× {{ item.count }}</text>
          </view>
        </view>
      </scroll-view>
      <button class="list-share" :disabled="sharing || loading || catalogLoading || !artwork || !!error || !stemCount"
        @click="shareListImage">
        <view class="i-carbon-share" />生成图片并分享
      </button>
    </view>
  </view>
  <view v-if="sharing" class="render-backdrop" aria-live="polite" @click.stop>
    <view class="render-dialog">
      <view class="render-flower" aria-hidden="true">
        <view class="i-carbon-sprout" />
      </view>
      <text class="render-title">正在生成花材清单</text>
      <view class="render-dots" aria-hidden="true">
        <view />
        <view />
        <view />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.material-list-overlay {
  position: fixed;
  z-index: 40;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  box-sizing: border-box;
  padding: 30rpx;
  background: rgba(var(--app-ink-rgb), .34)
}

.material-list-sheet {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 72vh;
  flex-direction: column;
  box-sizing: border-box;
  padding: 34rpx 34rpx calc(30rpx + env(safe-area-inset-bottom));
  border: 2rpx solid rgba(var(--app-ink-rgb), .22);
  border-radius: 24rpx 18rpx 28rpx 20rpx;
  background: var(--app-surface);
  box-shadow: 6rpx 8rpx 0 rgba(var(--app-ink-rgb), .12);
  color: var(--app-ink)
}

.list-tape {
  position: absolute;
  top: -14rpx;
  left: 54rpx;
  width: 104rpx;
  height: 30rpx;
  transform: rotate(-6deg);
  background: rgba(var(--app-sage-rgb), .8)
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between

}

.list-heading>view {
  display: flex;
  flex-direction: column;
  gap: 6rpx
}

.list-kicker {
  color: var(--app-inkMuted);
  font-size: 19rpx;
  letter-spacing: 3rpx
}

.list-title {
  font-family: serif;
  font-size: 36rpx;
  color: var(--app-brandStrong)
}

.list-close {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(var(--app-ink-rgb), .22);
  border-radius: 45% 55% 48% 52%;
  background: var(--app-page);
  color: var(--app-inkMuted)
}

.list-summary {
  margin-top: 18rpx;
  color: var(--app-inkMuted);
  font-size: 23rpx
}

.list-scroll {
  min-height: 100rpx;
  max-height: 40vh;
  margin-top: 18rpx
}

.list-scroll ::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  color: transparent
}

.list-scroll {
  scrollbar-width: none
}

.list-group {
  margin-bottom: 18rpx
}

.group-title {
  display: block;
  padding: 8rpx 0;
  border-bottom: 1rpx dashed rgba(var(--app-ink-rgb), .2);
  color: var(--app-brandStrong);
  font-size: 23rpx
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 4rpx 12rpx;
  font-size: 27rpx
}

.list-material {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16rpx
}

.material-thumbnail,
.material-thumbnail-fallback {
  display: block;
  width: 62rpx;
  height: 62rpx;
  flex: 0 0 62rpx
}

.material-thumbnail-fallback {
  box-sizing: border-box;
  padding: 14rpx;
  border-radius: 50%;
  background: rgba(var(--app-sageSoft-rgb), .62);
  color: var(--app-brandStrong);
  font-size: 32rpx
}

.item-count {
  color: var(--app-inkMuted);
  font-size: 24rpx
}

.list-state {
  padding: 46rpx 0;
  color: var(--app-inkMuted);
  font-size: 25rpx;
  text-align: center
}

.list-share {
  display: flex;
  height: 78rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 12rpx;
  border: 1rpx solid rgba(var(--app-ink-rgb), .52);
  border-radius: 16rpx 12rpx 18rpx 14rpx;
  background: var(--app-sageSoft);
  color: var(--app-brandStrong);
  font-size: 26rpx
}

.list-share[disabled] {
  opacity: .5
}

.render-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 41;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
  background: rgba(var(--app-ink-rgb), .32);
  animation: render-backdrop-in .2s ease-out both;
}

.render-dialog {
  position: relative;
  display: flex;
  width: 430rpx;
  min-height: 300rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 46rpx 42rpx 40rpx;
  border: 2rpx solid rgba(var(--app-ink-rgb), .34);
  border-radius: 20rpx 28rpx 18rpx 25rpx;
  background:
    radial-gradient(circle at 18% 20%, rgba(var(--app-danger-rgb), .08) 0 1rpx, transparent 2rpx),
    var(--app-surface);
  background-size: 30rpx 30rpx, auto;
  box-shadow: 8rpx 11rpx 0 rgba(var(--app-ink-rgb), .09), 0 24rpx 60rpx rgba(var(--app-ink-rgb), .15);
  animation: render-dialog-in .32s cubic-bezier(.2, .8, .25, 1.1) both;
}

.render-dialog::before {
  position: absolute;
  top: -13rpx;
  left: 50%;
  width: 112rpx;
  height: 27rpx;
  background: rgba(var(--app-line-rgb), .78);
  content: '';
  transform: translateX(-50%) rotate(-2deg);
}

.render-flower {
  display: flex;
  width: 78rpx;
  height: 78rpx;
  align-items: center;
  justify-content: center;
  margin-bottom: 22rpx;
  color: var(--app-sage);
  font-size: 62rpx;
  animation: render-flower-turn 2.2s ease-in-out infinite;
}

.render-title {
  color: var(--app-ink);
  font-family: 'Kaiti SC', 'STKaiti', serif;
  font-size: 31rpx;
  line-height: 1.4;
}

.render-note {
  margin-top: 11rpx;
  color: var(--app-inkMuted);
  font-size: 22rpx;
  line-height: 1.5;
}

.render-dots {
  display: flex;
  gap: 13rpx;
  margin-top: 25rpx;
}

.render-dots view {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: var(--app-subtle);
  animation: render-dot-bounce .9s ease-in-out infinite;
}

.render-dots view:nth-child(2) { animation-delay: .15s; }
.render-dots view:nth-child(3) { animation-delay: .3s; }

@keyframes render-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes render-dialog-in {
  from { opacity: 0; transform: translateY(24rpx) scale(.96) rotate(-.5deg); }
  to { opacity: 1; transform: translateY(0) scale(1) rotate(.2deg); }
}

@keyframes render-flower-turn {
  0%, 100% { transform: rotate(-7deg) scale(.96); }
  50% { transform: rotate(9deg) scale(1.04); }
}

@keyframes render-dot-bounce {
  0%, 60%, 100% { opacity: .35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-7rpx); }
}

</style>
