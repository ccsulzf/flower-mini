# Flower Studio Maintainability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce flower studio state and component coupling without changing its current user-facing interaction.

**Architecture:** Represent selection as one discriminated state in the studio store, expose compatibility computed properties to existing components, and move page-level selection/material commands into a focused composable. Reuse a pure thumbnail source helper in both material lists.

**Tech Stack:** uni-app, Vue 3, TypeScript, Pinia, SCSS

**Spec:** `docs/superpowers/specs/2026-10-26-flower-studio-maintainability-design.md`

## Global Constraints

- Do not change persisted artwork or cloud schemas.
- Do not add test files.
- Do not run package-manager, type-check, lint, or build commands without explicit confirmation.
- Preserve unrelated uncommitted changes.

## Review Focus

- Selecting, deleting, duplicating, undoing, and redoing must keep a valid selection.
- Opening another material tab must fully leave selection mode.
- Flower and foliage category focus must dim the opposite group without blocking all controls.
- Thumbnail generation must preserve color and mirror variants.
- Page unload must still end edits and cancel transient timers.

---

### Task 1: Remove obsolete toolbar path

**Files:**
- Delete: `src/pages/flower-studio/components/studio-flower-toolbar.vue`
- Modify: `src/hooks/useFlowerStudioLayout.ts`
- Modify: `src/stores/flowerStudioStore.ts`

- [x] Remove unreachable `flower-tools` panel state and unused actions.
- [x] Remove the unused left-toolbar layout value.
- [x] Confirm no remaining imports or references with `rg`.

### Task 2: Consolidate selection state

**Files:**
- Modify: `src/models/flower-studio.ts`
- Modify: `src/stores/flowerStudioStore.ts`
- Modify: `src/components/flower/flower-artwork-renderer.vue`

- [x] Add one discriminated `StudioSelectionState` value.
- [x] Expose existing selection fields as computed compatibility projections.
- [x] Route every selection action through one state assignment.
- [x] Make `pickScope` participate in dimming behavior.

### Task 3: Share thumbnail generation and selection commands

**Files:**
- Create: `src/utils/flower/material-thumbnail.ts`
- Create: `src/pages/flower-studio/composables/useStudioSelectionActions.ts`
- Modify: `src/pages/flower-studio/components/studio-flower-panel.vue`
- Modify: `src/pages/flower-studio/components/studio-selection-fab.vue`
- Modify: `src/pages/flower-studio/flower-studio-page.vue`

- [x] Extract deterministic thumbnail generation and scoped caching.
- [x] Move selected-context, focus, color, layer, mirror, duplicate, remove, undo, and redo commands out of the page.
- [x] Keep page lifecycle, material loading, saving, and navigation unchanged.

### Task 4: Read-only verification

- [x] Run `git diff --check`.
- [x] Use `rg` to check deleted symbols, imports, emits, and props.
- [x] Inspect the final diff for unrelated changes.
- [x] Report type-check, lint, build, and runtime behavior as unverified unless the user separately authorizes them.

