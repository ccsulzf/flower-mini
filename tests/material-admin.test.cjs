const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const crypto = require('node:crypto')
const ts = require('typescript')
const { createLoader } = require('./helpers/load-ts.cjs')

test('实际 Vite 配置支持小程序开发 watch，发行环境排除管理分包', () => {
  const exports = {}
  const env = {}
  const code = ts.transpileModule(fs.readFileSync('vite.config.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, process: { env }, __dirname: process.cwd(), require: name => {
    if (name === 'node:path') return path
    if (name.endsWith('material-admin-config.cjs')) return require('../scripts/material-admin-config.cjs')
    if (name === 'vite') return { defineConfig: value => value }
    return Object.assign(options => ({ options }), {})
  } })
  for (const [command, mode, included, uniNodeEnv] of [['serve', 'development', true], ['build', 'production', false], ['build', 'development', false], ['build', 'custom', false], ['serve', 'production', false], ['build', 'development', true, 'development'], ['build', 'custom', false, 'production'], ['build', 'development', false, 'production']]) {
    env.UNI_NODE_ENV = uniNodeEnv
    const config = exports.default({ command, mode })
    const pages = config.plugins.find(plugin => plugin.options?.dir === 'src/pages').options
    assert.equal(pages.subPackages.length, included ? 1 : 0)
    assert.equal(config.define.__MATERIAL_ADMIN__, String(included))
    assert.equal(pages.mergePages, true)
  }
})

test('真实页面插件扫描主包，并从旧开发路由中移除正式包管理入口', async () => {
  const os = require('node:os')
  process.env.UNI_PLATFORM = 'mp-weixin'
  const { PageContext } = await import('@uni-helper/vite-plugin-uni-pages')
  const { excludeMaterialAdmin } = require('../scripts/material-admin-config.cjs')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flower-pages-'))
  try {
    fs.mkdirSync(path.join(root, 'src/pages/index'), { recursive: true })
    fs.writeFileSync(path.join(root, 'src/pages/index/index.vue'), '<template><view /></template>')
    fs.writeFileSync(path.join(root, 'src/pages.json'), JSON.stringify({ pages: [], subPackages: [{ root: 'subpackages/material-admin', pages: [{ path: 'material-admin-page' }] }] }))
    const ctx = new PageContext({ dir: 'src/pages', mergePages: true, dts: false, onBeforeWriteFile: excludeMaterialAdmin }, root)
    await ctx.updatePagesJSON()
    const result = ts.parseConfigFileTextToJson('pages.json', fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8')).config
    assert.equal(result.pages.length, 1)
    assert.equal(result.pages[0].path, 'pages/index/index')
    assert.equal(result.subPackages.length, 0)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})


function draft(loader = createLoader()) { return loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(item => item.id === 'rose') }
test('独立档案自动识别三种 SVG、介绍、花语和颜色，不限原有品种', () => {
  const loader = createLoader(), item = draft(loader)
  assert.ok(item.introduction && item.flowerMeaning)
  assert.equal(Object.keys(item.sources).length, 3)
  const collect = loader.load('src/subpackages/material-admin/lib/local-materials.ts').collectLocalMaterials
  const meta = { ...item, id: 'new-flower' }; delete meta.sources; delete meta.revision
  const files = { '../assets/new/material.json': JSON.stringify(meta) }
  for (const [key, svg] of Object.entries(item.sources)) files[`../assets/new/${key}.svg`] = svg
  assert.equal(collect(files).items[0].id, 'new-flower')
  delete files['../assets/new/stemWithoutLeaves.svg']
  assert.equal(collect(files).items.length, 0)
  assert.equal(collect(files).errors.length, 1)
})
test('未检查不假装未上传；说明或 SVG 改动均显示有更新，预览不调用云端', () => {
  const loader = createLoader({ uniCloud: { importObject: () => { throw new Error('本地预览不调用云端') } } })
  const { uploadStatus, revisionOf, localPreviewSource } = loader.load('src/subpackages/material-admin/lib/local-materials.ts')
  const item = draft(loader)
  assert.equal(uploadStatus(item, null), '待检查')
  assert.equal(uploadStatus(item, []), '未上传')
  assert.equal(uploadStatus(item, [item]), '已上传')
  assert.equal(uploadStatus({ ...item, revision: revisionOf({ ...item, introduction: '改过了' }) }, [item]), '有更新')
  assert.notEqual(revisionOf(item.sources), revisionOf({ ...item.sources, flower: item.sources.flower + ' ' }))
  const source = Buffer.from(localPreviewSource(item.sources.flower, '#abcdef').split(',')[1], 'base64').toString('utf8')
  assert.ok(source.includes('#abcdef') && !source.includes('__COLOR__'))
  const page = loader.setup('src/subpackages/material-admin/material-admin-page.vue')
  assert.equal(page.materials.value.length, 78)
  assert.ok(!page.materials.value.some(material => material.id === 'poppy'))
  assert.equal(page.materials.value.find(material => material.id === 'ranunculus').name, '洋牡丹')
  assert.equal(page.materials.value.find(material => material.id === 'anthurium').name, '红掌')
  page.open(item); assert.equal(page.selected.value.id, item.id)
  page.group.value = 'main'; assert.equal(page.materials.value.length, 28)
  page.group.value = 'filler'; assert.equal(page.materials.value.length, 19)
})
test('管理员云对象验证身份、完整档案并允许新花材标识', async () => {
  let identity = { errCode: 0, uid: 'normal-user', role: [] }
  let databaseRoles = []
  const records = new Map(), module = { exports: {} }
  const collection = { doc: id => ({ get: async () => ({ data: records.has(id) ? [records.get(id)] : [] }), update: async data => records.set(id, data) }), add: async data => records.set(data._id, data) }
  vm.runInNewContext(fs.readFileSync('uniCloud-alipay/cloudfunctions/flower-material-admin/index.obj.js', 'utf8'), { module, uniCloud: { database: () => ({ collection: name => {
    if (name === 'uni-id-users') return { doc: uid => { assert.equal(uid, identity.uid); return { field: () => ({ get: async () => ({ data: [{ role: databaseRoles }] }) }) } } }
    assert.equal(name, 'flower-material-assets'); return collection
  } }) }, require: () => ({ createInstance: () => ({ checkToken: async () => identity }) }) })
  const cloud = module.exports; cloud.getUniIdToken = () => 'signed-token'
  await assert.rejects(cloud._before(), error => error.errCode === 'ADMIN_REQUIRED')
  identity = { errCode: 0, uid: 'real-admin', role: [] }; databaseRoles = ['admin']; await cloud._before()
  const item = draft(), assets = {}
  for (const key of Object.keys(item.sources)) assets[key] = { fileId: `cloud:${key}`, hash: 'a'.repeat(40) }
  await cloud.save({ ...item, id: 'new-flower', assets, updatedBy: 'forged' })
  assert.equal(records.get('new-flower').updatedBy, 'real-admin')
  assert.equal(Object.keys(records.get('new-flower').assets).length, 3)
  const packaging = createLoader().load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(row => row.id === 'kraft-wrap')
  await cloud.save({ ...packaging, assets: { bouquet: { fileId: 'cloud:wrap', hash: 'b'.repeat(40) } } })
  assert.equal(records.get('kraft-wrap').category, 'bouquet')
  assert.equal(records.get('kraft-wrap').assets.bouquet.fileId, 'cloud:wrap')
  const scene = createLoader().load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.find(row => row.id === 'scene-window-table')
  const backgroundAssets = { background: { fileId: 'cloud:scene', hash: 'c'.repeat(40) } }
  await cloud.save({ ...scene, assets: backgroundAssets })
  assert.equal(records.get(scene.id).category, 'background')
  assert.equal(records.get(scene.id).geometry.surfaceY, 910)
  await assert.rejects(cloud.save({ ...scene, assets: backgroundAssets, geometry: { ...scene.geometry, surfaceY: 1001 } }), error => error.errCode === 'INVALID_MATERIAL')
  databaseRoles = []; identity.role = ['admin']
  await assert.rejects(cloud._before(), error => error.errCode === 'ADMIN_REQUIRED')
  databaseRoles = ['admin']; await cloud._before()
  await assert.rejects(cloud.save({ ...item, assets: {} }), error => error.errCode === 'INVALID_MATERIAL')
  await assert.rejects(cloud.save({ ...item, assets, colors: [{ name: 'bad', value: 'red' }] }), error => error.errCode === 'INVALID_MATERIAL')
})
test('上传三个本地 SVG 后保存档案，失败不误标已上传', async () => {
  const files = new Map(); let uploaded = 0, stored
  const loader = createLoader({ wx: { env: { USER_DATA_PATH: '/local' }, getFileSystemManager: () => ({ writeFileSync: (file, text) => files.set(file, text), unlinkSync: file => files.delete(file), getFileInfo: options => options.success({ digest: crypto.createHash('sha1').update(files.get(options.filePath)).digest('hex') }) }) }, uniCloud: { uploadFile: async options => { uploaded++; assert.ok(files.get(options.filePath).includes('<svg')); return { fileID: `cloud:${uploaded}` } }, importObject: () => ({ list: async () => ({ items: [] }), save: async data => { stored = data } }) } })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/subpackages/material-admin/lib/store.ts').useMaterialAdminStore()
  const item = draft(loader); await store.upload(item)
  assert.equal(uploaded, 3); assert.equal(stored.id, item.id)
  assert.equal(files.size, 0); assert.equal(store.remote[0].revision, item.revision)
  const failed = createLoader({ uniCloud: { importObject: () => ({ list: async () => { throw { errMsg: '没有管理权限' } } }), uploadFile: () => { throw new Error('不应上传') } } })
  failed.load('src/utils/appAuth.ts').markAppAuthReady()
  const failedStore = failed.load('src/subpackages/material-admin/lib/store.ts').useMaterialAdminStore()
  await failedStore.upload(draft(failed))
  assert.equal(failedStore.remote, null); assert.equal(failedStore.error, '没有管理权限')
})

test('JSON 档案使用标准 JSON 导入，只有 SVG 使用 raw 导入', () => {
  const source = fs.readFileSync('src/subpackages/material-admin/lib/local-files.ts', 'utf8')
  assert.match(source, /glob\('\.\.\/assets\/\*\*\/material\.json',\s*\{\s*eager: true, import: 'default'\s*\}\)/)
  assert.match(source, /glob\('\.\.\/assets\/\*\*\/\*\.svg',\s*\{\s*eager: true, query: '\?raw', import: 'default'\s*\}\)/)
})

test('详情整枝预览拼接花朵与花茎，切换去叶与颜色，打开另一素材重置带叶', () => {
  const loader = createLoader(), page = loader.setup('src/subpackages/material-admin/material-admin-page.vue')
  const files = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  const rose = files.find(item => item.id === 'rose')
  page.open(rose)
  const decode = () => Buffer.from(page.wholePreview.value.source.split(',')[1], 'base64').toString('utf8')
  const withLeaves = decode()
  page.leafMode.value = 'without'
  const without = decode()
  assert.notEqual(withLeaves, without)
  assert.ok(without.includes(loader.load('src/utils/flower/stem-curves.ts').smoothStemTip(rose.sources.stemWithoutLeaves).split('>')[1].split('</svg')[0]))
  page.color.value = '#abcdef'
  assert.ok(decode().includes('#abcdef'))
  page.open(files.find(item => item.id === 'peony'))
  assert.equal(page.leafMode.value, 'with')
  page.open(files.find(item => item.id === 'ceramic-vase'))
  assert.equal(page.wholePreview.value, null)
})
