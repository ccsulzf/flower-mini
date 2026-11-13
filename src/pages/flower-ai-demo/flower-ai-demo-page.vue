<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import type { FlowerAiResult } from '@/api/flower-ai'
import { computed, ref } from 'vue'
import { optimizeFlower, probeFlowerAi } from '@/api/flower-ai'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { parseArtwork } from '@/utils/flower/artwork'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { exampleJson } from '@/pages/flower-json/example'
import { createComplexArtwork } from './complex-example'

definePage({ layout: 'default', style: { navigationBarTitleText: 'AI 花束调试', navigationBarBackgroundColor: '#f6f3eb' } })

function createCrowdedArtwork() {
  const value = parseArtwork(exampleJson)
  value.materials = value.materials.slice(0, 6).map(item => ({
    ...item,
    transform: { ...item.transform, anchor: { x: 350, y: 747 }, angle: 0, height: 360, scale: 1 },
  }))
  return value
}

const input = ref('')
const inputSummary = computed(() => {
  try {
    const value = parseArtwork(input.value)
    const overlapping = value.materials.length > 1 && value.materials.every(item =>
      item.transform.anchor.x === 350 && item.transform.anchor.y === 747
      && item.transform.angle === 0 && item.transform.height === 360)
    const leafCount = value.materials.filter(item => item.group === 'foliage').length
    return `当前输入：${value.materials.length} 枝（花材 ${value.materials.length - leafCount}，叶材 ${leafCount}）${overlapping ? '，花头全部重叠，适合验证优化效果' : ''}`
  }
  catch { return '当前输入：JSON 尚未通过校验' }
})
const original = ref<Artwork | null>(null)
const optimized = ref<Artwork | null>(null)
const result = ref<FlowerAiResult | null>(null)
const busy = ref(false)
const error = ref('')
const probeDetails = ref('')
const showingOriginal = ref(false)
const sourceStore = useCreationArtworkStore()
const preview = computed(() => showingOriginal.value ? original.value : optimized.value || original.value)
const changeSummary = computed(() => {
  if (!result.value?.valid || !original.value) return ''
  if (!optimized.value) return 'AI 认为无需调整，保留原样。'
  const byId = new Map(original.value.materials.map(item => [item.id, item]))
  const moved = optimized.value.materials.filter(item => {
    const before = byId.get(item.id)?.transform
    const after = item.transform
    return !before || before.anchor.x !== after.anchor.x || before.anchor.y !== after.anchor.y
      || before.angle !== after.angle || before.height !== after.height || before.scale !== after.scale
  }).length
  const reordered = original.value.materials.some((item, index) => item.id !== optimized.value?.materials[index]?.id)
  const recolored = optimized.value.materials.filter(item => item.color.toLowerCase() !== byId.get(item.id)?.color.toLowerCase()).length
  const colorNote = recolored ? `已调整 ${recolored} 枝花叶的配色。` : ''
  if (!moved && reordered) return `${colorNote}已调整前后层次；位置、角度和大小均未改变。`
  if (!moved) return colorNote || '实际构图未发生变化，保留原样。'
  return `${colorNote}已调整 ${moved} 枝花材的位置、角度或大小${reordered ? '，并调整了前后层次' : ''}。可切换原作对比。`
})
const details = computed(() => result.value ? JSON.stringify({
  promptVersion: result.value.debug.promptVersion,
  plan: result.value.debug.plan,
  model: result.value.debug.model,
  responseId: result.value.debug.responseId,
  elapsedMs: result.value.debug.elapsedMs,
  usage: result.value.debug.usage,
  mouth: result.value.debug.mouth,
  valid: result.value.valid,
  validationError: result.value.validationError,
}, null, 2) : '')
// 调试页内复用结果，撤销或切换预览均不会再请求模型。
const cache = new Map<string, FlowerAiResult>()
const previewScale = Math.max(0.1, (uni.getSystemInfoSync().windowWidth - 32) / 698)

function loadExample(count: number) {
  if (busy.value) return
  const value = parseArtwork(exampleJson)
  value.materials = value.materials.slice(0, count)
  input.value = JSON.stringify(value, null, 2)
  resetPreview()
}
function loadCrowdedExample() {
  if (busy.value) return
  input.value = JSON.stringify(createCrowdedArtwork(), null, 2)
  resetPreview()
}
function loadComplexExample() {
  if (busy.value) return
  input.value = JSON.stringify(createComplexArtwork(), null, 2)
  previewInput()
}
function resetPreview() {
  original.value = null
  optimized.value = null
  result.value = null
  error.value = ''
  showingOriginal.value = false
}
async function copyCurrent() {
  if (busy.value) return
  try {
    await waitForAppAuthReady()
    const value = parseArtwork(JSON.stringify(sourceStore.snapshot()))
    if (!value.materials.length) throw new Error('当前创作台没有花材，请先插花或载入示例')
    input.value = JSON.stringify(value, null, 2)
    resetPreview()
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '复制当前作品失败' }
}
function prepare() {
  const value = parseArtwork(input.value)
  if (!value.materials.length || value.materials.length > 48) throw new Error('调试支持 1 至 48 枝花材')
  original.value = value
  optimized.value = null
  result.value = null
  showingOriginal.value = false
  return value
}
function previewInput() {
  error.value = ''
  try { prepare() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '作品数据无效' }
}
async function run(force = false) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await waitForAppAuthReady()
    const source = prepare()
    const key = JSON.stringify(source)
    const response = !force && cache.has(key) ? cache.get(key)! : await optimizeFlower(source)
    result.value = response
    if (!response.valid || !response.optimization) throw new Error(response.validationError || '模型结果未通过校验')
    cache.set(key, response)
    if (!response.optimization.changed) return
    const next = parseArtwork(key)
    const adjustments = new Map(response.optimization.adjustments.map(item => [item.id, item]))
    const instances = new Map(next.materials.map(item => [item.id, item]))
    next.materials = response.optimization.orderedIds.map((id) => {
      const item = instances.get(id)
      const adjustment = adjustments.get(id)
      if (!item || !adjustment) throw new Error('模型结果中的实例 ID 无效')
      return { ...item, color: adjustment.color, transform: { ...item.transform, anchor: { ...adjustment.anchor },
        angle: adjustment.angle, height: adjustment.height, scale: adjustment.scale } }
    })
    // 清除当前花器的旧布局，避免后续换花器再换回来时恢复旧构图。
    delete next.containerLayouts[next.container.materialId]
    optimized.value = parseArtwork(JSON.stringify(next))
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'AI 请求失败' }
  finally { busy.value = false }
}
async function probe() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  probeDetails.value = ''
  try { probeDetails.value = JSON.stringify(await probeFlowerAi(), null, 2) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '最小请求失败' }
  finally { busy.value = false }
}
function copyOutput() {
  const text = result.value ? JSON.stringify({ result: result.value, artwork: optimized.value || original.value }, null, 2) : input.value
  uni.setClipboardData({ data: text })
}
</script>

<template>
  <view class="demo-page">
    <text class="title">请 AI 整理一束花</text>
    <text class="note">AI 调整花叶位置、大小、层次与配色，程序校验边界。保留全部花叶和花器；结果仅在此页预览，不保存到你的作品。</text>
    <view class="tools">
      <button :disabled="busy" @click="loadExample(1)">单枝</button>
      <button :disabled="busy" @click="loadExample(3)">三枝</button>
      <button :disabled="busy" @click="loadExample(12)">完整示例</button>
      <button :disabled="busy" @click="loadCrowdedExample">拥挤示例</button>
      <button :disabled="busy" @click="loadComplexExample">40 枝花叶示例</button>
      <button :disabled="busy" @click="copyCurrent">复制创作台</button>
    </view>
    <text class="note">{{ inputSummary }}</text>
    <textarea v-model="input" class="json-input" :disabled="busy" :maxlength="65536" :auto-height="false" placeholder="粘贴作品 JSON" />
    <view class="tools">
      <button :disabled="busy" @click="previewInput">预览原作</button>
      <button :disabled="busy" :loading="busy" class="primary" @click="run(false)">{{ busy ? '正在整理…' : 'AI 优化' }}</button>
    </view>
    <text v-if="error" class="error">{{ error }}</text>
    <text v-if="changeSummary" class="note">{{ changeSummary }}</text>
    <text v-if="result?.optimization?.reason" class="note">AI 构图判断：{{ result.optimization.reason }}</text>
    <text v-if="result?.optimization?.boundaryAdjustedIds?.length" class="note">已将 {{ result.optimization.boundaryAdjustedIds.length }} 枝花叶的目标位置收回可编辑的安全范围。</text>
    <view v-if="original" class="preview-area">
      <view class="tools">
        <button :disabled="!optimized" @click="showingOriginal = !showingOriginal">{{ showingOriginal ? '重新应用优化' : '撤销 · 看原作' }}</button>
        <text>{{ optimized && !showingOriginal ? '优化后' : '原作' }}</text>
      </view>
      <view class="preview" :style="{ height: `${1000 * previewScale}px` }">
        <FlowerArtworkPreview v-if="preview" :artwork="preview" :scale="previewScale" />
      </view>
    </view>
    <view class="debug">
      <text class="subtitle">调试信息</text>
      <text class="note">本地或云端配置 DeepSeek 官方 DEEPSEEK_API_KEY，模型默认 deepseek-flash，可通过 DEEPSEEK_MODEL 修改。同一作品优先复用本页缓存；“重新请求”会再次消耗接口额度。</text>
      <view class="tools">
        <button :disabled="busy" @click="probe">最小请求检查</button>
        <button :disabled="busy || !result" @click="run(true)">重新请求模型</button>
        <button :disabled="busy" @click="copyOutput">复制调试数据</button>
      </view>
      <text v-if="probeDetails" class="code" selectable>{{ probeDetails }}</text>
      <text v-if="details" class="code" selectable>{{ details }}</text>
      <text v-if="result" class="subtitle">模型目标坐标与配色原文</text>
      <text v-if="result" class="code" selectable>{{ result.debug.rawText || '没有文本输出' }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.demo-page { min-height: 100vh; padding: 32rpx 16px 60rpx; box-sizing: border-box; background: #f6f3eb; color: #655c50; }
.title { display: block; font-family: STSong, SimSun, serif; font-size: 38rpx; }
.note { display: block; margin: 20rpx 0; font-size: 24rpx; line-height: 1.7; color: #817767; }
.tools { display: flex; align-items: center; flex-wrap: wrap; gap: 16rpx; margin: 24rpx 0; font-size: 25rpx; }
button { margin: 0; padding: 0 22rpx; min-height: 72rpx; line-height: 72rpx; border: 1rpx solid #c5c6b2; border-radius: 12rpx 20rpx 15rpx 9rpx; background: #eeeddf; color: #59634e; font-size: 24rpx; }
button::after { border: none; }
button[disabled] { opacity: .5; color: #655c50; }
.primary { background: #dfe6d5; border-radius: 20rpx 11rpx 16rpx 13rpx; box-shadow: 3rpx 4rpx 0 #d4d4c5; }
.json-input { width: 100%; height: 320rpx; padding: 20rpx; box-sizing: border-box; border: 1rpx solid #d8d2c4; background: #fffcf4; font-family: monospace; font-size: 23rpx; line-height: 1.6; }
.error { display: block; color: #a44f4a; font-size: 25rpx; line-height: 1.7; }
.preview { position: relative; width: 100%; overflow: hidden; border: 1rpx solid #ddd7c9; box-sizing: border-box; }
.debug { margin-top: 36rpx; padding-top: 28rpx; border-top: 1rpx dashed #cfc7b6; }
.subtitle { display: block; margin: 20rpx 0; font-size: 28rpx; }
.code { display: block; white-space: pre-wrap; overflow-wrap: anywhere; font-family: monospace; font-size: 22rpx; line-height: 1.6; padding: 20rpx; background: #fffcf4; }
</style>
