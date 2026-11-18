<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import { onMounted, ref, watch } from 'vue'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerWorksStore } from '@/stores/flowerWorksStore'
import FlowerArtworkRenderer from './flower-artwork-renderer.vue'

const props = defineProps<{
  artwork?: Artwork
  workId?: string
  dailyDate?: string
  scale: number
  hideBackground?: boolean
}>()
const catalog = useFlowerCatalogStore()
const dailyFlowers = useDailyFlowerStore()
const works = useFlowerWorksStore()
const loading = ref(true)
const error = ref('')
const artwork = ref<Artwork | null>(null)
let requestId = 0

async function prepare(refreshCatalog = false) {
  const currentRequestId = ++requestId
  loading.value = true
  error.value = ''
  try {
    let source = props.artwork
    if (!source && props.workId)
      source = (await works.get(props.workId)).draft.artwork
    else if (!source && props.dailyDate)
      source = await dailyFlowers.getArtwork(props.dailyDate) ?? undefined
    if (!source)
      throw new Error('作品花束数据不存在')
    const refs = [...new Set([
      ...source.materials.map(material => material.materialId),
      source.container.materialId,
      source.background.materialId,
    ])]
    if (refreshCatalog || !catalog.loaded || refs.some(id => !catalog.materials.some(material => material.id === id)))
      await catalog.load()
    await Promise.all(refs.map(id => catalog.ensure(id, undefined, true, { silent: true })))
    if (currentRequestId === requestId)
      artwork.value = source
  }
  catch (value) {
    if (currentRequestId === requestId)
      error.value = value instanceof Error ? value.message : '作品暂时无法展示'
  }
  finally {
    if (currentRequestId === requestId)
      loading.value = false
  }
}

onMounted(() => { void prepare() })
watch(() => [JSON.stringify(props.artwork), props.workId, props.dailyDate], () => { void prepare() })
</script>

<template>
  <view class="artwork-preview">
    <FlowerArtworkRenderer
      v-if="!loading && !error && artwork"
      class="artwork-preview-board"
      :style="{ transform: `translate(-50%, -50%) scale(${scale})` }"
      :artwork="artwork"
      :prepared-materials="catalog.prepared"
      :hide-background="hideBackground"
    />
    <view v-else class="artwork-preview-state">
      <text>{{ loading ? '正在准备作品…' : error }}</text>
      <button v-if="!loading" @click.stop="prepare(true)">
        重试
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.artwork-preview {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.artwork-preview-board {
  position: absolute;
  top: 50%;
  left: 50%;
}

.artwork-preview-state {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: var(--app-brandStrong);
  font-size: 22rpx;
}

.artwork-preview-state button {
  position: relative;
  z-index: 3;
  margin: 0;
  padding: 0 16rpx;
  background: transparent;
  color: var(--app-brandStrong);
  font-size: 22rpx;
  line-height: 44rpx;
}
</style>
