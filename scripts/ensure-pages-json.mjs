import fs from 'node:fs'
const file = new URL('../src/pages.json', import.meta.url)
let valid = false
try {
  const config = JSON.parse(fs.readFileSync(file, 'utf8'))
  valid = Array.isArray(config?.pages) && config.pages.length > 0
    && config.pages.every(page => typeof page?.path === 'string' && page.path.trim().length > 0)
}
catch { /* 文件缺失、为空或格式无效时，恢复可供页面插件启动的基础配置。 */ }

if (!valid) {
  fs.writeFileSync(file, JSON.stringify({
    pages: [{ path: 'pages/index/index-page', style: { navigationBarTitleText: '花草工作室' } }],
    globalStyle: { navigationBarTextStyle: 'black', navigationBarBackgroundColor: '#E3EAF3' },
  }, null, 2))
}
