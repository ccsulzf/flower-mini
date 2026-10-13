import type { Artwork } from '@/models/artwork'
import type { FlowerCardText } from '@/models/flower-creation'
import { ref } from 'vue'
import { renderArtworkSvg } from '@/utils/flower/artwork-svg'
import { renderCloudImage } from '@/utils/flower/cloud-image-renderer'
import { readImageCache, removeCachedImage, writeImageCache } from '@/utils/flower/image-cache'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'

type ImageKind = 'artwork' | 'card'

// Ignore stale cloud render results after a page closes or a newer request replaces them.
export function useArtworkImage(createSnapshot: () => Artwork, cacheScope: () => string = () => '') {
  const exportingImage = ref(false)
  const imagePath = ref('')
  const imageError = ref('')
  const exportingCard = ref(false)
  const cardImagePath = ref('')
  const cardImageError = ref('')
  let generation = 0
  let artworkRequest = 0
  let cardRequest = 0
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
  function artworkSvg(artwork: Artwork) {
    return renderArtworkSvg(artwork, useFlowerCatalogStore().get)
  }
  async function exportImage(): Promise<boolean> {
    if (exportingImage.value)
      return false
    const epoch = generation
    const request = ++artworkRequest
    const artwork = createSnapshot()
    const signature = JSON.stringify(artwork)
    const scope = cacheScope()
    const cacheKey = `${scope ? `${scope}:` : ''}artwork:${signature}`
    const cached = readImageCache(cacheKey)
    if (cached) {
      artworkRequest++
      imagePath.value = cached
      exportingImage.value = false
      imageError.value = ''
      return true
    }
    const current = () => epoch === generation && request === artworkRequest
    exportingImage.value = true
    imagePath.value = ''
    imageError.value = ''
    try {
      const path = await renderCloudImage(artworkSvg(artwork), 1000)
      if (!current()) {
        removeCachedImage(path)
        return false
      }
      imagePath.value = path
      writeImageCache(cacheKey, path)
      return true
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
  async function exportCard(text: FlowerCardText, render: () => Promise<string>): Promise<boolean> {
    const signature = JSON.stringify(createSnapshot())
    const card = { ...text }
    const scope = cacheScope()
    const cacheKey = `${scope ? `${scope}:` : ''}card:${JSON.stringify([signature, card])}`
    const cached = readImageCache(cacheKey)
    if (cached) {
      cardRequest++
      exportingCard.value = false
      cardImagePath.value = cached
      cardImageError.value = ''
      return true
    }
    const epoch = generation
    const request = ++cardRequest
    const current = () => epoch === generation && request === cardRequest
    exportingCard.value = true
    cardImagePath.value = ''
    cardImageError.value = ''
    try {
      const path = await render()
      if (!path)
        throw new Error('贺卡图片导出失败')
      if (!current()) {
        removeCachedImage(path)
        return false
      }
      cardImagePath.value = path
      writeImageCache(cacheKey, path)
      return true
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
  return { exportingImage, imagePath, imageError, exportingCard, cardImagePath, cardImageError, exportImage, exportCard, invalidate, saveImage, shareImage, previewImage }
}
