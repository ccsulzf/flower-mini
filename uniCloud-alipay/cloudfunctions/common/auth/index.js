// common/auth/index.js
const uniID = require('uni-id-common')

module.exports = async function resolveAuth(ctx) {
  if (ctx.auth && ctx.auth.uid) {
    return ctx.auth
  }

  const token = ctx.getUniIdToken()
  if (!token) return null

  const uniId = uniID.createInstance({ context: ctx })
  const res = await uniId.checkToken(token)

  if (res.code === 0) {
    return { uid: res.uid }
  }

  return null
}
