<script setup lang="ts">
import type { SavedFlowerWork } from '@/models/flower-creation'
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
const completionState = ref<'idle' | 'saving' | 'generating' | 'ready' | 'failed'>('idle')
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

async function closeCompletion() {
  await resetAfterCompletion()
}

async function shareCompleted() {
  images.shareImage()
  await resetAfterCompletion()
}

async function makeCompletedCard() {
  const workId = completedWork.value?.id
  if (!workId)
    return
  await resetAfterCompletion()
  uni.navigateTo({ url: `/pages/flower-card/flower-card-page?workId=${workId}` })
}

async function resetWorkspaceAfterLeave() {
  applying = true
  try {
    closePanels()
    detailId.value = ''
    images.invalidate()
    await initializeDefaultArtwork(true)
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
        if (!session.discard())
          return
        try {
          await resetWorkspaceAfterLeave()
          leave()
        }
        catch (error) { if (alive) notify(creationFailure(error)) }
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
  <view class="flower-studio studio-light" :style="{ height: `${layout.device.windowHeight}px` }">
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
    <view v-if="completionState !== 'idle'" class="creation-overlay completion-overlay" @click="completionState === 'ready' && closeCompletion()" @touchmove.stop.prevent>
      <view class="completion-sheet" @click.stop>
        <template v-if="completionState === 'saving' || completionState === 'generating'">
          <view class="completion-bloom" aria-hidden="true">✿</view>
          <text class="completion-title">{{ completionState === 'saving' ? '正在收好这束花…' : '正在制作作品图片…' }}</text>
          <text class="completion-note">{{ completionState === 'saving' ? '正在保存作品' : '作品已保存，请稍候' }}</text>
        </template>
        <template v-else-if="completionState === 'failed'">
          <view class="completion-bloom completion-bloom-still" aria-hidden="true">✿</view>
          <text class="completion-title">图片还没有准备好</text>
          <text class="completion-note">{{ images.imageError.value || '作品已保存，请重试生成图片' }}</text>
          <view class="completion-actions">
            <button class="completion-primary" @click="retryCompletedImage">重新生成</button>
          </view>
        </template>
        <template v-else>
          <button class="completion-close" aria-label="关闭完成作品弹窗" @click="closeCompletion">×</button>
          <view class="completion-kicker">我的花作</view>
          <text class="completion-title">这束花已经完成</text>
          <text class="completion-note">可以分享作品，也可以把它做成贺卡</text>
          <image
            v-if="images.imagePath.value" class="completion-image" :src="images.imagePath.value"
            mode="aspectFit" @click="images.previewImage()"
          />
          <view class="completion-actions">
            <button class="completion-secondary" @click="shareCompleted"><view class="i-carbon-share" />分享图片</button>
            <button class="completion-primary" @click="makeCompletedCard"><view class="i-carbon-image" />制作贺卡</button>
          </view>
        </template>
      </view>
    </view>
    <view v-if="startupError" class="creation-overlay" @touchmove.stop.prevent><view class="creation-modal"><view class="creation-sheet"><view class="creation-title">暂时无法打开</view><view class="creation-error">{{ startupError }}</view><view class="creation-actions"><button v-if="detailId" class="creation-button" @click="closeDetail">返回作品列表</button><button v-else-if="initialized" class="creation-button" @click="endCreation">重新开始</button><button class="creation-button creation-primary" @click="retryStartup">重试</button></view></view></view></view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
@use '@/styles/flower-creation.scss';
.flower-studio{position:relative;min-height:100vh;width:750rpx;overflow:hidden;background:radial-gradient(circle at 13% 18%,rgba(139,121,94,.045) 0 2rpx,transparent 3rpx),radial-gradient(circle at 81% 70%,rgba(139,121,94,.035) 0 2rpx,transparent 3rpx),$studio-paper;background-size:42rpx 42rpx,54rpx 54rpx,auto;color:$studio-ink}.studio-stage{position:absolute;left:38rpx;right:38rpx;z-index:5;overflow:visible}.studio-artwork{position:absolute;z-index:1;overflow:hidden;transform-origin:0 0;outline:1rpx solid rgba(102,84,63,.2);border-radius:2rpx 5rpx 3rpx 4rpx;background:#f7f4ec;box-shadow:5rpx 7rpx 0 rgba(195,177,148,.2),0 14rpx 28rpx rgba(88,74,55,.075)}.creation-overlay{position:fixed;inset:0;z-index:20;background:rgba(53,46,38,.3);display:flex;align-items:center;justify-content:center;padding:30rpx;box-sizing:border-box}.creation-modal{width:100%;max-height:80vh;overflow:auto}.storage-warning{position:absolute;z-index:8;left:26rpx;right:26rpx;display:flex;gap:20rpx;padding:12rpx 18rpx;border:1rpx solid rgba(153,92,80,.22);border-radius:14rpx;background:rgba(245,234,215,.96);box-shadow:0 6rpx 16rpx rgba(88,74,55,.055);color:#995c50;font-size:22rpx}
.completion-overlay{z-index:30;padding:40rpx;background:rgba(35,41,34,.58)}.completion-sheet{position:relative;display:flex;width:100%;max-width:660rpx;max-height:94vh;overflow:auto;box-sizing:border-box;flex-direction:column;align-items:center;padding:34rpx 28rpx 28rpx;border:1rpx solid #e7e2d5;border-radius:30rpx;background:#fffdf7;box-shadow:0 20rpx 80rpx rgba(30,38,29,.2);text-align:center}.completion-bloom{color:#8b9b78;font-size:72rpx;line-height:1;animation:completion-bloom 1.6s ease-in-out infinite}.completion-bloom-still{animation:none}.completion-kicker{color:#849c81;font-size:19rpx;letter-spacing:5rpx}.completion-title{margin-top:8rpx;color:#3f463d;font-family:STKaiti,KaiTi,serif;font-size:36rpx;font-weight:650}.completion-note{margin-top:8rpx;color:#818779;font-size:23rpx;line-height:1.6}.completion-image{display:block;width:100%;height:620rpx;margin-top:18rpx;border-radius:18rpx;background:#f2f0e9}.completion-actions{display:flex;width:100%;gap:16rpx;margin-top:20rpx}.completion-actions button{display:flex;flex:1;align-items:center;justify-content:center;gap:10rpx;margin:0;height:84rpx;border-radius:44rpx;font-size:25rpx}.completion-actions button::after,.completion-close::after{border:0}.completion-primary{background:#758c70;color:#fffdf7}.completion-secondary{border:1rpx solid #dcded3;background:#fffdf7;color:#58624f}.completion-close{position:absolute;top:14rpx;right:16rpx;width:56rpx;height:56rpx;margin:0;padding:0;border:0;border-radius:50%;background:#f1f0e9;color:#6f7964;font-size:42rpx;line-height:52rpx}.completion-close::after{border:0}@keyframes completion-bloom{0%,100%{transform:scale(.92) rotate(-5deg);opacity:.72}50%{transform:scale(1.08) rotate(5deg);opacity:1}}
</style>
