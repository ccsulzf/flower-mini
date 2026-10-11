const { deflateSync } = require('node:zlib');
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
} return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), header = Buffer.alloc(4), crc = Buffer.alloc(4); header.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([header, name, data, crc]); }
module.exports = function png(width = 349, height = 500) { const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6; return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.alloc(height * (1 + width * 4)))), chunk('IEND', Buffer.alloc(0))]); };
