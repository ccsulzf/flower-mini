function materialAdminEnabled(command, mode, uniNodeEnv) {
  // 小程序 dev 使用 Vite build/watch；uni CLI 的环境标记区分运行和发行。
  if (uniNodeEnv) return uniNodeEnv === 'development' && mode !== 'production'
  return command === 'serve' && mode !== 'production'
}
const sanitizedContexts = new WeakSet()
function excludeMaterialAdmin(context) {
  if (sanitizedContexts.has(context)) return
  sanitizedContexts.add(context)
  // 插件会保留旧 pages.json 中的分包；在生成结果中定向移除管理分包。
  const generate = context.genratePagesJSON.bind(context)
  context.genratePagesJSON = async () => {
    const result = await generate()
    result.subPackages = (result.subPackages || []).filter(item => item.root !== 'subpackages/material-admin')
    return result
  }
}
module.exports = { materialAdminEnabled, excludeMaterialAdmin }
