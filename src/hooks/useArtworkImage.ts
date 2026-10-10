import type { Artwork } from '@/models/artwork'
import { getCurrentInstance, ref } from 'vue'
import { studioMetrics } from '@/utils/flower/arrangement.cjs'
import { renderArtwork } from '@/utils/flower/render-artwork'

// Canvas belongs to the page; request versions prevent late callbacks replacing a new preview.
export function useArtworkImage(createSnapshot: () => Artwork) {
  const instance = getCurrentInstance()
  const exportingImage = ref(false)
  const imagePath = ref('')
  const imageError = ref('')
  const exportCanvasId = 'flowerArtworkExport'
  let generation = 0
  // A single native canvas cannot render two generations concurrently.
  let pending: Promise<void> = Promise.resolve()

  function notify(title: string) { uni.showToast({ title, icon: 'none' }) }
  function reportError(error: unknown, fallback: string) {
    const message = typeof error === 'object' && error !== null && 'errMsg' in error ? String(error.errMsg) : ''
    if (!message.includes('cancel')) notify(fallback)
  }
  function invalidate() {
    generation++
    exportingImage.value = false
    imagePath.value = ''; imageError.value = ''
  }
  async function exportImage(): Promise<boolean> {
    if (exportingImage.value) return false
    const request = ++generation
    const artwork = createSnapshot()
    exportingImage.value = true
    imagePath.value = ''; imageError.value = ''
    const previous = pending
    let release!: () => void
    pending = new Promise<void>((resolve) => { release = resolve })
    try {
      await previous
      if (request !== generation) return false
      const ctx = uni.createCanvasContext(exportCanvasId, instance?.proxy)
      await renderArtwork(ctx, artwork)
      if (request !== generation) return false
      const path = await new Promise<string>((resolve, reject) => {
        uni.canvasToTempFilePath({
          canvasId: exportCanvasId, x: 0, y: 0, width: studioMetrics.width, height: studioMetrics.height,
          destWidth: studioMetrics.width * 2, destHeight: studioMetrics.height * 2, fileType: 'png',
          success: result => resolve(result.tempFilePath), fail: reject,
        }, instance?.proxy)
      })
      if (request !== generation) return false
      imagePath.value = path
      return true
    }
    catch (error) {
      const detail = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'errMsg' in error ? String(error.errMsg) : ''
      if (request === generation) imageError.value = detail ? `图片生成失败：${detail}，请重试` : '图片生成失败，请重试'
      return false
    }
    finally {
      release()
      if (request === generation) exportingImage.value = false
    }
  }
  function saveImage() {
    if (!imagePath.value || exportingImage.value) return
    uni.saveImageToPhotosAlbum({ filePath: imagePath.value, success: () => notify('图片已保存到相册'), fail: error => reportError(error, '保存失败，请检查相册权限') })
  }
  function shareImage() {
    if (!imagePath.value || exportingImage.value) return
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.showShareImageMenu === 'function' && wx.canIUse('showShareImageMenu')) {
      wx.showShareImageMenu({ path: imagePath.value, fail: error => reportError(error, '分享失败，请重试') })
      return
    }
    // #endif
    notify('当前平台不支持直接分享图片，请保存后分享')
  }
  function previewImage() {
    if (imagePath.value && !exportingImage.value) uni.previewImage({ urls: [imagePath.value], current: imagePath.value })
  }
  return { exportCanvasId, exportingImage, imagePath, imageError, exportImage, invalidate, saveImage, shareImage, previewImage }
}
