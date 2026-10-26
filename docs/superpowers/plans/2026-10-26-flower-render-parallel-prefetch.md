# Flower Render Parallel Prefetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce flower image generation latency by removing serial cloud database and file-download waits from artwork SVG preparation.

**Architecture:** Collect and validate all unique material IDs first, fetch their metadata concurrently, then concurrently preload each unique SVG part required by the artwork. Preserve the existing assembly order and rendering contract, while returning additive phase timings for production measurement.

**Tech Stack:** Alipay uniCloud cloud objects, Node.js, `@resvg/resvg-wasm`

**Spec:** User-approved short design in the 2026-10-26 conversation.

## Global Constraints

- Modify only `uniCloud-alipay/cloudfunctions/flower-render/index.obj.js` for production behavior.
- Do not create test files or run package-manager commands.
- Preserve authentication, validation, SVG ordering, output dimensions, cloud paths, and existing response fields.
- Do not add persistent caching.

## Review Focus

- Repeated material instances must produce one metadata query and one download per required part.
- Validation must still occur before using untrusted artwork values.
- Flower rendering order must remain identical to `artwork.materials` order.
- Background and container sources must be available before SVG assembly.
- Timing fields must be additive and must not change existing client validation.

---

### Task 1: Concurrent material and source prefetch

**Files:**
- Modify: `uniCloud-alipay/cloudfunctions/flower-render/index.obj.js`

**Interfaces:**
- Consumes: existing `getMaterial`, `materialSource`, and artwork schema.
- Produces: unchanged SVG string from `buildArtworkSvg(artwork)` with concurrent I/O preparation.

- [ ] Validate all material instances and collect unique IDs.
- [ ] Fetch unique material documents concurrently and validate their categories/groups.
- [ ] Collect required source parts and preload them concurrently.
- [ ] Keep the final material rendering loop ordered exactly as the input.

### Task 2: Phase timing visibility

**Files:**
- Modify: `uniCloud-alipay/cloudfunctions/flower-render/index.obj.js`

**Interfaces:**
- Produces: existing render result plus `prepareMs`, `wasmInitMs`, `rasterizeMs`, `uploadMs`, and `totalMs`.

- [ ] Measure SVG preparation separately in both cloud methods.
- [ ] Split rendering and upload timing without changing `renderMs` semantics.
- [ ] Verify syntax with `node --check` and inspect the focused diff.
