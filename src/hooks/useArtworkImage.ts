import type { Artwork } from '@/models/artwork'
import type { FlowerCardText } from '@/models/flower-creation'
import { getCurrentInstance, nextTick, ref } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { renderArtwork } from '@/utils/flower/render-artwork'
import { renderFlowerCard } from '@/utils/flower/render-flower-card'

type ImageKind = 'artwork' | 'card'
// A page owns its canvas. Rendering is serialized and stale callbacks never restore an ended session.
export function useArtworkImage(createSnapshot: () => Artwork) {
  const instance = getCurrentInstance()
  const exportingImage = ref(false)
  const imagePath = ref('')
  const imageError = ref('')
  const exportingCard = ref(false)
  const cardImagePath = ref('')
  const cardImageError = ref('')
  const canvasHeight = ref(1600)
  const exportCanvasId = 'flowerArtworkExport'
  let generation = 0
  let artworkRequest = 0
  let cardRequest = 0
  let pending: Promise<void> = Promise.resolve()
  function notify(title: string) {
    uni.showToast({ title, icon: 'none' })
  }
  function message(error: unknown) {
    return error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'errMsg' in error ? String(error.errMsg) : ''
  }
  function reportError(error: unknown, fallback: string) {
    if (!message(error).includes('cancel'))
      notify(fallback)
  }
  function invalidate() {
    generation++
    artworkRequest++
    cardRequest++
    exportingImage.value = false
    exportingCard.value = false
    imagePath.value = ''
    imageError.value = ''
    cardImagePath.value = ''
    cardImageError.value = ''
  }
  async function serial<T>(task: () => Promise<T>) {
    const previous = pending
    let release!: () => void
    pending = new Promise<void>((resolve) => {
      release = resolve
    })
    try {
      await previous
      return await task()
    }
    finally {
      release()
    }
  }
  function capture(width: number, height: number, scale = 2) {
    return new Promise<string>((resolve, reject) => uni.canvasToTempFilePath({ canvasId: exportCanvasId, x: 0, y: 0, width, height, destWidth: Math.round(width * scale), destHeight: Math.round(height * scale), fileType: 'png', success: result => resolve(result.tempFilePath), fail: reject }, instance?.proxy))
  }
  async function exportImage(): Promise<boolean> {
    if (exportingImage.value)
      return false
    const epoch = generation
    const request = ++artworkRequest
    const artwork = createSnapshot()
    const current = () => epoch === generation && request === artworkRequest
    exportingImage.value = true
    imagePath.value = ''
    imageError.value = ''
    try {
      return await serial(async () => {
        if (!current())
          return false
        await renderArtwork(uni.createCanvasContext(exportCanvasId, instance?.proxy), artwork)
        if (!current())
          return false
        const path = await capture(studioMetrics.width, studioMetrics.height)
        if (!current())
          return false
        imagePath.value = path
        return true
      })
    }
    catch (error) {
      if (current())
        imageError.value = `图片生成失败${message(error) ? `：${message(error)}` : ''}，请重试`
      return false
    }
    finally {
      if (current())
        exportingImage.value = false
    }
  }
  async function exportCard(text: FlowerCardText): Promise<boolean> {
    if (!imagePath.value && !await exportImage())
      return false
    const epoch = generation
    const request = ++cardRequest
    const original = imagePath.value
    const card = { ...text }
    const current = () => epoch === generation && request === cardRequest
    exportingCard.value = true
    cardImagePath.value = ''
    cardImageError.value = ''
    try {
      return await serial(async () => {
        if (!current())
          return false
        canvasHeight.value = 1800
        await nextTick()
        const size = await renderFlowerCard(uni.createCanvasContext(exportCanvasId, instance?.proxy), original, card, async (height) => {
          canvasHeight.value = height
          await nextTick()
        })
        if (!current())
          return false
        const path = await capture(size.width, size.height)
        if (!current())
          return false
        cardImagePath.value = path
        return true
      })
    }
    catch (error) {
      if (current())
        cardImageError.value = `花卡生成失败：${message(error) || '请重试'}`
      return false
    }
    finally {
      if (current())
        exportingCard.value = false
    }
  }
  async function exportThumbnail(): Promise<string> {
    const epoch = generation
    const artwork = createSnapshot()
    return serial(async () => {
      if (epoch !== generation)
        throw new Error('创作已切换，请重新保存')
      await renderArtwork(uni.createCanvasContext(exportCanvasId, instance?.proxy), artwork)
      const path = await capture(698, 1000, 0.5)
      if (epoch !== generation)
        throw new Error('创作已切换，请重新保存')
      return path
    })
  }
  function pathFor(kind: ImageKind) {
    return kind === 'card' ? exportingCard.value ? '' : cardImagePath.value : exportingImage.value ? '' : imagePath.value
  }
  function saveImage(kind: ImageKind = 'artwork') {
    const path = pathFor(kind)
    if (!path)
      return
    uni.saveImageToPhotosAlbum({ filePath: path, success: () => notify('图片已保存到相册'), fail: (error) => {
      const detail = message(error)
      if (detail.includes('cancel'))
        return
      if (/auth|deny|permission/i.test(detail)) {
        notify('保存失败，请检查相册权限')
        uni.showModal?.({ title: '允许保存图片', content: '请在设置中开启相册权限，再返回保存。', confirmText: '去设置', success: (result) => {
          if (result.confirm)
            uni.openSetting({})
        } })
      }
      else {
        reportError(error, '图片保存失败，请重试')
      }
    } })
  }
  function shareImage(kind: ImageKind = 'artwork') {
    const path = pathFor(kind)
    if (!path)
      return
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.showShareImageMenu === 'function' && wx.canIUse('showShareImageMenu')) {
      wx.showShareImageMenu({ path, fail: error => reportError(error, '分享失败，请重试') })
      return
    }
    // #endif
    notify('当前平台不支持直接分享图片，请保存后分享')
  }
  function previewImage(kind: ImageKind = 'artwork') {
    const path = pathFor(kind)
    if (path)
      uni.previewImage({ urls: [path], current: path })
  }
  return { exportCanvasId, canvasHeight, exportingImage, imagePath, imageError, exportingCard, cardImagePath, cardImageError, exportImage, exportCard, exportThumbnail, invalidate, saveImage, shareImage, previewImage }
}
