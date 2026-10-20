const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { createLoader } = require('./helpers/load-ts.cjs')

function setup(options = {}) {
  const temporary = new Map(), records = new Map(), uploaded = [], saved = [], removed = []
  let reads = 0
  const cloud = {
    list: async () => { reads++; if (options.listError) throw { errMsg: options.listError }; return { items: [...records.values()] } },
    save: async record => {
      if (options.beforeSave) await options.beforeSave(record)
      if (record.id === options.failSave) throw { errMsg: '保存失败' }
      saved.push(record.id); records.set(record.id, record)
    },
    remove: async ({ id }) => {
      if (options.removeError) throw { errMsg: options.removeError }
      removed.push(id); records.delete(id); return { ok: true }
    },
  }
  const loader = createLoader({
    uni: options.uni,
    wx: { env: { USER_DATA_PATH: '/test-materials' }, getFileSystemManager: () => ({
      writeFileSync: (path, text) => temporary.set(path, text), unlinkSync: path => temporary.delete(path),
      getFileInfo: ({ filePath, success }) => success({ digest: crypto.createHash('sha1').update(temporary.get(filePath)).digest('hex') }),
    }) },
    uniCloud: { importObject: (name, config) => { assert.equal(name, 'flower-material-admin'); assert.equal(config.customUI, true); return cloud },
      uploadFile: async ({ cloudPath }) => {
        uploaded.push(cloudPath)
        if (cloudPath.includes(`/${options.failUpload}/`)) throw { errMsg: '文件上传失败' }
        return { fileID: `cloud:${cloudPath}` }
      },
    },
  })
  loader.load('src/utils/appAuth.ts').markAppAuthReady()
  const store = loader.load('src/subpackages/material-admin/lib/store.ts').useMaterialAdminStore()
  const items = loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items
  const drafts = ['rose', 'tulip', 'daisy'].map(id => items.find(item => item.id === id))
  return { loader, store, drafts, records, uploaded, saved, removed, temporary, reads: () => reads }
}

test('全部上传先检查权限，跳过已存在素材并上传缺失素材', async () => {
  const s = setup(), [rose, tulip, daisy] = s.drafts
  s.records.set(rose.id, rose); s.records.set(tulip.id, { ...tulip})
  await s.store.uploadAll(s.drafts)
  assert.deepEqual(s.saved, ['daisy'])
  assert.equal(s.reads(), 1)
  assert.equal(s.uploaded.length, 3)
  assert.equal(s.temporary.size, 0)
  assert.ok(s.store.remote.some(item => item.id === tulip.id))
  assert.ok(s.store.remote.some(item => item.id === daisy.id))
  assert.equal(s.store.batchProgress.completed, 1)
  assert.equal(s.store.batchProgress.total, 1)
  assert.equal(s.store.batchProgress.skipped, 2)
  assert.equal(s.store.batchProgress.succeeded, 1)
  assert.equal(s.store.uploadFailures.length, 0)
  await s.store.uploadAll(s.drafts)
  assert.equal(s.saved.length, 1)
  assert.equal(s.store.batchProgress.total, 0)
  assert.equal(s.store.batchProgress.skipped, 3)
})

test('批量单项保存失败继续后续素材，失败项不标成功，重试只处理失败项', async () => {
  const options = { failSave: 'tulip' }, s = setup(options)
  await s.store.uploadAll(s.drafts)
  assert.deepEqual(s.saved, ['rose', 'daisy'])
  assert.equal(s.store.remote.some(item => item.id === 'tulip'), false)
  assert.equal(s.store.batchProgress.completed, 3)
  assert.equal(s.store.batchProgress.succeeded, 2)
  assert.deepEqual(Array.from(s.store.uploadFailures, row => [row.id, row.message]), [['tulip', '保存失败']])
  options.failSave = null
  options.listError = '网络异常'
  await s.store.uploadAll([s.drafts[1]])
  assert.equal(s.store.error, '网络异常')
  assert.deepEqual(Array.from(s.store.uploadFailures, row => row.id), ['tulip'])
  assert.deepEqual(s.saved, ['rose', 'daisy'])
  options.listError = null
  await s.store.uploadAll([s.drafts[1]])
  assert.deepEqual(s.saved, ['rose', 'daisy', 'tulip'])
  assert.equal(s.store.uploadFailures.length, 0)
})

test('批量文件上传失败清理临时文件，后续素材仍能上传；无权限时不上传文件', async () => {
  const s = setup({ failUpload: 'rose' })
  await s.store.uploadAll(s.drafts)
  assert.deepEqual(s.saved, ['tulip', 'daisy'])
  assert.equal(s.temporary.size, 0)
  assert.equal(s.store.uploadFailures[0].id, 'rose')
  const denied = setup({ listError: '没有管理权限' })
  await denied.store.uploadAll(denied.drafts)
  assert.equal(denied.uploaded.length, 0)
  assert.equal(denied.store.remote, null)
  assert.equal(denied.store.error, '没有管理权限')
  assert.equal(denied.store.busy, false)
})

test('上传期间显示当前素材和进度，重复点击不会启动第二次写入或删除', async () => {
  let release, started
  const gate = new Promise(resolve => { release = resolve })
  const entered = new Promise(resolve => { started = resolve })
  const s = setup({ beforeSave: async () => { started(); await gate } })
  const running = s.store.uploadAll([s.drafts[0]])
  await entered
  assert.equal(s.store.busy, true)
  assert.equal(s.store.batchProgress.currentName, '玫瑰')
  assert.equal(s.store.batchProgress.completed, 0)
  await s.store.uploadAll(s.drafts); await s.store.remove(s.drafts[0])
  assert.equal(s.reads(), 1); assert.equal(s.removed.length, 0)
  release(); await running
  assert.equal(s.saved.length, 1); assert.equal(s.store.busy, false)
})

test('删除成功后仅更新云端状态，本地档案仍可重新上传；删除失败保留已上传状态', async () => {
  const s = setup(), item = s.drafts[0]
  s.records.set(item.id, item); await s.store.refresh(); await s.store.remove(item)
  assert.deepEqual(s.removed, ['rose'])
  assert.equal(s.store.remote.length, 0)
  assert.ok(s.loader.load('src/subpackages/material-admin/lib/local-files.ts').localCatalog.items.some(row => row.id === item.id))
  await s.store.upload(item)
  assert.equal(s.store.remote[0].id, 'rose')
  const failed = setup({ removeError: '删除失败' })
  failed.records.set('rose', failed.drafts[0]); await failed.store.refresh(); await failed.store.remove(failed.drafts[0])
  assert.equal(failed.store.remote[0].id, 'rose')
  assert.equal(failed.store.error, '删除失败')
})

test('详情删除必须确认，取消不删除，确认后删除选中素材', async () => {
  let confirm = false, prompts = 0
  const s = setup({ uni: { showModal: ({ success, content }) => { prompts++; assert.match(content, /玫瑰/); success({ confirm, cancel: !confirm }) } } })
  s.records.set('rose', s.drafts[0]); await s.store.refresh()
  const page = s.loader.setup('src/subpackages/material-admin/material-admin-page.vue')
  page.open(s.drafts[0]); await page.removeSelected()
  assert.equal(prompts, 1); assert.equal(s.removed.length, 0)
  confirm = true; await page.removeSelected()
  assert.deepEqual(s.removed, ['rose'])
  assert.equal(page.selected.value.id, 'rose')
})

test('管理员删除接口校验当前身份和素材 ID，仅删除对应档案，不清理云文件', async () => {
  let roles = [], removed = []
  const module = { exports: {} }
  const records = new Map([['rose', { id: 'rose' }], ['tulip', { id: 'tulip' }]])
  vm.runInNewContext(fs.readFileSync('uniCloud-alipay/cloudfunctions/flower-material-admin/index.obj.js', 'utf8'), {
    module, require: () => ({ createInstance: () => ({ checkToken: async () => ({ errCode: 0, uid: 'admin-user' }) }) }),
    uniCloud: { deleteFile: () => { throw Error('不应删除文件') }, database: () => ({ collection: name => {
      if (name === 'uni-id-users') return { doc: uid => { assert.equal(uid, 'admin-user'); return { field: () => ({ get: async () => ({ data: [{ role: roles }] }) }) } } }
      assert.equal(name, 'flower-material-assets')
      return { doc: id => ({ remove: async () => { removed.push(id); records.delete(id) } }) }
    } }) },
  })
  const cloud = module.exports; cloud.getUniIdToken = () => 'signed-token'
  await assert.rejects(cloud._before(), error => error.errCode === 'ADMIN_REQUIRED')
  roles = ['admin']; await cloud._before()
  await assert.rejects(cloud.remove({ id: '../rose' }), error => error.errCode === 'INVALID_MATERIAL')
  await cloud.remove({ id: 'rose', uid: 'forged' })
  assert.deepEqual(removed, ['rose']); assert.equal(records.has('tulip'), true)
})
