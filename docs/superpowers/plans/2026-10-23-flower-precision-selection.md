# Flower Precision Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-level mobile selector that filters by flower/foliage and then by the exact material before selecting an instance.

**Architecture:** Keep broad category, exact material id, and menu level as transient studio UI state. Pass the active category and material id through the board into render and control layers so non-target instances dim and stop receiving touch events; retain the existing artwork model and edit toolbar.

**Tech Stack:** uni-app, Vue 3 `<script setup>`, TypeScript, Pinia, SCSS, UnoCSS/Carbon icons

**Spec:** `docs/superpowers/specs/2026-10-23-flower-precision-selection-design.md`

## Global Constraints

- Do not change the persisted `Artwork` shape or cloud schemas.
- Do not add test files unless the user explicitly requests tests.
- Do not run package-manager, type-check, lint, or build commands without explicit confirmation.
- Preserve all existing uncommitted changes, especially the vase-rendering edits in `flower-artwork-renderer.vue`.
- Use rpx for page UI and preserve the board's existing 698×1000 workspace coordinate system.

## Review Focus

- A category with zero instances must be visibly disabled and must not trap the user in an empty mode.
- Selecting, dragging, deleting, undoing, and redoing must not leave an invalid selected id.
- Filtered-out materials must be visibly dimmed and unable to intercept touches.
- Existing direct selection in “全部” mode must continue to work.
- The floating control must remain reachable without covering the main flower heads or bottom editing panel.

---

### Task 1: Transient Selection State

**Files:**
- Modify: `src/models/flower-studio.ts`
- Modify: `src/stores/flowerStudioStore.ts`

**Interfaces:**
- Produces: `StudioSelectionFilter = 'all' | 'flowers' | 'foliage'`
- Produces: `selectionFilter`, `selectionMaterialId`, `selectionMenuLevel`, and explicit category/material/back navigation actions

- [x] Add the filter type and transient store state.
- [x] Reset selection mode during store reset and when opening material panels.
- [x] Confirm the store changes do not touch artwork persistence.

### Task 2: Filter-Aware Board Selection

**Files:**
- Modify: `src/components/flower/flower-board.vue`
- Modify: `src/components/flower/flower-artwork-renderer.vue`
- Modify: `src/components/flower/flower-stem.vue`
- Modify: `src/components/flower/flower-stem-control.vue`

**Interfaces:**
- Consumes: `StudioSelectionFilter`
- Produces: filter-aware opacity and touch eligibility while retaining existing drag events

- [x] Pass the active filter into the renderer and controls.
- [x] Dim non-target rendered instances without changing their artwork data.
- [x] Disable pointer events for non-target controls and enlarge foliage selection geometry.
- [x] Strengthen the selected outline and add a visible head marker.

### Task 3: Floating Selector UI and Scoped Navigation

**Files:**
- Create: `src/pages/flower-studio/components/studio-selection-fab.vue`
- Modify: `src/pages/flower-studio/flower-studio-page.vue`

**Interfaces:**
- Consumes: artwork material groups and studio selection state
- Produces: category selection, exit, and previous/next selection events scoped to the active filter

- [x] Build the first-level “全部 / 花朵 / 草叶” menu and second-level exact-material list.
- [x] Group exact materials by `materialId`, display names and counts, and use “返回” for one-level navigation.
- [x] Disable empty categories and show the selected material with its instance position.
- [x] Place it relative to the visible stage without overlapping the bottom edit tools.
- [x] Change adjacent selection to cycle only through instances with the selected `materialId`.
- [x] Return to the current category's material list when the selected material reaches zero instances.

### Task 4: Read-Only Verification

**Files:**
- Inspect all files modified above.

- [x] Run `git diff --check`.
- [x] Review imports, emitted event names, prop types, and template bindings with `rg`/`git diff`.
- [x] Do not run package-manager-backed checks without user confirmation; report them as unverified.

### Task 5: Compact Edit Toolbar and Deterministic Layering

**Files:**
- Modify: `src/pages/flower-studio/components/studio-flower-tools.vue`
- Modify: `src/pages/flower-studio/components/studio-flower-toolbar.vue`
- Modify: `src/pages/flower-studio/flower-studio-page.vue`
- Modify: `src/stores/artworkStore.ts`

- [x] Remove position, height, size, previous, next, and overlap-navigation controls from the flower edit panel.
- [x] Remove the now-unused component events and page handlers.
- [x] Make forward/backward move the selected material directly to the front/back extreme.

### Task 6: Left Vertical Material Toolbar

**Files:**
- Modify: `src/hooks/useFlowerStudioLayout.ts`
- Modify: `src/pages/flower-studio/components/studio-flower-tools.vue`

- [x] Position the selected-material toolbar at the vertical center of the left side of the stage.
- [x] Render every action as a vertical icon-and-text button.
- [x] Expand the color choices to the right of the toolbar without covering the action buttons.

