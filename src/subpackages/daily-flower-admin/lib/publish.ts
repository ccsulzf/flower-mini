import type { DailyFlowerDraft } from './daily-flower'

interface RenderedDailyArtwork {
  width: number
  height: number
  fileID: string
  cloudPath: string
}

interface DailyFlowerRenderer {
  renderDailyArtwork: (input: { artwork: DailyFlowerDraft['artwork'], date: string }) => Promise<RenderedDailyArtwork>
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

export async function publishDailyFlower(draft: DailyFlowerDraft) {
  const renderer = uniCloud.importObject('flower-render', { customUI: true }) as DailyFlowerRenderer
  const rendered = await runCloudStage('每日花束云端图片生成', () =>
    renderer.renderDailyArtwork({ artwork: draft.artwork, date: draft.date }))
  if (rendered.width !== 1396 || rendered.height !== 2000 || typeof rendered.fileID !== 'string'
    || !rendered.fileID.startsWith('cloud://') || typeof rendered.cloudPath !== 'string'
    || !rendered.cloudPath.startsWith(`daily-flower/${draft.date}/`))
    throw new Error('云端返回的花束图片无效')

  const cloud = uniCloud.importObject('flower-daily-admin', { customUI: true }) as DailyFlowerAdmin
  return runCloudStage('每日花束云端记录保存', () => cloud.publish({
    date: draft.date,
    description: draft.description,
    artwork: draft.artwork,
    imageFileId: rendered.fileID,
  }))
}
