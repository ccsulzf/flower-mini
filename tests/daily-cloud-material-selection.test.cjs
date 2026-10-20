const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')

test('每日花束直接验证草稿引用的云端素材', () => {
  const attach = createLoader().load('src/subpackages/daily-flower-admin/lib/daily-flower-preview.ts').attachCloudMaterials
  const artwork = { stems: [{ kind: 'rose', materialId: 'rose' }], vaseMaterialId: 'vase', backgroundMaterialId: 'bg' }
  const materials = [{ id: 'rose', category: 'flower' }, { id: 'vase', category: 'vase' }, { id: 'bg', category: 'background' }]
  assert.equal(attach(artwork, materials).stems[0].materialId, 'rose')
  assert.throws(() => attach({ ...artwork, stems: [{ kind: 'rose' }] }, materials), /素材/)
  assert.throws(() => attach(artwork, materials.slice(1)), /rose/)
})
