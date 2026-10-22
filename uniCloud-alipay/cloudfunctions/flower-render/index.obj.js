const fs = require('node:fs');
const resolveAuth = require('auth');
const dailyFlower = require('daily-flower');
const { createHash, randomBytes } = require('node:crypto');
const { initWasm, Resvg } = require('@resvg/resvg-wasm');

let wasmReady;

const workIdPattern = /^[a-f\d]{32}$/;
const materialIdPattern = /^[a-z][a-z0-9-]{0,63}$/;
const maxRenderSvgLength = 8 * 1024 * 1024;

function colorizeMaterialSvg(svg, color) {
  const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : '#f1e5bd';
  let source = svg.replace(/__COLOR__/g, safeColor);
  if (!svg.includes('<!-- adaptive-petal-outline -->')) return source;
  const channels = [1, 3, 5].map(offset => Number.parseInt(safeColor.slice(offset, offset + 2), 16) / 255);
  const brightness = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  if (brightness < .38) source = source.replace(/stroke="#9d4b4f" stroke-opacity="\.5"/g, 'stroke="#e8a39d" stroke-opacity=".65"');
  return source;
}

function nested(source, x, y, width, height) {
    const root = source.match(/<svg\b[^>]*>/i)?.[0];
    const viewBox = root?.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
    if (!root || !viewBox)
        throw new Error('云素材 SVG 缺少 viewBox');
    return source.replace(root, `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" preserveAspectRatio="none">`);
}

function safeSvg(source, name) {
    if (typeof source !== 'string' || source.length > 512 * 1024
        || !/^\s*<svg\b/i.test(source) || !/<\/svg>\s*$/i.test(source)
        || /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=|@import|url\(\s*["']?(?!#)[^)]+\)/i.test(source))
        throw new Error(`${name}的云端 SVG 无效`);
    return source;
}

function bouquetLayers(source) {
    const back = source.match(/<!-- bouquet-back:start -->([\s\S]*?)<!-- bouquet-back:end -->/)?.[1];
    const front = source.match(/<!-- bouquet-front:start -->([\s\S]*?)<!-- bouquet-front:end -->/)?.[1];
    if (back && front) {
        const root = source.match(/<svg\b[^>]*>/i)?.[0];
        if (!root)
            throw new Error('花束 SVG 根节点缺失');
        const defs = source.match(/<defs>[\s\S]*?<\/defs>/i)?.[0] || '';
        return { back: `${root}${defs}${back}</svg>`, front: `${root}${defs}${front}</svg>` };
    }
    throw new Error('花束素材缺少前后分层标记');
}

function vasePlacement(material) {
    const geometry = material.geometry;
    const mouthY = material.category === 'bouquet' && geometry.mouthY < geometry.height * .65
        ? geometry.height * .86 : geometry.mouthY;
    return { x: 350 - geometry.mouthX, y: 747 - mouthY, width: geometry.width, height: geometry.height };
}

function backgroundOffset(background, vase) {
    if (!background || background.category !== 'background' || background.geometry?.surfaceY === undefined)
        return 0;
    const placement = vasePlacement(vase);
    const bottom = placement.y + placement.height;
    return background.geometry.surfaceY * 1000 / background.geometry.height - bottom;
}

const softLeft = new Set(['tulip', 'calla-lily', 'ranunculus', 'freesia', 'campanula', 'scabiosa', 'phalaenopsis']);
const softRight = new Set(['gerbera', 'feather-gerbera', 'lisianthus', 'single-lisianthus', 'oncidium', 'dendrobium', 'astilbe']);
const sturdy = new Set(['king-protea', 'hydrangea', 'sunflower', 'lotus', 'cotton', 'pincushion']);
function naturalStemSource(source, id) {
    let changed = 0;
    return source.replace(/(<path\b[^>]*\bd=")([^"]+)(")/g, (whole, prefix, path, suffix) => {
        if (changed >= 2) return whole;
        const numbers = path.match(/^M([\d.]+) ([\d.]+)C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)$/);
        if (!numbers) return whole;
        const [startX, startY, firstX, , secondX, , endX, endY] = numbers.slice(1).map(Number);
        if (firstX === startX || startY > 1 || endY !== 260 || Math.abs(firstX - startX) > 8 || Math.abs(secondX - endX) > 8) return whole;
        const offset = startX < 54 && id !== 'bird-of-paradise' ? -.4 : changed === 1 ? -.4 : 0;
        let control1, control2;
        if (softLeft.has(id)) { control1 = 18; control2 = 12; }
        else if (softRight.has(id)) { control1 = 92; control2 = 99; }
        else if (sturdy.has(id)) { control1 = 37; control2 = 35; }
        else {
            const right = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0;
            control1 = right ? 83 : 25;
            control2 = right ? 67 : 40;
        }
        changed++;
        return `${prefix}M${startX} ${startY}C${control1 + offset} 76 ${control2 + offset} 180 ${endX} ${endY}${suffix}`;
    });
}
function smoothStemTip(source) {
    let matched = 0;
    return source.replace(/(<path\b[^>]*\bd=")(M([\d.]+) ([\d.]+)C)([\d.]+)( [\d.]+ [\d.]+ [\d.]+ [\d.]+ 260")/g, (whole, prefix, start, x, y, _control, rest) => {
        if (matched >= 2 || Number(y) > 1) return whole;
        matched++;
        return `${prefix}${start}${x}${rest}`;
    });
}
function fitStemJoin(source, heightScale) {
    if (!source.includes('<!-- continuous-stem-join -->')) return source;
    return source.replace(/(<path\b[^>]*\bd="M)([\d.-]+) 0C([\d.-]+)( [\d.-]+)/g, (_whole, prefix, x, control, rest) => {
        const fitted = Number((Number(x) + (Number(control) - Number(x)) * heightScale).toFixed(6));
        return `${prefix}${x} 0C${fitted}${rest}`;
    });
}

async function getMaterial(id, cache) {
    if (typeof id !== 'string' || !materialIdPattern.test(id))
        throw new Error('作品中的云素材引用无效');
    const key = id;
    if (cache.has(key))
        return cache.get(key);
    const result = await uniCloud.database().collection('flower-material-assets').doc(id).get();
    const material = result.data?.[0];
    if (!material || material.id !== id)
        throw new Error(`素材 ${id} 不存在`);
    cache.set(key, { ...material, sources: {} });
    return cache.get(key);
}

async function materialSource(material, part) {
    if (material.sources[part])
        return material.sources[part];
    const fileId = material.assets?.[part]?.fileId;
    if (typeof fileId !== 'string' || !fileId.startsWith('cloud://') || fileId.length > 1024)
        throw new Error(`${material.name}的 ${part} 云文件引用无效`);
    const downloaded = await uniCloud.downloadFile({ fileID: fileId });
    if (!Buffer.isBuffer(downloaded?.fileContent))
        throw new Error(`${material.name}的云文件下载失败`);
    material.sources[part] = safeSvg(downloaded.fileContent.toString('utf8'), material.name);
    return material.sources[part];
}

async function buildArtworkSvg(artwork) {
    if (!artwork || typeof artwork !== 'object' || Array.isArray(artwork)
        || !Array.isArray(artwork.materials)
        || !materialIdPattern.test(artwork.background?.materialId || '')
        || !materialIdPattern.test(artwork.container?.materialId || '')
        || !['vase', 'bouquet'].includes(artwork.container?.type))
        throw new Error('作品格式无效');
    const cache = new Map();
    const cloudMaterials = new Map();
    for (const instance of artwork.materials) {
        const transform = instance?.transform;
        if (!transform || !Number.isFinite(transform.anchor?.x) || transform.anchor.x < 0 || transform.anchor.x > 698
            || !Number.isFinite(transform.anchor?.y) || transform.anchor.y < 0 || transform.anchor.y > 1000
            || !Number.isFinite(transform.angle) || transform.angle < -65 || transform.angle > 65
            || !Number.isFinite(transform.scale) || transform.scale < .65 || transform.scale > 1.35
            || !Number.isFinite(transform.height) || transform.height < 120 || transform.height > 620
            || typeof transform.mirrored !== 'boolean' || typeof instance.color !== 'string' || !/^#[\da-f]{6}$/i.test(instance.color)
            || !materialIdPattern.test(instance.materialId || ''))
            throw new Error('作品花材数据无效');
        const material = await getMaterial(instance.materialId, cache);
        if (material.category !== 'flower' || material.group !== instance.group)
            throw new Error('作品引用的云端花材类型无效');
        cloudMaterials.set(instance.materialId, material);
    }
    const backgroundMaterial = await getMaterial(artwork.background.materialId, cache);
    if (backgroundMaterial.category !== 'background')
        throw new Error('作品引用的云端背景类型无效');
    const background = nested(await materialSource(backgroundMaterial, 'background'), 0, 0, 698, 1000);
    const vaseMaterial = await getMaterial(artwork.container.materialId, cache);
    if (vaseMaterial.category !== artwork.container.type || !vaseMaterial.geometry)
        throw new Error('作品引用的云端花器无效');
    const anchorOffset = backgroundOffset(backgroundMaterial, vaseMaterial);
    const renderedMaterials = [];
    for (const instance of artwork.materials) {
        const material = cloudMaterials.get(instance.materialId);
        if (!material.geometry)
            throw new Error('云端花材几何信息缺失');
        const { anchor, angle, height, scale, mirrored } = instance.transform;
        const total = height + 55;
        const scaleX = mirrored ? -scale : scale;
        if (material.group === 'foliage') {
            const source = (await materialSource(material, 'foliage')).replace(/__COLOR__/g, instance.color);
            renderedMaterials.push(`<g transform="translate(${anchor.x} ${anchor.y}) rotate(${angle}) scale(${scaleX} ${scale}) translate(-55 ${-total})">${nested(source, 0, 0, 110, total)}</g>`);
            continue;
        }
        const flower = colorizeMaterialSvg(await materialSource(material, 'flower'), instance.color);
        const stemSource = await materialSource(material, 'stemWithoutLeaves');
        const geometry = material.geometry;
        const headHeight = geometry.flowerHeight * 110 / geometry.width;
        const connection = geometry.connectionY * 110 / geometry.width;
        const headTop = 55 - headHeight / 2;
        const overlap = stemSource.includes('<!-- continuous-stem-join -->') ? 0 : 8;
        const join = Math.max(headTop, headTop + (material.id === 'anemone' ? Math.min(connection, 84) : connection) - overlap);
        const shapedStem = smoothStemTip(naturalStemSource(stemSource, material.id));
        const fittedStem = fitStemJoin(shapedStem, (total - join) / geometry.stemHeight / (110 / geometry.width));
        renderedMaterials.push(`<g transform="translate(${anchor.x} ${anchor.y}) rotate(${angle}) scale(${scaleX} ${scale}) translate(-55 ${-total})">${nested(fittedStem, 0, join, 110, total - join)}${nested(flower, 0, headTop, 110, headHeight)}</g>`);
    }
    const part = vaseMaterial.category === 'bouquet' ? 'bouquet' : 'vase';
    const source = await materialSource(vaseMaterial, part);
    const placement = vasePlacement(vaseMaterial);
    let vaseBack = '';
    let vaseFront;
    if (vaseMaterial.category === 'bouquet') {
        const layers = bouquetLayers(source);
        vaseBack = nested(layers.back, placement.x, placement.y, placement.width, placement.height);
        vaseFront = nested(layers.front, placement.x, placement.y, placement.width, placement.height);
    }
    else {
        vaseFront = nested(source, placement.x, placement.y, placement.width, placement.height);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000" viewBox="0 0 698 1000"><rect width="698" height="1000" fill="#f6f3eb"/>${background}<g transform="translate(0 ${anchorOffset})">${vaseBack}${renderedMaterials.join('')}${vaseFront}</g></svg>`;
}

async function renderSvg(svg, cloudPath) {
    const startedAt = Date.now();
    const root = typeof svg === 'string' ? svg.match(/^\s*(<svg\b[^>]*>)/i)?.[1] : undefined;
    const width = root && Number(root.match(/\bwidth=["'](\d+(?:\.\d+)?)["']/i)?.[1]);
    const height = root && Number(root.match(/\bheight=["'](\d+(?:\.\d+)?)["']/i)?.[1]);
    if (typeof svg !== 'string' || svg.length > maxRenderSvgLength
        || !root || !/<\/svg>\s*$/i.test(svg)
        || /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=|@import|url\(\s*["']?(?!#)[^)]+\)/i.test(svg)
        || width !== 698 || !Number.isInteger(height) || height < 1000 || height > 2000)
        throw new Error('作品 SVG 无效或尺寸不符合要求');
    if (!wasmReady) {
        const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
        wasmReady = initWasm(fs.readFileSync(wasmPath)).catch((error) => {
            if (error?.message === 'Already initialized. The `initWasm()` function can be used only once.')
                return;
            wasmReady = undefined;
            throw error;
        });
    }
    await wasmReady;
    const renderer = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1396 },
        font: { loadSystemFonts: true },
    });
    let image;
    let png;
    let renderedWidth;
    let renderedHeight;
    try {
        image = renderer.render();
        renderedWidth = image.width;
        renderedHeight = image.height;
        png = image.asPng();
    }
    finally {
        image?.free();
        renderer.free();
    }
    const uploaded = await uniCloud.uploadFile({ cloudPath, fileContent: Buffer.from(png) });
    if (!uploaded?.fileID)
        throw new Error('云端图片上传失败');
    return {
        width: renderedWidth,
        height: renderedHeight,
        fileID: uploaded.fileID,
        cloudPath,
        renderMs: Date.now() - startedAt,
    };
}

module.exports = {
    async _before() {
        const auth = await resolveAuth(this);
        if (!auth?.uid)
            throw { errCode: 'AUTH_REQUIRED', errMsg: '请先登录后生成图片' };
        this.auth = auth;
    },
    _after(error, result) {
        if (error)
            throw error;
        if (this.auth.newToken)
            result.newToken = this.auth.newToken;
        return result;
    },
    async renderWork({ workId } = {}) {
        if (typeof workId !== 'string' || !workIdPattern.test(workId))
            throw new Error('作品编号无效');
        const query = await uniCloud.database().collection('flower-works')
            .where({ _id: workId, user_id: this.auth.uid }).limit(1).get();
        const work = query.data?.[0];
        if (!work)
            throw { errCode: 'WORK_NOT_FOUND', errMsg: '作品不存在或已删除' };
        const svg = await buildArtworkSvg(work.artwork);
        const owner = createHash('sha256').update(this.auth.uid).digest('hex');
        const cloudPath = `flower-works/${owner}/${workId}/artwork.png`;
        const result = await renderSvg(svg, cloudPath);
        return result;
    },
    async renderDailyArtwork({ artwork, date } = {}) {
        const user = await uniCloud.database().collection('uni-id-users')
            .doc(this.auth.uid).field({ role: true }).get();
        const roles = user.data?.[0]?.role;
        if (!Array.isArray(roles) || !roles.includes('admin'))
            throw { errCode: 'ADMIN_REQUIRED', errMsg: '此账号没有每日插花维护权限' };
        const validDate = dailyFlower.validateDate(date);
        const validArtwork = dailyFlower.validateArtwork(artwork);
        const svg = await buildArtworkSvg(validArtwork);
        const cloudPath = `daily-flower/${validDate}/render-${randomBytes(16).toString('hex')}.png`;
        return renderSvg(svg, cloudPath);
    },
};
