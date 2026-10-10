import type { MaterialDraft, SvgPart, UploadedMaterial } from './types'
export async function uploadDraft(draft: MaterialDraft): Promise<Omit<UploadedMaterial, 'updatedAt'>> {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager) throw new Error('请在微信小程序中上传素材')
  const fs = wx.getFileSystemManager()
  const assets: UploadedMaterial['assets'] = {}
  for (const key of Object.keys(draft.sources) as SvgPart[]) {
    const source = draft.sources[key]!
    const filePath = `${wx.env.USER_DATA_PATH}/${draft.id}-${key}.svg`
    fs.writeFileSync(filePath, source, 'utf8')
    try {
      const info = await new Promise<WechatMiniprogram.GetFileInfoSuccessCallbackResult>((resolve, reject) => fs.getFileInfo({ filePath, digestAlgorithm: 'sha1', success: resolve, fail: reject }))
      const result = await uniCloud.uploadFile({ filePath, cloudPath: `flower-materials/${draft.id}/${info.digest}-${key}.svg` })
      assets[key] = { fileId: result.fileID, hash: info.digest }
    } finally { try { fs.unlinkSync(filePath) } catch { /* 临时文件清理失败不影响上传结果 */ } }
  }
  const { sources: _, ...metadata } = draft
  return { ...metadata, assets }
}
