const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const fs = require('node:fs')
const test = require('node:test')
const vm = require('node:vm')
const validation = require('../uniCloud-alipay/cloudfunctions/common/daily-flower')
const { createLoader } = require('./helpers/load-ts.cjs')

function sampleArtwork() {
  return {
    version: 2,
    vase: '陶瓶',
    background: 'warm',
    stems: [{
      id: 1,
      kind: 'rose',
      x: 350,
      y: 747,
      angle: 0,
      flowerScale: 1,
      stemHeight: 260,
      color: '#d85f70',
    }],
  }
}

function makePng(width = 698, height = 1000) {
  const data = Buffer.alloc(24)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(data)
  data.writeUInt32BE(width, 16)
  data.writeUInt32BE(height, 20)
  return data
}

function setupCloud(options = {}) {
  const records = new Map()
  const deletedFiles = []
  const uploadedFile = makePng()
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync('uniCloud-alipay/cloudfunctions/flower-daily-admin/index.obj.js', 'utf8'), {
    module,
    Buffer,
    console,
    require: (name) => {
      if (name === 'uni-id-common')
        return { createInstance: () => ({ checkToken: async () => ({ errCode: 0, uid: 'daily-admin' }) }) }
      if (name === 'daily-flower')
        return validation
      throw new Error(`Unexpected dependency ${name}`)
    },
    uniCloud: {
      database: () => ({
        collection: (name) => {
          if (name === 'uni-id-users') {
            return {
              doc: (uid) => {
                assert.equal(uid, 'daily-admin')
                return { field: () => ({ get: async () => ({ data: [{ role: options.roles || [] }] }) }) }
              },
            }
          }
          assert.equal(name, 'daily-flower')
          return {
            doc: id => ({
              get: async () => ({ data: records.has(id) ? [records.get(id)] : [] }),
              update: async changes => records.set(id, { ...records.get(id), ...changes }),
            }),
            add: async record => records.set(record._id, record),
          }
        },
      }),
      downloadFile: async ({ fileID }) => {
        if (options.downloadError)
          throw new Error('download failed')
        assert.ok(fileID.startsWith('cloud://space/daily-flower/'))
        return { fileContent: options.invalidImage ? makePng(1, 1) : uploadedFile }
      },
      deleteFile: async ({ fileList }) => deletedFiles.push(...fileList),
    },
  })
  const cloud = module.exports
  cloud.getUniIdToken = () => 'signed-token'
  return { cloud, records, deletedFiles }
}

test('每日花束 JSON 校验日期、描述及花束结构，并丢弃未知字段', () => {
  const artwork = { ...sampleArtwork(), unexpected: 'ignored' }
  const result = validation.validateArtwork(artwork)
  assert.equal(result.unexpected, undefined)
  assert.equal(validation.validateDate('2026-02-28'), '2026-02-28')
  assert.equal(validation.validateDescription('  一束春日玫瑰  '), '一束春日玫瑰')
  assert.throws(() => validation.validateDate('2026-02-30'), error => error.errMsg === '日期无效')
  assert.throws(() => validation.validateArtwork({ ...sampleArtwork(), stems: [] }), error => error.errMsg.includes('1 至 64 枝'))
})

test('本地每日花束 JSON 由用户提供并在预览前完整校验', () => {
  const pageModule = createLoader().load('src/utils/flower/daily-flower.ts')
  const input = JSON.stringify({
    date: '2026-10-14',
    description: '晨光里的玫瑰',
    artwork: sampleArtwork(),
  })
  const draft = pageModule.parseDailyFlower(input)
  assert.equal(draft.date, '2026-10-14')
  assert.equal(draft.artwork.stems.length, 1)
  assert.throws(() => pageModule.parseDailyFlower(JSON.stringify({
    date: '2026-02-30',
    description: '花束',
    artwork: sampleArtwork(),
  })), /日期无效/)
  assert.throws(() => pageModule.parseDailyFlower(JSON.stringify({
    date: '2026-10-14',
    description: '',
    artwork: sampleArtwork(),
  })), /描述不能为空/)
})

test('本地物料 JSON 仅将已存在于云端的候选物料关联到每日花束', () => {
  const attachCloudMaterials = createLoader().load('src/subpackages/daily-flower-admin/lib/daily-flower-preview.ts').attachCloudMaterials
  const cloudMaterial = (id, category, revision) => ({
    id,
    category,
    revision,
    colors: [{ name: '测试色', value: '#d85f70' }],
  })
  const materials = [
    cloudMaterial('firework-chrysanthemum', 'flower', 'a'.repeat(16)),
    cloudMaterial('rose', 'flower', 'b'.repeat(16)),
    cloudMaterial('dahlia', 'flower', 'c'.repeat(16)),
    cloudMaterial('solidago', 'flower', 'f'.repeat(16)),
    cloudMaterial('eucalyptus', 'flower', '1'.repeat(16)),
    cloudMaterial('ceramic-vase', 'vase', 'd'.repeat(16)),
    cloudMaterial('scene-sage-table', 'background', 'e'.repeat(16)),
  ]
  const manifest = JSON.parse(fs.readFileSync('src/subpackages/daily-flower-admin/assets/daily-flower-materials.json', 'utf8'))
  for (const [kind, ids] of Object.entries(manifest.flowers)) {
    for (const id of ids) {
      const localMaterial = JSON.parse(fs.readFileSync(`src/subpackages/material-admin/assets/${id}/material.json`, 'utf8'))
      assert.equal(localMaterial.category || 'flower', 'flower', `${kind}: ${id}`)
    }
  }
  for (const [ids, category] of [[manifest.vases, 'vase'], [manifest.backgrounds, 'background']]) {
    for (const id of ids) {
      const localMaterial = JSON.parse(fs.readFileSync(`src/subpackages/material-admin/assets/${id}/material.json`, 'utf8'))
      assert.equal(localMaterial.category, category, id)
    }
  }
  const localJson = JSON.parse(fs.readFileSync('src/subpackages/daily-flower-admin/assets/daily-flower.json', 'utf8'))
  const parsed = createLoader().load('src/utils/flower/daily-flower.ts').parseDailyFlower(JSON.stringify(localJson))
  const artwork = attachCloudMaterials(parsed.artwork, materials, manifest)
  assert.equal(artwork.stems.length, 44)
  assert.ok(artwork.stems.filter(stem => stem.kind === 'chrysanthemum').length >= 10)
  assert.ok(new Set(artwork.stems.map(stem => stem.kind)).size >= 5)
  assert.ok(artwork.stems.every(stem => stem.materialId && stem.materialRevision))
  assert.equal(artwork.vaseMaterialId, 'ceramic-vase')
  assert.equal(artwork.backgroundMaterialId, 'scene-sage-table')
  assert.equal(artwork.stems[0].materialId, 'firework-chrysanthemum')
  assert.ok(artwork.stems.every(stem => materials.some(material => material.id === stem.materialId)))
  assert.throws(() => attachCloudMaterials(parsed.artwork, [], manifest), /没有本地物料清单中可用于 chrysanthemum/)
})

test('每日花束云对象拒绝非管理员，并验证 PNG 图片尺寸', async () => {
  const denied = setupCloud()
  await assert.rejects(denied.cloud._before(), error => error.errCode === 'ADMIN_REQUIRED')

  const admin = setupCloud({ roles: ['admin'], invalidImage: true })
  await admin.cloud._before()
  await assert.rejects(admin.cloud.publish({
    date: '2026-10-14',
    description: '晨光里的玫瑰',
    artwork: sampleArtwork(),
    imageFileId: 'cloud://space/daily-flower/2026-10-14/new.png',
  }), error => error.errCode === 'INVALID_DAILY_FLOWER_IMAGE')
})

test('同日再次发布覆盖花束与图片，并清理旧图片', async () => {
  const { cloud, records, deletedFiles } = setupCloud({ roles: ['admin'] })
  await cloud._before()
  const first = await cloud.publish({
    date: '2026-10-14',
    description: '晨光里的玫瑰',
    artwork: sampleArtwork(),
    imageFileId: 'cloud://space/daily-flower/2026-10-14/first.png',
  })
  assert.equal(first.updated, false)
  const originalCreatedAt = records.get('2026-10-14').createdAt

  const second = await cloud.publish({
    date: '2026-10-14',
    description: '秋日里的玫瑰',
    artwork: { ...sampleArtwork(), background: 'sage' },
    imageFileId: 'cloud://space/daily-flower/2026-10-14/second.png',
  })
  const row = records.get('2026-10-14')
  assert.equal(second.updated, true)
  assert.equal(row.description, '秋日里的玫瑰')
  assert.equal(row.artwork.background, 'sage')
  assert.equal(row.imageFileId, 'cloud://space/daily-flower/2026-10-14/second.png')
  assert.equal(row.createdAt, originalCreatedAt)
  assert.deepEqual(deletedFiles, ['cloud://space/daily-flower/2026-10-14/first.png'])
})
