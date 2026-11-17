const resolveAuth = require('auth')
const { consumeDailyQuota, getDailyQuota } = require('./quota')
const { parsePrompt, parseRecentBackgroundIds, describeCatalog, instructions, buildArtwork } = require('./generation')
const { generationDensity } = require('./generation-density')

module.exports = {
  async _before() {
    this.auth = await resolveAuth(this)
    if (!this.auth?.uid) throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后生成花束' }
  },
  _after(error, result) {
    if (error) throw error
    if (this.auth.newToken) result.newToken = this.auth.newToken
    return result
  },
  async quota() {
    return { code: 0, data: await getDailyQuota(uniCloud.database(), this.auth.uid) }
  },
  async generate(input) {
    const started = Date.now()
    let prompt
    let recentBackgroundIds
    try {
      prompt = parsePrompt(input)
      recentBackgroundIds = parseRecentBackgroundIds(input)
    }
    catch (error) { throw { errCode: 'INVALID_ARGUMENT', errMsg: error.message } }
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
    const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash'
    if (!apiKey) throw { errCode: 'AI_NOT_CONFIGURED', errMsg: '请为 flower-generate 配置 DEEPSEEK_API_KEY' }
    // 素材目录是公共业务资源；用户身份只取自公共 auth，不接收客户端 uid。
    const collection = uniCloud.database().collection('flower-material-assets')
    const records = []
    for (let skip = 0; ; skip += 100) {
      const page = await collection.orderBy('id', 'asc').skip(skip).limit(100).get()
      records.push(...page.data)
      if (page.data.length < 100) break
      if (records.length >= 1000) throw { errCode: 'CATALOG_TOO_LARGE', errMsg: '素材目录过大，请收敛生成素材范围' }
    }
    const catalog = describeCatalog(records)
    if (!catalog.some(item => item.category === 'background')
      || !catalog.some(item => ['vase', 'bouquet'].includes(item.category))
      || !catalog.some(item => item.category === 'flower'))
      throw { errCode: 'CATALOG_INCOMPLETE', errMsg: '请先上传背景、容器和花叶素材' }
    // 提前检查避免无额度时调用模型；最终仍通过唯一槽位原子扣次，防止并发超额。
    if (!(await getDailyQuota(uniCloud.database(), this.auth.uid)).available)
      throw { errCode: 'DAILY_LIMIT_REACHED', errMsg: '今日额度已用完' }
    const density = generationDensity(prompt)
    const messages = [{ role: 'system', content: instructions },
      { role: 'user', content: JSON.stringify({ prompt, catalog, recentBackgroundIds, density }) }]
    let result
    let body
    let attempts = 0
    const usage = { inputTokens: 0, outputTokens: 0 }
    let hasInputUsage = false
    let hasOutputUsage = false
    // 包含目录读取和两次请求的总预算，给60秒云函数留出返回余量。
    for (let attempt = 0; attempt < 2; attempt++) {
      const remainingMs = 55000 - (Date.now() - started)
      if (remainingMs < 1000) throw { errCode: 'AI_NETWORK_ERROR', errMsg: '生成请求已超时，请稍后重试' }
      let response
      try {
        attempts++
        response = await uniCloud.httpclient.request('https://api.deepseek.com/chat/completions', {
          method: 'POST', contentType: 'json', dataType: 'json', timeout: Math.min(45000, remainingMs),
          headers: { Authorization: `Bearer ${apiKey}` },
          data: { model, messages, thinking: { type: 'disabled' },
            response_format: { type: 'json_object' }, stream: false, max_tokens: 12000 },
        })
      }
      catch {
        // 不回传客户端异常，避免泄露包含密钥的请求头。
        throw { errCode: 'AI_NETWORK_ERROR', errMsg: attempt ? '自动纠正生成结果时模型请求超时或失败，请稍后重试' : '模型请求失败或超时，请稍后重试' }
      }
      if (response.status !== 200) throw { errCode: 'AI_HTTP_ERROR', errMsg: `模型接口 HTTP ${response.status}，请检查接口配置、余额或稍后重试` }
      body = response.data
      if (Number.isFinite(body?.usage?.prompt_tokens)) {
        usage.inputTokens += body.usage.prompt_tokens
        hasInputUsage = true
      }
      if (Number.isFinite(body?.usage?.completion_tokens)) {
        usage.outputTokens += body.usage.completion_tokens
        hasOutputUsage = true
      }
      const choice = body?.choices?.[0]
      if (choice?.finish_reason !== 'stop') throw { errCode: 'AI_INCOMPLETE', errMsg: '模型未完整生成，请重新尝试' }
      const rawText = choice.message?.content
      try {
        result = buildArtwork(rawText, records, prompt)
        break
      }
      catch (error) {
        const repairable = ['STEM_COUNT_INVALID', 'MODEL_JSON_INVALID', 'MODEL_CATALOG_INVALID', 'MODEL_REQUIREMENT_INVALID', 'MODEL_DENSITY_INVALID'].includes(error.code)
        const canRepair = attempt === 0 && repairable && 55000 - (Date.now() - started) >= 8000
        console.warn('[flower-generate] validation failed', {
          code: error.code || 'INVALID_ARTWORK', attempt: attempt + 1,
          position: error.position ?? null, actualCount: error.actualCount ?? null,
          outputLength: typeof rawText === 'string' ? rawText.length : 0, willRepair: canRepair,
        })
        if (!canRepair) throw { errCode: 'AI_INVALID_RESULT', errMsg: `生成方案未通过校验：${error.message}${attempt ? '（已自动纠正一次）' : ''}` }
        messages.push({ role: 'assistant', content: rawText })
        const feedback = error.code === 'MODEL_REQUIREMENT_INVALID'
          ? `${error.message}。保留所有有效要求，替换违反排除项的花叶，颜色只能使用对应素材目录色板。只返回完整合法JSON，遵循明确限量和density，不要声称满足实际上没有满足的要求。`
          : error.code === 'MODEL_CATALOG_INVALID'
          ? `素材目录校验失败：${error.message}。请逐项核对并纠正上一条输出中所有素材ID及对应色值。只能从以下目录逐字复制ID，花叶不能使用背景或容器ID，color只能使用对应素材列出的值：${JSON.stringify(catalog.map(item => ({ id: item.id, category: item.category, colors: item.colors?.map(color => color.value) })))}。保留创作主题与有效布局，返回完整合法JSON，不要解释或使用代码围栏；materials保持1至96项，数量、花材、颜色和排除项必须遵循原始用户需求，不要求四种role齐全。`
          : error.code === 'MODEL_JSON_INVALID'
          ? `${error.message}。请修正上一条输出的JSON语法，尤其检查未加引号的文字、数字中夹带的汉字、逗号、引号和括号。只返回完整合法的JSON对象，不要解释，不要使用代码围栏或补丁。保留创作主题、有效素材ID和布局设计；遵循原始用户的明确限量、排除项以及density，不得复制坐标凑数。`
          : `花量或花面校验失败：${error.message}。请保留用户原始需求、有效素材和创作主题，重新返回完整JSON。严格区分花朵数与花叶总数；未指定数量时通过同一套适配花材的自然重复达到density，不增加无关品种，不复制坐标凑数。不要求四种职责齐全。`
        messages.push({ role: 'user', content: `${feedback}\n本次花量验收条件density=${JSON.stringify(density)}。除用户明确配方外，按target枝设计并逐项计数，花叶总数与花朵数都要满足范围；保持足够花面宽度和高低跨度。` })
      }
    }
    // 模型请求、自动纠正和作品校验全部成功后才消耗额度。
    await consumeDailyQuota(uniCloud.database(), this.auth.uid)
    console.info('[flower-generate] composition accepted', {
      density: density.kind, target: density.target, totalStems: result.artwork.materials.length,
      flowerStems: result.artwork.materials.filter(item => item.group !== 'foliage').length,
      silhouette: result.design.silhouette, attempts,
    })
    return { code: 0, data: { ...result, debug: { model, elapsedMs: Date.now() - started,
      responseId: typeof body?.id === 'string' ? body.id : '', promptVersion: 'text-bouquet-v10-density-validated', attempts,
      usage: { inputTokens: hasInputUsage ? usage.inputTokens : null, outputTokens: hasOutputUsage ? usage.outputTokens : null } } } }
  },
}
