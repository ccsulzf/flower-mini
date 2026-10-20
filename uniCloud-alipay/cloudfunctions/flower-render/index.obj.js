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

function backgroundColor(name) {
    return { warm: '#f4efe5', sage: '#e7eadf', cocoa: '#e8ded3', mist: '#edf0ed', blush: '#f2e4e3', sand: '#eee6d6' }[name];
}

function builtInVase(name) {
    if (name === '花束')
        return '<g><path d="M180 615H520L350 890Z" fill="#ded5c5"/><path d="M205 643H490L350 878Z" fill="#f1e9d9"/><path d="M235 650H475L350 885Z" fill="#e8decb"/><path d="M292 778H408V798H292Z" fill="#c98b94"/></g>';
    const round = name === '圆花器';
    const glass = name === '玻璃瓶';
    const left = round ? 260 : 280;
    const top = round ? 765 : 735;
    const width = round ? 180 : 140;
    const height = round ? 140 : 170;
    const opacity = glass ? ' opacity=".72"' : '';
    return `<g><ellipse cx="350" cy="910" rx="109" ry="15" fill="#000" opacity=".12"/><path d="M${left + width * .18} ${top} C${left} ${top} ${left} ${top + height * .15} ${left} ${top + height * .42} C${left} ${top + height} ${left + width * .18} ${top + height} ${left + width * .5} ${top + height} C${left + width * .82} ${top + height} ${left + width} ${top + height} ${left + width} ${top + height * .42} C${left + width} ${top + height * .15} ${left + width * .82} ${top} ${left + width * .82} ${top} Z" fill="url(#vase)"${opacity}/><ellipse cx="350" cy="${top + 2}" rx="${round ? 45 : 70}" ry="7.5" fill="${glass ? '#78958b' : '#667568'}"${glass ? ' opacity=".2"' : ''}/><ellipse cx="${left + 30}" cy="${top + 81}" rx="4" ry="49" fill="#fff" opacity=".2"/></g>`;
}

function bouquetLayers(source, material) {
    const back = source.match(/<!-- bouquet-back:start -->([\s\S]*?)<!-- bouquet-back:end -->/)?.[1];
    const front = source.match(/<!-- bouquet-front:start -->([\s\S]*?)<!-- bouquet-front:end -->/)?.[1];
    if (back && front) {
        const root = source.match(/<svg\b[^>]*>/i)?.[0];
        if (!root)
            throw new Error('花束 SVG 根节点缺失');
        const defs = source.match(/<defs>[\s\S]*?<\/defs>/i)?.[0] || '';
        return { back: `${root}${defs}${back}</svg>`, front: `${root}${defs}${front}</svg>` };
    }
    const colors = Array.from(source.matchAll(/stop-color="(#[\da-f]{6})"/gi), match => match[1]);
    const light = colors[0] || '#eee8d9';
    const shade = colors[1] || '#c7beab';
    const { width, height } = material.geometry;
    const frontLayer = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><g transform="scale(${width / 350} ${height / 290})">
      <path d="M35 38Q95 112 164 210L181 254L115 213Q65 132 35 38Z" fill="${light}" stroke="${shade}" stroke-width=".6"/>
      <path d="M320 47Q265 132 185 207L169 254L229 210Q279 135 320 47Z" fill="${shade}" stroke="${light}" stroke-width=".6"/>
      <path d="M52 58Q110 154 173 243M301 67Q255 158 181 243" fill="none" stroke="${light}" stroke-width="1"/>
      <path d="M164 232Q177 218 190 232L185 252Q200 267 202 286Q176 292 152 286Q153 267 168 251Z" fill="${light}" stroke="${shade}" stroke-width=".5"/>
      <path d="M176 249C153 230 139 245 158 253Q169 256 176 249C189 228 214 240 196 252Q186 257 176 249Z" fill="${shade}"/>
      <path d="M173 252L161 280L169 275L174 281L179 253M181 252L195 275L187 272L185 279L176 254" fill="${shade}"/>
      <ellipse cx="177" cy="251" rx="5" ry="4" fill="${shade}"/>
    </g></svg>`;
    return { back: source, front: frontLayer };
}

function vasePlacement(material) {
    const geometry = material.geometry;
    const mouthY = material.category === 'bouquet' && geometry.mouthY < geometry.height * .65
        ? geometry.height * .86 : geometry.mouthY;
    return { x: 350 - geometry.mouthX, y: 747 - mouthY, width: geometry.width, height: geometry.height };
}

function backgroundOffset(background, vase, vaseName) {
    if (!background || background.category !== 'background' || background.geometry?.surfaceY === undefined)
        return 0;
    const bottom = vase
        ? (() => { const placement = vasePlacement(vase); return placement.y + placement.height; })()
        : vaseName === '花束' ? 915 : 905;
    const surfaceY = ['scene-ivory-table', 'scene-sage-table'].includes(background.id)
        ? 820 : background.geometry.surfaceY;
    return surfaceY * 1000 / background.geometry.height - bottom;
}

function sceneBackgroundSource(material, source) {
    if (source.includes('studio-background:v2'))
        return source;
    const marker = '<!-- studio-background:v2 -->';
    if (material.id === 'scene-ivory-table') {
        const grain = Array.from({ length: 12 }, (_, i) => `<path d="M0 ${835 + i * 14} C150 ${825 + i * 14} 380 ${850 + i * 14} 698 ${832 + i * 14}" fill="none" stroke="#9e7957" stroke-width="2" opacity="0.35"/>`).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 698 1000">${marker}<rect width="698" height="1000" fill="#eee7db"/><path d="M0 0 H698 V820 H0Z" fill="#f4efe5"/><path d="M0 0 H130 V820 H0Z" fill="#dcd2c2" opacity="0.45"/><path d="M130 0 V820" stroke="#c5b7a2" stroke-width="3"/><path d="M140 0 V820" stroke="#fffaf0" stroke-width="3"/><path d="M698 160 L430 250 L540 820 H698Z" fill="#fffaf0" opacity="0.65"/><rect y="820" width="698" height="180" fill="#c4a27e"/><path d="M0 820 H698" stroke="#a68462" stroke-width="5"/>${grain}<path d="M0 890 H698 M248 820 L230 1000" fill="none" stroke="#8e6d50" stroke-width="2" opacity="0.38"/></svg>`;
    }
    if (material.id === 'scene-sage-table')
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 698 1000">${marker}<rect width="698" height="1000" fill="#d5dfcc"/><path d="M0 0 H160 V820 H0Z" fill="#b9c9af" opacity="0.65"/><path d="M160 0 V820 M170 0 V820" stroke="#9daf92" stroke-width="2" opacity="0.55"/><path d="M170 560 H698 M170 570 H698" stroke="#9daf92" stroke-width="2" opacity="0.35"/><path d="M530 0 H698 V820 H630Z" fill="#eef1e4" opacity="0.7"/><rect y="820" width="698" height="180" fill="#b9baad"/><path d="M0 820 H698" stroke="#898e7d" stroke-width="5"/><path d="M0 860 C150 895 200 820 365 872 S590 890 698 850 M0 955 C160 925 290 994 480 950 S620 926 698 950" fill="none" stroke="#e5e6da" stroke-width="4" opacity="0.6"/><path d="M0 935 C200 902 320 976 698 914" fill="none" stroke="#929787" stroke-width="2" opacity="0.5"/></svg>`;
    return source;
}

function builtInPlant(stem) {
    const color = stem.color;
    const bloom = stem.kind === 'tulip'
        ? `<path d="M28 54Q26 17 43 27Q55 0 67 27Q84 17 82 54Q72 76 55 69Q38 76 28 54Z" fill="${color}"/>`
        : stem.kind === 'daisy'
            ? `<g>${Array.from({ length: 8 }, (_, i) => `<ellipse cx="55" cy="32" rx="8" ry="20" fill="${color}" transform="rotate(${i * 45} 55 55)"/>`).join('')}<circle cx="55" cy="55" r="11" fill="#d9a83f"/></g>`
            : `<path d="M55 62C7 50 28 1 55 35C83 0 104 50 55 62Z" fill="${color}"/>`;
    const scaleX = stem.mirrored ? -stem.flowerScale : stem.flowerScale;
    return `<g transform="translate(${stem.x} 747) rotate(${stem.angle}) scale(${scaleX} ${stem.flowerScale}) translate(-55 ${-(stem.stemHeight + 55)})"><path d="M55 55Q52 170 55 ${stem.stemHeight + 55}" fill="none" stroke="#73835c" stroke-width="4"/><g transform="translate(0 ${stem.stemHeight})">${bloom}</g></g>`;
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
    if (!artwork || typeof artwork !== 'object' || Array.isArray(artwork))
        throw new Error('作品缺少有效的 artwork 数据');
    if (!Array.isArray(artwork.stems))
        throw new Error('作品格式无效或花材列表缺失');
    if (!['陶瓶', '玻璃瓶', '圆花器', '花束'].includes(artwork.vase))
        throw new Error('作品花器类型无效');
    if (!backgroundColor(artwork.background))
        throw new Error('作品背景类型无效');
    const cache = new Map();
    const cloudMaterials = new Map();
    for (const stem of artwork.stems) {
        if (!stem || !Number.isFinite(stem.x) || stem.x < 0 || stem.x > 698
            || !Number.isFinite(stem.angle) || stem.angle < -65 || stem.angle > 65
            || !Number.isFinite(stem.flowerScale) || stem.flowerScale < .65 || stem.flowerScale > 1.35
            || !Number.isFinite(stem.stemHeight) || stem.stemHeight < 120 || stem.stemHeight > 620
            || typeof stem.color !== 'string' || !/^#[\da-f]{6}$/i.test(stem.color))
            throw new Error('作品花材数据无效');
        if (stem.materialId) {
            const material = await getMaterial(stem.materialId, cache);
            if (material.category !== 'flower')
                throw new Error('作品引用的云端花材类型无效');
            cloudMaterials.set(stem.materialId, material);
        }
    }
    let background = '';
    let backgroundMaterial;
    if (artwork.backgroundMaterialId) {
        backgroundMaterial = await getMaterial(artwork.backgroundMaterialId, cache);
        if (backgroundMaterial.category !== 'background')
            throw new Error('作品引用的云端背景类型无效');
        const source = await materialSource(backgroundMaterial, 'background');
        background = nested(sceneBackgroundSource(backgroundMaterial, source), 0, 0, 698, 1000);
    }
    let vaseMaterial;
    if (artwork.vaseMaterialId)
        vaseMaterial = await getMaterial(artwork.vaseMaterialId, cache);
    const anchorOffset = backgroundOffset(backgroundMaterial, vaseMaterial, artwork.vase);
    const anchorY = artwork.vase === '圆花器' ? 777 : 747;
    const stems = [];
    for (const stem of artwork.stems) {
        if (!stem.materialId) {
            stems.push(builtInPlant(stem));
            continue;
        }
        const material = cloudMaterials.get(stem.materialId);
        if (!material.geometry)
            throw new Error('云端花材几何信息缺失');
        const total = stem.stemHeight + 55;
        if (material.group === 'foliage') {
            const source = (await materialSource(material, 'foliage')).replace(/__COLOR__/g, stem.color);
            const scaleX = stem.mirrored ? -stem.flowerScale : stem.flowerScale;
            stems.push(`<g transform="translate(${stem.x} ${anchorY}) rotate(${stem.angle}) scale(${scaleX} ${stem.flowerScale}) translate(-55 ${-total})">${nested(source, 0, 0, 110, total)}</g>`);
            continue;
        }
        const flower = colorizeMaterialSvg(await materialSource(material, 'flower'), stem.color);
        const stemSource = await materialSource(material, 'stemWithoutLeaves');
        const geometry = material.geometry;
        const headHeight = geometry.flowerHeight * 110 / geometry.width;
        const headTop = 55 - headHeight / 2;
        const join = Math.max(headTop, headTop + geometry.connectionY * 110 / geometry.width - 8);
        const scaleX = stem.mirrored ? -stem.flowerScale : stem.flowerScale;
        stems.push(`<g transform="translate(${stem.x} ${anchorY}) rotate(${stem.angle}) scale(${scaleX} ${stem.flowerScale}) translate(-55 ${-total})">${nested(stemSource, 0, join, 110, total - join)}${nested(flower, 0, headTop, 110, headHeight)}</g>`);
    }
    let vaseBack = '';
    let vaseFront = builtInVase(artwork.vase);
    if (vaseMaterial) {
        if (!['vase', 'bouquet'].includes(vaseMaterial.category) || !vaseMaterial.geometry)
            throw new Error('作品引用的云端花器无效');
        const part = vaseMaterial.category === 'bouquet' ? 'bouquet' : 'vase';
        const source = await materialSource(vaseMaterial, part);
        const placement = vasePlacement(vaseMaterial);
        if (vaseMaterial.category === 'bouquet') {
            const layers = bouquetLayers(source, vaseMaterial);
            vaseBack = nested(layers.back, placement.x, placement.y, placement.width, placement.height);
            vaseFront = nested(layers.front, placement.x, placement.y, placement.width, placement.height);
        }
        else {
            vaseFront = nested(source, placement.x, placement.y, placement.width, placement.height);
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="698" height="1000" viewBox="0 0 698 1000"><defs><linearGradient id="vase" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6e2d7"/><stop offset=".58" stop-color="#dedacf"/><stop offset="1" stop-color="#cdc9bd"/></linearGradient></defs><rect width="698" height="1000" fill="${backgroundColor(artwork.background)}"/>${background}<g transform="translate(0 ${anchorOffset})">${vaseBack}${stems.join('')}${vaseFront}</g></svg>`;
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
