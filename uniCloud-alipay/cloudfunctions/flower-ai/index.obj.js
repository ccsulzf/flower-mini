const resolveAuth = require('auth')
const { parseInput, describeComposition } = require('./optimization')
const { instructions, parsePlan, generateLayout } = require('./composition-plan')

async function requestModel(apiKey, payload) {
    const started = Date.now()
    let response
    try {

      response = await uniCloud.httpclient.request('https://api.deepseek.com/chat/completions', {
        method: 'POST', contentType: 'json', dataType: 'json', timeout: 45000,
        headers: { Authorization: `Bearer ${apiKey}` },
        data: payload,
      })

    }
    catch (error) {
      // 不打印完整异常：HTTP 客户端异常可能携带含密钥的请求头。
      const safeLabel = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value) ? value : ''
      const kind = safeLabel(error?.code) || safeLabel(error?.name) || 'UNKNOWN'
      const elapsedMs = Date.now() - started
      console.error('[flower-ai] request failed', { kind, elapsedMs })
      throw { errCode: 'AI_NETWORK_ERROR', errMsg: `模型请求失败（${kind}，耗时 ${elapsedMs}ms），请查看本地云函数控制台` }
    }
    if (response.status !== 200) {
      const status = response.status
      throw { errCode: 'AI_HTTP_ERROR', errMsg: `模型接口 HTTP ${status}：${status === 401 ? '请检查 DeepSeek 官方 API Key' : status === 402 ? 'DeepSeek 余额不足' : status === 429 ? 'DeepSeek 请求限速，请稍后再试' : '请检查模型 ID、接口权限及服务状态'}` }
    }
    return response
}

module.exports = {
  async probe() {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
    const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash'
    if (!apiKey) throw { errCode: 'AI_NOT_CONFIGURED', errMsg: '请在 flower-ai 本地或云端环境变量配置 DeepSeek 官方 DEEPSEEK_API_KEY' }
    const started = Date.now()
    const response = await requestModel(apiKey, { model, messages: [{ role: 'user', content: '只回复 OK' }], thinking: { type: 'disabled' }, stream: false, max_tokens: 128 })
    const body = response.data
    const choice = body?.choices?.[0]
    const text = typeof choice?.message?.content === 'string' ? choice.message.content.slice(0, 2000) : ''
    return { code: 0, data: { model, elapsedMs: Date.now() - started,
      status: choice?.finish_reason === 'stop' ? 'completed' : choice?.finish_reason || 'unknown', text } }
  },
  async _before() {
    this.auth = await resolveAuth(this)
    if (!this.auth?.uid) throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后调试 AI' }
  },
  _after(error, result) {
    if (error) throw error
    if (this.auth.newToken) result.newToken = this.auth.newToken
    return result
  },
  async optimize(input) {
    let source
    try { source = parseInput(input) }
    catch (error) { throw { errCode: 'INVALID_ARGUMENT', errMsg: error.message } }
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
    const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash'

    if (!apiKey) throw { errCode: 'AI_NOT_CONFIGURED', errMsg: '请在 flower-ai 本地或云端环境变量配置 DeepSeek 官方 DEEPSEEK_API_KEY' }
    // 素材语义、几何均取云端目录，不接受客户端自定义提示词或目标 URL。
    const ids = [...new Set([source.container.materialId, ...source.materials.map(item => item.materialId)])]
    const records = await Promise.all(ids.map(async id => {
      const result = await uniCloud.database().collection('flower-material-assets').doc(id).get()
      const material = result.data?.[0]
      if (!material || material.id !== id) throw { errCode: 'MATERIAL_NOT_FOUND', errMsg: `素材 ${id} 不存在` }
      return material
    }))
    const catalog = new Map(records.map(item => [item.id, item]))
    const container = catalog.get(source.container.materialId)
    const width = container.geometry?.mouthWidth
    if (container.category !== source.container.type || !Number.isFinite(width) || width <= 0 || width > 698)
      throw { errCode: 'INVALID_CONTAINER', errMsg: '花器分类或插入口几何无效' }
    const mouthWidth = container.category === 'bouquet' ? Math.min(width, 24) : width
    const inset = Math.min(4, mouthWidth / 2)
    const mouth = { left: 350 - mouthWidth / 2 + inset, right: 350 + mouthWidth / 2 - inset, y: 747 }
    const materials = source.materials.map(item => {
      const material = catalog.get(item.materialId)
      if ((material.category || 'flower') !== 'flower') throw { errCode: 'INVALID_MATERIAL', errMsg: '花材分类无效' }
      return { ...item, name: material.name, geometry: material.geometry, colors: material.colors }
    })
    const composition = describeComposition(materials)
    const started = Date.now()
    const response = await requestModel(apiKey, {
      model, messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: JSON.stringify({ container: { ...source.container, name: container.name }, mouth, materials, composition }) },
      ],
      thinking: { type: 'disabled' }, response_format: { type: 'json_object' },
      stream: false, max_tokens: 8192,
    })
    const body = response.data
    const choice = body?.choices?.[0]
    const rawText = typeof choice?.message?.content === 'string' ? choice.message.content : ''
    const debug = { model, responseId: typeof body?.id === 'string' ? body.id : '',
      elapsedMs: Date.now() - started, usage: {
        inputTokens: Number.isFinite(body?.usage?.prompt_tokens) ? body.usage.prompt_tokens : null,
        outputTokens: Number.isFinite(body?.usage?.completion_tokens) ? body.usage.completion_tokens : null,
      }, rawText: rawText.slice(0, 40000), mouth, composition, promptVersion: 'ai-position-color-v1' }
    try {
      if (choice?.finish_reason !== 'stop') throw new Error(`模型未正常完成输出（${choice?.finish_reason || 'unknown'}），请检查输出长度或服务状态`)
      if (!rawText || rawText.length > 40000) throw new Error('模型文本为空或过长')
      const enrichedSource = { ...source, materials }
      const plan = parsePlan(rawText, enrichedSource)
      const layout = generateLayout(plan, enrichedSource, mouth)
      const optimization = layout.optimization
      debug.plan = layout.plan
      return { code: 0, data: { valid: true, validationError: '', optimization, debug } }
    }
    catch (error) {
      return { code: 0, data: { valid: false, validationError: error.message, optimization: null, debug } }
    }
  },
}
