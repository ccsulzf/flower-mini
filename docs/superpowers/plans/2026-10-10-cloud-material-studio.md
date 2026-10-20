# 云端素材进入工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if explicitly selected. Steps use checkbox syntax for tracking.

**Goal:** 已上传花材和花瓶经下载缓存进入工作台，并用于完成图片，验证一次真实云端闭环。

**Architecture:** 共享素材模型与消费 store 留在主包，开发管理分包只负责本地档案、预览、上传。云对象读取 flower-material-assets；作品保存素材 ID 和 revision，渲染与导出共用缓存和几何。

**Tech Stack:** uni-app、Vue 3、TypeScript、Pinia、微信文件系统、支付宝 uniCloud。

**Spec:** ../specs/2026-10-10-cloud-material-studio-design.md

## Global Constraints

- 不安装依赖，不执行未经授权的包管理器命令，不修改 node_modules。
- 不改密钥、云空间绑定、第三方模块和生成声明；保留已有用户修改，不自动提交。
- 等待 waitForAppAuthReady；云对象 customUI: true；业务数据库仅服务端访问。
- 旧档案缺少 category 时视为 flower；旧工作台与 JSON 数据继续可用。
- 正式包排除管理分包和待审核文件，但包含运行时素材加载与缓存。
- 真正使用下载素材，不用本地替代伪装成功；离线测试不等于真实联调。

## Review Focus

- 旧档案不带几何：已知示例有兼容默认值，未知品种提示补齐。
- 缓存文件已被系统清理：重新下载而不是留空白。
- 新旧 revision 并存：作品按引用版本渲染，避免静默换花。
- 更新花瓶后撤销：恢复花瓶及花枝底端，不能只恢复名字。
- 微信 Canvas 不支持 SVG：完成图应明确失败或使用验证过的栅格化结果，不能画另一种花。

### Task 1: 共享档案和花瓶管理

**Files:** create src/models/material.ts; modify src/subpackages/material-admin/lib/{types,local-materials,upload,store}.ts and material-admin-page.vue; create assets/ceramic-vase/{material.json,vase.svg}; modify cloudfunctions/flower-material-admin/index.obj.js and database/flower-material-assets.schema.json; tests/material-admin.test.cjs.

**Interfaces:** MaterialRecord discriminated by category flower/vase, with revision/assets; FlowerGeometry and VaseGeometry; normalizeMaterial(value: unknown): MaterialRecord; legacy known IDs get explicit default geometry.

- [ ] Add failing cases: legacy rose normalizes; unknown flower without geometry fails; vase needs mouth within viewBox; flower/vase wrong file parts rejected; admin role still checked in database.
- [ ] Run node --test tests/material-admin.test.cjs and confirm new cases fail.
- [ ] Implement shared types, metadata normalization, server category/geometry validation and schema; preserve old uploaded records.
- [ ] Add flower/vase local directory parsing, vase category/detail preview and one ceramic-vase example, with stable id/version.
- [ ] Run tests/material-admin.test.cjs; require all pass.

### Task 2: 云目录与持久缓存

**Files:** modify cloudfunctions/flower-catalog/index.obj.js and src/stores/flowerCatalogStore.ts; create src/utils/flower/material-catalog.ts and material-cache.ts; tests/flower-catalog.test.cjs and new tests/material-cache.test.cjs.

**Interfaces:** list() returns normalized flower/vase records with per-asset URLs; prepareMaterial(record: MaterialRecord): Promise<CachedMaterial>; CachedMaterial maps parts to persistent path and raw source; catalog store supports load(), ensure(id, revision) and get(id, revision), loading/error/progress/cache stats.

- [ ] Failing tests: authenticated paginated catalog reads new collection; duplicate/invalid records rejected; first request downloads files, second hits persistent cache; missing/corrupt file re-downloads; HTTPS failure shows error; concurrent ensure calls share task.
- [ ] Run named tests and confirm failures.
- [ ] Implement server directory with URL resolution and standard token renewal; cache validates content hash and SVG, stores files and metadata persistently; no silent local fallback.
- [ ] Implement shared Pinia catalog and task deduplication, retain cached prior revision for artwork references.
- [ ] Run named tests; require all pass.

### Task 3: 工作台选材与真实渲染

**Files:** modify src/models/artwork.ts, stores/artworkStore.ts, components/flower/{flower-board,flower-stem,flower-vase}.vue, pages/flower-studio/flower-studio-page.vue and components/{studio-options,studio-flower-tools}.vue; utils/flower/{artwork,artwork-history}.ts and arrangement helpers as necessary; new runtime material geometry/render helpers; tests/flower-{store,history,rendering,json}.test.cjs.

**Interfaces:** Stem optional materialId/materialRevision; Artwork optional vaseMaterialId/vaseMaterialRevision; addMaterial(record: CachedMaterial), setVaseMaterial(record: CachedMaterial); geometry helpers map actual assets to board anchors. Legacy addFlower/setVase remain supported.

- [ ] Failing tests: cloud choice unavailable until cache ready; arbitrary new ID renders downloaded source; color choices come from metadata; with/without leaf changes correct asset; clone/undo/redo preserve references; vase switch and undo restore geometry; JSON legacy examples still pass.
- [ ] Run named tests and confirm new failures.
- [ ] Add cloud options with loading/error/retry, download selected material before insertion; preserve local legacy entries as explicitly local options.
- [ ] Render original cached sources using normalized geometry; user gestures and selection use same geometry. Add cloud vase positioning with mouth alignment. Unavailable revision reports an error rather than rendering a different asset.
- [ ] Run named tests and direct TypeScript/Vue compilation; require pass.

### Task 4: 完成图片与真实闭环

**Files:** modify src/utils/flower/render-artwork.ts and hooks/useArtworkImage.ts; create shared source-to-export-image helper if needed; tests/flower-image.test.cjs; update README.md and asset instructions.

**Interfaces:** resolveArtworkAssets(artwork: Artwork): Promise<resolved assets>; export consumes same revision, color and geometry as runtime renderer. Native SVG capability must be tested before declaring export complete.

- [ ] Failing tests: cloud artwork export loads referenced source rather than approximate local flower; cloud vase geometry used; missing asset/conversion failure produces no success image; legacy export retains behavior.
- [ ] Implement exact-source drawImage export path and validate platform decoding. If decoding unsupported, implement supported source rasterization/PNG derivative; do not declare closed-loop success before real result is checked.
- [ ] Run node --test tests/*.test.cjs, related no-emit TypeScript and Vue compilation, git diff --check.
- [ ] Via available HBuilderX/WeChat UI, restart local cloud objects or deploy updated schema/object; read existing uploaded record, download/select/edit/export; preview result and verify cache hit on repeat. Upload ceramic-vase sample and select it for same checks. Only account/service access gaps require user intervention.
- [ ] If full formal build requires a package-manager command, seek the command authorization; otherwise inspect build through available UI. Confirm no admin routes/assets in formal output.
- [ ] Request fresh code review, address important findings, report actual checks and remaining real-platform limitations. Do not commit automatically.
