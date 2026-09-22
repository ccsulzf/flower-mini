import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

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
    backgroundColor: '#E9EEF5',
    backgroundColorBottom: '#E9EEF5',
    backgroundColorTop: '#E3EAF3',
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#E3EAF3',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '云开发模板',
    navigationStyle: 'default',
  },
  // tabBar: {
  //   backgroundColor: "@tabBgColor",
  //   borderStyle: "@tabBorderStyle",
  //   color: "@tabFontColor",
  //   selectedColor: "@tabSelectedColor",
  // },
})
