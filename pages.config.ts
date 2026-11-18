import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'
import { appColors } from './uno.config'

export default defineUniPages({
  easycom: {
    autoscan: true,
    custom: {
      // uni-ui 规则如下配置
      '^uni-(.*)': '@dcloudio/uni-ui/lib/uni-$1/uni-$1.vue',
    },
  },
  pages: [],
  globalStyle: {
    backgroundColor: appColors.page,
    backgroundColorBottom: appColors.page,
    backgroundColorTop: appColors.page,
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: appColors.page,
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '花瓶小作',
    navigationStyle: 'default',
  },
  // tabBar: {
  //   backgroundColor: "@tabBgColor",
  //   borderStyle: "@tabBorderStyle",
  //   color: "@tabFontColor",
  //   selectedColor: "@tabSelectedColor",
  // },
})
