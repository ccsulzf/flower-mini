<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import FlowerBoard from '@/components/flower/flower-board.vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { type Artwork, artworkBackground, parseArtwork } from '@/utils/flower/artwork'
import { createComplexRenderTestArtwork } from '@/utils/flower/render-test-svg'

definePage({
  layout: 'default',
  style: { navigationBarTitleText: '渲染路线验证', navigationBarBackgroundColor: '#f6f3eb' },
})

const jsonInput = ref('')
const artwork = ref<Artwork | null>(null)
const error = ref('')
const cloudError = ref('')
const cloudImagePath = ref('')
const cloudRenderMs = ref<number | null>(null)
const cloudPngBytes = ref(0)
const cloudAssetCount = ref(0)
const cloudLoading = ref(false)
const cloudExampleLoading = ref(false)
const previewStyle = computed(() => `background-color:${artwork.value ? artworkBackground(artwork.value.background) : '#f6f3eb'};`)
const flowerMaterialCount = computed(() => new Set(artwork.value?.stems.map(stem => stem.materialId).filter(Boolean)).size)
const catalog = useFlowerCatalogStore()

async function prepareCloudMaterials(value: Artwork) {
  if (value.stems.some(stem => !stem.materialId || !stem.materialRevision))
    throw new Error('请使用含云端素材 ID 的作品，或先载入云端素材示例')
  if (!catalog.loaded)
    await catalog.load()
  if (catalog.error)
    throw new Error(catalog.error)
  const references = [...value.stems.filter(stem => stem.materialId).map(stem => [stem.materialId!, stem.materialRevision!] as const)]
  if (value.vaseMaterialId && value.vaseMaterialRevision)
    references.push([value.vaseMaterialId, value.vaseMaterialRevision])
  if (value.backgroundMaterialId && value.backgroundMaterialRevision)
    references.push([value.backgroundMaterialId, value.backgroundMaterialRevision])
  await Promise.all([...new Map(references.map(([id, revision]) => [`${id}:${revision}`, [id, revision] as const])).values()]
    .map(([id, revision]) => catalog.ensure(id, revision)))
  if (catalog.error)
    throw new Error(catalog.error)
}

async function renderVue() {
  error.value = ''
  try {
    const nextArtwork = parseArtwork(jsonInput.value)
    await prepareCloudMaterials(nextArtwork)
    artwork.value = nextArtwork
    cloudError.value = ''
    cloudImagePath.value = ''
    cloudRenderMs.value = null
    cloudPngBytes.value = 0
    cloudAssetCount.value = 0
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : '作品 JSON 或云端素材无效'
  }
}

async function fillCloudExample() {
  if (cloudExampleLoading.value)
    return
  cloudExampleLoading.value = true
  error.value = ''
  try {
    if (!catalog.loaded)
      await catalog.load()
    if (catalog.error)
      throw new Error(catalog.error)
    const sample = createComplexRenderTestArtwork(catalog.materials)
    const serialized = JSON.stringify(sample, null, 2)
    const nextArtwork = parseArtwork(serialized)
    await prepareCloudMaterials(nextArtwork)
    jsonInput.value = serialized
    artwork.value = nextArtwork
    cloudError.value = ''
    cloudImagePath.value = ''
    cloudRenderMs.value = null
    cloudPngBytes.value = 0
    cloudAssetCount.value = 0
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : '读取云端素材失败'
  }
  finally {
    cloudExampleLoading.value = false
  }
}

async function renderCloud() {
  if (!artwork.value || cloudLoading.value)
    return
  cloudLoading.value = true
  cloudError.value = ''
  cloudImagePath.value = ''
  try {
    const cloud = uniCloud.importObject('flower-render-test', { customUI: true })
    const result = await cloud.renderArtwork({ artwork: artwork.value })
    if (result.width !== 698 || result.height !== 1000 || !result.pngBase64)
      throw new Error('云端图片尺寸或内容无效')
    const filePath = `${wx.env.USER_DATA_PATH}/flower-render-test.png`
    await new Promise<void>((resolve, reject) => {
      wx.getFileSystemManager().writeFile({
        filePath,
        data: result.pngBase64,
        encoding: 'base64',
        success: () => resolve(),
        fail: reject,
      })
    })
    cloudImagePath.value = filePath
    cloudRenderMs.value = result.renderMs
    cloudPngBytes.value = result.pngBytes
    cloudAssetCount.value = result.assetCount
  }
  catch (cause) {
    cloudError.value = cause instanceof Error ? cause.message : '云端图片生成失败'
  }
  finally {
    cloudLoading.value = false
  }
}

function previewCloudImage() {
  if (cloudImagePath.value)
    uni.previewImage({ urls: [cloudImagePath.value], current: cloudImagePath.value })
}

onMounted(() => {
  void fillCloudExample()
})
</script>

<template>
  <view class="render-test-page">
    <view class="intro">
      <text class="title">Vue 预览与云端 PNG</text>
      <text class="description">左侧由 Vue 预览；右侧仅发送作品 JSON，由云端按素材 ID 和版本读取云存储 SVG、组装并栅格化。</text>
    </view>
    <view class="input-card">
      <text class="input-title">作品 JSON</text>
      <button class="example-button" :disabled="cloudExampleLoading" @click="fillCloudExample">
        {{ cloudExampleLoading ? '读取云端素材…' : '载入云端素材示例' }}
      </button>
      <textarea
        v-model="jsonInput" class="json-input" :maxlength="65536"
        placeholder="粘贴作品 JSON…" :auto-height="false" :adjust-position="true"
        :disable-default-padding="true"
      />
      <text class="input-hint">云端 PNG 路径不上传作品 SVG 或素材文件；测试云对象会根据作品引用查询素材档案，并从 fileId 下载对应 SVG。</text>
      <text v-if="error" class="error-message">{{ error }}</text>
      <button class="vue-button" :disabled="cloudExampleLoading" @click="renderVue">
        {{ catalog.preparing ? '正在准备云端素材…' : '更新 Vue 预览' }}
      </button>
    </view>
    <view class="comparison-heading">
      <text>并排对比</text>
      <text v-if="artwork" class="stem-count">{{ artwork.stems.length }} 枝 · {{ flowerMaterialCount }} 种云端花材 · {{ artwork.vase }}</text>
    </view>
    <button class="cloud-button" :disabled="!artwork || cloudLoading" @click="renderCloud">
      {{ cloudLoading ? '云端生成中…' : '生成云端 PNG' }}
    </button>
    <text v-if="cloudError" class="error-message">{{ cloudError }}</text>
    <view class="comparison">
      <view class="comparison-column">
        <text class="comparison-label">Vue 预览</text>
        <view class="preview" :style="previewStyle">
          <FlowerBoard
            v-if="artwork" :background="artwork.background" :stems="artwork.stems"
            :background-material-id="artwork.backgroundMaterialId" :background-material-revision="artwork.backgroundMaterialRevision"
            :vase="artwork.vase" :vase-material-id="artwork.vaseMaterialId"
            :vase-material-revision="artwork.vaseMaterialRevision" :selected-id="null"
          />
          <view v-else class="preview-empty">
            <text>粘贴云端作品 JSON，或载入素材示例</text>
          </view>
        </view>
      </view>
      <view class="comparison-column">
        <text class="comparison-label">
          云端 PNG
          <text v-if="cloudRenderMs !== null">· 698×1000 · {{ cloudAssetCount }} 个素材 · {{ cloudRenderMs }} ms · {{ Math.ceil(cloudPngBytes / 1024) }} KB</text>
        </text>
        <view class="preview cloud-preview" :style="previewStyle">
          <image
            v-if="cloudImagePath" class="cloud-image" :src="cloudImagePath" mode="aspectFit"
            @tap="previewCloudImage"
          />
          <view v-else class="preview-empty">
            <text>{{ cloudLoading ? '正在生成图片…' : '等待云端生成' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.render-test-page { min-height: 100vh; padding: 30rpx 26rpx 60rpx; box-sizing: border-box; background: #f6f3eb; color: #3f463d; }
.intro { margin: 8rpx 0 24rpx; }.title { display: block; font-size: 36rpx; font-weight: 600; }.description { display: block; margin-top: 10rpx; color: #777d70; font-size: 23rpx; line-height: 1.6; }
.input-card { padding: 20rpx; border: 1rpx solid #e3dfd3; border-radius: 22rpx; background: #fffdf7; }.input-title { display: block; margin-bottom: 12rpx; font-size: 26rpx; font-weight: 600; }
.example-button { margin: 0 0 12rpx; border-radius: 12rpx; background: #eceee3; color: #59634e; font-size: 22rpx; line-height: 64rpx; }.example-button::after, .vue-button::after { border: none; }.example-button[disabled], .vue-button[disabled] { opacity: .6; }
.json-input { display: block; width: 100%; height: 220rpx; padding: 16rpx; box-sizing: border-box; border-radius: 12rpx; background: #f1f0e9; color: #3f463d; font-family: monospace; font-size: 20rpx; line-height: 1.5; }
.input-hint { display: block; margin-top: 12rpx; color: #777d70; font-size: 20rpx; line-height: 1.5; }.error-message { display: block; margin-top: 12rpx; color: #b82b36; font-size: 22rpx; line-height: 1.5; }
.vue-button, .cloud-button { margin-top: 16rpx; border-radius: 14rpx; color: #fffdf7; font-size: 24rpx; line-height: 68rpx; }.vue-button { background: #687a62; }.cloud-button { background: #59634e; }.vue-button::after, .cloud-button::after { border: none; }.cloud-button[disabled] { opacity: .6; }
.comparison-heading { display: flex; justify-content: space-between; align-items: center; margin: 24rpx 4rpx 12rpx; font-size: 27rpx; font-weight: 600; }.stem-count { color: #777d70; font-size: 21rpx; font-weight: 400; }
.comparison { display: flex; gap: 14rpx; }.comparison-column { flex: 1; min-width: 0; }.comparison-label { display: block; min-height: 32rpx; margin: 0 0 8rpx 2rpx; color: #626b59; font-size: 19rpx; line-height: 1.5; }
.preview { position: relative; width: 100%; height: 480rpx; overflow: hidden; border: 1rpx solid #e3dfd3; border-radius: 14rpx; }.preview :deep(.studio-board) { transform: scale(.48); transform-origin: top left; }.cloud-image { display: block; width: 100%; height: 100%; }
.preview-empty { display: flex; height: 100%; align-items: center; justify-content: center; padding: 12rpx; box-sizing: border-box; color: #777d70; font-size: 21rpx; text-align: center; }
</style>
