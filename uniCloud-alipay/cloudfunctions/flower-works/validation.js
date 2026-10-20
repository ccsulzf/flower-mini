const fail = message => { throw { errCode: 'INVALID_WORK', errMsg: message }; };
const record = v => v && typeof v === 'object' && !Array.isArray(v);
const finite = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const ref = id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id);
function reference(source, target, prefix) {
    const id = prefix + 'Id';
    if (source[id] !== undefined) {
        if (!ref(source[id]))
            fail('素材引用无效');
        target[id] = source[id];
    }
}
function layout(v) {
    if (!record(v) || !Number.isSafeInteger(v.id) || !finite(v.id, 1, Number.MAX_SAFE_INTEGER) || !finite(v.x, 0, 698) || !finite(v.angle, -65, 65) || !finite(v.flowerScale, .65, 1.35) || !finite(v.stemHeight, 120, 620))
        fail('花材位置或尺寸无效');
    return { id: v.id, x: v.x, angle: v.angle, flowerScale: v.flowerScale, stemHeight: v.stemHeight };
}
function artwork(v) {
    if (!record(v) || !['陶瓶', '玻璃瓶', '圆花器', '花束'].includes(v.vase) || !['warm', 'sage', 'cocoa', 'mist', 'blush', 'sand'].includes(v.background) || !Array.isArray(v.stems))
        fail('作品格式无效');
    const out = { vase: v.vase, background: v.background, stems: [] }, ids = new Set();
    reference(v, out, 'vaseMaterial');
    reference(v, out, 'backgroundMaterial');
    out.stems = v.stems.map(s => {
        const row = layout(s);
        if (ids.has(s.id) || !finite(s.y, 0, 1000) || !['daisy', 'poppy', 'leaf', 'chrysanthemum', 'rose', 'tulip'].includes(s.kind) || typeof s.color !== 'string' || !/^#[a-f\d]{6}$/i.test(s.color) || s.mirrored !== undefined && typeof s.mirrored !== 'boolean')
            fail('花材数据无效');
        ids.add(s.id);
        Object.assign(row, { kind: s.kind, y: s.y, color: s.color });
        reference(s, row, 'material');
        if (s.mirrored !== undefined)
            row.mirrored = s.mirrored;
        return row;
    });
    if (v.containerLayouts !== undefined) {
        if (!record(v.containerLayouts) || Object.keys(v.containerLayouts).length > 64)
            fail('容器布局无效');
        out.containerLayouts = {};
        for (const [key, rows] of Object.entries(v.containerLayouts)) {
            if (!/^(?:[a-z][a-z0-9-]{0,63}|builtin:(?:陶瓶|玻璃瓶|圆花器|花束))$/.test(key) || !Array.isArray(rows))
                fail('容器布局无效');
            const seen = new Set();
            out.containerLayouts[key] = rows.map(v => { const row = layout(v); if (seen.has(row.id))
                fail('重复花材编号'); seen.add(row.id); return row; });
        }
    }
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
