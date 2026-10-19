import type { DailyFlowerRecord } from '@/models/daily-flower'

interface CachedDailyFlowerImage {
  imageFileId: string
  imagePath: string
}

function cacheKey(date: string) {
  return `daily-flower-image:v1:${date}`
}

function fileExists(filePath: string) {
  if (typeof wx === 'undefined' || typeof wx.getFileSystemManager !== 'function')
    return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
}

function downloadImage(url: string) {
  return new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
    uni.downloadFile({ url, success: resolve, fail: reject })
  })
}

function saveImage(tempFilePath: string) {
  return new Promise<UniApp.SaveFileSuccess>((resolve, reject) => {
    uni.saveFile({ tempFilePath, success: resolve, fail: reject })
  })
}

export async function resolveDailyFlowerImage(record: DailyFlowerRecord): Promise<string> {
  const key = cacheKey(record.date)
  const cached: unknown = uni.getStorageSync(key)
  if (typeof cached === 'object' && cached !== null
    && 'imageFileId' in cached && cached.imageFileId === record.imageFileId
    && 'imagePath' in cached && typeof cached.imagePath === 'string' && cached.imagePath
    && await fileExists(cached.imagePath)) {
    return cached.imagePath
  }

  let download: UniApp.DownloadSuccessData | undefined
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      download = await downloadImage(record.imageUrl)
      break
    }
    catch (error) {
      lastError = error
    }
  }
  if (!download)
    throw lastError
  if (download.statusCode !== 200)
    throw new Error('今日花束图片下载失败')

  const saved = await saveImage(download.tempFilePath)
  const next: CachedDailyFlowerImage = {
    imageFileId: record.imageFileId,
    imagePath: saved.savedFilePath,
  }
  uni.setStorageSync(key, next)
  return next.imagePath
}
