import fs from 'node:fs'
const file = new URL('../src/pages.json', import.meta.url)
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({
    pages: [{ path: 'pages/index/index-page', style: { navigationBarTitleText: '花草工作室' } }],
    globalStyle: { navigationBarTextStyle: 'black', navigationBarBackgroundColor: '#E3EAF3' },
  }, null, 2))
}
