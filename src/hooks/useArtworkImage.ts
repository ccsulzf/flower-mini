import type { Artwork } from '@/models/artwork'
import { ref } from 'vue'
import { renderCloudImage } from '@/utils/flower/cloud-image-renderer'
import { readImageCache, removeCachedImage, writeImageCache } from '@/utils/flower/image-cache'

type ImageKind = 'artwork' | 'card'

// Ignore stale cloud render results after a page closes or a newer request replaces them.
export function useArtworkImage(
  createSnapshot: () => Artwork,
  cacheScope: () => string = () => '',
  getWorkIdentity: () => { id: string } | undefined = () => undefined,
  getExistingImagePath: () => string | Promise<string> = () => '',
) {
  const exportingImage = ref(false)
  const imagePath = ref('')
  const imageError = ref('')
  const cardImagePath = ref('')
  let generation = 0
  let artworkRequest = 0
  function notify(title: string) {
    uni.showToast({ title, icon: 'none' })
  }
  function message(error: unknown) {
    if (error instanceof Error)
      return error.message
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
      return error.message
    return typeof error === 'object' && error !== null && 'errMsg' in error ? String(error.errMsg) : ''
  }
  function reportError(error: unknown, fallback: string) {
    if (!message(error).includes('cancel'))
      notify(fallback)
  }
  function invalidate() {
    generation++
    artworkRequest++
    exportingImage.value = false
    imagePath.value = ''
    imageError.value = ''
    cardImagePath.value = ''
  }
  function workIdentity(overrideId?: string) {
    if (overrideId && /^[a-f\d]{32}$/.test(overrideId))
      return { id: overrideId }
    const identity = getWorkIdentity()
    if (!identity || !/^[a-f\d]{32}$/.test(identity.id))
      throw new Error('请先保存作品，再生成图片')
    return identity
  }
  async function exportImage(workId?: string): Promise<boolean> {
    if (exportingImage.value)
      return false
    const epoch = generation
    const request = ++artworkRequest
    const current = () => epoch === generation && request === artworkRequest
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
    const existingPath = await getExistingImagePath()
    if (!current())
      return false
    if (existingPath) {
      artworkRequest++
      imagePath.value = existingPath
      exportingImage.value = false
      imageError.value = ''
      return true
    }
    exportingImage.value = true
    imagePath.value = ''
    imageError.value = ''
    try {
      const identity = workIdentity(workId)
      const path = await renderCloudImage(identity.id)
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
  function pathFor(kind: ImageKind) {
    return kind === 'card' ? cardImagePath.value : exportingImage.value ? '' : imagePath.value
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
  function setCardImagePath(path: string) {
    cardImagePath.value = path
  }
  return {
    exportingImage,
    imagePath,
    imageError,
    cardImagePath,
    exportImage,
    invalidate,
    saveImage,
    shareImage,
    previewImage,
    setCardImagePath,
  }
}
