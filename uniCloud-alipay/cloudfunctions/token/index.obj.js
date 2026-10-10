// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const uniID = require('uni-id-common')

module.exports = {
  /**
   * 通用预处理器（可选）
   */
  _before: function() {
    // 目前不做拦截，如需全局鉴权可在此处理
  },

  /**
   * 校验当前请求携带的 token 是否有效
   * @returns {{valid: boolean, uid?: string, code?: any, message?: string}}
   */
  async checkToken() {
    const token = this.getUniIdToken()

    if (!token) {
      return {
        valid: false,
        code: 'NO_TOKEN',
        message: '客户端未携带 token'
      }
    }

    // 2. 创建 uni-id 实例并校验
    const uniId = uniID.createInstance({
      context: this
    })
    const res = await uniId.checkToken(token)

    // 3. 判断校验结果
    if (res.errCode === 0 || (res.errCode === undefined && res.code === 0)) {
      return {
        valid: true,
        ...(res.token && res.tokenExpired ? {
          newToken: { token: res.token, tokenExpired: res.tokenExpired }
        } : {}),
      }
    }

    return {
      valid: false,
    }
  }

}
