import type { Artwork } from '@/models/artwork'
import type { FlowerGreetingText } from '@/models/flower-creation'
import { readImageCache, writeImageCache } from './image-cache'

const cloudCardRenderVersion = 'ma-shan-zheng-card-v1'

interface CloudCardResult {
  width: number
  height: number
  fileID: string
  cloudPath: string
}

interface FlowerRenderCloud {
  renderCard(input: {
    artwork: Artwork
    text: FlowerGreetingText
  }): Promise<CloudCardResult>
}

interface CloudFileUrlResult {
  fileList?: Array<{ fileID: string, tempFileURL?: string }>
}

export async function renderCloudCard(artwork: Artwork, text: FlowerGreetingText) {
  const cacheKey = `cloud-card:${JSON.stringify([cloudCardRenderVersion, artwork, text])}`
  const cached = readImageCache(cacheKey)
  if (cached)
    return cached
  const cloud = uniCloud.importObject('flower-render', { customUI: true }) as FlowerRenderCloud
  const result = await cloud.renderCard({ artwork, text })
  if (result.width !== 1396 || result.height !== 2520 || typeof result.fileID !== 'string'
    || !result.fileID.startsWith('cloud://') || typeof result.cloudPath !== 'string'
    || !result.cloudPath.startsWith('flower-cards/') || !result.cloudPath.endsWith('.png')) {
    throw new Error('云端返回的贺卡图片无效')
  }
  if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env?.USER_DATA_PATH)
    throw new Error('当前平台不支持保存云端贺卡')
  const urls = await uniCloud.getTempFileURL({ fileList: [result.fileID] }) as CloudFileUrlResult
  const imageUrl = urls.fileList?.find(item => item.fileID === result.fileID)?.tempFileURL
  if (typeof imageUrl !== 'string' || !/^https:\/\//.test(imageUrl))
    throw new Error('无法获取云端贺卡下载地址')
  const filename = `${wx.env.USER_DATA_PATH}/flower-cloud-card-${Date.now()}-${Math.random().toString(16).slice(2)}.png`
  const download = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
    uni.downloadFile({ url: imageUrl, filePath: filename, success: resolve, fail: reject })
  })
  if (download.statusCode !== 200)
    throw new Error('云端贺卡下载失败')
  writeImageCache(cacheKey, filename)
  return filename
}
