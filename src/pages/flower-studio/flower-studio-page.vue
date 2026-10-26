<script setup lang="ts">
import type { StudioTab } from './studio-types'
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
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { initializeAppAuth } from '@/utils/appAuth'
import { createCatalogArtwork } from '@/utils/flower/artwork'
import { useStudioSelectionActions } from './composables/useStudioSelectionActions'
import StudioMaterialDock from './components/studio-material-dock.vue'
import StudioMaterialPrepareModal from './components/studio-material-prepare-modal.vue'
import StudioTopToolbar from './components/studio-top-toolbar.vue'

definePage({
  type: 'home',
  layout: 'default',
  style: { navigationStyle: 'custom', navigationBarTitleText: '花瓶小作', navigationBarBackgroundColor: '#f6f3eb', disableScroll: true },
})

const artworkStore = useCreationArtworkStore()
const { artwork, materials, container, canClear } = storeToRefs(artworkStore)
const catalog = useFlowerCatalogStore()
const { prepared: preparedMaterials, needsPreparation, preparePercent, prepareMessage, prepareError } = storeToRefs(catalog)
const studio = useFlowerStudioStore()
studio.reset()
const { pageReady, finishing, startupError, pendingMaterialId, lastAddedMaterialId, selectedMaterialId, activeTab, colorsExpanded, selectionFilter, selectionMaterialId } = storeToRefs(studio)
const session = useFlowerCreationSession(artworkStore)
const { pendingDraft, storageError, readonly, initialized, draftReadFailed } = session
const works = useFlowerWorksStore()
const userInfo = useUserInfoStore()
const layout = useFlowerStudioLayout()
const images = useArtworkImage(artworkStore.snapshot)
let cancelDrag = () => {}
const selectionActions = useStudioSelectionActions(() => cancelDrag(), images.invalidate)
const {
  closeFlowerTools,
  openFlowerTools,
  setColor,
  setLayer,
  mirrorSelected,
  duplicateSelected,
  removeSelected,
  focusSelectionMaterial,
  selectSelectionInstance,
  undo,
  redo,
} = selectionActions
const detailId = ref('')
let applying = false
let alive = true
let sessionVersion = 0
let bootTask: Promise<void> | null = null
let addedMaterialTimer: ReturnType<typeof setTimeout> | null = null
const { startDrag, moveDrag, endDrag } = useFlowerDrag(
  artworkStore,
  layout,
  id => catalog.get(id),
  () => catalog.get(container.value.materialId),
  () => selectedMaterialId.value,
  openFlowerTools,
)
cancelDrag = () => endDrag(true)

onLoad((query) => {
  detailId.value = String(query?.workId || '')
  void bootstrap()
})
onShow(() => { if (!bootTask && alive && !pageReady.value) void bootstrap() })
onHide(() => { endDrag(true); session.flushDraft() })
onUnload(() => {
  alive = false
  if (addedMaterialTimer)
    clearTimeout(addedMaterialTimer)
  sessionVersion++
  endDrag(true)
  session.dispose()
  images.invalidate()
  studio.reset()
  artworkStore.$dispose()
})

watch(() => JSON.stringify(artworkStore.snapshot()), () => {
  if (pageReady.value && !applying)
    session.markEdited()
}, { flush: 'sync' })
watch(storageError, (value) => { if (value) notify(value) })

function notify(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function referencedMaterialIds() {
  const value = artworkStore.snapshot()
  return [value.background.materialId, value.container.materialId, ...value.materials.map(item => item.materialId)]
}

async function prepareArtwork() {
  for (const id of referencedMaterialIds()) {
    if (!catalog.get(id))
      throw new Error('作品引用的素材不可用')
  }
}

async function initializeDefaultArtwork(force = false) {
  if (!force && container.value.materialId)
    return
  const containerRecord = catalog.materials.find(item => item.category === 'vase' || item.category === 'bouquet')
  const backgroundRecord = catalog.materials.find(item => item.category === 'background')
  if (!containerRecord || !backgroundRecord)
    throw new Error('创作素材尚未准备完整')
  const containerMaterial = catalog.get(containerRecord.id)
  const backgroundMaterial = catalog.get(backgroundRecord.id)
  if (!containerMaterial || !backgroundMaterial)
    throw new Error('创作素材尚未准备完整')
  artworkStore.initialize(createCatalogArtwork(containerMaterial, backgroundMaterial))
}

function bootstrap(): Promise<void> {
  if (bootTask)
    return bootTask
  bootTask = (async () => {
    try {
      const uid = await userInfo.requireUid('请先登录后创作')
      await catalog.prepareAll()
      if (!alive || pageReady.value)
        return
      session.initialize(uid, Boolean(detailId.value))
      const restoring = Boolean(pendingDraft.value)
      if (restoring) {
        applying = true
        session.continueDraft()
        applying = false
      }
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
      if (detailId.value || restoring)
        await prepareArtwork()
      else
        await initializeDefaultArtwork()
      startupError.value = ''
      pageReady.value = true
    }
    catch (error) {
      if (!catalog.prepareError)
        startupError.value = creationFailure(error)
    }
    finally {
      bootTask = null
    }
  })()
  return bootTask
}

async function retryMaterialPreparation() {
  try {
    await catalog.retryPreparation()
    await bootstrap()
  }
  catch { /* Modal 保持打开并展示安全错误文案。 */ }
}

async function retryStartup() {
  try {
    await initializeAppAuth(true)
    startupError.value = ''
    await bootstrap()
  }
  catch (error) {
    startupError.value = creationFailure(error)
  }
}

function closePanels() {
  artworkStore.endEdit()
  studio.closePanel()
  studio.clearSelection()
  images.invalidate()
}

function toggleTab(tab: StudioTab) {
  if (!pageReady.value || pendingDraft.value)
    return
  endDrag(true)
  if (activeTab.value === tab) {
    studio.clearSelection()
    images.invalidate()
    return
  }
  studio.clearSelection()
  studio.openTab(tab)
  images.invalidate()
}

async function selectCatalogMaterial(id: string) {
  if (!pageReady.value || pendingDraft.value || pendingMaterialId.value)
    return
  const record = catalog.materials.find(item => item.id === id)
  if (!record)
    return
  pendingMaterialId.value = id
  const request = sessionVersion
  try {
    const material = await catalog.ensure(id)
    if (!alive || request !== sessionVersion)
      return
    endDrag(true)
    if (material.category === 'background') {
      artworkStore.setBackground(material)
    }
    else if (material.category === 'vase' || material.category === 'bouquet') {
      artworkStore.setContainer(material, materialId => catalog.get(materialId))
      studio.closePanel()
      studio.clearSelection()
    }
    else {
      const containerMaterial = catalog.get(container.value.materialId)
      if (!containerMaterial)
        throw new Error('当前容器不可用')
      const id = artworkStore.addMaterial(material, containerMaterial)
      if (id === null)
        return
      studio.recordRecentMaterial(material.id)
      lastAddedMaterialId.value = material.id
      if (addedMaterialTimer)
        clearTimeout(addedMaterialTimer)
      addedMaterialTimer = setTimeout(() => { lastAddedMaterialId.value = '' }, 1200)
    }
  }
  catch (error) {
    if (alive && request === sessionVersion)
      notify(error instanceof Error ? error.message : '素材加载失败')
  }
  finally {
    if (request === sessionVersion)
      pendingMaterialId.value = null
  }
}

function clearMaterials() {
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
      artworkStore.clearMaterials()
      studio.clearSelection()
    },
  })
}

async function saveCurrentWork() {
  if (!container.value.materialId)
    throw new Error('创作空间尚未准备好')
  const draft = session.snapshot()
  await prepareArtwork()
  if (!alive)
    return null
  const now = new Date()
  let title = `花意 ${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  let description = ''
  if (draft.workId) {
    const original = await works.get(draft.workId)
    if (!alive)
      return null
    title = original.title
    description = original.description
  }
  return works.save({ draft, title, description, workId: draft.workId })
}

async function finish() {
  if (finishing.value || pendingMaterialId.value || needsPreparation.value)
    return
  endDrag(true)
  studio.closePanel()
  studio.clearSelection()
  session.flushDraft()
  finishing.value = true
  try {
    const work = await saveCurrentWork()
    if (!work || !alive)
      return
    await new Promise<void>((resolve, reject) => uni.navigateTo({ url: `/pages/flower-detail/flower-detail-page?workId=${work.id}`, success: () => resolve(), fail: reject }))
    if (!alive)
      return
    applying = true
    const cleared = session.saved(work)
    if (!cleared)
      notify(storageError.value || '作品已保存，但本地草稿清理失败')
    detailId.value = ''
    images.invalidate()
    await initializeDefaultArtwork(true)
  }
  catch (error) {
    if (alive)
      notify(creationFailure(error))
  }
  finally {
    applying = false
    finishing.value = false
  }
}

function requestLeave(leave: () => void) {
  if (finishing.value)
    return
  endDrag(true)
  const meaningful = Boolean(pendingMaterialId.value || session.hasUnsavedChanges.value || materials.value.length || session.card.value.blessing || session.card.value.signature || session.workId.value)
  if (!meaningful) {
    session.flushDraft()
    leave()
    return
  }
  uni.showModal({
    title: '作品尚未保存', content: '保存作品后再离开吗？', confirmText: '保存作品', cancelText: '放弃离开',
    success: async (result) => {
      if (!result.confirm) {
        sessionVersion++
        pendingMaterialId.value = null
        if (session.discard())
          leave()
        return
      }
      if (pendingMaterialId.value)
        return notify('花材正在准备，请稍后再保存')
      finishing.value = true
      try {
        const work = await saveCurrentWork()
        if (work && alive) {
          if (!session.saved(work))
            notify(storageError.value || '作品已保存，但本地草稿清理失败')
          leave()
        }
      }
      catch (error) { if (alive) notify(creationFailure(error)) }
      finally { finishing.value = false }
    },
    fail: error => notify(creationFailure(error)),
  })
}

function openWorks() { requestLeave(() => uni.navigateTo({ url: '/pages/flower-works/flower-works-page' })) }
function openDailyFlowers() {
  requestLeave(() => {
    closePanels()
    uni.navigateTo({ url: '/pages/daily-flower/daily-flower-page', events: { 'daily-flower-copied': (payload: { workId: string }) => void openCopiedDailyFlower(payload.workId) } })
  })
}
async function openCopiedDailyFlower(workId: string) {
  if (!/^[a-f\d]{32}$/.test(workId))
    return notify('复制的作品编号无效')
  pageReady.value = false
  applying = true
  try {
    const work = await works.get(workId)
    if (!alive)
      return
    closePanels()
    session.openWork(work)
    session.editWork()
    detailId.value = work.id
    await prepareArtwork()
    startupError.value = ''
  }
  catch (error) { startupError.value = creationFailure(error) }
  finally { applying = false; pageReady.value = true }
}

async function continueDraft() {
  pageReady.value = false
  applying = true
  try { session.continueDraft(); images.invalidate(); await prepareArtwork() }
  catch (error) { startupError.value = creationFailure(error) }
  finally { applying = false; pageReady.value = true }
}
async function retryLocalDraft() { if (session.retryDraft() && pendingDraft.value) await continueDraft() }
async function endCreation() {
  if (readonly.value)
    return
  applying = true
  const restarted = session.restart()
  applying = false
  if (!restarted)
    return
  sessionVersion++
  pendingMaterialId.value = null
  studio.closePanel()
  studio.clearSelection()
  startupError.value = ''
  detailId.value = ''
  await initializeDefaultArtwork()
  pageReady.value = true
}
function closeDetail() { uni.navigateBack() }
</script>

<template>
  <view class="flower-studio studio-light" :style="{ backgroundColor: '#f6f3eb', height: `${layout.device.windowHeight}px` }">
    <view class="studio-stage" :style="{ bottom: `${layout.stageBottom}px`, top: `${layout.stageTop}px` }">
      <view class="studio-artwork" :style="layout.workspaceStyle">
        <FlowerBoard :artwork="artwork" :prepared-materials="preparedMaterials" :selected-id="selectedMaterialId" :pick-scope="selectionFilter" :pick-material-id="selectionMaterialId" @start="startDrag" @move="moveDrag" @end="endDrag" @clear="closeFlowerTools" />
      </view>
    </view>
    <StudioMaterialDock
      :toolbar-bottom="layout.toolbarBottom" :stage-bottom="layout.stageBottom" @select="toggleTab" @close="studio.closePanel"
      @dismiss="closePanels" @material="selectCatalogMaterial" @focus="focusSelectionMaterial" @instance="selectSelectionInstance"
      @color="setColor" @toggle-colors="colorsExpanded = !colorsExpanded" @layer="setLayer"
      @duplicate="duplicateSelected" @remove="removeSelected" @mirror="mirrorSelected"
    />
    <StudioTopToolbar :navigation-top="layout.navigationStatusTop" :navigation-height="layout.navigationHeight" :actions-top="layout.pageActionsTop" @works="openWorks" @today="openDailyFlowers" @undo="undo" @redo="redo" @reset="clearMaterials" @finish="finish" />
    <view v-if="storageError && !pendingDraft && !startupError" class="storage-warning" :style="{ top: `${layout.pageActionsTop + 58}px` }"><text>{{ storageError }}</text><text v-if="draftReadFailed" @click="retryLocalDraft">重新读取</text><text @click="endCreation">重新开始</text></view>
    <StudioMaterialPrepareModal v-if="needsPreparation" :percent="preparePercent" :message="prepareMessage" :error="prepareError" @retry="retryMaterialPreparation" />
    <view v-if="startupError" class="creation-overlay" @touchmove.stop.prevent><view class="creation-modal"><view class="creation-sheet"><view class="creation-title">暂时无法打开</view><view class="creation-error">{{ startupError }}</view><view class="creation-actions"><button v-if="detailId" class="creation-button" @click="closeDetail">返回作品列表</button><button v-else-if="initialized" class="creation-button" @click="endCreation">重新开始</button><button class="creation-button creation-primary" @click="retryStartup">重试</button></view></view></view></view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
@use '@/styles/flower-creation.scss';
.flower-studio{position:relative;min-height:100vh;width:750rpx;overflow:hidden;color:$studio-ink}.studio-stage{position:absolute;left:0;right:0;z-index:5;overflow:hidden}.studio-artwork{position:absolute;transform-origin:0 0}.creation-overlay{position:fixed;inset:0;z-index:20;background:rgba(17,20,15,.25);display:flex;align-items:center;justify-content:center;padding:30rpx;box-sizing:border-box}.creation-modal{width:100%;max-height:80vh;overflow:auto}.storage-warning{position:absolute;z-index:8;left:26rpx;right:26rpx;font-size:22rpx;color:#995c50;display:flex;gap:20rpx}
</style>
