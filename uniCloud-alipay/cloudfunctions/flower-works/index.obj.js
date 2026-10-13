const resolveAuth = require('auth');
const { randomBytes, createHash } = require('crypto');
const validate = require('./validation');
const collection = () => uniCloud.database().collection('flower-works');
const conflict = () => { throw { errCode: 'WORK_CONFLICT', errMsg: '作品已在其他设备修改，请保留当前创作并刷新作品列表' }; };
async function cleanup(fileId) { if (fileId)
    try {
        await uniCloud.deleteFile({ fileList: [fileId] });
    }
    catch { /* Record is authoritative; failed cleanup never rolls back a saved work. */ } }
async function expose(rows) {
    return rows.map(row => ({ id: row._id, title: row.title, description: row.description || '', createdAt: row.createdAt, updatedAt: row.updatedAt, revision: row.revision, draft: { version: 1, artwork: row.artwork, card: row.card, updatedAt: row.updatedAt, workId: row._id, workRevision: row.revision } }));
}
module.exports = {
    async _before() { const auth = await resolveAuth(this); if (!auth?.uid)
        throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后查看或保存作品' }; this.auth = auth; },
    _after(error, result) { if (error)
        throw error; if (this.auth.newToken)
        result.newToken = this.auth.newToken; return result; },
    async list({ page = 1, pageSize = 20 } = {}) { if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50)
        validate.fail('分页参数无效'); const result = await collection().where({ user_id: this.auth.uid }).orderBy('updatedAt', 'desc').orderBy('_id', 'desc').skip((page - 1) * pageSize).limit(pageSize + 1).get(); return { items: await expose(result.data.slice(0, pageSize)), hasMore: result.data.length > pageSize }; },
    async get({ id } = {}) { validate.id(id); const result = await collection().where({ _id: id, user_id: this.auth.uid }).limit(1).get(); if (!result.data[0])
        throw { errCode: 'WORK_NOT_FOUND', errMsg: '作品不存在或已删除' }; return (await expose(result.data))[0]; },
    async save(input = {}) {
        const artwork = validate.artwork(input.artwork), card = validate.card(input.card), buffer = validate.thumbnail(input.thumbnailBase64);
        if (typeof input.title !== 'string' || input.title.length > 40)
            validate.fail('作品名称最多 40 字');
        const title = input.title.trim() || `我的插花 ${new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')}`;
        if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 160))
            validate.fail('作品介绍最多 160 字');
        const description = (input.description || '').trim();
        const id = input.id === undefined ? randomBytes(16).toString('hex') : validate.id(input.id);
        let old;
        if (input.id !== undefined) {
            validate.revision(input.expectedRevision);
            const result = await collection().where({ _id: id, user_id: this.auth.uid }).limit(1).get();
            old = result.data[0];
            if (!old)
                throw { errCode: 'WORK_NOT_FOUND', errMsg: '作品不存在或已删除' };
            if (old.revision !== input.expectedRevision)
                conflict();
        }
        const revision = (old?.revision || 0) + 1, now = Date.now(), owner = createHash('sha256').update(this.auth.uid).digest('hex');
        let upload;
        let cloudPath;
        if (buffer) {
            cloudPath = `flower-works/${owner}/${id}/${randomBytes(16).toString('hex')}.png`;
            upload = await uniCloud.uploadFile({ cloudPath, fileContent: buffer });
            if (!upload.fileID)
                throw { errCode: 'THUMBNAIL_FAILED', errMsg: '缩略图上传失败，作品尚未保存' };
        }
        const row = { _id: id, user_id: this.auth.uid, title, description, artwork, card, ...(upload?.fileID ? { thumbnailFileId: upload.fileID, thumbnailPath: cloudPath } : old?.thumbnailFileId ? { thumbnailFileId: old.thumbnailFileId, thumbnailPath: old.thumbnailPath } : {}), createdAt: old?.createdAt || now, updatedAt: now, revision };
        try {
            if (old) {
                const { _id, user_id, createdAt, ...changes } = row;
                const result = await collection().where({ _id: id, user_id: this.auth.uid, revision: input.expectedRevision }).update(changes);
                if (result.updated !== 1)
                    conflict();
            }
            else
                await collection().add(row);
        }
        catch (error) {
            await cleanup(upload?.fileID);
            throw error;
        }
        if (upload && old?.thumbnailPath?.startsWith(`flower-works/${owner}/${id}/`))
            await cleanup(old.thumbnailFileId);
        return (await expose([row]))[0];
    },
    async remove({ id, expectedRevision } = {}) { validate.id(id); validate.revision(expectedRevision); const result = await collection().where({ _id: id, user_id: this.auth.uid }).limit(1).get(); const old = result.data[0]; if (!old)
        throw { errCode: 'WORK_NOT_FOUND', errMsg: '作品不存在或已删除' }; const removed = await collection().where({ _id: id, user_id: this.auth.uid, revision: expectedRevision }).remove(); if (removed.deleted !== 1)
        conflict(); const owner = createHash('sha256').update(this.auth.uid).digest('hex'); if (old.thumbnailPath?.startsWith(`flower-works/${owner}/${id}/`))
        await cleanup(old.thumbnailFileId); return { success: true }; }
};
