const fs = require('node:fs')
const resolveAuth = require('auth')
const { initWasm, Resvg } = require('@resvg/resvg-wasm')

let wasmReady

module.exports = {
  async _before() {
    const auth = await resolveAuth(this)
    if (!auth?.uid)
      throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后进行云端渲染测试' }
    this.auth = auth
  },
  _after(error, result) {
    if (error)
      throw error
    if (this.auth.newToken)
      result.newToken = this.auth.newToken
    return result
  },
  async render({ svg } = {}) {
    const startedAt = Date.now()
    const root = typeof svg === 'string' ? svg.match(/^\s*(<svg\b[^>]*>)/i)?.[1] : undefined
    if (typeof svg !== 'string' || svg.length > 1024 * 1024
      || !root || !/<\/svg>\s*$/i.test(svg)
      || /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=|@import|url\(\s*["']?(?!#)[^)]+\)/i.test(svg)
      || !/\bwidth=["']698["']/i.test(root) || !/\bheight=["']1000["']/i.test(root))
      throw new Error('作品 SVG 无效或尺寸不符合要求')
    if (!wasmReady) {
      const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm')
      wasmReady = initWasm(fs.readFileSync(wasmPath)).catch((error) => {
        if (error?.message === 'Already initialized. The `initWasm()` function can be used only once.')
          return
        wasmReady = undefined
        throw error
      })
    }
    await wasmReady
    const renderer = new Resvg(svg, {
      fitTo: { mode: 'original' },
      font: { loadSystemFonts: false },
    })
    let image
    let png
    let width
    let height
    try {
      image = renderer.render()
      width = image.width
      height = image.height
      png = image.asPng()
    }
    finally {
      image?.free()
      renderer.free()
    }
    return {
      width,
      height,
      pngBase64: Buffer.from(png).toString('base64'),
      pngBytes: png.length,
      renderMs: Date.now() - startedAt,
    }
  },
}
