import type { Artwork } from '@/models/artwork'
import { readImageCache, writeImageCache } from './image-cache'

const renderVersion = 'cloud-material-list-v8'
interface RenderResult { width: number, height: number, fileID: string, cloudPath: string }
interface FlowerRenderCloud { renderMaterialList(input: { artwork: Artwork }): Promise<RenderResult> }
interface CloudFileUrlResult { fileList?: Array<{ fileID: string, tempFileURL?: string }> }

export async function renderCloudMaterialList(artwork: Artwork) {
  const cached = readImageCache(`cloud-material-list:${JSON.stringify([renderVersion, artwork])}`)
  if (cached)
    return cached
  const cloud = uniCloud.importObject('flower-render', { customUI: true }) as FlowerRenderCloud
  const result = await cloud.renderMaterialList({ artwork })
  if (result.width !== 1396 || result.height < 2000 || result.height > 4000
    || typeof result.fileID !== 'string' || !result.fileID.startsWith('cloud://')
    || typeof result.cloudPath !== 'string' || !result.cloudPath.startsWith('flower-material-lists/')
    || !result.cloudPath.endsWith('.png'))
    throw new Error('云端返回的花材清单图片无效')
  if (typeof wx === 'undefined' || !wx.env?.USER_DATA_PATH)
    throw new Error('当前平台不支持下载云端生成的图片')
  const urls = await uniCloud.getTempFileURL({ fileList: [result.fileID] }) as CloudFileUrlResult
  const imageUrl = urls.fileList?.find(item => item.fileID === result.fileID)?.tempFileURL
  if (typeof imageUrl !== 'string' || !/^https:\/\//.test(imageUrl))
    throw new Error('无法获取云端图片下载地址')
  const filename = `${wx.env.USER_DATA_PATH}/flower-material-list-${Date.now()}.png`
  const download = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
    uni.downloadFile({ url: imageUrl, filePath: filename, success: resolve, fail: reject })
  })
  if (download.statusCode !== 200)
    throw new Error('云端花材清单图片下载失败')
  writeImageCache(`cloud-material-list:${JSON.stringify([renderVersion, artwork])}`, filename)
  return filename
}
