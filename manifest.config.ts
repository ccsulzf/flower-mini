import { defineManifestConfig } from '@uni-helper/vite-plugin-uni-manifest'

export default defineManifestConfig({
  'name': 'flower-mini',
  'appid': '__UNI__888943B',
  'description': '鲜花创作微信小程序',
  'versionName': '1.0.0',
  'versionCode': '100',
  'transformPx': false,
  'mp-weixin': {
    appid: 'wxe710740bf9c944f3',
    setting: { urlCheck: true, es6: false },
    usingComponents: true,
  },
  'uniStatistics': { enable: false },
  'vueVersion': '3',
})
