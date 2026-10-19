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

function makePng(width = 1396, height = 2000) {
  const data = Buffer.alloc(24)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(data)
  data.writeUInt32BE(width, 16)
  data.writeUInt32BE(height, 20)
  return data
}

function setupCloud(options = {}) {
  const records = new Map()
  const deletedFiles = []
  const uploadedFile = makePng(options.imageWidth, options.imageHeight)
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

test('管理页日期草稿均可解析且花材引用符合本地候选清单', () => {
  const parseDailyFlower = createLoader().load('src/utils/flower/daily-flower.ts').parseDailyFlower
  const materials = JSON.parse(fs.readFileSync('src/subpackages/daily-flower-admin/assets/daily-flower-materials.json', 'utf8'))
  const dates = [
    { date: '2026-10-16' },
    { date: '2026-10-17', stemCount: 50, materialCount: 29 },
    { date: '2026-10-18', stemCount: 52, materialCount: 34 },
    { date: '2026-10-19', stemCount: 48, materialCount: 37 },
  ]

  for (const { date, stemCount, materialCount } of dates) {
    const path = date === '2026-10-16'
      ? 'src/subpackages/daily-flower-admin/assets/daily-flower.json'
      : `docs/daily-flowers/${date}.json`
    const draft = parseDailyFlower(fs.readFileSync(path, 'utf8'))
    assert.equal(draft.date, date)
    assert.ok(draft.artwork.stems.length >= 30)
    if (stemCount !== undefined)
      assert.equal(draft.artwork.stems.length, stemCount)
    assert.ok(new Set(draft.artwork.stems.map(stem => stem.materialId)).size >= (materialCount || 8))
    assert.ok(materials.vases.includes(draft.artwork.vaseMaterialId))
    assert.ok(materials.backgrounds.includes(draft.artwork.backgroundMaterialId))
    for (const stem of draft.artwork.stems)
      assert.ok(materials.flowers[stem.kind]?.includes(stem.materialId), `${date}: ${stem.materialId} is not a ${stem.kind} candidate`)
  }
})

test('每日花束历史摘要只校验日期和描述，不要求返回 artwork', () => {
  const parser = createLoader().load('src/utils/flower/daily-flower.ts')
  assert.deepEqual(
    JSON.parse(JSON.stringify(parser.parseDailyFlowerSummary(JSON.stringify({
      date: '2026-10-14',
      description: '秋日花束',
    })))),
    { date: '2026-10-14', description: '秋日花束' },
  )
  assert.throws(() => parser.parseDailyFlowerSummary(JSON.stringify({
    date: '2026-02-30',
    description: '花束',
  })), /日期无效/)
  assert.throws(() => parser.parseDailyFlowerSummary(JSON.stringify({
    date: '2026-10-14',
    description: '',
  })), /描述不能为空/)
})

test('每日花束发布直接使用渲染云函数返回的云文件，不经客户端转码或重复上传', async () => {
  const calls = []
  const loader = createLoader({
    uniCloud: {
      importObject: (name) => {
        if (name === 'flower-render') {
          return {
            renderDailyArtwork: async input => {
              calls.push(['render', input])
              return {
                width: 1396,
                height: 2000,
                fileID: 'cloud://space/daily-flower/2026-10-16/render.png',
                cloudPath: 'daily-flower/2026-10-16/render.png',
              }
            },
          }
        }
        assert.equal(name, 'flower-daily-admin')
        return {
          publish: async input => {
            calls.push(['publish', input])
            return { ok: true }
          },
        }
      },
      uploadFile: async () => {
        throw new Error('客户端不应重复上传渲染结果')
      },
    },
  })
  const draft = {
    date: '2026-10-16',
    description: '晨光里的玫瑰',
    artwork: sampleArtwork(),
  }
  const result = await loader.load('src/subpackages/daily-flower-admin/lib/publish.ts').publishDailyFlower(draft)
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['render', { artwork: draft.artwork, date: draft.date }],
    ['publish', { date: draft.date, description: draft.description, artwork: draft.artwork, imageFileId: 'cloud://space/daily-flower/2026-10-16/render.png' }],
  ])
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
    cloudMaterial('spray-rose', 'flower', '6'.repeat(16)),
    cloudMaterial('dahlia', 'flower', 'c'.repeat(16)),
    cloudMaterial('gerbera', 'flower', '7'.repeat(16)),
    cloudMaterial('pincushion', 'flower', '8'.repeat(16)),
    cloudMaterial('gypsophila', 'flower', '9'.repeat(16)),
    cloudMaterial('chamomile', 'flower', 'a'.repeat(16)),
    cloudMaterial('solidago', 'flower', 'f'.repeat(16)),
    cloudMaterial('spirea', 'flower', '3'.repeat(16)),
    cloudMaterial('eucalyptus', 'flower', '1'.repeat(16)),
    cloudMaterial('dusty-miller', 'flower', 'b'.repeat(16)),
    cloudMaterial('ceramic-vase', 'vase', 'd'.repeat(16)),
    cloudMaterial('ribbed-ceramic-vase', 'vase', '4'.repeat(16)),
    cloudMaterial('scene-window-table', 'background', '2'.repeat(16)),
    cloudMaterial('scene-ivory-table', 'background', '5'.repeat(16)),
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
  assert.ok(artwork.stems.length >= 30)
  assert.equal(artwork.stems.length, 64)
  assert.equal(artwork.stems.filter(stem => stem.kind === 'chrysanthemum').length, 0)
  assert.equal(artwork.stems.filter(stem => stem.kind === 'rose').length, 16)
  assert.equal(artwork.stems.filter(stem => stem.kind === 'poppy').length, 18)
  assert.equal(artwork.stems.filter(stem => stem.kind === 'leaf').length, 10)
  assert.equal(artwork.stems.filter(stem => stem.kind === 'daisy').length, 20)
  assert.equal(new Set(artwork.stems.map(stem => stem.kind)).size, 4)
  const bloomHeads = artwork.stems.slice(30).map((stem) => {
    const radians = stem.angle * Math.PI / 180
    return [
      stem.x + Math.sin(radians) * stem.stemHeight,
      stem.y - Math.cos(radians) * stem.stemHeight,
    ]
  })
  assert.ok(Math.max(...bloomHeads.map(([x]) => x)) - Math.min(...bloomHeads.map(([x]) => x)) >= 330)
  assert.ok(Math.max(...bloomHeads.map(([, y]) => y)) - Math.min(...bloomHeads.map(([, y]) => y)) >= 250)
  assert.ok(artwork.stems.some(stem => stem.color === '#d99eaa'))
  assert.ok(artwork.stems.some(stem => stem.color === '#a99db9'))
  assert.ok(artwork.stems.every(stem => !['#793b4b', '#c76d43', '#748ad6'].includes(stem.color)))
  assert.ok(new Set(artwork.stems.map(stem => stem.materialId)).size >= 8)
  assert.ok(artwork.stems.every(stem => stem.materialId && stem.materialRevision))
  assert.equal(artwork.vaseMaterialId, 'ribbed-ceramic-vase')
  assert.equal(artwork.backgroundMaterialId, 'scene-sage-table')
  assert.equal(artwork.stems[0].materialId, 'eucalyptus')
  assert.ok(artwork.stems.every(stem => materials.some(material => material.id === stem.materialId)))
  assert.throws(() => attachCloudMaterials(parsed.artwork, [], manifest), /没有本地物料清单中可用于 leaf/)
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

test('每日花束云对象继续接受旧尺寸 PNG', async () => {
  const { cloud } = setupCloud({ roles: ['admin'], imageWidth: 698, imageHeight: 1000 })
  await cloud._before()
  const result = await cloud.publish({
    date: '2026-10-14',
    description: '晨光里的玫瑰',
    artwork: sampleArtwork(),
    imageFileId: 'cloud://space/daily-flower/2026-10-14/legacy.png',
  })
  assert.equal(result.updated, false)
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
