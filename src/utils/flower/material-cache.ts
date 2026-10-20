import type { CachedMaterial, SvgPart, UploadedMaterial } from '@/models/material'
function fs() {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager) throw new Error('当前平台不支持素材文件缓存')
  return wx.getFileSystemManager()
}
async function read(path: string, hash: string) {
  const info = await new Promise<WechatMiniprogram.GetFileInfoSuccessCallbackResult>((resolve, reject) => fs().getFileInfo({ filePath: path, digestAlgorithm: 'sha1', success: resolve, fail: reject }))
  if (info.digest !== hash) throw new Error('素材内容校验失败')
  const result = await new Promise<WechatMiniprogram.ReadFileSuccessCallbackResult>((resolve, reject) => fs().readFile({ filePath: path, encoding: 'utf8', success: resolve, fail: reject }))
  const source = String(result.data)
  if (source.length > 65536 || !/^\s*<svg\b/.test(source) || !/<\/svg>\s*$/.test(source) || /<script|<foreignObject|\bon\w+\s*=|\bhref\s*=|<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('SVG 内容无效')
  return source
}
export async function prepareMaterial(record: UploadedMaterial) {
  const paths: CachedMaterial['paths'] = {}, sources: CachedMaterial['sources'] = {}
  let downloaded = 0, cached = 0
  for (const key of Object.keys(record.assets) as SvgPart[]) {
    const asset = record.assets[key]!
    const storageKey = `flower-material-file:${asset.hash}`
    const old: unknown = uni.getStorageSync(storageKey)
    if (typeof old === 'string') {
      try { sources[key] = await read(old, asset.hash); paths[key] = old; cached++; continue }
      catch { uni.removeStorageSync(storageKey) }
    }
    if (!asset.url || !/^https:\/\//.test(asset.url)) throw new Error('素材下载地址无效，请刷新目录')
    const result = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => uni.downloadFile({ url: asset.url!, success: resolve, fail: reject }))
    if (result.statusCode !== 200) throw new Error('素材下载失败')
    sources[key] = await read(result.tempFilePath, asset.hash)
    const saved = await new Promise<UniApp.SaveFileSuccess>((resolve, reject) => uni.saveFile({ tempFilePath: result.tempFilePath, success: resolve, fail: reject }))
    paths[key] = saved.savedFilePath
    uni.setStorageSync(storageKey, saved.savedFilePath); downloaded++
  }
  const material: CachedMaterial = { ...record, paths, sources }
  uni.setStorageSync(`flower-material-record:${record.id}`, record)
  return { material, downloaded, cached }
}
export function cachedRecord(id: string): unknown { return uni.getStorageSync(`flower-material-record:${id}`) }
