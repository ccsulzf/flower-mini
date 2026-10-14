<script setup lang="ts">
import type { StudioTab } from './studio-types'
import type { Artwork } from '@/models/artwork'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import FlowerBoard from '@/components/flower/flower-board.vue'
import { useArtworkImage } from '@/hooks/useArtworkImage'
import { useFlowerCreationSession } from '@/hooks/useFlowerCreationSession'
import { useFlowerDrag } from '@/hooks/useFlowerDrag'
import { useFlowerStudioLayout } from '@/hooks/useFlowerStudioLayout'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { initializeAppAuth } from '@/utils/appAuth'
import StudioFlowerToolbar from './components/studio-flower-toolbar.vue'
import StudioMaterialDock from './components/studio-material-dock.vue'
import StudioTopToolbar from './components/studio-top-toolbar.vue'

definePage({
  type: 'home',
  layout: 'default',
  style: { navigationStyle: 'custom', navigationBarTitleText: '花瓶小作', navigationBarBackgroundColor: '#f6f3eb', disableScroll: true },
})
const store = useCreationArtworkStore()
store.initialize({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })
const { stems, vase, vaseMaterialId, vaseMaterialRevision, background, backgroundMaterialId, backgroundMaterialRevision, selectedId, canClear } = storeToRefs(store)
const catalog = useFlowerCatalogStore()
const session = useFlowerCreationSession(store)
const { pendingDraft, storageError, readonly, initialized, draftReadFailed } = session
const works = useFlowerWorksStore()
const userInfo = useUserInfoStore()
const studio = useFlowerStudioStore()
studio.reset()
const { pageReady, finishing, startupError, addingMaterial, addedMaterialId, activeTab, showFlowerTools, toolsColorsOpen } = storeToRefs(studio)
const detailId = ref('')
let applying = false
let alive = true
let sessionVersion = 0
let bootTask: Promise<void> | null = null
let addedMaterialTimer: ReturnType<typeof setTimeout> | null = null
const layout = useFlowerStudioLayout()
const { device, unit, pageActionsTop, stageTop, stageBottom, boardScale, artworkStyle, flowerToolsStyle } = layout
const images = useArtworkImage(store.snapshot)
const { startDrag, moveDrag, endDrag } = useFlowerDrag(store, boardScale, unit, openFlowerTools, () => {
  studio.closeFlowerTools()
})

onLoad((query) => {
  detailId.value = String(query?.workId || '')
  void bootstrap()
})
onShow(() => {
  if (!bootTask && alive)
    void bootstrap()
})
onHide(() => {
  endDrag(true)
  session.flushDraft()
})
watch(() => JSON.stringify(store.snapshot()), () => {
  if (pageReady.value && !applying)
    session.markEdited()
}, { flush: 'sync' })
watch(storageError, (value) => {
  if (value)
    notify(value)
})
async function prepareArtwork() {
  const art = store.snapshot()
  const references = [...art.stems.filter(row => row.materialId).map(row => [row.materialId!, row.materialRevision!]), ...(art.vaseMaterialId ? [[art.vaseMaterialId, art.vaseMaterialRevision!]] : []), ...(art.backgroundMaterialId ? [[art.backgroundMaterialId, art.backgroundMaterialRevision!]] : [])]
  await Promise.all(references.map(([id, revision]) => catalog.ensure(id, revision)))
  const bounds = store.stemLandingBounds()
  if (art.stems.some(stem => stem.x < bounds.left - 0.01 || stem.x > bounds.right + 0.01))
    throw new Error('作品落点超出当前容器，请返回编辑调整花材')
}
function bootstrap(): Promise<void> {
  if (bootTask)
    return bootTask
  bootTask = (async () => {
    try {
      const uid = await userInfo.requireUid('请先登录后创作')
      if (!alive)
        return
      if (pageReady.value)
        return
      session.initialize(uid, Boolean(detailId.value))
      const restoring = Boolean(pendingDraft.value)
      if (restoring) {
        applying = true
        session.continueDraft()
        applying = false
      }
      startupError.value = ''
      if (detailId.value && !/^[a-f\d]{32}$/.test(detailId.value))
        throw new Error('作品链接无效')
      if (detailId.value) {
        const work = await works.get(detailId.value)
        if (!alive)
          return
        applying = true
        session.openWork(work)
        session.editWork()

        applying = false
      }
      await loadMaterials()
      if (!alive)
        return
      if (detailId.value || restoring)
        await prepareArtwork()
      pageReady.value = true
    }
    catch (error) {
      startupError.value = creationFailure(error)
    }
    finally {
      bootTask = null
    }
  })()
  return bootTask
}
async function retryStartup() {
  try {
    await initializeAppAuth(true)
    await bootstrap()
    if (pageReady.value) {
      await catalog.load()
      await prepareArtwork()
      startupError.value = ''
    }
  }
  catch (error) {
    startupError.value = creationFailure(error)
  }
}
async function loadMaterials() {
  // 返回工作室时先用已准备的花瓶，不等待目录网络刷新。
  const knownVase = catalog.materials.find(item => item.category === 'vase')
  const cachedVase = knownVase ? catalog.get(knownVase.id, knownVase.revision) : undefined
  if (!pendingDraft.value && !readonly.value && !vaseMaterialId.value && cachedVase) {
    applying = true
    store.setVaseMaterial(cachedVase, false)
    applying = false
  }
  if (!catalog.loaded)
    await catalog.load()
  if (!pendingDraft.value && !readonly.value && !vaseMaterialId.value) {
    const firstVase = catalog.materials.find(item => item.category === 'vase')
    if (firstVase) {
      try {
        const material = await catalog.ensure(firstVase.id, firstVase.revision)
        // 用户可能已在等待期间主动选了另一个容器。
        if (alive && !pendingDraft.value && !readonly.value && !vaseMaterialId.value) {
          applying = true
          store.setVaseMaterial(material, false)
          applying = false
        }
      }
      catch (value) {
        notify(value instanceof Error ? value.message : '花瓶加载失败')
      }
    }
  }
  void catalog.preload()
}
onUnload(() => {
  alive = false
  if (addedMaterialTimer)
    clearTimeout(addedMaterialTimer)
  sessionVersion++
  endDrag(true)
  session.dispose()
  images.invalidate()
  studio.reset()
  store.$dispose()
})
function notify(title: string) {
  uni.showToast({ title, icon: 'none' })
}
function closeFlowerTools() {
  studio.closeFlowerTools()
  store.select(null)
}
function closePanels() {
  studio.closePanel()
  store.select(null)
  images.invalidate()
}
function toggleTab(tab: StudioTab) {
  if (!pageReady.value || pendingDraft.value)
    return
  endDrag(true)
  store.select(null)
  images.invalidate()
  studio.toggleTab(tab)
}
async function finish() {
  if (finishing.value)
    return
  if (addingMaterial.value) {
    notify('素材正在准备，请稍后再完成')
    return
  }
  endDrag(true)
  closeFlowerTools()
  studio.closePanel()
  if (!pendingDraft.value && !readonly.value && !vaseMaterialId.value) {
    notify('花瓶正在准备，请稍后再完成')
    return
  }
  session.flushDraft()
  const draft = session.snapshot()
  finishing.value = true
  try {
    await prepareArtwork()
    if (!alive)
      return
    const now = new Date()
    let title = `花意 ${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    let description = ''
    if (draft.workId) {
      const original = await works.get(draft.workId)
      if (!alive)
        return
      title = original.title
      description = original.description
    }
    const work = await works.save({
      draft,
      title,
      description,
      workId: draft.workId,
      expectedRevision: draft.workRevision,
    })
    if (!alive)
      return
    await new Promise<void>((resolve, reject) => {
      uni.navigateTo({
        url: `/pages/flower-detail/flower-detail-page?workId=${work.id}`,
        success: () => resolve(),
        fail: reject,
      })
    })
    if (!alive)
      return
    applying = true
    const draftCleared = session.saved()
    applying = false
    if (!draftCleared)
      notify(storageError.value || '作品已保存，但本地草稿清理失败')
    detailId.value = ''
    images.invalidate()
    studio.closePanel()
    store.select(null)
    void loadMaterials()
  }
  catch (error) {
    if (alive)
      notify(creationFailure(error))
  }
  finally {
    finishing.value = false
  }
}

async function retryLocalDraft() {
  if (session.retryDraft() && pendingDraft.value)
    await continueDraft()
}
async function continueDraft() {
  pageReady.value = false
  applying = true
  try {
    session.continueDraft()
    images.invalidate()
    await prepareArtwork()
    await loadMaterials()
  }
  catch (error) {
    startupError.value = creationFailure(error)
  }
  finally {
    applying = false
    pageReady.value = true
  }
}
function endCreation() {
  if (readonly.value)
    return
  applying = true
  const reset = session.restart()
  applying = false
  if (!reset)
    return
  sessionVersion++
  images.invalidate()
  addingMaterial.value = false
  addedMaterialId.value = ''
  if (addedMaterialTimer) {
    clearTimeout(addedMaterialTimer)
    addedMaterialTimer = null
  }
  studio.closePanel()
  store.select(null)
  startupError.value = ''

  detailId.value = ''

  pageReady.value = true
  void loadMaterials()
}
function openWorks() {
  endDrag(true)
  session.flushDraft()
  uni.navigateTo({ url: '/pages/flower-works/flower-works-page' })
}
function closeDetail() {
  uni.navigateBack()
}
function openFlowerTools(id: number) {
  if (activeTab.value)
    studio.closePanel()
  if (showFlowerTools.value && selectedId.value === id)
    return
  store.select(id)
  toolsColorsOpen.value = false
  images.invalidate()
  studio.openFlowerTools()
}
async function addCloudMaterial(id: string) {
  if (!pageReady.value || pendingDraft.value)
    return
  const row = catalog.materials.find(item => item.id === id)
  if (!row || addingMaterial.value)
    return
  addingMaterial.value = true
  const request = sessionVersion
  try {
    const material = await catalog.ensure(row.id, row.revision)
    if (!alive || request !== sessionVersion)
      return
    endDrag(true)
    let addedStemId: number | null = null
    if (material.category === 'background') {
      store.setBackgroundMaterial(material)
    }
    else if (material.category === 'vase' || material.category === 'bouquet') {
      store.setVaseMaterial(material)
      studio.closePanel()
    }
    else {
      addedStemId = store.addMaterial(material)
      if (addedStemId === null)
        return
    }
    if (addedStemId !== null) {
      studio.closeFlowerTools()
      store.select(activeTab.value ? null : addedStemId)
      addedMaterialId.value = material.id
      if (addedMaterialTimer)
        clearTimeout(addedMaterialTimer)
      addedMaterialTimer = setTimeout(() => {
        if (addedMaterialId.value === material.id)
          addedMaterialId.value = ''
      }, 1200)
    }
    else {
      closeFlowerTools()
    }
  }
  catch (value) {
    if (alive && request === sessionVersion)
      notify(value instanceof Error ? value.message : '素材加载失败')
  }
  finally {
    if (request === sessionVersion)
      addingMaterial.value = false
  }
}
function undo() {
  endDrag(true)
  store.undo()
  closeFlowerTools()
}
function redo() {
  endDrag(true)
  store.redo()
  closeFlowerTools()
}
function reset() {
  if (!canClear.value)
    return
  uni.showModal({
    title: '清空花材',
    content: '确定清空所有花材吗？清空后可以撤销恢复。',
    confirmText: '清空',
    cancelText: '取消',
    success: (result) => {
      if (!result.confirm)
        return
      endDrag(true)
      store.clearArtwork()
      closeFlowerTools()
    },
  })
}
function setColor(color: string) {
  store.setColor(color)
}
function setBackground(value: Artwork['background']) {
  store.setBackground(value)
}
function setLayer(direction: 'front' | 'back') {
  toolsColorsOpen.value = false
  store.setLayer(direction)
}
function duplicateSelected() {
  endDrag(true)
  const id = store.duplicateSelected()
  if (id !== null)
    openFlowerTools(id)
}
function removeSelected() {
  endDrag(true)
  store.removeSelected()
  closeFlowerTools()
}
</script>

<template>
  <view
    class="flower-studio studio-light"
    :style="{ backgroundColor: '#f6f3eb', height: `${device.windowHeight}px` }"
  >
    <view class="studio-stage" :style="{ bottom: `${stageBottom}px`, top: `${stageTop}px` }">
      <view class="studio-artwork" :style="artworkStyle">
        <FlowerBoard
          :background="background" :background-material-id="backgroundMaterialId" :background-material-revision="backgroundMaterialRevision"
          :stems="stems" :vase="vase" :vase-material-id="vaseMaterialId" :vase-material-revision="vaseMaterialRevision"
          :selected-id="selectedId" @start="startDrag" @move="moveDrag" @end="endDrag" @clear="closeFlowerTools"
        />
      </view>
      <StudioMaterialStatus />
    </view>
    <StudioMaterialDock
      @select="toggleTab" @close="studio.closePanel" @dismiss="closePanels" @cloud="addCloudMaterial"
      @background="setBackground"
    />
    <StudioFlowerToolbar
      @close="closeFlowerTools" @color="setColor"
      @toggle-colors="toolsColorsOpen = !toolsColorsOpen" @layer="setLayer" @duplicate="duplicateSelected"
      @remove="removeSelected" @mirror="store.mirrorSelected()" @adjacent="store.selectAdjacent"
    />
    <StudioTopToolbar @works="openWorks" @undo="undo" @redo="redo" @reset="reset" @finish="finish" />
    <view v-if="storageError && !pendingDraft && !startupError" class="storage-warning" :style="{ top: `${pageActionsTop + 58}px` }">
      <text>{{ storageError }}</text><text v-if="draftReadFailed" @click="retryLocalDraft">
        重新读取
      </text><text @click="endCreation">
        重新开始
      </text>
    </view>
    <view v-if="startupError" class="creation-overlay" @touchmove.stop.prevent>
      <view class="creation-modal">
        <view class="creation-sheet">
          <view class="creation-title">
            暂时无法打开
          </view><view class="creation-error">
            {{ startupError }}
          </view>
          <view class="creation-actions">
            <button v-if="detailId" class="creation-button" @click="closeDetail">
              返回作品列表
            </button>
            <button v-else-if="initialized" class="creation-button" @click="endCreation">
              重新开始
            </button>
            <button class="creation-button creation-primary" @click="retryStartup">
              重试
            </button>
          </view>
        </view>
      </view>
    </view>
    <!-- 仅导出时绘制，保留真实尺寸，不能 display:none。 -->
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
@use '@/styles/flower-creation.scss';

.flower-studio {
  position: relative;
  min-height: 100vh;
  width: 750rpx;
  overflow: hidden;
  color: $studio-ink;
}

.studio-stage {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 5;
  overflow: hidden;
}

.studio-artwork {
  position: absolute;
  transform-origin: 0 0;
  transition: top .2s ease;
}

.studio-preview-position { position: absolute; left: 0; right: 0; z-index: 8; }
.creation-overlay { position: fixed; inset: 0; z-index: 20; background: rgba(17,20,15,.25); display: flex; align-items: center; justify-content: center; padding: 30rpx; box-sizing: border-box; }
.creation-modal { width: 100%; max-height: 80vh; overflow: auto; }
.work-name-input { padding: 20rpx; height: 56rpx; font-size: 28rpx; background: #fffdf7; border-radius: 16rpx; margin-bottom: 24rpx; }
.storage-warning { position: absolute; z-index: 8; left: 26rpx; right: 26rpx; font-size: 22rpx; color: #995c50; display: flex; gap: 20rpx; }
</style>
