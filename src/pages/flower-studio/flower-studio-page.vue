<script setup lang="ts">
import type { StudioTab } from './studio-types'
import type { SavedFlowerWork } from '@/models/flower-creation'
import type { FlowerGuideTarget, ReportFlowerGuideTarget } from '@/models/flower-guide'
import { onHide, onLoad, onShareAppMessage, onShareTimeline, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, provide, ref, watch } from 'vue'
import FlowerBoard from '@/components/flower/flower-board.vue'
import { useArtworkImage } from '@/hooks/useArtworkImage'
import { useFlowerCreationSession } from '@/hooks/useFlowerCreationSession'
import { useFlowerDrag } from '@/hooks/useFlowerDrag'
import { useFlowerStudioLayout } from '@/hooks/useFlowerStudioLayout'
import { useCreationArtworkStore } from '@/stores/artworkStore'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useFlowerStudioStore } from '@/stores/flowerStudioStore'
import { creationFailure, useFlowerWorksStore } from '@/stores/flowerWorksStore'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { initializeAppAuth } from '@/utils/appAuth'
import { createCatalogArtwork } from '@/utils/flower/artwork'
import StudioGuide from './components/studio-guide.vue'
import StudioMaterialDock from './components/studio-material-dock.vue'
import StudioTopToolbar from './components/studio-top-toolbar.vue'
import { useStudioGuide } from './composables/useStudioGuide'
import { useStudioSelectionActions } from './composables/useStudioSelectionActions'

const SHARE_TITLE = '选花材，搭配出属于自己的花束'
const SHARE_PATH = '/pages/flower-studio/flower-studio-page'
const SHARE_IMAGE_URL = '/static/share/index-share.png'
const TIMELINE_SHARE_IMAGE_URL = '/static/share/index-share-timeline.png'

definePage({
  type: 'home',
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '花瓶小作',
    navigationBarBackgroundColor: '#f6f3eb',
    disableScroll: true,
    enableShareAppMessage: true,
    enableShareTimeline: true,
  },
})

const artworkStore = useCreationArtworkStore()
const { artwork, materials, container, canClear } = storeToRefs(artworkStore)
const catalog = useFlowerCatalogStore()
const { prepared: preparedMaterials, needsPreparation, prepareError } = storeToRefs(catalog)
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
const completionState = ref<'idle' | 'saving' | 'generating' | 'ready' | 'failed'>('idle')
const dailyFlower = useDailyFlowerStore()
const guide = useStudioGuide()
const guideStep = guide.step
watch(activeTab, (tab) => {
  if (guideStep.value === 'flowers' && tab !== 'flowers')
    guideStep.value = 'open-flowers'
  else if (guideStep.value === 'open-flowers' && tab === 'flowers')
    guideStep.value = 'flowers'
}, { flush: 'sync' })
const guideAvailable = computed(() => pageReady.value && !startupError.value && !prepareError.value && !storageError.value && !pendingDraft.value && completionState.value === 'idle' && !dailyFlower.loading && !dailyFlower.visible)
provide('studioGuideStep', computed(() => guideAvailable.value ? guideStep.value : null))
const guideTarget = ref<FlowerGuideTarget | null>(null)
let guideTargetOwner = -1
const reportGuideTarget: ReportFlowerGuideTarget = (target, owner) => {
  if (target) {
    if (target.step !== guideStep.value)
      return
    guideTargetOwner = owner
    guideTarget.value = target
  }
  else if (owner === guideTargetOwner) {
    guideTarget.value = null
    guideTargetOwner = -1
  }
}
provide('studioGuideTarget', reportGuideTarget)
let guideDragSnapshot = ''

function startGuidedDrag(...args: Parameters<typeof startDrag>) {
  guideDragSnapshot = JSON.stringify(materials.value)
  startDrag(...args)
}

function endGuidedDrag(cancelled: boolean) {
  endDrag(cancelled)
  if (!cancelled && guideDragSnapshot && guideDragSnapshot !== JSON.stringify(materials.value))
    guide.arranged()
  guideDragSnapshot = ''
}

const completedWork = ref<SavedFlowerWork>()
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
  // #ifdef MP-WEIXIN
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  })
  // #endif

  detailId.value = String(query?.workId || '')
  void bootstrap()
})
onShow(() => {
  if (!bootTask && alive && !pageReady.value)
    void bootstrap()
})
onHide(() => { endDrag(true); session.flushDraft() })
onUnload(() => {
  if (detailId.value && !session.hasUnsavedChanges.value)
    void resetWorkspaceAfterLeave()
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

onShareAppMessage(() => ({
  title: SHARE_TITLE,
  path: SHARE_PATH,
  imageUrl: SHARE_IMAGE_URL,
}))

onShareTimeline(() => ({
  title: SHARE_TITLE,
  imageUrl: TIMELINE_SHARE_IMAGE_URL,
}))

watch(() => JSON.stringify(artworkStore.snapshot()), () => {
  if (pageReady.value && !applying)
    session.markEdited()
}, { flush: 'sync' })
watch(storageError, (value) => {
  if (value)
    notify(value)
})
watch(() => materials.value.length, (count) => {
  if (!count && (guideStep.value === 'arrange' || guideStep.value === 'save'))
    guideStep.value = activeTab.value === 'flowers' ? 'flowers' : 'open-flowers'
})

function notify(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function referencedMaterialIds() {
  const value = artworkStore.snapshot()
  return [value.background.materialId, value.container.materialId, ...value.materials.map(item => item.materialId)]
}

async function prepareArtwork() {
  await catalog.prepareFor(referencedMaterialIds())
  for (const id of referencedMaterialIds()) {
    if (!catalog.get(id))
      throw new Error('作品引用的素材不可用')
  }
}

async function initializeDefaultArtwork(force = false) {
  if (!force && container.value.materialId) {
    await prepareArtwork()
    return
  }
  const containerRecord = catalog.materials.find(item => item.category === 'vase')
  // 默认使用斜窗晨光背景。
  const backgroundRecord = catalog.materials.find(item => item.id === 'light-window-diagonal')
    || catalog.materials.find(item => item.category === 'background')
  if (!containerRecord || !backgroundRecord)
    throw new Error('创作素材尚未准备完整')
  await catalog.prepareFor([containerRecord.id, backgroundRecord.id])
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
      if (!alive || pageReady.value)
        return
      session.initialize(uid, Boolean(detailId.value))
      let restoring = Boolean(pendingDraft.value)
      let useDefaultArtwork = draftReadFailed.value
      if (restoring) {
        applying = true
        try { session.continueDraft() }
        catch (error) {
          console.error('[flower-draft] apply failed', error)
          restoring = false
          useDefaultArtwork = true
        }
        finally { applying = false }
      }
      await catalog.preload()
      if (!alive)
        return
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
      if (detailId.value) {
        await prepareArtwork()
      }
      else {
        if (restoring) {
          try { await prepareArtwork() }
          catch (error) {
            console.error('[flower-draft] materials failed', error)
            useDefaultArtwork = true
          }
        }
        if (useDefaultArtwork) {
          await initializeDefaultArtwork(true)
          session.startFreshDraft()
        }
        else if (!restoring) {
          await initializeDefaultArtwork()
        }
      }
      if (!alive)
        return
      startupError.value = ''
      pageReady.value = true
      if (!detailId.value && !restoring && !draftReadFailed.value && !materials.value.length)
        guide.start(true, materials.value.length ? 'arrange' : 'open-flowers')
      void catalog.preloadRemaining()
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
    if (pageReady.value)
      await prepareArtwork()
    else
      await bootstrap()
  }
  catch { /* 保留素材错误提示，供用户重试。 */ }
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
      if (guideStep.value === 'flowers') {
        guide.added()
        studio.closePanel()
      }
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
  if (finishing.value || completionState.value !== 'idle' || pendingMaterialId.value || needsPreparation.value)
    return
  endDrag(true)
  studio.closePanel()
  studio.clearSelection()
  session.flushDraft()
  finishing.value = true
  completionState.value = 'saving'
  try {
    const work = await saveCurrentWork()
    if (!work || !alive)
      return
    completedWork.value = work
    // 完成后仍可留在工作台编辑，保留草稿和作品 ID，后续保存更新同一作品。
    if (!session.saved(work, true))
      notify(storageError.value || '作品已保存，但本地草稿保存失败')
    if (guideStep.value)
      guide.dismiss()
    completionState.value = 'generating'
    if (await images.exportImage(work.id))
      completionState.value = 'ready'
    else
      completionState.value = 'failed'
  }
  catch (error) {
    if (alive) {
      completionState.value = 'idle'
      notify(creationFailure(error))
    }
  }
  finally {
    applying = false
    finishing.value = false
  }
}

async function retryCompletedImage() {
  if (!completedWork.value || finishing.value)
    return
  finishing.value = true
  completionState.value = 'generating'
  try {
    completionState.value = await images.exportImage(completedWork.value.id) ? 'ready' : 'failed'
  }
  finally {
    finishing.value = false
  }
}

async function resetAfterCompletion() {
  const work = completedWork.value
  if (!work)
    return
  applying = true
  try {
    if (!session.saved(work))
      notify(storageError.value || '作品已保存，但本地草稿清理失败')
    detailId.value = ''
    completedWork.value = undefined
    completionState.value = 'idle'
    images.invalidate()
    await initializeDefaultArtwork(true)
  }
  finally {
    applying = false
  }
}

function closeCompletion() {
  completedWork.value = undefined
  completionState.value = 'idle'
  images.invalidate()
}

function shareCompleted() {
  images.shareImage()
}

function makeCompletedCard() {
  const workId = completedWork.value?.id
  if (!workId)
    return
  uni.navigateTo({
    url: `/pages/flower-card/flower-card-page?workId=${workId}`,
    success: () => {
      void resetAfterCompletion().catch(error => notify(creationFailure(error)))
    },
    fail: () => notify('贺卡页面打开失败，请重试'),
  })
}

async function resetWorkspaceAfterLeave() {
  applying = true
  try {
    closePanels()
    detailId.value = ''
    images.invalidate()
    await initializeDefaultArtwork(true)
    session.startFreshDraft()
  }
  finally {
    applying = false
  }
}

function requestLeave(leave: () => void) {
  if (finishing.value)
    return
  endDrag(true)
  const isNewWorkWithContent = !session.workId.value && Boolean(materials.value.length || session.card.value.blessing || session.card.value.signature)
  const meaningful = Boolean(pendingMaterialId.value || session.hasUnsavedChanges.value || isNewWorkWithContent)
  if (!meaningful) {
    if (!session.discard()) {
      notify(storageError.value || '本地草稿清理失败，请重试')
      return
    }
    void resetWorkspaceAfterLeave()
      .then(leave)
      .catch(error => notify(creationFailure(error)))
    return
  }
  uni.showModal({
    title: '作品尚未保存',
    content: '保存作品后再离开吗？',
    confirmText: '保存作品',
    cancelText: '放弃离开',
    success: async (result) => {
      if (!result.confirm) {
        sessionVersion++
        pendingMaterialId.value = null
        if (!session.discard())
          return
        try {
          await resetWorkspaceAfterLeave()
          leave()
        }
        catch (error) {
          if (alive)
            notify(creationFailure(error))
        }
        return
      }
      if (pendingMaterialId.value)
        return notify('花材正在准备，请稍后再保存')
      finishing.value = true
      try {
        const work = await saveCurrentWork()
        if (work && alive) {
          if (!session.saved(work)) {
            notify(storageError.value || '作品已保存，但本地草稿清理失败')
            return
          }
          await resetWorkspaceAfterLeave()
          leave()
        }
      }
      catch (error) {
        if (alive)
          notify(creationFailure(error))
      }
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
async function retryLocalDraft() {
  if (session.retryDraft() && pendingDraft.value)
    await continueDraft()
}
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
function closeDetail() { requestLeave(() => uni.navigateBack()) }
</script>

<template>
  <view class="flower-studio studio-light" style="height: 100vh;">
    <view class="studio-stage" :style="{ bottom: `${layout.stageBottom}px`, top: `${layout.stageTop}px` }">
      <view class="studio-artwork" :style="layout.workspaceStyle">
        <view class="studio-board-scale" :style="layout.boardStyle">
          <FlowerBoard :artwork="artwork" :prepared-materials="preparedMaterials" :selected-id="selectedMaterialId" :pick-scope="selectionFilter" :pick-material-id="selectionMaterialId" :guide-arrange="guideStep === 'arrange' && guideAvailable" @start="startGuidedDrag" @move="moveDrag" @end="endGuidedDrag" @clear="closeFlowerTools" />
        </view>
      </view>
    </view>
    <StudioMaterialDock
      :toolbar-bottom="layout.toolbarBottom" :stage-bottom="layout.stageBottom" @select="toggleTab" @close="studio.closePanel"
      @dismiss="closePanels" @material="selectCatalogMaterial" @focus="focusSelectionMaterial" @instance="selectSelectionInstance"
      @color="setColor" @toggle-colors="colorsExpanded = !colorsExpanded" @layer="setLayer"
      @duplicate="duplicateSelected" @remove="removeSelected" @mirror="mirrorSelected"
    />
    <StudioTopToolbar :navigation-top="layout.navigationStatusTop" :navigation-height="layout.navigationHeight" :actions-top="layout.pageActionsTop" @works="openWorks" @today="openDailyFlowers" @undo="undo" @redo="redo" @reset="clearMaterials" @finish="finish" />
    <StudioGuide
      v-if="guideStep && guideAvailable"
      :step="guideStep" :target="guideTarget" :window-width="layout.device.windowWidth" :window-height="layout.device.windowHeight"
    />
    <view v-if="storageError && !pendingDraft && !startupError && !needsPreparation" class="storage-warning" :style="{ top: `${layout.pageActionsTop + 58}px` }">
      <text>{{ storageError }}</text><text v-if="draftReadFailed" @click="retryLocalDraft">
        重新读取
      </text><text @click="endCreation">
        重新开始
      </text>
    </view>
    <view v-if="prepareError && !startupError" class="storage-warning" :style="{ top: `${layout.pageActionsTop + 58}px` }" role="status">
      <text>{{ prepareError }}</text>
      <text @click="retryMaterialPreparation">
        重新加载
      </text>
    </view>
    <view v-if="completionState !== 'idle'" class="creation-overlay completion-overlay" @click="completionState === 'ready' && closeCompletion()" @touchmove.stop.prevent>
      <view class="completion-sheet" @click.stop>
        <template v-if="completionState === 'saving' || completionState === 'generating'">
          <view class="completion-bloom" aria-hidden="true">
            ✿
          </view>
          <text class="completion-title">
            {{ completionState === 'saving' ? '正在收好这束花…' : '正在制作作品图片…' }}
          </text>
          <text class="completion-note">
            {{ completionState === 'saving' ? '正在保存作品' : '作品已保存，请稍候' }}
          </text>
        </template>
        <template v-else-if="completionState === 'failed'">
          <view class="completion-bloom completion-bloom-still" aria-hidden="true">
            ✿
          </view>
          <text class="completion-title">
            图片还没有准备好
          </text>
          <text class="completion-note">
            {{ images.imageError.value || '作品已保存，请重试生成图片' }}
          </text>
          <view class="completion-actions">
            <view class="completion-button-wrap completion-button-primary">
              <button class="completion-primary" @click="retryCompletedImage">
                重新生成
              </button>
            </view>
          </view>
        </template>
        <template v-else>
          <button class="completion-close" aria-label="关闭完成作品弹窗" @click="closeCompletion">
            ×
          </button>
          <view class="completion-kicker">
            我的花作
          </view>
          <text class="completion-title">
            这束花已经完成
          </text>
          <view v-if="images.imagePath.value" class="completion-photo">
            <view class="completion-tape" aria-hidden="true" />
            <image class="completion-image" :src="images.imagePath.value" mode="aspectFit" @click="images.previewImage()" />
          </view>
          <view class="completion-actions">
            <view class="completion-button-wrap completion-button-secondary">
              <button class="completion-secondary" @click="shareCompleted">
                <view class="i-carbon-share" />分享图片
              </button>
            </view>
            <view class="completion-button-wrap completion-button-primary">
              <button class="completion-primary" @click="makeCompletedCard">
                <view class="i-carbon-image" />制作贺卡
              </button>
            </view>
          </view>
        </template>
      </view>
    </view>
    <view v-if="startupError" class="creation-overlay" @touchmove.stop.prevent>
      <view class="creation-modal">
        <view class="creation-sheet">
          <view class="creation-title">
            暂时无法打开
          </view><view class="creation-error">
            {{ startupError }}
          </view><view class="creation-actions">
            <button v-if="detailId" class="creation-button" @click="closeDetail">
              返回作品列表
            </button><button v-else-if="initialized" class="creation-button" @click="endCreation">
              重新开始
            </button><button class="creation-button creation-primary" @click="retryStartup">
              重试
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
@use '@/styles/flower-creation.scss';
@use '@/styles/flower-completion.scss';
.flower-studio{position:relative;min-height:100vh;width:750rpx;overflow:hidden;background:radial-gradient(circle at 13% 18%,rgba(139,121,94,.045) 0 2rpx,transparent 3rpx),radial-gradient(circle at 81% 70%,rgba(139,121,94,.035) 0 2rpx,transparent 3rpx),$studio-paper;background-size:42rpx 42rpx,54rpx 54rpx,auto;color:$studio-ink}.studio-stage{position:absolute;left:38rpx;right:38rpx;z-index:5;display:flex;align-items:center;justify-content:center;overflow:hidden}.studio-artwork{position:relative;flex-shrink:0;z-index:1;overflow:hidden;outline:1rpx solid rgba(102,84,63,.2);border-radius:2rpx 5rpx 3rpx 4rpx;background:#f7f4ec;box-shadow:5rpx 7rpx 0 rgba(195,177,148,.2),0 14rpx 28rpx rgba(88,74,55,.075)}.studio-board-scale{position:absolute;top:0;left:0;transform-origin:0 0}.creation-overlay{position:fixed;inset:0;z-index:20;background:rgba(53,46,38,.3);display:flex;align-items:center;justify-content:center;padding:30rpx;box-sizing:border-box}.creation-modal{width:100%;max-height:80vh;overflow:auto}.storage-warning{position:absolute;z-index:8;left:26rpx;right:26rpx;display:flex;gap:20rpx;padding:12rpx 18rpx;border:1rpx solid rgba(153,92,80,.22);border-radius:14rpx;background:rgba(245,234,215,.96);box-shadow:0 6rpx 16rpx rgba(88,74,55,.055);color:#995c50;font-size:22rpx}
</style>
