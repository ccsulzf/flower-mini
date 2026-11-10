const fail = message => { throw { errCode: 'INVALID_WORK', errMsg: message }; };
const record = v => v && typeof v === 'object' && !Array.isArray(v);
const finite = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const ref = id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id);
const groups = new Set(['main', 'filler', 'foliage']);
const containerTypes = new Set(['vase', 'bouquet']);
function point(v) {
    if (!record(v) || !finite(v.x, 0, 698) || !finite(v.y, 0, 1000))
        fail('花材落点无效');
    return { x: v.x, y: v.y };
}
function transform(v) {
    if (!record(v) || !finite(v.angle, -65, 65) || !finite(v.height, 120, 620) || !finite(v.scale, .65, 1.35) || typeof v.mirrored !== 'boolean')
        fail('花材位置或尺寸无效');
    return { anchor: point(v.anchor), angle: v.angle, height: v.height, scale: v.scale, mirrored: v.mirrored };
}
function layout(v, materialIds) {
    if (!record(v) || !Number.isSafeInteger(v.materialInstanceId) || !materialIds.has(v.materialInstanceId)
        || !finite(v.angle, -65, 65) || !finite(v.height, 120, 620) || !finite(v.scale, .65, 1.35))
        fail('容器布局记录无效');
    return { materialInstanceId: v.materialInstanceId, anchor: point(v.anchor), angle: v.angle, height: v.height, scale: v.scale };
}
function artwork(v) {
    if (!record(v) || !record(v.background) || !ref(v.background.materialId)
        || !record(v.container) || !ref(v.container.materialId) || !containerTypes.has(v.container.type)
        || !Array.isArray(v.materials) || !record(v.containerLayouts))
        fail('作品格式无效');
    const ids = new Set();
    const materials = v.materials.map(s => {
        if (!record(s) || !Number.isSafeInteger(s.id) || !finite(s.id, 1, Number.MAX_SAFE_INTEGER)
            || ids.has(s.id) || !ref(s.materialId) || !groups.has(s.group)
            || typeof s.color !== 'string' || !/^#[a-f\d]{6}$/i.test(s.color))
            fail('花材数据无效');
        ids.add(s.id);
        return { id: s.id, materialId: s.materialId, group: s.group, color: s.color, transform: transform(s.transform) };
    });
    const containerLayouts = {};
    for (const [key, rows] of Object.entries(v.containerLayouts)) {
        if (!ref(key) || !Array.isArray(rows))
            fail('容器布局无效');
        const seen = new Set();
        containerLayouts[key] = rows.map(row => {
            const normalized = layout(row, ids);
            if (seen.has(normalized.materialInstanceId))
                fail('容器布局包含重复花材');
            seen.add(normalized.materialInstanceId);
            return normalized;
        });
    }
    const out = {
        background: { materialId: v.background.materialId },
        container: { materialId: v.container.materialId, type: v.container.type },
        materials,
        containerLayouts,
    };
    if (JSON.stringify(out).length > 65536)
        fail('作品数据过大');
    return out;
}
function card(v) { if (!record(v) || typeof v.blessing !== 'string' || typeof v.signature !== 'string' || v.blessing.length > 120 || v.signature.length > 24)
    fail('花卡文字过长或格式无效'); return { blessing: v.blessing.trim(), signature: v.signature.trim() }; }
function id(v) { if (typeof v !== 'string' || !/^[a-f\d]{32}$/.test(v))
    fail('作品编号无效'); return v; }
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
} return (crc ^ 0xffffffff) >>> 0; }
function thumbnail(v) {
    if (v === undefined)
        return undefined;
    if (typeof v !== 'string' || v.length > 1050000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(v))
        fail('缩略图无效');
    const buffer = Buffer.from(v, 'base64');
    if (buffer.length < 45 || buffer.length > 768 * 1024 || buffer.toString('base64') !== v || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
        fail('缩略图 PNG 无效或超过大小限制');
    const parts = [];
    let offset = 8, header = false, end = false, channels = 0, palette = false;
    while (offset < buffer.length) {
        if (offset + 12 > buffer.length)
            fail('PNG 数据不完整');
        const length = buffer.readUInt32BE(offset), finish = offset + 12 + length;
        if (finish > buffer.length)
            fail('PNG 数据不完整');
        const type = buffer.toString('ascii', offset + 4, offset + 8), data = buffer.subarray(offset + 8, finish - 4);
        if (!/^[A-Za-z]{4}$/.test(type) || crc32(buffer.subarray(offset + 4, finish - 4)) !== buffer.readUInt32BE(finish - 4))
            fail('PNG 校验失败');
        if (!header && type !== 'IHDR')
            fail('PNG 缺少图像头');
        if (type === 'IHDR') {
            if (header || length !== 13)
                fail('PNG 图像头无效');
            const width = data.readUInt32BE(0), height = data.readUInt32BE(4);
            if (!((width === 349 && height === 500) || (width === 698 && height === 1000)) || data[8] !== 8 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0)
                fail('缩略图尺寸无效');
            header = true;
            channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[data[9]];
            if (!channels)
                fail('PNG 色彩格式无效');
        }
        else if (type === 'PLTE') {
            if (!length || length > 768 || length % 3)
                fail('PNG 调色板无效');
            palette = true;
        }
        else if (type === 'IDAT') {
            if (!length)
                fail('PNG 图像数据为空');
            parts.push(data);
        }
        else if (type === 'IEND') {
            if (length !== 0 || finish !== buffer.length)
                fail('PNG 结束标记无效');
            end = true;
        }
        else if (type[0] === type[0].toUpperCase())
            fail('PNG 格式不支持');
        offset = finish;
    }
    if (!end || !parts.length || (buffer[25] === 3 && !palette))
        fail('PNG 图像数据不完整');
    const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
    const rowBytes = 1 + width * channels, expected = height * rowBytes;
    let pixels;
    try {
        pixels = require('zlib').inflateSync(Buffer.concat(parts), { maxOutputLength: expected + 1 });
    }
    catch {
        fail('PNG 图像数据损坏');
    }
    if (pixels.length !== expected)
        fail('PNG 图像尺寸无效');
    for (let row = 0; row < height; row++)
        if (pixels[row * rowBytes] > 4)
            fail('PNG 行过滤参数无效');
    return buffer;
}
module.exports = { artwork, card, id, thumbnail, fail };
