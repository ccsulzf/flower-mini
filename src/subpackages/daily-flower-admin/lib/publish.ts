import type { DailyFlowerDraft } from './daily-flower'

interface RenderedDailyArtwork {
  width: number
  height: number
  pngBase64: string
}

interface DailyFlowerRenderer {
  renderDailyArtwork: (input: { artwork: DailyFlowerDraft['artwork'] }) => Promise<RenderedDailyArtwork>
}

interface DailyFlowerAdmin {
  publish: (input: {
    date: string
    description: string
    artwork: DailyFlowerDraft['artwork']
    imageFileId: string
  }) => Promise<{ ok: true, updated: boolean, imageCleanupWarning: boolean }>
}

function cloudErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'object' && error !== null && 'errMsg' in error)
    return String(error.errMsg)
  return '未知云端错误'
}

async function runCloudStage<T>(stage: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  }
  catch (error) {
    throw new Error(`${stage}失败：${cloudErrorMessage(error)}`)
  }
}

function writePng(data: string) {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env?.USER_DATA_PATH)
    throw new Error('请在微信小程序中发布每日花束')

  const fs = wx.getFileSystemManager()
  const filePath = `${wx.env.USER_DATA_PATH}/daily-flower-${Date.now()}-${Math.random().toString(16).slice(2)}.png`
  return new Promise<{ filePath: string, digest: string }>((resolve, reject) => {
    fs.writeFile({
      filePath,
      data,
      encoding: 'base64',
      success: () => {
        fs.getFileInfo({
          filePath,
          digestAlgorithm: 'sha1',
          success: result => resolve({ filePath, digest: result.digest }),
          fail: reject,
        })
      },
      fail: reject,
    })
  }).catch((error) => {
    try {
      fs.unlinkSync(filePath)
    }
    catch { /* 临时文件不存在时无需清理 */ }
    throw error
  })
}

export async function publishDailyFlower(draft: DailyFlowerDraft) {
  const renderer = uniCloud.importObject('flower-render', { customUI: true }) as DailyFlowerRenderer
  const rendered = await runCloudStage('每日花束云端图片生成', () =>
    renderer.renderDailyArtwork({ artwork: draft.artwork }))
  if (rendered.width !== 698 || rendered.height !== 1000 || typeof rendered.pngBase64 !== 'string' || !rendered.pngBase64)
    throw new Error('云端返回的花束图片无效')

  const image = await writePng(rendered.pngBase64)
  const fs = wx.getFileSystemManager()
  try {
    const uploaded = await runCloudStage('每日花束图片上传', () => uniCloud.uploadFile({
      filePath: image.filePath,
      cloudPath: `daily-flower/${draft.date}/${Date.now()}-${Math.random().toString(16).slice(2)}-${image.digest}.png`,
    }))
    if (!uploaded.fileID)
      throw new Error('每日花束图片上传失败')

    const cloud = uniCloud.importObject('flower-daily-admin', { customUI: true }) as DailyFlowerAdmin
    return await runCloudStage('每日花束云端记录保存', () => cloud.publish({
      date: draft.date,
      description: draft.description,
      artwork: draft.artwork,
      imageFileId: uploaded.fileID,
    }))
  }
  finally {
    try {
      fs.unlinkSync(image.filePath)
    }
    catch { /* 临时文件清理失败不会撤销已完成的发布 */ }
  }
}
