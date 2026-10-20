# Cloud-only Runtime Materials Design

## Goal

Require every runtime artwork visual to come from the cloud material catalog. Remove packaged and code-generated fallbacks for legacy flower stems, vases, bouquets, and backgrounds. Existing artworks without complete cloud material references do not need compatibility because the product is still under development.

## Scope

Runtime artwork data must contain:

- a valid `materialId` on every stem;
- a valid `vaseMaterialId` for the container;
- a valid `backgroundMaterialId` for the background.

The change removes the runtime assets under `src/static/flower`, the legacy flower SVG assets under `src/utils/flower/svg`, and the code paths that draw or synthesize missing flowers, containers, and backgrounds.

The following remain unchanged:

- third-party files under `src/uni_modules`;
- local SVG and JSON source files under `src/subpackages/material-admin/assets`, which remain development-only upload sources;
- client-side persistent caching of SVG files downloaded from cloud storage;
- stylesheets and code-generated SVG composition that combine already downloaded cloud material sources.

## Artwork Contract

`Stem.materialId`, `Artwork.vaseMaterialId`, and `Artwork.backgroundMaterialId` become required TypeScript fields. `parseArtwork` rejects missing, malformed, or empty cloud references before returning an artwork. There is no legacy `kind`-only rendering path.

The legacy fields `kind`, `vase`, and `background` remain only where current layout, grouping, color, and persisted-data code still requires them. They do not select visual assets. A later independent refactor may remove them after their non-visual responsibilities are migrated.

New empty artwork creation cannot invent cloud IDs. The creation flow must initialize the artwork from the loaded cloud catalog before it becomes renderable. If the catalog lacks at least one compatible flower, vase, or background, the UI stays unavailable and reports a material-loading error instead of displaying a fallback.

## Rendering

Editor rendering, Canvas export, and SVG/test rendering resolve every visual through `useFlowerCatalogStore` or an explicit cloud-material resolver.

- A missing prepared flower, vase, or background is an error.
- A material with the wrong category or missing required SVG parts is an error.
- Image load/render failure is surfaced; it never switches to a packaged or procedural visual.
- Background color may remain as a non-asset UI/layout value while loading, but a finished artwork cannot render or export without its cloud background material.
- SVG wrapper markup, transforms, color substitution, stem shaping, and bouquet layer splitting may remain because they transform cloud-provided SVG source rather than provide a substitute asset.
- Hard-coded SVG paths that substitute for a missing bouquet layer, legacy background version, vase, flower, or stem are removed.

## Local Asset Removal

Delete runtime-only files and their imports:

- `src/static/flower/*.png`;
- `src/utils/flower/svg/*.svg` and its README;
- `src/utils/flower/svg-artwork.ts`.

Do not delete or change `src/subpackages/material-admin/assets` or `src/uni_modules`.

The unused cloud-function `catalog.json` is outside the confirmed runtime-fallback scope and is not required for this change unless a direct reference is discovered during implementation.

## Error Handling

Malformed imported JSON fails with a clear cloud-reference validation error. A stored draft created before this contract follows the existing draft-read failure path: the UI reports that restoration failed and requires the user to restart, which clears that draft. Imported or opened artwork fails visibly and is not applied. No old data is migrated.

Rendering APIs fail fast when referenced catalog data is absent. They must not emit partial artwork, silently omit a layer, or choose a local replacement.

## Testing

Use test-first changes with the existing dependency-free Node test runner.

Coverage must prove:

- parsing rejects a stem without `materialId`;
- parsing rejects artwork without `vaseMaterialId` or `backgroundMaterialId`;
- valid fully referenced artwork still parses and renders;
- editor, Canvas, and SVG renderers do not contain or call legacy local fallback paths;
- missing or invalid cloud materials cause explicit failures rather than partial output;
- production runtime source no longer references `/static/flower`, `src/utils/flower/svg`, `plantSvgMarkup`, or built-in vase/background substitute functions;
- material-admin local sources and third-party assets remain untouched.

Verification uses targeted `node --test tests/*.test.cjs` commands and then the full offline Node suite. Package-manager lint, type-check, and build commands require separate explicit approval because they may repair dependencies.

## Success Criteria

An artwork can be displayed or exported only when all of its flower, container, and background SVG sources were obtained through the cloud catalog/cache pipeline. Removing cloud references produces an explicit invalid-data or unavailable-material error, and no first-party runtime local or synthesized asset is used as a fallback.
