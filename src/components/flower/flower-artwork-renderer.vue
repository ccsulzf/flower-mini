<script setup lang="ts">
import type { Artwork } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import { computed } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { backgroundOffset, backgroundSceneSource } from '@/utils/flower/background-render'
import { svgImageSource } from '@/utils/flower/material-render'
import FlowerInstance from './flower-stem.vue'
import StudioContainer from './flower-vase.vue'

const props = defineProps<{
  artwork: Artwork
  preparedMaterials: Record<string, CachedMaterial>
  hideContainer?: boolean
}>()
const background = computed(() => props.preparedMaterials[props.artwork.background.materialId])
const container = computed(() => props.preparedMaterials[props.artwork.container.materialId])
const backgroundSource = computed(() => background.value?.sources.background ? svgImageSource(backgroundSceneSource(background.value)) : '')
const arrangementOffset = computed(() => backgroundOffset(background.value, container.value))
</script>

<template>
  <view class="artwork-renderer" :style="`width:${studioMetrics.width}px;height:${studioMetrics.height}px;`">
    <image v-if="backgroundSource" class="board-background" :src="backgroundSource" mode="scaleToFill" />
    <view class="board-arrangement" :style="`transform:translateY(${arrangementOffset}px);`">
      <StudioContainer v-if="container" :material="container" :hide-container="hideContainer">
        <FlowerInstance
          v-for="instance in artwork.materials"
          :key="instance.id"
          :instance="instance"
          :material="preparedMaterials[instance.materialId]"
        />
      </StudioContainer>
    </view>
  </view>
</template>

<style scoped lang="scss">
.artwork-renderer { position: relative; overflow: hidden; background: #f6f3eb; }
.board-background { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.board-arrangement { position: absolute; inset: 0; }
</style>
