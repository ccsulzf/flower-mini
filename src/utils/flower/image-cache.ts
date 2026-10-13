const cache = new Map<string, string>()
const cacheLimit = 24

export function removeCachedImage(path: string) {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env?.USER_DATA_PATH)
    return
  const prefix = `${wx.env.USER_DATA_PATH}/flower-cloud-`
  if (!path.startsWith(prefix))
    return
  wx.getFileSystemManager().unlink({
    filePath: path,
    fail: (error) => {
      const detail = String(error.errMsg || '').toLowerCase()
      if (!detail.includes('no such file') && !detail.includes('not exist'))
        uni.showToast({ title: '本地图片缓存清理失败', icon: 'none' })
    },
  })
}

export function readImageCache(key: string) {
  const path = cache.get(key)
  if (!path)
    return ''
  cache.delete(key)
  cache.set(key, path)
  return path
}

export function writeImageCache(key: string, path: string) {
  const existing = cache.get(key)
  cache.delete(key)
  if (existing && existing !== path)
    removeCachedImage(existing)
  cache.set(key, path)
  if (cache.size > cacheLimit) {
    const [oldestKey, oldestPath] = cache.entries().next().value!
    cache.delete(oldestKey)
    removeCachedImage(oldestPath)
  }
}

export function clearImageCacheScope(scope: string) {
  const prefix = `${scope}:`
  const paths = new Set<string>()
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      paths.add(cache.get(key)!)
      cache.delete(key)
    }
  }
  paths.forEach(removeCachedImage)
}
