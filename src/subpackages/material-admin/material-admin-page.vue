<script setup lang="ts">
import type { MaterialDraft, MaterialGroup } from './lib/types'
import { computed, ref } from 'vue'
import { cloudPlantSvg } from '@/utils/flower/material-render'
import { localCatalog } from './lib/local-files'
import { localPreviewSource, svgParts, uploadStatus } from './lib/local-materials'
import { useMaterialAdminStore } from './lib/store'

definePage({ layout: 'default', style: { navigationBarTitleText: '素材管理' } })
const store = useMaterialAdminStore()
const groups = [{ key: 'all', name: '全部' }, { key: 'main', name: '主花' }, { key: 'filler', name: '配花' }, { key: 'foliage', name: '叶材' }, { key: 'vase', name: '花瓶' }, { key: 'bouquet', name: '花束包装' }, { key: 'background', name: '背景' }] as const
const group = ref<MaterialGroup | 'all' | 'vase' | 'bouquet' | 'background'>('all')
const materials = computed(() => localCatalog.items.filter(item => group.value === 'all' || (group.value === 'vase' || group.value === 'bouquet' || group.value === 'background' ? item.category === group.value : item.category === 'flower' && item.group === group.value)))
const selected = ref<MaterialDraft | null>(null)
const canDelete = computed(() => !!selected.value && !!store.remote?.some(item => item.id === selected.value!.id))
const failedMaterials = computed(() => localCatalog.items.filter(item => store.uploadFailures.some(failure => failure.id === item.id)))
const color = ref('')
const wholePreview = computed(() => {
  const item = selected.value
  if (!item || item.category !== 'flower' || item.group === 'foliage')
    return null
  try {
    const source = cloudPlantSvg({ ...item, category: 'flower', updatedAt: 0, assets: {}, paths: {} }, {
      stemHeight: 320,
      color: color.value,
    })
    return { source: localPreviewSource(source, color.value), error: '' }
  }
  catch (value) { return { source: '', error: value instanceof Error ? value.message : '整枝预览生成失败' } }
})
const failedPreviews = ref<string[]>([])
function previewFailed(key: string) {
  if (!failedPreviews.value.includes(key))
    failedPreviews.value.push(key)
}
function previewLoaded(key: string) { failedPreviews.value = failedPreviews.value.filter(value => value !== key) }
function open(item: MaterialDraft) { selected.value = item; color.value = item.colors[0]?.value || '#f4f0e6'; failedPreviews.value = [] }
function thumbnail(item: MaterialDraft) { return localPreviewSource(item.sources.flower || item.sources.foliage || item.sources.vase || item.sources.bouquet || item.sources.background || '', item.colors[0]?.value || '#f4f0e6') }
function groupName(key: MaterialGroup | 'vase' | 'bouquet' | 'background') { return groups.find(item => item.key === key)?.name }
async function removeSelected() {
  const item = selected.value
  if (!item || store.busy || !canDelete.value)
    return
  try {
    const result = await new Promise<UniApp.ShowModalRes>((resolve, reject) => uni.showModal({
      title: '删除云端素材',
      content: `确定从云端删除“${item.name}”吗？本地素材会保留，可再次上传。`,
      confirmText: '删除',
      confirmColor: '#b82b36',
      success: resolve,
      fail: reject,
    }))
    if (result.confirm)
      await store.remove(item)
  }
  catch { store.error = '无法打开删除确认，请重试' }
}
</script>

<template>
  <view class="admin-page">
    <view class="heading">
      <view class="app-section-title">
        本地素材
      </view><button class="refresh app-secondary-btn" :disabled="store.busy" @click="store.refresh">
        检查上传状态
      </button>
    </view>
    <button class="upload-all app-primary-btn" :disabled="store.busy || !localCatalog.items.length" @click="store.uploadAll(localCatalog.items)">
      全部上传
    </button>
    <view class="hint">
      先查看素材，满意后上传。未检查云端时显示“待检查”。
    </view>
    <view class="hint">
      全部上传包含所有分类，自动跳过已上传且没有更新的素材。
    </view>
    <view v-if="store.batchProgress" class="batch-status">
      <view class="status">
        上传进度 {{ store.batchProgress.completed }} / {{ store.batchProgress.total }} · 已跳过 {{ store.batchProgress.skipped }} 项
      </view>
      <progress :percent="store.batchProgress.total ? store.batchProgress.completed / store.batchProgress.total * 100 : 100" :stroke-width="4" activeColor="#849c81" backgroundColor="#e4e8de" />
      <view v-if="store.batchProgress.currentName" class="hint">
        正在上传：{{ store.batchProgress.currentName }}
      </view>
    </view>
    <view v-if="store.uploadFailures.length" class="batch-failures">
      <view class="error">
        以下 {{ store.uploadFailures.length }} 项上传失败
      </view>
      <view v-for="failure in store.uploadFailures" :key="failure.id" class="error">
        {{ failure.name }}：{{ failure.message }}
      </view>
      <button class="app-secondary-btn" :disabled="store.busy" @click="store.uploadAll(failedMaterials)">
        重试失败项
      </button>
    </view>
    <view class="catalog">
      <view class="categories">
        <view v-for="item in groups" :key="item.key" class="category" :class="{ active: group === item.key }" @click="group = item.key">
          {{ item.name }}<text class="count">
            {{ item.key === 'all' ? localCatalog.items.length : localCatalog.items.filter(row => item.key === 'vase' || item.key === 'bouquet' || item.key === 'background' ? row.category === item.key : row.category === 'flower' && row.group === item.key).length }}
          </text>
        </view>
      </view>
      <view class="materials">
        <view v-for="item in materials" :key="item.id" class="material-row" @click="open(item)">
          <image class="thumbnail" :src="thumbnail(item)" mode="aspectFit" />
          <view class="row-info">
            <view class="name">
              {{ item.name }}
            </view><view class="hint">
              {{ groupName(item.category !== 'flower' ? item.category! : item.group) }}{{ item.category !== 'flower' ? '' : ` · ${item.colors.length} 种颜色` }}
            </view><view class="status">
              {{ uploadStatus(item, store.remote) }}
            </view>
          </view><text>›</text>
        </view>
        <view v-if="!materials.length" class="empty">
          此分类暂无本地素材
        </view>
      </view>
    </view>
    <view v-for="issue in localCatalog.errors" :key="issue" class="error">
      {{ issue }}
    </view>
    <view v-if="store.error" class="error">
      {{ store.error }}
    </view><view v-if="store.message" class="status">
      {{ store.message }}
    </view>
    <view v-if="selected" class="overlay" @click="selected = null">
      <view class="detail" @click.stop>
        <view class="heading">
          <view class="app-section-title">
            {{ selected.name }}
          </view><button class="close" @click="selected = null">
            关闭
          </button>
        </view>
        <scroll-view scroll-y class="detail-body">
          <view class="status">
            {{ groupName(selected.category !== 'flower' ? selected.category! : selected.group) }} · {{ uploadStatus(selected, store.remote) }} · v{{ selected.version }}
          </view>
          <view class="label">
            介绍
          </view><view class="description">
            {{ selected.introduction }}
          </view>
          <view v-if="selected.category === 'flower'" class="label">
            花语
          </view><view class="description">
            {{ selected.flowerMeaning }}
          </view>
          <view v-if="selected.category === 'flower'" class="label">
            可选颜色
          </view><view class="colors">
            <view v-for="option in selected.colors" :key="option.value" class="color-option" :class="{ chosen: color === option.value }" @click="color = option.value">
              <view class="swatch" :style="{ background: option.value }" /><text>{{ option.name }}</text>
            </view>
          </view>
          <view v-if="wholePreview" class="whole-preview">
            <view class="whole-heading">
              <text class="label">
                整枝预览
              </text>
            </view>
            <image v-if="wholePreview.source" class="whole-image" :src="wholePreview.source" mode="aspectFit" @error="previewFailed('whole')" @load="previewLoaded('whole')" />
            <view v-if="wholePreview.error || failedPreviews.includes('whole')" class="error">
              {{ wholePreview.error || '整枝预览加载失败' }}
            </view>
          </view>
          <view class="previews">
            <template v-for="part in svgParts" :key="part.key">
              <view v-if="selected.sources[part.key]" class="preview-card">
                <view>{{ part.name }}</view><image class="preview-image" :src="localPreviewSource(selected.sources[part.key]!, color)" mode="aspectFit" @error="previewFailed(part.key)" @load="previewLoaded(part.key)" /><view v-if="failedPreviews.includes(part.key)" class="error">
                  SVG 预览加载失败
                </view>
              </view>
            </template>
          </view>
          <view class="hint">
            素材标识：{{ selected.id }}
          </view>
        </scroll-view>
        <view v-if="store.error" class="error">
          {{ store.error }}
        </view><view v-if="store.message" class="status">
          {{ store.message }}
        </view>
        <button class="app-primary-btn" :disabled="store.busy || uploadStatus(selected, store.remote) === '已上传'" @click="store.upload(selected)">
          {{ store.busy ? '处理中…' : uploadStatus(selected, store.remote) === '有更新' ? '上传本地更新' : uploadStatus(selected, store.remote) === '已上传' ? '已上传' : '上传当前素材' }}
        </button>
        <button class="delete-action" :disabled="store.busy || !canDelete" @click="removeSelected">
          删除云端素材
        </button>
        <view v-if="store.remote === null" class="hint">
          检查上传状态后可删除云端素材。
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page { padding: 24rpx; }
.upload-all { margin-top: 20rpx; }
.batch-status, .batch-failures { padding: 16rpx; margin: 16rpx 0; background: #edf0e8; border-radius: 12rpx; }
.delete-action { margin-top: 12rpx; color: #b82b36; background: #f7e9e7; font-size: 25rpx; }
.delete-action[disabled] { color: #a49a95; }
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
.whole-image { display: block; width: 100%; height: 460rpx; margin-top: 16rpx; }
</style>
