<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import { onMounted, ref, watch } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import FlowerBoard from './flower-board.vue'

const props = defineProps<{ artwork: Artwork, scale: number }>()
const catalog = useFlowerCatalogStore()
const loading = ref(true)
const error = ref('')

async function prepare() {
  loading.value = true
  error.value = ''
  try {
    if (!catalog.loaded)
      await catalog.load()
    if (catalog.error)
      throw new Error(catalog.error)
    const artwork = props.artwork
    const refs = [
      ...artwork.stems.filter(stem => stem.materialId).map(stem => [stem.materialId!, stem.materialRevision!] as const),
      ...(artwork.vaseMaterialId ? [[artwork.vaseMaterialId, artwork.vaseMaterialRevision!] as const] : []),
      ...(artwork.backgroundMaterialId ? [[artwork.backgroundMaterialId, artwork.backgroundMaterialRevision!] as const] : []),
    ]
    await Promise.all(refs.map(([id, revision]) => catalog.ensure(id, revision)))
  }
  catch (value) {
    error.value = '作品暂时无法展示'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => { void prepare() })
watch(() => JSON.stringify(props.artwork), () => { void prepare() })
</script>

<template>
  <view class="artwork-preview">
    <FlowerBoard
      v-if="!loading && !error"
      class="artwork-preview-board"
      :style="{ transform: `translate(-50%, -50%) scale(${scale})` }"
      :background="artwork.background"
      :background-material-id="artwork.backgroundMaterialId"
      :background-material-revision="artwork.backgroundMaterialRevision"
      :stems="artwork.stems"
      :vase="artwork.vase"
      :selected-id="null"
      :vase-material-id="artwork.vaseMaterialId"
      :vase-material-revision="artwork.vaseMaterialRevision"
    />
    <view v-else class="artwork-preview-state">
      <text>{{ loading ? '正在准备作品…' : error }}</text>
      <button v-if="!loading" @click.stop="prepare">
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
  color: #7c8474;
  font-size: 22rpx;
}

.artwork-preview-state button {
  margin: 0;
  padding: 0 16rpx;
  background: transparent;
  color: #75806c;
  font-size: 22rpx;
  line-height: 44rpx;
}
</style>
