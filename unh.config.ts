import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  platform: { default: 'mp-weixin', alias: { 'mp-weixin': 'wx' } },
  autoGenerate: { pages: true, manifest: true },
})
