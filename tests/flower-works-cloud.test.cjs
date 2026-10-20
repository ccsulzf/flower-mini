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
const artwork = { vase: '陶瓶', background: 'warm', stems: [] };
const thumbnailBase64 = require('./helpers/png.cjs')().toString('base64');
const input = { title: '测试', description: '一束春日的花', artwork, card: { blessing: '', signature: '' }, thumbnailBase64 };
test('云端作品鉴权、账号隔离并按 ID 直接更新', async () => {
    const f = fixture();
    f.user(null);
    await assert.rejects(f.invoke('list', {}));
    f.user('alice');
    const saved = await f.invoke('save', { ...input, uid: 'bob' });
    assert.equal(f.rows[0].user_id, 'alice');
    assert.equal(saved.description, '一束春日的花');
    f.user('bob');
    await assert.rejects(f.invoke('get', { id: saved.id }));
    await assert.rejects(f.invoke('remove', { id: saved.id }));
    await assert.rejects(f.invoke('save', { ...input, id: saved.id }));
    assert.equal(f.rows.length, 1);
    f.user('alice');
    const updated = await f.invoke('save', { ...input, id: saved.id, title: '新名称' });
    assert.equal(updated.id, saved.id);
    assert.equal(f.rows.length, 1);
    const list = await f.invoke('list', { page: 1, pageSize: 20 });
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0].draft, undefined);
    assert.equal(list.items[0].artwork, undefined);
    assert.equal(list.items[0].id, saved.id);
    await f.invoke('remove', { id: saved.id });
    assert.equal(f.rows.length, 0);
});
test('云端拒绝伪造图片和非法作品字段', async () => { const f = fixture(); await assert.rejects(f.invoke('save', { ...input, thumbnailBase64: 'bad' })); await assert.rejects(f.invoke('save', { ...input, artwork: { ...artwork, stems: [{ id: 1 }] } })); assert.equal(f.uploaded.length, 0); });
test('云端作品校验允许超过48枝花材', async () => { const f = fixture(); const stems = Array.from({ length: 60 }, (_, index) => ({ id: index + 1, kind: 'rose', x: 350, y: 747, angle: 0, flowerScale: 1, stemHeight: 410, color: '#abcdef' })); const saved = await f.invoke('save', { ...input, artwork: { ...artwork, stems } }); assert.equal(saved.draft.artwork.stems.length, 60); });
test('云端作品保存允许不生成缩略图，并可更新无缩略图新作和保留旧缩略图', async () => { const f = fixture(); const { thumbnailBase64: _thumbnail, ...withoutThumbnail } = input; const saved = await f.invoke('save', withoutThumbnail); assert.equal(f.uploaded.length, 0); assert.equal(saved.thumbnailFileId, undefined); const updatedNew = await f.invoke('save', { ...withoutThumbnail, id: saved.id, title: '更新无缩略图作品' }); assert.equal(updatedNew.thumbnailFileId, undefined); const legacy = await f.invoke('save', input); const legacyThumbnail = legacy.thumbnailFileId; const updatedLegacy = await f.invoke('save', { ...withoutThumbnail, id: legacy.id, title: '仅更新文字' }); assert.equal(updatedLegacy.thumbnailFileId, legacyThumbnail); assert.equal(f.uploaded.length, 1); assert.deepEqual(f.deleted, []); });
test('数据库失败只清理新缩略图，原记录保持完整', async () => { const options = {}, f = fixture(options); const saved = await f.invoke('save', input); const oldFile = f.rows[0].thumbnailFileId; options.dbFailure = true; await assert.rejects(f.invoke('save', { ...input, id: saved.id, title: '失败' })); assert.equal(f.rows[0].title, '测试'); assert.equal(f.deleted.length, 1); assert.notEqual(f.deleted[0], oldFile); });
test('缩略图上传失败不创建记录，分页和作品文字长度严格校验', async () => { const f = fixture({ uploadFailure: true }); await assert.rejects(f.invoke('save', input)); assert.equal(f.rows.length, 0); for (const bad of [{ page: 0 }, { page: 1, pageSize: 51 }])
    await assert.rejects(f.invoke('list', bad)); for (const bad of [{ ...input, title: '花'.repeat(41) }, { ...input, description: '花'.repeat(161) }, { ...input, card: { blessing: '花'.repeat(121), signature: '' } }])
    await assert.rejects(f.invoke('save', bad)); assert.equal(f.uploaded.length, 0); });
test('公共 auth 使用 errCode 识别登录，并保留 token 续期', async () => { const filename = path.resolve('uniCloud-alipay/cloudfunctions/common/auth/index.js'), module = { exports: {} }; let result = { errCode: 0, uid: 'alice', token: 'renewed', tokenExpired: 123 }; vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: () => ({ createInstance: () => ({ checkToken: async () => result }) }) }); const auth = await module.exports({ getUniIdToken: () => 'token' }); assert.equal(auth.uid, 'alice'); assert.equal(auth.newToken.token, 'renewed'); result = { errCode: 'EXPIRED', uid: 'alice' }; assert.equal(await module.exports({ getUniIdToken: () => 'token' }), null); });
test('PNG 校验接受高清与旧版作品图，拒绝其他尺寸、伪造头部和损坏校验码', async () => { const f = fixture(); const forged = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.from([0, 0, 1, 93, 0, 0, 1, 244]), Buffer.alloc(20)]).toString('base64'); await assert.rejects(f.invoke('save', { ...input, thumbnailBase64: forged })); const corrupt = Buffer.from(thumbnailBase64, 'base64'); corrupt[30] ^= 1; await assert.rejects(f.invoke('save', { ...input, thumbnailBase64: corrupt.toString('base64') })); await assert.rejects(f.invoke('save', { ...input, thumbnailBase64: require('./helpers/png.cjs')(400, 600).toString('base64') })); await f.invoke('save', { ...input, thumbnailBase64: require('./helpers/png.cjs')(349, 500).toString('base64') }); assert.equal(f.uploaded.length, 1); });
