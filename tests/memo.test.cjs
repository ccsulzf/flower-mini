const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

function setup() {
  const rows = []
  let next = 0
  const collection = {
    async add(data) { const id = String(++next); rows.push({ ...data, _id: id }); return { id } },
    where(filter) {
      const match = row => Object.entries(filter).every(([key, value]) => row[key] === value)
      let offset = 0, count = Infinity
      const order = []
      return {
        orderBy(key, direction) { order.push([key, direction]); return this },
        skip(value) { offset = value; return this },
        limit(value) { count = value; return this },
        async get() {
          const data = rows.filter(match).sort((a, b) => {
            for (const [key, direction] of order) {
              if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (direction === 'desc' ? -1 : 1)
            }
            return 0
          }).slice(offset, offset + count).map(row => ({ ...row }))
          return { data }
        },
        async update(data) { let updated = 0; rows.filter(match).forEach(row => { Object.assign(row, data); updated++ }); return { updated } },
        async remove() { let deleted = 0; for (let i = rows.length - 1; i >= 0; i--) { if (match(rows[i])) { rows.splice(i, 1); deleted++ } } return { deleted } },
      }
    },
  }
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../uniCloud-alipay/cloudfunctions/memo/index.obj.js'), 'utf8'), {
    module, require: () => async ctx => ctx.identity ? { uid: ctx.identity } : null,
    uniCloud: { database: () => ({ collection: () => collection }) },
  })
  return identity => ({ ...module.exports, identity })
}

test('rejects unauthenticated access', async () => {
  const ctx = setup()(null)
  await assert.rejects(() => ctx._before(), /登录/)
})
test('validates input before writing', async () => {
  const ctx = setup()('alice'); await ctx._before()
  for (const data of [null, {}, { title: ' ' }, { title: 'x'.repeat(81) }, { title: 'ok', content: 1 }, { title: 'ok', content: 'x'.repeat(2001) }])
    await assert.rejects(() => ctx.create(data))
  assert.equal((await ctx.list()).data.length, 0)
})
test('creates, reads, updates and deletes only owned records', async () => {
  const user = setup(); const a = user('alice'); const b = user('bob')
  await a._before(); await b._before()
  const { id } = await a.create({ title: ' first ', content: ' note ', user_id: 'bob' })
  assert.equal((await a.list()).data[0].title, 'first')
  assert.equal((await a.list()).data[0].user_id, 'alice')
  assert.equal((await b.list()).data.length, 0)
  await assert.rejects(() => b.update({ id, title: 'stolen', content: '' }))
  await assert.rejects(() => b.remove({ id }))
  await a.update({ id, title: 'edited', content: '' })
  assert.equal((await a.list()).data[0].title, 'edited')
  await a.remove({ id })
  assert.equal((await a.list()).data.length, 0)
  await assert.rejects(() => a.remove({ id }))
})

test('paginates records without leaking other users and rejects invalid page/id', async () => {
  const user = setup(); const a = user('alice'); const b = user('bob')
  await a._before(); await b._before()
  for (let i = 0; i < 23; i++) await a.create({ title: `note ${i}`, content: '' })
  await b.create({ title: 'private', content: '' })
  const first = (await a.list({ page: 1 })).data
  const second = (await a.list({ page: 2 })).data
  assert.equal(first.length, 20)
  assert.equal(second.length, 3)
  assert.equal(new Set([...first, ...second].map(row => row._id)).size, 23)
  assert.ok([...first, ...second].every(row => row.user_id === 'alice'))
  for (const page of [0, -1, 1.5, '1', 10001]) await assert.rejects(() => a.list({ page }))
  for (const id of [null, '', {}, 1]) await assert.rejects(() => a.remove({ id }))
})
