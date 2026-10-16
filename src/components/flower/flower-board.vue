<script setup lang="ts">
import type { StudioTouchEvent } from '@/models/artwork'
import { computed } from 'vue'
import type { Artwork, Stem, VaseName } from '@/utils/flower/artwork'
import { anchorY } from '@/utils/flower/artwork'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { backgroundOffset } from '@/utils/flower/background-render'
import FlowerArtworkRenderer from './flower-artwork-renderer.vue'
import FlowerStemControl from './flower-stem-control.vue'

const props = defineProps<{ background?: Artwork['background'], backgroundMaterialId?: string, backgroundMaterialRevision?: string, stems: Stem[], vase: VaseName, selectedId: number | null, hideVase?: boolean, vaseMaterialId?: string, vaseMaterialRevision?: string }>()
const emit = defineEmits<{ start: [event: StudioTouchEvent, stem: Stem], move: [event: StudioTouchEvent], end: [cancelled: boolean], clear: [] }>()
const catalog = useFlowerCatalogStore()
const scene = computed(() => props.backgroundMaterialId && props.backgroundMaterialRevision ? catalog.get(props.backgroundMaterialId, props.backgroundMaterialRevision) : undefined)
const arrangementOffset = computed(() => backgroundOffset(scene.value, props.vaseMaterialId && props.vaseMaterialRevision ? catalog.get(props.vaseMaterialId, props.vaseMaterialRevision) : undefined, props.vase))
</script>

<template>
  <view class="studio-board" @tap="emit('clear')">
    <FlowerArtworkRenderer
      :background="background"
      :background-material-id="backgroundMaterialId"
      :background-material-revision="backgroundMaterialRevision"
      :stems="stems"
      :vase="vase"
      :hide-vase="hideVase"
      :vase-material-id="vaseMaterialId"
      :vase-material-revision="vaseMaterialRevision"
    />
    <view class="board-controls" :style="{ transform: `translateY(${arrangementOffset}rpx)` }">
      <FlowerStemControl
        v-for="stem in stems"
        :key="stem.id"
        :stem="stem"
        :anchor="anchorY(vase)"
        :selected="selectedId === stem.id"
        @start="emit('start', $event, stem)"
        @move="emit('move', $event)"
        @end="emit('end', $event)"
      />
    </view>
    <view v-if="!stems.length" class="studio-empty">
      <text>从一枝花开始</text><text class="empty-hint">
        在下方选择喜欢的花材
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.studio-board { position: relative; width: 698rpx; height: 1000rpx; overflow: hidden; }
.board-controls { position: absolute; inset: 0; pointer-events: none; }
.studio-empty { position: absolute; z-index: 1; top: 300rpx; width: 100%; text-align: center; color: $studio-muted; font-size: 30rpx; letter-spacing: 3rpx; pointer-events: none; }
.empty-hint { display: block; margin-top: 20rpx; font-size: 22rpx; letter-spacing: 1rpx; }
</style>
