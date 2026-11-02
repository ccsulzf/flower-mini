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
  <view v-if="visible" class="material-list-overlay" @click="emit('close')">
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
        <view class="i-carbon-share" />{{ sharing ? '正在生成图片…' : '生成图片并分享' }}
      </button>
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
  background: rgba(63, 55, 45, .34)
}

.material-list-sheet {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 72vh;
  flex-direction: column;
  box-sizing: border-box;
  padding: 34rpx 34rpx calc(30rpx + env(safe-area-inset-bottom));
  border: 2rpx solid rgba(112, 91, 68, .22);
  border-radius: 24rpx 18rpx 28rpx 20rpx;
  background: #fffaf0;
  box-shadow: 6rpx 8rpx 0 rgba(143, 124, 95, .12);
  color: #514a40
}

.list-tape {
  position: absolute;
  top: -14rpx;
  left: 54rpx;
  width: 104rpx;
  height: 30rpx;
  transform: rotate(-6deg);
  background: rgba(203, 210, 175, .8)
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
  color: #8b806e;
  font-size: 19rpx;
  letter-spacing: 3rpx
}

.list-title {
  font-family: serif;
  font-size: 36rpx;
  color: #4f594b
}

.list-close {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(112, 91, 68, .22);
  border-radius: 45% 55% 48% 52%;
  background: #f7f1e5;
  color: #756b5d
}

.list-summary {
  margin-top: 18rpx;
  color: #817665;
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
  border-bottom: 1rpx dashed rgba(112, 91, 68, .2);
  color: #728066;
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
  background: rgba(226, 233, 216, .62);
  color: #728066;
  font-size: 32rpx
}

.item-count {
  color: #817665;
  font-size: 24rpx
}

.list-state {
  padding: 46rpx 0;
  color: #817665;
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
  border: 1rpx solid rgba(91, 74, 57, .52);
  border-radius: 16rpx 12rpx 18rpx 14rpx;
  background: #e3e9d7;
  color: #4f594b;
  font-size: 26rpx
}

.list-share[disabled] {
  opacity: .5
}

</style>
