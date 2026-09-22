import { defineManifestConfig } from '@uni-helper/vite-plugin-uni-manifest'

export default defineManifestConfig({
  'name': 'uni-cloud-demo',
  'appid': 'wx73d72762a3a1e1a3',
  'description': '微信小程序 + 支付宝 uniCloud 开发模板',
  'versionName': '1.0.0',
  'versionCode': '100',
  'transformPx': false,
  'mp-weixin': {
    appid: 'wx73d72762a3a1e1a3',
    setting: { urlCheck: true, es6: true },
    usingComponents: true,
  },
  'uniStatistics': { enable: false },
  'vueVersion': '3',
})
