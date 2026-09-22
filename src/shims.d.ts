export {}

declare module 'vue' {
  type Hooks = App.AppInstance & Page.PageInstance
  /**
   * 为 Vue 组件选项补充 uni-app 页面生命周期类型。
   */
  interface ComponentCustomOptions extends Hooks {}
}
