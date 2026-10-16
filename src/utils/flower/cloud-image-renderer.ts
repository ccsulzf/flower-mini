interface CloudImageResult {
  width: number
  height: number
  fileID: string
  cloudPath: string
}

interface FlowerRenderCloud {
  renderWork(input: {
    workId: string
    expectedRevision: number
  }): Promise<CloudImageResult>
}

interface CloudFileUrlResult {
  fileList?: Array<{ fileID: string, tempFileURL?: string }>
}

export async function renderCloudImage(workId: string, expectedRevision: number) {
  const cloud = uniCloud.importObject('flower-render', { customUI: true }) as FlowerRenderCloud
  const result = await cloud.renderWork({ workId, expectedRevision })
  if (result.width !== 1396 || result.height !== 2000 || typeof result.fileID !== 'string'
    || !result.fileID.startsWith('cloud://') || typeof result.cloudPath !== 'string'
    || !result.cloudPath.endsWith(`/${workId}/artwork.png`))
    throw new Error('云端返回的图片无效')
  if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env?.USER_DATA_PATH)
    throw new Error('当前平台不支持保存云端生成的图片')
  const urls = await uniCloud.getTempFileURL({ fileList: [result.fileID] }) as CloudFileUrlResult
  const imageUrl = urls.fileList?.find(item => item.fileID === result.fileID)?.tempFileURL
  if (typeof imageUrl !== 'string' || !/^https:\/\//.test(imageUrl))
    throw new Error('无法获取云端图片下载地址')
  const filename = `${wx.env.USER_DATA_PATH}/flower-cloud-${Date.now()}-${Math.random().toString(16).slice(2)}.png`
  const download = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
    uni.downloadFile({
      url: imageUrl,
      filePath: filename,
      success: resolve,
      fail: reject,
    })
  })
  if (download.statusCode !== 200)
    throw new Error('云端图片下载失败')
  return filename
}
