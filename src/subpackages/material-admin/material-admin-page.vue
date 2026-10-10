<script setup lang="ts">
import { computed, ref } from 'vue'
import { cloudPlantSvg } from '@/utils/flower/material-render'
import { localCatalog } from './lib/local-files'
import { localPreviewSource, svgParts, uploadStatus } from './lib/local-materials'
import { useMaterialAdminStore } from './lib/store'
import type { MaterialGroup, MaterialDraft } from './lib/types'

definePage({ layout: 'default', style: { navigationBarTitleText: '素材管理' } })
const store = useMaterialAdminStore()
const groups = [{ key: 'all', name: '全部' }, { key: 'main', name: '主花' }, { key: 'filler', name: '配花' }, { key: 'foliage', name: '叶材' }, { key: 'vase', name: '花瓶' }, { key: 'bouquet', name: '花束包装' }] as const
const group = ref<MaterialGroup | 'all' | 'vase' | 'bouquet'>('all')
const materials = computed(() => localCatalog.items.filter(item => group.value === 'all' || (group.value === 'vase' || group.value === 'bouquet' ? item.category === group.value : item.category === 'flower' && item.group === group.value)))
const selected = ref<MaterialDraft | null>(null)
const color = ref('')
const leafMode = ref<'with' | 'without'>('with')
const wholePreview = computed(() => {
  const item = selected.value
  if (!item || item.category !== 'flower' || item.group === 'foliage') return null
  try {
    const source = cloudPlantSvg({ ...item, category: 'flower', assets: {}, paths: {} }, {
      id: 0, kind: 'rose', x: 55, y: 375, angle: 0, flowerScale: 1, stemHeight: 320, color: color.value, leafMode: leafMode.value,
    })
    return { source: localPreviewSource(source, color.value), error: '' }
  } catch (value) { return { source: '', error: value instanceof Error ? value.message : '整枝预览生成失败' } }
})
const failedPreviews = ref<string[]>([])
function previewFailed(key: string) { if (!failedPreviews.value.includes(key)) failedPreviews.value.push(key) }
function previewLoaded(key: string) { failedPreviews.value = failedPreviews.value.filter(value => value !== key) }
function open(item: MaterialDraft) { selected.value = item; leafMode.value = 'with'; color.value = item.colors[0]?.value || '#f4f0e6'; failedPreviews.value = [] }
function thumbnail(item: MaterialDraft) { return localPreviewSource(item.sources.flower || item.sources.foliage || item.sources.vase || item.sources.bouquet || '', item.colors[0]?.value || '#f4f0e6') }
function groupName(key: MaterialGroup | 'vase' | 'bouquet') { return groups.find(item => item.key === key)?.name }
</script>

<template>
  <view class="admin-page">
    <view class="heading"><view class="app-section-title">本地素材</view><button class="app-secondary-btn refresh" :disabled="store.busy" @click="store.refresh">检查上传状态</button></view>
    <view class="hint">先查看素材，满意后上传。未检查云端时显示“待检查”。</view>
    <view class="catalog">
      <view class="categories"><view v-for="item in groups" :key="item.key" class="category" :class="{ active: group === item.key }" @click="group = item.key">{{ item.name }}<text class="count">{{ item.key === 'all' ? localCatalog.items.length : localCatalog.items.filter(row => item.key === 'vase' || item.key === 'bouquet' ? row.category === item.key : row.category === 'flower' && row.group === item.key).length }}</text></view></view>
      <view class="materials">
        <view v-for="item in materials" :key="item.id" class="material-row" @click="open(item)">
          <image class="thumbnail" :src="thumbnail(item)" mode="aspectFit" />
          <view class="row-info"><view class="name">{{ item.name }}</view><view class="hint">{{ groupName(item.category !== 'flower' ? item.category! : item.group) }}{{ item.category !== 'flower' ? '' : ` · ${item.colors.length} 种颜色` }}</view><view class="status">{{ uploadStatus(item, store.remote) }}</view></view><text>›</text>
        </view>
        <view v-if="!materials.length" class="empty">此分类暂无本地素材</view>
      </view>
    </view>
    <view v-for="issue in localCatalog.errors" :key="issue" class="error">{{ issue }}</view>
    <view v-if="store.error" class="error">{{ store.error }}</view><view v-if="store.message" class="status">{{ store.message }}</view>
    <view v-if="selected" class="overlay" @click="selected = null">
      <view class="detail" @click.stop>
        <view class="heading"><view class="app-section-title">{{ selected.name }}</view><button class="close" @click="selected = null">关闭</button></view>
        <scroll-view scroll-y class="detail-body">
          <view class="status">{{ groupName(selected.category !== 'flower' ? selected.category! : selected.group) }} · {{ uploadStatus(selected, store.remote) }} · v{{ selected.version }}</view>
          <view class="label">介绍</view><view class="description">{{ selected.introduction }}</view>
          <view v-if="selected.category === 'flower'" class="label">花语</view><view class="description">{{ selected.flowerMeaning }}</view>
          <view v-if="selected.category === 'flower'" class="label">可选颜色</view><view class="colors"><view v-for="option in selected.colors" :key="option.value" class="color-option" :class="{ chosen: color === option.value }" @click="color = option.value"><view class="swatch" :style="{ background: option.value }" /><text>{{ option.name }}</text></view></view>
          <view v-if="wholePreview" class="whole-preview">
            <view class="whole-heading"><text class="label">整枝预览</text><view class="leaf-options"><button :class="{ picked: leafMode === 'with' }" @click="leafMode = 'with'">带叶</button><button :class="{ picked: leafMode === 'without' }" @click="leafMode = 'without'">去叶</button></view></view>
            <image v-if="wholePreview.source" class="whole-image" :src="wholePreview.source" mode="aspectFit" @error="previewFailed('whole')" @load="previewLoaded('whole')" />
            <view v-if="wholePreview.error || failedPreviews.includes('whole')" class="error">{{ wholePreview.error || '整枝预览加载失败' }}</view>
          </view>
          <view class="previews"><template v-for="part in svgParts" :key="part.key"><view v-if="selected.sources[part.key]" class="preview-card"><view>{{ part.name }}</view><image class="preview-image" :src="localPreviewSource(selected.sources[part.key]!, color)" mode="aspectFit" @error="previewFailed(part.key)" @load="previewLoaded(part.key)" /><view v-if="failedPreviews.includes(part.key)" class="error">SVG 预览加载失败</view></view></template></view>
          <view class="hint">素材标识：{{ selected.id }}</view>
        </scroll-view>
        <view v-if="store.error" class="error">{{ store.error }}</view><view v-if="store.message" class="status">{{ store.message }}</view>
        <button class="app-primary-btn" :disabled="store.busy || uploadStatus(selected, store.remote) === '已上传'" @click="store.upload(selected)">{{ store.busy ? '处理中…' : uploadStatus(selected, store.remote) === '有更新' ? '上传本地更新' : uploadStatus(selected, store.remote) === '已上传' ? '已上传' : '上传当前素材' }}</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page { padding: 24rpx; }
.heading { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.refresh, .close { font-size: 24rpx; margin: 0; padding: 0 18rpx; }
.hint { font-size: 23rpx; color: #7b8276; line-height: 1.6; margin: 12rpx 0; }
.catalog { display: flex; margin-top: 24rpx; min-height: 70vh; background: #fff; border-radius: 20rpx; overflow: hidden; }
.categories { width: 140rpx; flex-shrink: 0; background: #edf0e8; }
.category { padding: 28rpx 16rpx; font-size: 26rpx; }
.category.active { background: #fff; color: #456344; font-weight: 600; border-left: 6rpx solid #849c81; }
.count { display: block; font-size: 22rpx; color: #7b8276; margin-top: 4rpx; }
.materials { flex: 1; min-width: 0; padding: 0 16rpx; }
.material-row { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 0; border-bottom: 1rpx solid #e4e8de; }
.thumbnail { width: 100rpx; height: 120rpx; flex-shrink: 0; background: #f6f3eb; border-radius: 12rpx; }
.row-info { flex: 1; min-width: 0; }.name { font-size: 28rpx; font-weight: 600; overflow-wrap: anywhere; }
.status { font-size: 24rpx; color: #456344; margin: 12rpx 0; }.error { font-size: 24rpx; color: #b82b36; margin: 12rpx 0; overflow-wrap: anywhere; }
.empty { padding: 40rpx 0; color: #7b8276; font-size: 25rpx; }
.overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; padding: 24rpx; }
.detail { width: 100%; max-height: 90vh; box-sizing: border-box; background: #f6f3eb; border-radius: 24rpx; padding: 24rpx; }
.detail-body { height: 62vh; margin: 16rpx 0; }.label { font-size: 26rpx; font-weight: 600; margin-top: 24rpx; }.description { font-size: 26rpx; line-height: 1.7; margin-top: 8rpx; }
.colors { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }.color-option { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 12rpx; border: 2rpx solid transparent; border-radius: 12rpx; font-size: 24rpx; }.chosen { border-color: #849c81; }.swatch { width: 30rpx; height: 30rpx; border-radius: 50%; border: 1rpx solid #aaa; }
.previews { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 24rpx; }.preview-card { flex: 1; min-width: 140rpx; padding: 16rpx 8rpx; background: #fff; text-align: center; border-radius: 16rpx; font-size: 24rpx; }.preview-image { width: 100%; height: 300rpx; margin-top: 16rpx; }
.whole-preview { margin-top: 24rpx; padding: 18rpx; background: #fff; border-radius: 16rpx; }
.whole-heading { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }.whole-heading .label { margin-top: 0; }
.leaf-options { display: flex; gap: 6rpx; padding: 4rpx; background: #edf0e8; border-radius: 12rpx; }.leaf-options button { margin: 0; padding: 0 20rpx; height: 54rpx; line-height: 54rpx; font-size: 24rpx; color: #7b8276; background: transparent; border-radius: 10rpx; }.leaf-options button::after { border: none; }.leaf-options .picked { color: #456344; background: #dce6d3; }
.whole-image { display: block; width: 100%; height: 460rpx; margin-top: 16rpx; }
</style>
