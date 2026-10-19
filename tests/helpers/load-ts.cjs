const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { compileScript, parse } = require('@vue/compiler-sfc')
const { createPinia, setActivePinia } = require('pinia')

const root = path.resolve(__dirname, '../..')
function createLoader(options = {}) {
  setActivePinia(createPinia())
  const modules = new Map()
  const uni = {
    getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 800, screenHeight: 800, statusBarHeight: 24, ...options.device }),
    arrayBufferToBase64: buffer => Buffer.from(buffer).toString('base64'),
    setNavigationBarColor() {}, setNavigationBarTitle() {}, showToast() {}, showLoading() {}, hideLoading() {},
    ...options.uni,
  }
  function load(relative) {
    const filename = path.isAbsolute(relative) ? relative : path.resolve(root, relative)
    if (modules.has(filename)) return modules.get(filename)
    let source = fs.readFileSync(filename, 'utf8')
    if (filename.endsWith('.vue')) source = compileScript(parse(source, { filename }).descriptor, { id: filename }).content
    source = source.replace(/import\.meta\.glob/g, '__localGlob')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const exports = {}
    modules.set(filename, exports)
    vm.runInNewContext(code, {
      exports, uni, getCurrentPages: () => options.pages || [], __localGlob: pattern => {
        const base = path.join(root, 'src/subpackages/material-admin/assets')
        const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.(svg|json)$/.test(entry.name) ? [[`../assets/${path.relative(base, path.join(dir, entry.name))}`, fs.readFileSync(path.join(dir, entry.name), 'utf8')]] : [])
        return Object.fromEntries(walk(base).filter(([name]) => pattern.endsWith('material.json') ? name.endsWith('/material.json') : name.endsWith('.svg')).map(([name, value]) => [name, pattern.endsWith('material.json') ? JSON.parse(value) : value]))
      }, uniCloud: options.uniCloud, wx: options.wx, definePage() {}, setTimeout, clearTimeout,
      require(name) {
        if (options.modules && Object.prototype.hasOwnProperty.call(options.modules, name)) return options.modules[name]
        if (name === 'vue' && options.eventChannel) return { ...require('vue'), getCurrentInstance: () => ({ proxy: { getOpenerEventChannel: () => options.eventChannel } }) }
        if (name === '@dcloudio/uni-app') return Object.fromEntries(['onUnload', 'onLoad', 'onShow', 'onHide', 'onBackPress', 'onReachBottom'].map(event => [event, callback => { options.lifecycle?.[event]?.push(callback) }]))
        if (!name.startsWith('.') && !name.startsWith('@/')) return require(name)
        const target = name.startsWith('@/') ? path.resolve(root, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name)
        if (name.endsWith('?raw')) return { __esModule: true, default: fs.readFileSync(target.slice(0, -4), 'utf8') }
        if (name.endsWith('.vue')) return {}
        if (name.endsWith('.cjs')) return require(target)
        return load(path.extname(target) ? target : `${target}.ts`)
      },
    })
    return exports
  }
  return { load, setup: (relative, props = {}) => load(relative).default.setup(props, { expose() {}, emit: options.emit || (() => {}) }) }
}
module.exports = { createLoader }
