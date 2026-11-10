# Flower Studio Workbench Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the phone flower studio around one logical coordinate system, a normalized artwork model, focused editor components, and a blocking first-entry material preparation flow.

**Architecture:** `artworkStore` owns the persisted artwork and undoable domain actions, `flowerStudioStore` owns transient editor UI, and a page-scoped layout composable owns device-to-canvas transforms. Rendering components receive plain props and emit intentions; the catalog store prepares hash-validated assets and exposes user-safe progress for the startup modal.

**Tech Stack:** uni-app, Vue 3 `<script setup lang="ts">`, Pinia setup stores, TypeScript, WeChat Mini Program APIs, Alipay uniCloud cloud objects and JSON database schemas.

**Spec:** `docs/superpowers/specs/2026-10-22-flower-studio-workbench-refactor-design.md`

## Global Constraints

- Target phone portrait layouts only; do not add iPad, tablet, or landscape behavior.
- Use a fixed `698 × 1000` logical artwork coordinate system and never persist device pixels, `rpx`, scale, or offsets.
- Do not add any artwork, material, canvas, schema, or migration version field.
- Do not preserve compatibility with historical artwork, drafts, JSON imports, cloud payloads, or old endpoints; switch every in-scope consumer to the new structure together.
- Do not automatically delete historical database records.
- Do not impose a flower-material count limit in UI, stores, validators, cloud functions, exports, or schemas.
- Keep the existing material file hash as the cache-validity signal; do not expose file counts, cache hits, download counts, hashes, or validation details in user-facing copy.
- Do not modify `src/uni_modules/`, generated declaration files, dependencies, lockfiles, or `node_modules`.
- Do not create test files unless the user separately authorizes tests. Use focused read-only checks and manual mini-program verification instead.
- Do not run `pnpm`, `npm`, `yarn`, `corepack`, `type-check`, `lint`, or a build without explicit confirmation in the implementation session.
- Preserve unrelated working-tree changes and stage only files owned by the current task.

## Review Focus

- A local cache record whose saved file was removed by the OS must reopen the preparation modal, redownload the asset, and never enter a partially prepared studio; verify in Task 6.
- A container layout referencing a deleted material instance must be rejected on import and removed during editor deletion; verify in Tasks 1 and 2.
- A rotated or scaled flower near a canvas edge must remain operable while its stem anchor stays inside the active container mouth; verify in Tasks 2 and 3.
- Undo after a continuous drag, slider edit, container switch, or one-step layer move must restore exactly one prior artwork state without restoring UI selection; verify in Tasks 2 and 5.
- A missing background, container, or flower asset must keep the last valid artwork intact and surface a friendly error instead of silently substituting a material; verify in Tasks 6, 7, and 9.

---

## File Structure

### Domain and geometry

- `src/models/artwork.ts`: canonical artwork, selection, instance, transform, and container-layout types.
- `src/utils/flower/artwork.ts`: strict new-format parsing, initial artwork creation, and domain validation.
- `src/utils/flower/arrangement.cjs`: pure geometry for logical canvas bounds, container mouths, derived head positions, and constrained transforms.
- `src/utils/flower/arrangement.d.cts`: TypeScript declarations matching the CommonJS geometry API.
- `src/utils/flower/artwork-history.ts`: deep-copy and snapshot history for the new nested model.

### Editor state and coordinates

- `src/stores/artworkStore.ts`: artwork state and undoable domain actions.
- `src/stores/flowerStudioStore.ts`: transient panels, search, selection, color expansion, save state, and material preparation state.
- `src/hooks/useFlowerStudioLayout.ts`: page-scoped phone layout and screen/logical coordinate transforms.
- Delete `src/stores/flowerStudioLayoutStore.ts` after all consumers use the composable.
- `src/hooks/useFlowerDrag.ts`: drag transaction orchestration against logical points.

### Rendering components

- `src/components/flower/flower-board.vue`: `FlowerWorkspace` boundary and layer composition.
- `src/components/flower/flower-stem.vue`: store-independent complete material-instance renderer.
- `src/components/flower/flower-stem-control.vue`: selection and pointer hit target.
- `src/components/flower/flower-vase.vue`: unified vase/bouquet renderer with internal back/front layers.
- `src/components/flower/flower-artwork-renderer.vue`: shared editor/preview renderer for the new artwork shape.

### Studio UI

- `src/pages/flower-studio/flower-studio-page.vue`: startup, session, save, navigation, and component orchestration.
- `src/pages/flower-studio/components/studio-material-prepare-modal.vue`: blocking, user-safe startup progress and retry UI.
- `src/pages/flower-studio/components/studio-flower-panel.vue`: recent/main/filler/foliage tabs and name search.
- `src/pages/flower-studio/components/studio-flower-tools.vue`: transform, color, mirror, duplicate, adjacent selection, one-step layer movement, and deletion.
- `src/pages/flower-studio/components/studio-container-panel.vue`: vase/bouquet choice only.
- `src/pages/flower-studio/components/studio-background-panel.vue`: solid/scene choice only.
- `src/pages/flower-studio/components/studio-material-dock.vue`: mutually exclusive panel host.
- `src/pages/flower-studio/components/studio-header.vue`: global command toolbar.
- `src/pages/flower-studio/components/studio-flower-toolbar.vue`: positions the adjustment panel using page layout output.

### Catalog, persistence, renderers, and cloud

- `src/stores/flowerCatalogStore.ts` and `src/utils/flower/material-cache.ts`: prepare-all state, hash validation, retry, and progress.
- `src/utils/flower/creation-storage.ts`, `src/hooks/useFlowerCreationSession.ts`, `src/stores/flowerWorksStore.ts`: persist only the new artwork.
- `src/utils/flower/artwork-svg.ts`, `src/utils/flower/render-artwork.ts`, `src/utils/flower/render-test-svg.ts`, `src/utils/flower/cloud-image-renderer.ts`: render the new model consistently.
- `src/components/flower/flower-artwork-preview.vue`, `src/hooks/useFlowerPageArtwork.ts`, `src/pages/flower-json/*`, `src/pages/flower-render-test/*`, `src/subpackages/daily-flower-admin/*`, `src/utils/flower/daily-flower.ts`: update all local artwork consumers.
- `uniCloud-alipay/cloudfunctions/flower-works/validation.js`, `uniCloud-alipay/cloudfunctions/flower-works/index.obj.js`, `uniCloud-alipay/cloudfunctions/flower-render/index.obj.js`, `uniCloud-alipay/cloudfunctions/common/daily-flower/index.js`, `uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js`, `uniCloud-alipay/cloudfunctions/flower-daily-admin/index.obj.js`: accept and emit only the new artwork.
- `uniCloud-alipay/database/flower-works.schema.json` and `uniCloud-alipay/database/daily-flower.schema.json`: directly describe the new nested artwork structure.

### Task 1: Replace the Artwork Domain Model and Parser

**Files:**
- Modify: `src/models/artwork.ts`
- Modify: `src/utils/flower/artwork.ts`
- Modify: `src/utils/flower/arrangement.cjs`
- Modify: `src/utils/flower/arrangement.d.cts`
- Modify: `src/utils/flower/artwork-history.ts`

**Interfaces:**
- Produces: `Artwork`, `BackgroundSelection`, `ContainerSelection`, `ContainerType`, `MaterialInstance`, `MaterialTransform`, `MaterialLayout`, `Point`.
- Produces: `parseArtwork(text: string): Artwork` and `createCatalogArtwork(container: CachedMaterial, background: CachedMaterial): Artwork`.
- Produces: `constrainMaterialTransform(transform, geometry, mouthBounds)` and derived-head/bounds helpers in `arrangement.cjs` with matching declarations.
- Consumes: `CachedMaterial` and existing catalog geometry metadata.

- [ ] **Step 1: Replace the legacy flat artwork types**

Define exactly the nested types from the spec: `background.materialId`, `container.materialId/type`, `materials[]`, and `containerLayouts`. Remove `FlowerKind`, `VaseName`, `Stem`, built-in background enums, `vaseMaterialId`, `backgroundMaterialId`, and legacy flat transform fields.

- [ ] **Step 2: Replace parser and initial-artwork creation**

Make `parseArtwork` accept only the new model, reject duplicate instance IDs, non-finite transforms, invalid groups/colors/container types, and layouts that reference absent material instances. Do not include a legacy conversion path or material-count check.

- [ ] **Step 3: Centralize geometry in pure functions**

Use logical width `698` and height `1000`. Constrain anchors to the active mouth, derive head coordinates from anchor/angle/height, and calculate rotated/scaled visual bounds so a material remains operable near canvas edges.

- [ ] **Step 4: Make history copies deep and model-complete**

Copy nested background, container, transform, materials, and every container layout. History must never retain shared transform or anchor objects.

- [ ] **Step 5: Run focused read-only checks**

Run: `rg -n "FlowerKind|VaseName|interface Stem|vaseMaterialId|backgroundMaterialId" src/models/artwork.ts src/utils/flower/artwork.ts src/utils/flower/artwork-history.ts`

Expected: no legacy model definitions or fallback branches.

Run: `git diff --check -- src/models/artwork.ts src/utils/flower/artwork.ts src/utils/flower/arrangement.cjs src/utils/flower/arrangement.d.cts src/utils/flower/artwork-history.ts`

Expected: no output.

- [ ] **Step 6: Commit the domain model**

```bash
git add src/models/artwork.ts src/utils/flower/artwork.ts src/utils/flower/arrangement.cjs src/utils/flower/arrangement.d.cts src/utils/flower/artwork-history.ts
git commit -m "refactor: replace flower artwork model"
```

### Task 2: Rebuild Artwork Store Actions and Transactions

**Files:**
- Modify: `src/stores/artworkStore.ts`

**Interfaces:**
- Consumes: Task 1 artwork types and geometry helpers.
- Produces: `snapshot`, `initialize`, `addMaterial`, `removeMaterial`, `duplicateMaterial`, `clearMaterials`, `setMaterialColor`, `setMaterialMirror`, `updateMaterialTransform`, `moveMaterialLayer`, `setBackground`, `setContainer`, `beginEdit`, `endEdit`, `undo`, and `redo`.
- Produces: computed `canUndo`, `canRedo`, `canClear`, `canMoveBackward`, and `canMoveForward`.

- [ ] **Step 1: Store only persisted artwork state**

Remove selected instance and panel state from the artwork store. Store `background`, `container`, `materials`, and `containerLayouts` in the new shape and return a deep, parser-valid snapshot.

- [ ] **Step 2: Implement unbounded material lifecycle actions**

Add, duplicate, and delete without a count cap. Duplicate immediately after its source in layer order with a constrained offset. Delete its entries from every saved container layout.

- [ ] **Step 3: Implement one-step layer movement**

`moveMaterialLayer(id, 'forward' | 'backward')` swaps only with the adjacent array item, records one history entry, and does nothing at a boundary.

- [ ] **Step 4: Implement transactional transform editing**

`beginEdit(id)` captures one snapshot; repeated `updateMaterialTransform` calls mutate the preview through Task 1 constraints; `endEdit()` records nothing when unchanged and otherwise retains exactly one undo step.

- [ ] **Step 5: Implement container layout memory**

Before switching, save layouts under the current container material ID. Restore an existing target layout; otherwise derive a first layout from target mouth geometry, with a single bouquet adjustment that does not compound on repeated switching.

- [ ] **Step 6: Verify state boundaries**

Run: `rg -n "selectedId|activePanel|maxMaterials|48|\.vase\b|\.stems\b" src/stores/artworkStore.ts`

Expected: no transient selection, count cap, or legacy artwork access.

Run: `git diff --check -- src/stores/artworkStore.ts`

Expected: no output.

- [ ] **Step 7: Commit store actions**

```bash
git add src/stores/artworkStore.ts
git commit -m "refactor: isolate flower artwork actions"
```

### Task 3: Replace the Global Layout Store with Page-Scoped Coordinates

**Files:**
- Modify: `src/hooks/useFlowerStudioLayout.ts`
- Modify: `src/hooks/useFlowerDrag.ts`
- Delete: `src/stores/flowerStudioLayoutStore.ts`

**Interfaces:**
- Consumes: Task 1 logical dimensions and Task 2 edit transaction API.
- Produces: `useFlowerStudioLayout()` returning device safe-area data, available stage rectangle, `scale`, `offsetX`, `offsetY`, `workspaceStyle`, `screenToWorkspace(point)`, and `workspaceToScreen(point)`.
- Produces: `useFlowerDrag(store, layout, onTap, onDragStart)` operating only on logical points.

- [ ] **Step 1: Compute the available phone stage inside the composable**

Read system, capsule, and safe-area measurements once per page instance. Calculate `scale = min(availableWidth / 698, availableHeight / 1000)` and centered offsets without persisting them.

- [ ] **Step 2: Add inverse coordinate transforms**

Implement screen-to-workspace and workspace-to-screen conversion using the same scale and offsets. Keep device units outside the artwork store.

- [ ] **Step 3: Rewrite drag orchestration**

Convert touch points before calling the store. Start one edit transaction after the movement threshold, update logical transforms during movement, and end the transaction on touch end, page hide, panel switch, or cancellation.

- [ ] **Step 4: Remove the Pinia layout store**

Update imports in the touched hooks, then delete `flowerStudioLayoutStore.ts`. Later component imports are removed in Tasks 5 and 7.

- [ ] **Step 5: Run focused checks**

Run: `rg -n "useFlowerStudioLayoutStore|boardScale|unit \*" src/hooks src/stores`

Expected: no dependency on the removed store and no drag delta based on `rpx` conversion.

- [ ] **Step 6: Commit coordinates**

```bash
git add src/hooks/useFlowerStudioLayout.ts src/hooks/useFlowerDrag.ts src/stores/flowerStudioLayoutStore.ts
git commit -m "refactor: centralize studio coordinates"
```

### Task 4: Make Rendering Components Store-Independent

**Files:**
- Modify: `src/components/flower/flower-board.vue`
- Modify: `src/components/flower/flower-stem.vue`
- Modify: `src/components/flower/flower-stem-control.vue`
- Modify: `src/components/flower/flower-vase.vue`
- Modify: `src/components/flower/flower-artwork-renderer.vue`

**Interfaces:**
- Consumes: Task 1 artwork types and prepared `CachedMaterial` values supplied by the parent.
- Produces: a workspace component accepting `artwork`, prepared material lookup, selected instance ID, and logical layout props; emits start/move/end/select/clear intentions.
- Produces: a complete `FlowerInstance` renderer with no Pinia access.
- Produces: a unified container renderer whose vase and bouquet layering is internal.

- [ ] **Step 1: Remove catalog-store reads from leaf renderers**

Pass resolved flower SVG source, container sources/geometry, color, and transform through props. `flower-stem.vue` and `flower-vase.vue` must not import Pinia stores.

- [ ] **Step 2: Render one complete material instance**

Apply anchor, height, angle, scale, and mirror once to the flower-and-stem unit. Use the same transform semantics as Task 1 geometry.

- [ ] **Step 3: Encapsulate container layers**

Render a normal vase once. Render bouquets as back layer before materials and front layer after materials without exposing bouquet-specific branching to the page.

- [ ] **Step 4: Compose the workspace layer order**

Render background, container back, materials in array order, container front, then selection overlay. Keep the fixed logical size and clipping inside the workspace.

- [ ] **Step 5: Verify component boundaries**

Run: `rg -n "useFlowerCatalogStore|useCreationArtworkStore|useFlowerStudioStore" src/components/flower/flower-board.vue src/components/flower/flower-stem.vue src/components/flower/flower-stem-control.vue src/components/flower/flower-vase.vue`

Expected: no store imports in leaf rendering components.

- [ ] **Step 6: Commit rendering boundaries**

```bash
git add src/components/flower/flower-board.vue src/components/flower/flower-stem.vue src/components/flower/flower-stem-control.vue src/components/flower/flower-vase.vue src/components/flower/flower-artwork-renderer.vue
git commit -m "refactor: split flower workspace rendering"
```

### Task 5: Rebuild Transient UI State and Editing Panels

**Files:**
- Modify: `src/stores/flowerStudioStore.ts`
- Modify: `src/pages/flower-studio/components/studio-flower-panel.vue`
- Modify: `src/pages/flower-studio/components/studio-flower-tools.vue`
- Modify: `src/pages/flower-studio/components/studio-container-panel.vue`
- Modify: `src/pages/flower-studio/components/studio-background-panel.vue`
- Modify: `src/pages/flower-studio/components/studio-material-dock.vue`
- Modify: `src/pages/flower-studio/components/studio-header.vue`
- Modify: `src/pages/flower-studio/components/studio-flower-toolbar.vue`

**Interfaces:**
- Consumes: Task 2 actions/computed state, Task 3 layout output, and catalog queries.
- Produces: transient selection and panel API in `useFlowerStudioStore`.
- Produces: local recent-material storage containing at most 12 distinct material IDs.
- Produces: panel events for add, transform, color, mirror, duplicate, one-step layer movement, delete, container, and background selection.

- [ ] **Step 1: Move transient state into the UI store**

Store selected material instance ID, active panel, active material group, keyword, expanded colors, finishing, and pending material ID. Do not include any of these in artwork snapshots.

- [ ] **Step 2: Implement material discovery**

Use tabs ordered `最近｜主花｜配花｜叶材`, default to main on first entry, preserve the session tab, search trimmed names across all groups, and return to the prior tab when search clears.

- [ ] **Step 3: Implement recent materials**

Record only successful additions, deduplicate, put newest first, retain 12 IDs, ignore missing catalog entries, and keep this list outside artwork data.

- [ ] **Step 4: Rebuild the adjustment panel**

Expose position, height, size, mirror, supported colors, duplicate, previous/next overlapping material, forward one layer, backward one layer, and delete. Disable only actions that are impossible at the current boundary.

- [ ] **Step 5: Keep selectors presentational**

Container and background panels emit IDs and show selected/loading state. Container switching closes its panel after success; background switching keeps its panel open for comparison.

- [ ] **Step 6: Verify copy and limits**

Run: `rg -n "48|最多|上限|maxMaterials|移到最前|移到最后|缓存|hash|下载" src/pages/flower-studio/components src/stores/flowerStudioStore.ts`

Expected: no material count cap, direct-to-edge layer action, or technical cache copy.

- [ ] **Step 7: Commit the editor panels**

```bash
git add src/stores/flowerStudioStore.ts src/pages/flower-studio/components/studio-flower-panel.vue src/pages/flower-studio/components/studio-flower-tools.vue src/pages/flower-studio/components/studio-container-panel.vue src/pages/flower-studio/components/studio-background-panel.vue src/pages/flower-studio/components/studio-material-dock.vue src/pages/flower-studio/components/studio-header.vue src/pages/flower-studio/components/studio-flower-toolbar.vue
git commit -m "refactor: rebuild studio editing panels"
```

### Task 6: Add Hash-Validated Startup Material Preparation

**Files:**
- Modify: `src/utils/flower/material-cache.ts`
- Modify: `src/stores/flowerCatalogStore.ts`
- Create: `src/pages/flower-studio/components/studio-material-prepare-modal.vue`

**Interfaces:**
- Produces: internal `MaterialPrepareProgress` with phase, processed work, total work, and percent; only phase-safe message and percent leave the store.
- Produces: `prepareAll(): Promise<void>`, `retryPreparation(): Promise<void>`, `needsPreparation`, `preparePercent`, `prepareMessage`, and `prepareError`.
- Consumes: catalog asset hashes and WeChat saved-file APIs.

- [ ] **Step 1: Make cache validation explicit**

For every catalog asset, verify the saved path exists, SHA-1 equals the catalog hash, and SVG content is safe. Remove an invalid storage pointer and download the asset again. A stored record alone must never count as prepared.

- [ ] **Step 2: Expose deterministic aggregate progress**

Count completed validation/download work internally and derive a monotonic `0–100` percentage. Do not expose file totals, cache hits, downloads, hashes, or validation detail to components.

- [ ] **Step 3: Make preparation session-aware and retryable**

During one App run, reuse complete prepared memory. Reopen preparation when the catalog contains an unprepared asset or a cached file disappears. Retry only unfinished/invalid assets and cap concurrent downloads without changing artwork state.

- [ ] **Step 4: Build the blocking modal**

Show a progress bar and short copy such as `正在准备花材，请稍候`. Provide no close action. On failure, show friendly copy and one `重新加载` action. Never render technical counts or cache terminology.

- [ ] **Step 5: Verify user-facing copy and cache behavior**

Run: `rg -n "文件|缓存|hash|SHA|下载数量|命中|[0-9]+ /" src/pages/flower-studio/components/studio-material-prepare-modal.vue`

Expected: no technical preparation details.

Run: `git diff --check -- src/utils/flower/material-cache.ts src/stores/flowerCatalogStore.ts src/pages/flower-studio/components/studio-material-prepare-modal.vue`

Expected: no output.

- [ ] **Step 6: Commit material preparation**

```bash
git add src/utils/flower/material-cache.ts src/stores/flowerCatalogStore.ts src/pages/flower-studio/components/studio-material-prepare-modal.vue
git commit -m "feat: prepare studio materials before editing"
```

### Task 7: Reduce the Studio Page to Orchestration

**Files:**
- Modify: `src/pages/flower-studio/flower-studio-page.vue`

**Interfaces:**
- Consumes: Tasks 2–6 store, layout, workspace, panel, and preparation APIs.
- Produces: page lifecycle that prepares materials, restores a new-format draft/work, binds domain actions, saves, and handles leave confirmation.

- [ ] **Step 1: Gate initialization behind the preparation modal**

Wait for auth, load the catalog, run `prepareAll`, then create or restore artwork and reveal the workspace. On retry, remain blocked until preparation succeeds.

- [ ] **Step 2: Replace direct artwork mutation with store actions**

Resolve async material IDs through the catalog, call one domain action on success, and keep the last valid artwork unchanged on failure.

- [ ] **Step 3: Bind selection and panels through the UI store**

Clear invalid selection after delete/undo/redo, close adjustment state on blank tap, and end edit transactions before panel changes, save, hide, or unload.

- [ ] **Step 4: Preserve session and navigation responsibilities**

Keep draft recovery, works navigation, daily-flower copy flow, save/finish, and leave confirmation in the page while removing coordinate, history, and geometry calculations.

- [ ] **Step 5: Verify page boundaries**

Run: `rg -n "\.materials\.(push|splice)|containerLayouts|Math\.(sin|cos)|boardScale|vaseMaterialId|backgroundMaterialId|\.stems\b" src/pages/flower-studio/flower-studio-page.vue`

Expected: no direct domain mutation, geometry, or legacy fields.

- [ ] **Step 6: Commit page orchestration**

```bash
git add src/pages/flower-studio/flower-studio-page.vue
git commit -m "refactor: simplify flower studio orchestration"
```

### Task 8: Switch Local Persistence, Preview, Export, and Import Consumers

**Files:**
- Modify: `src/utils/flower/creation-storage.ts`
- Modify: `src/hooks/useFlowerCreationSession.ts`
- Modify: `src/stores/flowerWorksStore.ts`
- Modify: `src/components/flower/flower-artwork-preview.vue`
- Modify: `src/hooks/useFlowerPageArtwork.ts`
- Modify: `src/utils/flower/artwork-svg.ts`
- Modify: `src/utils/flower/render-artwork.ts`
- Modify: `src/utils/flower/render-test-svg.ts`
- Modify: `src/utils/flower/cloud-image-renderer.ts`
- Modify: `src/pages/flower-json/example.ts`
- Modify: `src/pages/flower-json/flower-json-page.vue`
- Modify: `src/pages/flower-render-test/flower-render-test-page.vue`
- Modify: `src/utils/flower/daily-flower.ts`
- Modify: `src/subpackages/daily-flower-admin/daily-flower-admin-page.vue`
- Modify: `src/subpackages/daily-flower-admin/lib/daily-flower-preview.ts`

**Interfaces:**
- Consumes: Task 1 `Artwork` and parser.
- Produces: all local readers, writers, previews, and renderers using identical layer and transform semantics.

- [ ] **Step 1: Switch drafts and works to strict new-format parsing**

Persist and restore only the new shape. Old drafts fail with existing user-safe recovery options; do not add conversion or fallback fields.

- [ ] **Step 2: Update shared preview and page consumers**

Resolve background, container, and material references from the new nested fields and render array order as layer order.

- [ ] **Step 3: Update SVG and Canvas exporters**

Use Task 1 transform semantics and container internal layer order so editor, preview, SVG, PNG, and card output match.

- [ ] **Step 4: Replace JSON examples and import validation**

Provide only a new-format example. Reject old flat JSON without migration messaging that promises compatibility.

- [ ] **Step 5: Update daily-flower administration consumers**

Validate, preview, and publish the new artwork shape without count limits or old field access.

- [ ] **Step 6: Scan all local source consumers**

Run: `rg -n "vaseMaterialId|backgroundMaterialId|containerLayouts.*stems|\.stems\b|artwork\.vase\b|artwork\.background\b|FlowerKind|VaseName" src --glob '!src/uni_modules/**'`

Expected: no old artwork model access.

- [ ] **Step 7: Commit local consumers**

```bash
git add src/utils/flower/creation-storage.ts src/hooks/useFlowerCreationSession.ts src/stores/flowerWorksStore.ts src/components/flower/flower-artwork-preview.vue src/hooks/useFlowerPageArtwork.ts src/utils/flower/artwork-svg.ts src/utils/flower/render-artwork.ts src/utils/flower/render-test-svg.ts src/utils/flower/cloud-image-renderer.ts src/pages/flower-json/example.ts src/pages/flower-json/flower-json-page.vue src/pages/flower-render-test/flower-render-test-page.vue src/utils/flower/daily-flower.ts src/subpackages/daily-flower-admin/daily-flower-admin-page.vue src/subpackages/daily-flower-admin/lib/daily-flower-preview.ts
git commit -m "refactor: switch artwork consumers to new model"
```

### Task 9: Switch Cloud Validation, Rendering, and Schemas

**Files:**
- Modify: `uniCloud-alipay/cloudfunctions/flower-works/validation.js`
- Modify: `uniCloud-alipay/cloudfunctions/flower-works/index.obj.js`
- Modify: `uniCloud-alipay/cloudfunctions/flower-render/index.obj.js`
- Modify: `uniCloud-alipay/cloudfunctions/common/daily-flower/index.js`
- Modify: `uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js`
- Modify: `uniCloud-alipay/cloudfunctions/flower-daily-admin/index.obj.js`
- Modify: `uniCloud-alipay/database/flower-works.schema.json`
- Modify: `uniCloud-alipay/database/daily-flower.schema.json`

**Interfaces:**
- Consumes: Task 1 artwork contract reproduced in server-side validation.
- Produces: strict cloud artwork normalization and schemas with no legacy branches or material-count cap.

- [ ] **Step 1: Replace cloud artwork validation**

Whitelist the new nested fields, reject duplicate IDs, non-finite transforms, invalid groups/colors/container types, and layout references to absent instances. Preserve server-side identity checks and payload-size safety; do not limit the number of materials.

- [ ] **Step 2: Update works and daily-flower cloud objects**

Accept, save, fetch, copy, and publish only the new normalized artwork. Keep every query, update, and delete scoped by server-authenticated identity where ownership applies.

- [ ] **Step 3: Update cloud rendering**

Render background, container back, material array order, and container front with the same transform semantics as the client.

- [ ] **Step 4: Replace database artwork schemas**

Describe the new required nested shape directly. Do not include legacy fields, version fields, compatibility alternatives, or a material array maximum.

- [ ] **Step 5: Run syntax and legacy-field checks**

Run: `node --check uniCloud-alipay/cloudfunctions/flower-works/validation.js && node --check uniCloud-alipay/cloudfunctions/flower-works/index.obj.js && node --check uniCloud-alipay/cloudfunctions/flower-render/index.obj.js && node --check uniCloud-alipay/cloudfunctions/common/daily-flower/index.js && node --check uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js && node --check uniCloud-alipay/cloudfunctions/flower-daily-admin/index.obj.js`

Expected: every command exits successfully.

Run: `rg -n "vaseMaterialId|backgroundMaterialId|\.stems\b|FlowerKind|VaseName|version|revision|maxItems" uniCloud-alipay/cloudfunctions/flower-works uniCloud-alipay/cloudfunctions/flower-render uniCloud-alipay/cloudfunctions/common/daily-flower uniCloud-alipay/cloudfunctions/flower-daily uniCloud-alipay/cloudfunctions/flower-daily-admin uniCloud-alipay/database/flower-works.schema.json uniCloud-alipay/database/daily-flower.schema.json`

Expected: no artwork compatibility/version fields or material count cap; investigate unrelated package metadata before changing it.

- [ ] **Step 6: Commit cloud and schema changes**

```bash
git add uniCloud-alipay/cloudfunctions/flower-works/validation.js uniCloud-alipay/cloudfunctions/flower-works/index.obj.js uniCloud-alipay/cloudfunctions/flower-render/index.obj.js uniCloud-alipay/cloudfunctions/common/daily-flower/index.js uniCloud-alipay/cloudfunctions/flower-daily/index.obj.js uniCloud-alipay/cloudfunctions/flower-daily-admin/index.obj.js uniCloud-alipay/database/flower-works.schema.json uniCloud-alipay/database/daily-flower.schema.json
git commit -m "refactor: switch cloud artwork schema"
```

### Task 10: Integrate and Verify the Complete Workbench

**Files:**
- Modify only files needed to correct issues found by the checks below.

**Interfaces:**
- Consumes: Tasks 1–9.
- Produces: a coherent phone workbench whose editor, persistence, preview, export, and cloud paths share the same model.

- [ ] **Step 1: Run repository-wide legacy and constraint scans**

Run: `rg -n "vaseMaterialId|backgroundMaterialId|\.stems\b|FlowerKind|VaseName|canvasVersion|maxMaterials|最多 ?48|48 ?枝" src uniCloud-alipay --glob '!src/uni_modules/**' --glob '!**/package-lock.json'`

Expected: no old artwork access, version field, or material-count limit. Review documentation-only matches separately.

- [ ] **Step 2: Run whitespace and JavaScript syntax checks**

Run: `git diff --check`

Expected: no output.

Run the Task 9 `node --check` command again.

Expected: every cloud JavaScript file parses successfully.

- [ ] **Step 3: Request permission for project verification**

Ask the user before running `pnpm type-check`, `pnpm lint`, or `pnpm build:mp-weixin`, because this workspace explicitly requires confirmation and these commands may alter dependency state.

- [ ] **Step 4: Run approved project checks**

If authorized, run exactly:

```bash
pnpm type-check
pnpm lint
pnpm build:mp-weixin
```

Expected: all commands exit `0`. Do not run `lint:fix`; repair only files in this refactor.

- [ ] **Step 5: Perform manual WeChat Mini Program verification**

Verify on at least one short and one tall phone viewport:

- first App-session entry blocks on a simple progress modal, then opens the studio;
- a second entry in the same App session skips the modal when memory and files are valid;
- a removed cached file causes preparation and redownload instead of a broken canvas;
- add many materials beyond 48 without an artificial limit;
- search, recent, main, filler, and foliage selection work;
- drag and sliders each undo in one step;
- duplicate, mirror, recolor, delete, forward one layer, and backward one layer work;
- vase/bouquet switching restores each saved layout without cumulative height changes;
- background/container/material failures leave the prior artwork intact;
- save, reopen, preview, daily-flower copy, JSON import, and export match the editor.

- [ ] **Step 6: Record actual verification evidence**

In the implementation handoff, list every command actually run, its result, manual scenarios completed, and anything not verified. Do not describe local checks as real cloud deployment or integration.

- [ ] **Step 7: Commit integration fixes**

Stage only files changed to resolve integration findings, then commit:

```bash
git commit -m "fix: integrate flower studio workbench"
```

