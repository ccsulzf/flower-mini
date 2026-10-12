const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const path = require('node:path');
function fixture(options = {}) {
    const rows = [], deleted = [], uploaded = [];
    let uid = 'alice';
    const collection = { where(condition) {
            const match = row => Object.entries(condition).every(([k, v]) => row[k] === v);
            const query = { orderBy() { return query; }, skip(n) { query.start = n; return query; }, limit(n) { query.size = n; return query; }, async get() { return { data: rows.filter(match).sort((a, b) => b.updatedAt - a.updatedAt).slice(query.start || 0, (query.start || 0) + (query.size || 50)) }; }, async update(data) { if (options.dbFailure)
                    throw Error('database down'); if (options.conflict)
                    return { updated: 0 }; const row = rows.find(match); if (row)
                    Object.assign(row, data); return { updated: row ? 1 : 0 }; }, async remove() { const index = rows.findIndex(match); if (index < 0)
                    return { deleted: 0 }; rows.splice(index, 1); return { deleted: 1 }; } };
            return query;
        }, async add(row) { if (options.dbFailure)
            throw Error('database down'); rows.push(row); return { id: row._id }; } };
    const cloud = { database: () => ({ collection: () => collection }), uploadFile: async (input) => { if (options.uploadFailure)
            throw Error('upload failed'); uploaded.push(input); return { fileID: `cloud://${input.cloudPath}` }; }, deleteFile: async ({ fileList }) => deleted.push(...fileList), getTempFileURL: async ({ fileList }) => ({ fileList: fileList.map(fileID => ({ fileID, tempFileURL: 'https://image/' + fileID })) }) };
    const filename = path.resolve('uniCloud-alipay/cloudfunctions/flower-works/index.obj.js'), module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, uniCloud: cloud, Buffer, require: name => name === 'auth' ? async () => uid ? { uid } : null : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name) });
    const object = module.exports;
    const invoke = async (method, input) => { const ctx = { getUniIdToken() { }, ...object }; await object._before.call(ctx); return object[method].call(ctx, input); };
    return { rows, deleted, uploaded, invoke, user: value => { uid = value; } };
}
const artwork = { version: 2, vase: '陶瓶', background: 'warm', stems: [] };
const thumbnailBase64 = require('./helpers/png.cjs')().toString('base64');
const input = { title: '测试', description: '一束春日的花', artwork, card: { blessing: '', signature: '' }, thumbnailBase64 };
test('云端作品鉴权、账号隔离、同 ID 更新和修订冲突', async () => {
    const f = fixture();
    f.user(null);
    await assert.rejects(f.invoke('list', {}));
    f.user('alice');
    const saved = await f.invoke('save', { ...input, uid: 'bob' });
    assert.equal(f.rows[0].user_id, 'alice');
    assert.equal(saved.revision, 1);
    assert.equal(saved.description, '一束春日的花');
    f.user('bob');
    await assert.rejects(f.invoke('get', { id: saved.id }));
    await assert.rejects(f.invoke('remove', { id: saved.id, expectedRevision: 1 }));
    await assert.rejects(f.invoke('save', { ...input, id: saved.id, expectedRevision: 1 }));
    assert.equal(f.rows.length, 1);
    f.user('alice');
    const updated = await f.invoke('save', { ...input, id: saved.id, expectedRevision: 1, title: '新名称' });
    assert.equal(updated.id, saved.id);
    assert.equal(updated.revision, 2);
    assert.equal(f.rows.length, 1);
    await assert.rejects(f.invoke('save', { ...input, id: saved.id, expectedRevision: 1 }), error => error.errCode === 'WORK_CONFLICT');
    const list = await f.invoke('list', { page: 1, pageSize: 20 });
    assert.equal(list.items.length, 1);
    await f.invoke('remove', { id: saved.id, expectedRevision: 2 });
    assert.equal(f.rows.length, 0);
});
test('云端拒绝伪造图片和非法作品字段', async () => { const f = fixture(); await assert.rejects(f.invoke('save', { ...input, thumbnailBase64: 'bad' })); await assert.rejects(f.invoke('save', { ...input, artwork: { ...artwork, stems: [{ id: 1 }] } })); assert.equal(f.uploaded.length, 0); });
test('数据库失败和并发冲突只清理新缩略图，原记录保持完整', async () => { const options = {}, f = fixture(options); const saved = await f.invoke('save', input); const oldFile = f.rows[0].thumbnailFileId; options.dbFailure = true; await assert.rejects(f.invoke('save', { ...input, id: saved.id, expectedRevision: 1, title: '失败' })); assert.equal(f.rows[0].title, '测试'); assert.equal(f.rows[0].revision, 1); assert.equal(f.deleted.length, 1); assert.notEqual(f.deleted[0], oldFile); options.dbFailure = false; options.conflict = true; await assert.rejects(f.invoke('save', { ...input, id: saved.id, expectedRevision: 1 }), e => e.errCode === 'WORK_CONFLICT'); assert.equal(f.deleted.length, 2); assert.ok(!f.deleted.includes(oldFile)); });
test('缩略图上传失败不创建记录，分页和作品文字长度严格校验', async () => { const f = fixture({ uploadFailure: true }); await assert.rejects(f.invoke('save', input)); assert.equal(f.rows.length, 0); for (const bad of [{ page: 0 }, { page: 1, pageSize: 51 }])
    await assert.rejects(f.invoke('list', bad)); for (const bad of [{ ...input, title: '花'.repeat(41) }, { ...input, description: '花'.repeat(161) }, { ...input, card: { blessing: '花'.repeat(121), signature: '' } }])
    await assert.rejects(f.invoke('save', bad)); assert.equal(f.uploaded.length, 0); });
test('公共 auth 使用 errCode 识别登录，并保留 token 续期', async () => { const filename = path.resolve('uniCloud-alipay/cloudfunctions/common/auth/index.js'), module = { exports: {} }; let result = { errCode: 0, uid: 'alice', token: 'renewed', tokenExpired: 123 }; vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: () => ({ createInstance: () => ({ checkToken: async () => result }) }) }); const auth = await module.exports({ getUniIdToken: () => 'token' }); assert.equal(auth.uid, 'alice'); assert.equal(auth.newToken.token, 'renewed'); result = { errCode: 'EXPIRED', uid: 'alice' }; assert.equal(await module.exports({ getUniIdToken: () => 'token' }), null); });
test('PNG 必须具有有效图片数据与校验码，伪造头部不能保存', async () => { const f = fixture(); const forged = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.from([0, 0, 1, 93, 0, 0, 1, 244]), Buffer.alloc(20)]).toString('base64'); await assert.rejects(f.invoke('save', { ...input, thumbnailBase64: forged })); const corrupt = Buffer.from(thumbnailBase64, 'base64'); corrupt[30] ^= 1; await assert.rejects(f.invoke('save', { ...input, thumbnailBase64: corrupt.toString('base64') })); assert.equal(f.uploaded.length, 0); });
