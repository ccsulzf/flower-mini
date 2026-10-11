<script setup lang="ts">
import type { StudioTab } from './studio-types'
import type { Artwork } from '@/models/artwork'
import type { FlowerCardText } from '@/models/flower-creation'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import FlowerBoard from '@/components/flower/flower-board.vue'
import { useArtworkImage } from '@/hooks/useArtworkImage'
import { useFlowerCreationSession } from '@/hooks/useFlowerCreationSession'
import { useFlowerDrag } from '@/hooks/useFlowerDrag'
import { useFlowerStudioLayout } from '@/hooks/useFlowerStudioLayout'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { initializeAppAuth, waitForAppAuthReady } from '@/utils/appAuth'
import { artworkBackground } from '@/utils/flower/artwork'
import { backgroundOffset } from '@/utils/flower/background-render'
import { validateCard } from '@/utils/flower/creation-storage'
import StudioArtworkPreview from './components/studio-artwork-preview.vue'
import StudioCardEditor from './components/studio-card-editor.vue'
import StudioCardPreview from './components/studio-card-preview.vue'
import StudioFlowerTools from './components/studio-flower-tools.vue'
import StudioHeader from './components/studio-header.vue'
import StudioOptions from './components/studio-options.vue'
import StudioRestore from './components/studio-restore.vue'
import StudioToolbar from './components/studio-toolbar.vue'

definePage({
  type: 'home',
  layout: 'default',
  style: { navigationStyle: 'custom', navigationBarTitleText: '花草工作室', navigationBarBackgroundColor: '#f6f3eb', disableScroll: true },
})
const store = useCreationArtworkStore()
store.initialize({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })
const { stems, vase, vaseMaterialId, vaseMaterialRevision, background, backgroundMaterialId, backgroundMaterialRevision, selectedId, selected, canUndo, canRedo, canClear, canMoveBack, canMoveFront } = storeToRefs(store)
const catalog = useFlowerCatalogStore()
const session = useFlowerCreationSession(store)
const { view, card, pendingDraft, storageError, readonly, initialized, draftReadFailed } = session
const works = useFlowerWorksStore()
const pageReady = ref(false)
const startupError = ref('')
const showCardEditor = ref(false)
const showSaveWork = ref(false)
const workTitle = ref('')
const savingWork = ref(false)
const deletingWork = ref(false)
const detailId = ref('')
let applying = false
let alive = true
let sessionVersion = 0
let bootTask: Promise<void> | null = null
let pageOwner = ''
const screen = uni.getSystemInfoSync()
let navigationInset = (screen.statusBarHeight || 0) + 44
// #ifdef MP-WEIXIN
if (typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function') {
  const capsule = wx.getMenuButtonBoundingClientRect()
  if (capsule.bottom > 0)
    navigationInset = capsule.bottom + 8
}
// #endif
const addingMaterial = ref(false)
const activeTab = ref<StudioTab | null>(null)
const showFinish = computed(() => view.value !== 'edit')
const showFlowerTools = ref(false)
const toolsColorsOpen = ref(false)
const arrangementOffset = computed(() => backgroundOffset(backgroundMaterialId.value && backgroundMaterialRevision.value ? catalog.get(backgroundMaterialId.value, backgroundMaterialRevision.value) : undefined, vaseMaterialId.value && vaseMaterialRevision.value ? catalog.get(vaseMaterialId.value, vaseMaterialRevision.value) : undefined, vase.value))
const layout = useFlowerStudioLayout(selected, vase, arrangementOffset, navigationInset)
const { device, unit, pageActionsTop, toolbarBottom, stageTop, stageBottom, boardScale, artworkStyle, flowerToolsStyle } = layout
const images = useArtworkImage(store.snapshot)
const { exportCanvasId, canvasHeight, exportingImage, imagePath, imageError, exportingCard, cardImagePath, cardImageError, exportImage, saveImage, shareImage, previewImage } = images
const { startDrag, moveDrag, endDrag } = useFlowerDrag(store, boardScale, unit, openFlowerTools, () => {
  toolsColorsOpen.value = false
  showFlowerTools.value = false
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
      await waitForAppAuthReady()
      if (!alive)
        return
      const uid = uniCloud.getCurrentUserInfo().uid
      if (!uid)
        throw new Error('请先登录后创作')
      if (pageOwner && pageOwner !== uid) {
        sessionVersion++
        images.invalidate()
        closePanels()
        pageReady.value = false
        showCardEditor.value = false
        showSaveWork.value = false
        savingWork.value = false
        deletingWork.value = false
        addingMaterial.value = false
        workTitle.value = ''
        applying = true
        store.initialize({ version: 2, vase: '陶瓶', background: 'warm', stems: [] })
        applying = false
      }
      if (pageReady.value && pageOwner === uid)
        return
      pageOwner = uid
      session.initialize(uid, Boolean(detailId.value))
      startupError.value = ''
      if (detailId.value && !/^[a-f\d]{32}$/.test(detailId.value))
        throw new Error('作品链接无效')
      if (detailId.value) {
        const work = await works.get(detailId.value)
        if (!alive || uid !== uniCloud.getCurrentUserInfo().uid)
          return
        applying = true
        session.openWork(work)
        workTitle.value = work.title
        applying = false
      }
      await loadMaterials()
      if (!alive || uid !== uniCloud.getCurrentUserInfo().uid)
        return
      if (detailId.value) {
        await prepareArtwork()
        void images.exportImage()
      }
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
      if (view.value !== 'edit')
        void images.exportImage()
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
    store.setVaseMaterial(cachedVase)
    applying = false
  }
  await catalog.load()
  if (!pendingDraft.value && !readonly.value && !vaseMaterialId.value) {
    const firstVase = catalog.materials.find(item => item.category === 'vase')
    if (firstVase) {
      try {
        const material = await catalog.ensure(firstVase.id, firstVase.revision)
        // 用户可能已在等待期间主动选了另一个容器。
        if (alive && !pendingDraft.value && !readonly.value && !vaseMaterialId.value) {
          applying = true
          store.setVaseMaterial(material)
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
watch(background, value => uni.setNavigationBarColor({
  frontColor: value === 'cocoa' ? '#ffffff' : '#000000',
  backgroundColor: artworkBackground(value),
}), { immediate: true })
onUnload(() => {
  alive = false
  sessionVersion++
  endDrag(true)
  session.dispose()
  images.invalidate()
  store.$dispose()
})
function notify(title: string) {
  uni.showToast({ title, icon: 'none' })
}
function closeFinish() {
  view.value = 'edit'
  images.invalidate()
}
function closeFlowerTools() {
  showFlowerTools.value = false
  toolsColorsOpen.value = false
  store.select(null)
}
function closePanels() {
  activeTab.value = null
  closeFinish()
  closeFlowerTools()
}
function toggleTab(tab: StudioTab) {
  if (!pageReady.value || pendingDraft.value)
    return
  endDrag(true)
  closeFinish()
  closeFlowerTools()
  activeTab.value = activeTab.value === tab ? null : tab
}
function finish() {
  if (addingMaterial.value) {
    notify('素材正在准备，请稍后再完成')
    return
  }
  endDrag(true)
  closeFlowerTools()
  activeTab.value = null
  if (!pendingDraft.value && !readonly.value && !vaseMaterialId.value) {
    notify('花瓶正在准备，请稍后再完成')
    return
  }
  view.value = 'artwork'
  void images.exportImage()
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
  if (savingWork.value || readonly.value)
    return
  applying = true
  const reset = session.restart()
  applying = false
  if (!reset)
    return
  sessionVersion++
  images.invalidate()
  addingMaterial.value = false
  activeTab.value = null
  closeFlowerTools()
  showCardEditor.value = false
  showSaveWork.value = false
  startupError.value = ''
  workTitle.value = ''
  detailId.value = ''
  pageReady.value = true
  void loadMaterials()
}
function returnToEdit() {
  if (savingWork.value)
    return
  if (readonly.value) {
    session.editWork()
    detailId.value = ''
  }
  view.value = 'edit'
  images.invalidate()
}
function backToArtwork() {
  view.value = 'artwork'
}
function openCardEditor() {
  showCardEditor.value = true
}
function cancelCardEditor() {
  showCardEditor.value = false
  view.value = 'artwork'
}
function skipCard() {
  showCardEditor.value = false
  view.value = 'artwork'
  images.shareImage()
}
function previewCard(text: FlowerCardText) {
  const value = validateCard(text)
  if (!value.blessing && !value.signature) {
    skipCard()
    return
  }
  session.commitCard(value)
  showCardEditor.value = false
  view.value = 'card'
  void images.exportCard(value)
}
function openWorks() {
  if (savingWork.value)
    return
  endDrag(true)
  session.flushDraft()
  uni.navigateTo({ url: '/pages/flower-works/flower-works-page' })
}
function closeDetail() {
  uni.navigateBack()
}
function openAuxiliary() {
  if (!savingWork.value && !deletingWork.value) {
    session.flushDraft()
    uni.navigateTo({ url: '/pages/index/index-page' })
  }
}
function deleteWork() {
  const id = session.workId.value
  const revision = session.workRevision.value
  const request = sessionVersion
  if (!readonly.value || !id || !revision || deletingWork.value)
    return
  uni.showModal({ title: '删除作品', content: `确定删除“${workTitle.value}”吗？删除后无法恢复。`, confirmText: '删除', success: async (result) => {
    if (!result.confirm || !alive || request !== sessionVersion)
      return
    deletingWork.value = true
    try {
      await works.remove(id, revision)
      if (alive && request === sessionVersion) {
        notify('作品已删除')
        closeDetail()
      }
    }
    catch (error) {
      if (alive && request === sessionVersion)
        notify(creationFailure(error))
    }
    finally {
      if (alive && request === sessionVersion)
        deletingWork.value = false
    }
  } })
}
function requestSaveWork() {
  if (readonly.value || savingWork.value)
    return
  if (!workTitle.value) {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    workTitle.value = `我的插花 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
  }
  showSaveWork.value = true
}
async function saveWork() {
  if (savingWork.value)
    return
  const request = sessionVersion
  const draft = session.snapshot()
  savingWork.value = true
  try {
    const path = await images.exportThumbnail()
    if (!alive || request !== sessionVersion)
      return
    const work = await works.save({ draft, title: workTitle.value, imagePath: path, workId: session.workId.value, expectedRevision: session.workRevision.value })
    if (!alive || request !== sessionVersion)
      return
    session.saved(work)
    workTitle.value = work.title
    showSaveWork.value = false
    notify('作品已保存到云端')
  }
  catch (error) {
    if (alive && request === sessionVersion)
      notify(creationFailure(error))
  }
  finally {
    if (alive && request === sessionVersion)
      savingWork.value = false
  }
}
function openFlowerTools(id: number) {
  if (showFlowerTools.value && selectedId.value === id)
    return
  store.select(id)
  toolsColorsOpen.value = false
  activeTab.value = null
  closeFinish()
  showFlowerTools.value = true
}
async function addCloudMaterial(id: string) {
  if (!pageReady.value || pendingDraft.value)
    return
  const row = catalog.materials.find(item => item.id === id)
  if (!row || addingMaterial.value)
    return
  addingMaterial.value = true
  const request = sessionVersion
  const owner = pageOwner
  try {
    const material = await catalog.ensure(row.id, row.revision)
    if (!alive || request !== sessionVersion || owner !== pageOwner || (owner && owner !== uniCloud.getCurrentUserInfo().uid))
      return
    endDrag(true)
    if (material.category === 'background') {
      store.setBackgroundMaterial(material)
    }
    else if (material.category === 'vase' || material.category === 'bouquet') {
      store.setVaseMaterial(material)
      activeTab.value = null
    }
    else if (store.addMaterial(material) === null) {
      notify('最多放入 48 枝花材')
      return
    }
    closeFlowerTools()
  }
  catch (value) {
    if (alive && request === sessionVersion && owner === pageOwner)
      notify(value instanceof Error ? value.message : '素材加载失败')
  }
  finally {
    if (request === sessionVersion && owner === pageOwner)
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
  else if (stems.value.length >= 48)
    notify('最多放入 48 枝花材')
}
function removeSelected() {
  endDrag(true)
  store.removeSelected()
  closeFlowerTools()
}
</script>

<template>
  <view
    class="flower-studio" :class="{ 'studio-light': background !== 'cocoa' }"
    :style="{ backgroundColor: artworkBackground(background), height: `${device.windowHeight}px` }"
  >
    <view v-if="view === 'edit'" class="studio-stage" :style="{ bottom: `${stageBottom}px`, top: `${stageTop}px` }">
      <view class="studio-artwork" :style="artworkStyle">
        <FlowerBoard
          :background-material-id="backgroundMaterialId" :background-material-revision="backgroundMaterialRevision" :stems="stems" :vase="vase" :vase-material-id="vaseMaterialId" :vase-material-revision="vaseMaterialRevision" :selected-id="selectedId" @start="startDrag" @move="moveDrag"
          @end="endDrag" @clear="closeFlowerTools"
        />
      </view>
    </view>
    <view v-if="activeTab && view === 'edit'" class="panel-backdrop" @click="closePanels" @touchmove.stop.prevent />
    <view v-if="activeTab" class="studio-options-position" :style="{ bottom: `${stageBottom}px` }">
      <StudioOptions
        :tab="activeTab" :vase="vase" :background="background" :background-material-id="backgroundMaterialId" :adding="addingMaterial" @close="activeTab = null" @cloud="addCloudMaterial"
        @background="setBackground"
      />
    </view>
    <view v-if="showFlowerTools && selected" class="studio-flower-tools-position" :style="flowerToolsStyle">
      <StudioFlowerTools
        :stem="selected" :colors-open="toolsColorsOpen" :can-move-back="canMoveBack"
        :can-move-front="canMoveFront" @close="closeFlowerTools" @color="setColor"
        @toggle-colors="toolsColorsOpen = !toolsColorsOpen" @layer="setLayer" @duplicate="duplicateSelected"
        @remove="removeSelected" @mirror="store.mirrorSelected()" @adjacent="store.selectAdjacent"
      />
    </view>
    <view v-if="view !== 'edit'" class="studio-preview-position" :style="{ top: `${navigationInset}px`, bottom: `${toolbarBottom}px` }">
      <StudioArtworkPreview
        v-if="view === 'artwork'" :image-path="imagePath" :exporting="exportingImage" :error="imageError" :read-only="readonly" :busy="savingWork || deletingWork"
        @edit="returnToEdit" @retry="exportImage" @save-image="saveImage()" @preview-image="previewImage()" @share="openCardEditor" @save-work="requestSaveWork" @end="endCreation" @close="closeDetail" @delete-work="deleteWork"
      />
      <StudioCardPreview
        v-else :image-path="cardImagePath" :exporting="exportingCard" :error="cardImageError"
        @back="backToArtwork" @edit-text="openCardEditor" @retry="images.exportCard(card)" @save-image="saveImage('card')" @share="shareImage('card')" @preview-image="previewImage('card')"
      />
    </view>
    <view v-if="!showFinish" class="studio-page-actions-position" :style="{ top: `${pageActionsTop}px` }">
      <StudioHeader
        :can-undo="canUndo" :can-redo="canRedo"
        :can-clear="canClear" @undo="undo" @redo="redo" @reset="reset" @finish="finish"
      />
    </view>
    <view v-if="!showFinish" class="studio-toolbar-position" :style="{ bottom: `${toolbarBottom}px` }">
      <StudioToolbar :active-tab="activeTab" @select="toggleTab" />
    </view>
    <view class="studio-navigation" :style="{ top: `${screen.statusBarHeight || 0}px` }">
      <button class="studio-works-link" :disabled="!pageReady || savingWork || deletingWork" @click="openWorks">
        我的作品
      </button>
      <text @longpress="openAuxiliary">
        花草工作室
      </text>
    </view>
    <view v-if="storageError && !pendingDraft && !startupError" class="storage-warning" :style="{ top: `${pageActionsTop + 58}px` }">
      <text>{{ storageError }}</text><text v-if="draftReadFailed" @click="session.retryDraft">
        重新读取
      </text><text @click="endCreation">
        重新开始
      </text>
    </view>
    <view v-if="!pageReady && !startupError" class="startup-note" :style="{ top: `${pageActionsTop + 58}px` }">
      正在连接账号与素材…
    </view>
    <view v-if="pendingDraft || showCardEditor || showSaveWork || startupError" class="creation-overlay" @touchmove.stop.prevent>
      <view class="creation-modal">
        <StudioRestore v-if="pendingDraft" :error="storageError" @continue="continueDraft" @restart="endCreation" />
        <StudioCardEditor v-else-if="showCardEditor" :text="card" @cancel="cancelCardEditor" @skip="skipCard" @preview="previewCard" />
        <view v-else-if="showSaveWork" class="creation-sheet">
          <view class="creation-title">
            保存到我的作品
          </view>
          <view class="creation-note">
            作品保存在云端，可在其他设备继续编辑。
          </view>
          <input v-model="workTitle" class="work-name-input" :maxlength="40" placeholder="作品名称（最多 40 字）" :disabled="savingWork">
          <view class="creation-actions">
            <button class="creation-button" :disabled="savingWork" @click="showSaveWork = false">
              取消
            </button>
            <button class="creation-button creation-primary" :disabled="savingWork" @click="saveWork">
              {{ savingWork ? '正在保存…' : '保存作品' }}
            </button>
          </view>
        </view>
        <view v-else class="creation-sheet">
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
    <canvas :id="exportCanvasId" :canvas-id="exportCanvasId" class="artwork-export-canvas" :style="{ height: `${canvasHeight}px` }" />
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
  overflow: hidden;
}

.studio-artwork {
  position: absolute;
  transform-origin: 0 0;
}

.studio-toolbar-position {
  position: absolute;
  z-index: 7;
  left: 26rpx;
  right: 26rpx;
}

.studio-page-actions-position {
  position: absolute;
  z-index: 7;
  left: 26rpx;
  right: 26rpx;
}

.panel-backdrop {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(17, 20, 15, .2);
}

.studio-options-position {
  position: absolute;
  z-index: 6;
  left: 26rpx;
  right: 26rpx;
}

.studio-flower-tools-position {
  position: absolute;
  z-index: 3;
}

.studio-finish-position {
  position: absolute;
  z-index: 8;
  left: 26rpx;
  right: 26rpx;
}

.artwork-export-canvas {
  position: fixed;
  left: -2000px;
  top: 0;
  width: 698px;
  height: 1000px;
  pointer-events: none;
}
.studio-navigation { position: absolute; z-index: 9; left: 26rpx; right: 200rpx; height: 44px; display: flex; align-items: center; gap: 20rpx; font-size: 30rpx; }
.studio-works-link { margin: 0; padding: 0 14rpx; background: #e4e8dd; color: #3f463d; border-radius: 18rpx; font-size: 24rpx; line-height: 56rpx; }
.studio-works-link::after { border: none; }
.studio-preview-position { position: absolute; left: 0; right: 0; z-index: 8; }
.creation-overlay { position: fixed; inset: 0; z-index: 20; background: rgba(17,20,15,.25); display: flex; align-items: center; justify-content: center; padding: 30rpx; box-sizing: border-box; }
.creation-modal { width: 100%; max-height: 80vh; overflow: auto; }
.work-name-input { padding: 20rpx; height: 56rpx; font-size: 28rpx; background: #fffdf7; border-radius: 16rpx; margin-bottom: 24rpx; }
.storage-warning { position: absolute; z-index: 8; left: 26rpx; right: 26rpx; font-size: 22rpx; color: #995c50; display: flex; gap: 20rpx; }
.startup-note { position: absolute; left: 0; right: 0; text-align: center; font-size: 24rpx; color: #7c8474; }
</style>
