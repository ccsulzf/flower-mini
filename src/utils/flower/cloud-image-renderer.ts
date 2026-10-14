interface CloudImageResult {
  width: number
  height: number
  pngBase64: string
}

interface FlowerRenderCloud {
  renderWork(input: {
    workId: string
    expectedRevision: number
  }): Promise<CloudImageResult>
}

export async function renderCloudImage(workId: string, expectedRevision: number) {
  const cloud = uniCloud.importObject('flower-render', { customUI: true }) as FlowerRenderCloud
  const result = await cloud.renderWork({ workId, expectedRevision })
  if (result.width !== 698 || result.height !== 1000 || typeof result.pngBase64 !== 'string' || !result.pngBase64)
    throw new Error('云端返回的图片无效')
  if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env?.USER_DATA_PATH)
    throw new Error('当前平台不支持保存云端生成的图片')
  const filename = `${wx.env.USER_DATA_PATH}/flower-cloud-${Date.now()}-${Math.random().toString(16).slice(2)}.png`
  await new Promise<void>((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath: filename,
      data: result.pngBase64,
      encoding: 'base64',
      success: () => resolve(),
      fail: reject,
    })
  })
  return filename
}
