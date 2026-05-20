# Changelog

<div align="center">
  <img src="docs/banner.svg" alt="Cabinet Planner" width="100%"/>
</div>

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.53.80] — 2026-06-11

### Sprints 61–70 — Cabinet Reorder, Weight, Validation Fixes, Assembly Time, Parts Filter, Shortcuts, Room Numbers, Validation Rules, DXF Layers

Covers Sprints 61 through 70 (v3.53.71 → v3.53.80). All tests passing.

### Store — Move Cabinet Up/Down (Sprint 61)

- **Sprint 61** — Added `moveCabinet(index, direction)` action to `cabinet-store`. ▲/▼ buttons in `CabinetSelector` let users reorder cabinets without removing and re-adding them. `activeCabinetIndex` follows the moved cabinet. 5 new tests. (v3.53.71)

### Engine — Parts Total Weight (Sprint 62)

- **Sprint 62** — Added `computePartsWeight(parts, extraMaterials?)` to `src/engine/parts.ts` and exported from `src/engine/index.ts`. `ProjectSummaryPanel` now shows a **Total weight** stat (kg). Silently skips parts with unknown materials. 5 new tests. (v3.53.72)

### Configurator — ValidationPanel Fix Button (Sprint 63)

- **Sprint 63** — `ValidationPanel` shows a **Fix** button for issues that carry `field` and `suggestedValue`. Clicking it calls `setConfig({ [field]: suggestedValue })` and dismisses the issue. 5 new tests in `tests/components/ValidationPanel-fix.test.tsx`. (v3.53.73)

### Assembly — Estimated Time Per Step (Sprint 64)

- **Sprint 64** — `AssemblyStep` gained `estimatedMinutes: number`. All 23 steps have time estimates (10–45 min each). `AssemblyGuide` header shows the total estimated build time in minutes. 5 new tests. (v3.53.74)

### Optimizer — Parts Table Material Filter (Sprint 65)

- **Sprint 65** — `Tables` (optimizer parts table) gained a material-filter `<select>` that appears when a cut plan contains more than one material. Filtering updates the sorted parts list; resetting restores all rows. Select has proper `aria-label`. 5 new tests. (v3.53.75)

### Shortcuts — Ctrl+R Reset Config (Sprint 66)

- **Sprint 66** — `App.tsx` keyboard handler: **Ctrl+R** calls `resetConfig()` and shows a toast. ShortcutsModal lists the new shortcut. i18n keys: `shortcuts.resetConfig`. 4 new tests in `tests/components/ctrl-r-reset.test.tsx`. (v3.53.76)

### Room Layout — Cabinet Position Numbers (Sprint 67)

- **Sprint 67** — SVG floor-plan cabinet labels now include a 1-based position number prefix: `(1) Base Unit`, `(2) Wall Unit`. `CabinetRect` takes an `index` prop; `FloorPlan` passes `i` from `map`. 4 new tests added to `tests/components/RoomLayoutView.test.tsx`. (v3.53.77)

### Validation — WARDROBE_MISSING_TOEKICK (Sprint 68)

- **Sprint 68** — New `info`-severity validation rule: wardrobes with `kickHeight === 0` raise `WARDROBE_MISSING_TOEKICK`, suggesting 80 mm (`suggestedValue: 80`, `field: 'kickHeight'`). 5 new tests. (v3.53.78)

### Validation — BACK_PANEL_OVERSIZED (Sprint 69)

- **Sprint 69** — New `info`-severity validation rule: when `hasBack !== false` and the back-panel material is thicker than 9 mm, raises `BACK_PANEL_OVERSIZED` (`field: 'backPanelMaterial'`) suggesting a thin 4–6 mm HDF sheet. 5 new tests. (v3.53.79)

### DXF Export — GRAIN_CONFLICT Layer (Sprint 70)

- **Sprint 70** — `cutSheetToDxf` now declares a `GRAIN_CONFLICT` layer (DXF color 1 = red) in the TABLES section. Parts with `grainConflict === true` are drawn on `GRAIN_CONFLICT` instead of the material layer, making grain violations immediately visible in CAM software. Layer count updated from 4 → 5. 4 new tests. (v3.53.80)

---

## [3.53.69] — 2026-06-09

### Sprints 51–59 — Assembly Checklist, Project Summary, Error Boundary, Room Layout, Validation, Shortcuts, Optimizer & PDF

Covers Sprints 51 through 59 (v3.53.61 → v3.53.69). All 821 tests passing across 53 test files.

### Optimizer — Stale Badge Fix (Sprint 51)

- **Sprint 51** — Fixed stale `optimizationPending` badge staying visible after second optimization run. ROADMAP quality gates added. (v3.53.61)

### Assembly — Step Checklist (Sprint 52)

- **Sprint 52** — `AssemblyGuide` step checklist with checkboxes, progress counter, reset button, and "all steps done" celebration state. Persisted in component state. i18n keys: `assembly.stepsCompleted`, `assembly.resetProgress`, `assembly.markStepDone`, `assembly.stepDone`, `assembly.allStepsDone`. 5 new tests. (v3.53.62)

### Optimizer — Multi-Cabinet Project Summary (Sprint 53)

- **Sprint 53** — `ProjectSummaryPanel` shows total cabinets, total parts, sheets used, overall yield, total waste, and grain conflicts across all cabinets. Returns `null` when fewer than 2 cabinets. Uses `combinedOptimization` from `useCabinetStore`. `<dl>` grid in `<section aria-label>`. i18n key: `summary.*`. 7 new tests. (v3.53.63)

### Layout — ErrorBoundary Copy-to-Clipboard (Sprint 54)

- **Sprint 54** — ErrorBoundary adds a "Copy error details" button that writes `error.stack` to the clipboard. Button label and `aria-label` toggle dynamically to "Copied!" for 2 seconds. `getDerivedStateFromError` now sets `copied: false`. i18n keys: `errors.copyDetails`, `errors.copied`. 5 new tests. (v3.53.64)

### Layout — Room Floor-Plan View (Sprint 55)

- **Sprint 55** — `RoomLayoutView` SVG floor-plan component (`src/components/layout/RoomLayoutView.tsx`). Reads the active layout from `useRoomStore`, scales the room outline and cabinet footprints to fit a 640×400 viewBox. Each `RoomCabinet` rendered as a labelled `<rect>`. Graceful empty state when no layouts configured. Wired into the Configurator tab below `ConfiguratorPanel`. `role="img"` on SVG with `aria-label`. i18n keys: `room.title`, `room.sectionLabel`, `room.empty`, `room.cabinets`. 7 new tests. (v3.53.65)

### Engine — Two New Validation Rules (Sprint 56)

- **Sprint 56** — Two new `validateConfig` rules in `src/engine/validation.ts`:
  - **`DEPTH_EXCEEDS_WIDTH`** (warning) — cabinet depth greater than width is an unusual proportion indicating a possible measurement error and raised tip-over risk. `suggestedValue` set to cabinet width.
  - **`EXCESSIVE_DRAWER_COUNT`** (error) — when drawer count × MIN_DRAWER_HEIGHT_MM exceeds internal height, standard side-mount hardware cannot be installed. `suggestedValue` is the computed maximum safe drawer count.
  - 9 new tests. (v3.53.66)

### Keyboard Shortcuts — BOM CSV Export (Sprint 57)

- **Sprint 57** — `Ctrl+E` keyboard shortcut triggers synchronous BOM CSV export from anywhere in the app (App.tsx keyboard handler). Uses `generateParts` + `generateHardware` to build per-cabinet data then calls `downloadBomCsv`. Shows success toast via i18n key `shortcuts.exportBom`. `ShortcutsModal` updated with the new shortcut. (v3.53.67)

### Smart Optimizer — Exhaustive Strategy (Sprint 58)

- **Sprint 58** — Added `'exhaustive'` to the `SmartStrategy` union type. The `exhaustive` strategy aggregates candidates from all six individual strategies and applies standard deduplication and scoring. `stratLabels` and `STRATEGY_ICON` updated. 5 new tests. (v3.53.68)

### PDF Export — Page Size & Orientation (Sprint 59)

- **Sprint 59** — `CabinetPdfDocument` now accepts `pageSize?: 'A4' | 'LETTER'` and `orientation?: 'portrait' | 'landscape'` props. `PdfExportPanel` adds two `<select>` controls for user choice before PDF generation. i18n keys: `pdf.pageSize`, `pdf.pageSizeA4`, `pdf.pageSizeLetter`, `pdf.orientation`, `pdf.orientationPortrait`, `pdf.orientationLandscape`. (v3.53.69)

---

## [3.53.58] — 2026-06-08

### Sprints 41–50 — Domain Intelligence, UX Polish & API Documentation

Covers Sprints 41 through 50 (v3.53.49 → v3.53.58). Each sprint was independently committed; 783 tests passing across 49 test files.

### Optimizer — Grain Conflict UX (Phase 5)

- **Sprint 41** — `grainConflictCount` stat pill in the optimizer toolbar showing total grain conflicts across all sheets, with a tooltip quoting the placement rationale of the first conflicting part. i18n keys: `optimizer.grainConflicts`, `optimizer.grainConflictsTitle`. 5 new tests. (v3.53.49)

- **Sprint 42** — Per-part red triangle grain conflict marker on `PartRect` SVG elements; sheet-level conflict badge on `SheetCard` header when any part on that sheet has a grain conflict. 4 new tests. (v3.53.50)

### Configurator — Material Intelligence (Phase 5)

- **Sprint 43** — `SubstitutionPanel` component in `src/components/configurator/`: collapsible suggestion list with quantitative rationale (deflection reduction %, weight saved per sheet, cost delta %). "Use this" button applies the substitution via `setConfig`. Individual suggestions can be dismissed. `role="region"` + `aria-label`. 5 new tests. (v3.53.51)

### PWA — Service Worker Updates (Phase 3)

- **Sprint 44** — `useSwUpdate` hook (`src/hooks/useSwUpdate.ts`) detects an active `waiting` service worker. `SwUpdateBanner` fixed top-of-page banner with `role="alert"` / `aria-live="polite"` lets users reload into the new version without manual page refresh. i18n keys: `swUpdate.available`, `swUpdate.reload`. 5 new tests. (v3.53.52)

### Validation — Joinery Rules (Phase 5)

- **Sprint 45** — Two new validation rules in `src/engine/validation.ts`:
  - `JOINERY_MAX_SPAN` (warning): fires when shelf width exceeds 900 mm on chipboard/MDF/melamine materials (deflection risk).
  - `JOINERY_MIN_SHELF_GAP` (warning): fires when average shelf-to-shelf gap falls below 150 mm; suggests a reduced shelf count.
  7 new tests. (v3.53.53)

### Optimizer — Part Filter (Phase 5)

- **Sprint 46** — Text filter input in the optimizer toolbar highlights matching parts across all sheets (bold labels, full opacity) while fading non-matches. Same highlight logic applied to legend colour swatches. i18n keys: `optimizer.filterParts`, `optimizer.filterPartsPlaceholder`. (v3.53.54)

### Engine — Templates (Phase 5)

- **Sprint 47** — `pantry` template added to `src/engine/templates.ts`: 600×2000×580 mm, 6 shelves, 2 flat-panel doors, melamine-18 carcass, bar handles, 100 mm kick. `backPanelMaterial` corrected to `mdf-3` (the valid material key). Additional template assertion tests for `bathroom-vanity`, `tv-unit`, and `pantry`; all templates now total ≥ 16. 7 new tests. (v3.53.55)

### Hooks — OS Dark Mode Sync

- **Sprint 48** — `useSystemDarkMode` hook (`src/hooks/useSystemDarkMode.ts`) listens to `window.matchMedia('(prefers-color-scheme: dark)')` change events. When the OS preference changes, the store's `darkMode` is updated only if the user has not manually diverged from the OS (i.e. store value still matches what the OS was before the change). Registered in `App.tsx`. 5 new tests. (v3.53.56)

### Docs — TypeDoc Plugin API

- **Sprint 49** — `typedoc.json` config targets `src/engine/index.ts`; `npm run docs:api` generates HTML docs under `docs/api/` (git-ignored). `@packageDocumentation` JSDoc added to the engine barrel with a usage example. Six missing type re-exports added to barrel (`FurnitureType`, `DrawerSlideType`, `PanelMaterialSource`, `QuantitativeRationale`, `HardwareCost`, `SmartOptimizerOptions`). Pre-existing `grainVertical` property on `Part` test literal fixed (property belongs to `CutRect`). TypeDoc generates with zero warnings. (v3.53.57)

### Infrastructure

- **Sprint 50** — CHANGELOG updated for Sprints 41–50. `gh release v3.53.58` published. 783 tests, 49 test files. (v3.53.58)

## [3.53.48] — 2026-06-07

### Sprints 31–40 — Phase 7 Completion + UX Polish

Covers Sprints 31 through 40 (v3.53.39 → v3.53.48). Each sprint was independently committed; 745 tests passing across 47 test files.

### UX — Loading States (Phase 7)

- **Sprint 31** — `SkeletonPane` animated loading placeholder for lazy panels. `role="status"` / `aria-live="polite"` / `data-testid="skeleton-pane"`. Three `Suspense` fallbacks in `App.tsx` replaced with `<SkeletonPane label={t('skeleton.loading...')} />`. i18n keys added: `skeleton.loading`, `skeleton.loadingOptimizer`, `skeleton.loadingAssembly`, `skeleton.loadingPdf` in both EN and HE. 8 new tests. (v3.53.39)

### Preview — WebGL Evaluation (Phase 7)

- **Sprint 32** — `probeWebGLTier() → 'webgl2' | 'webgl1' | 'unavailable'` in `src/engine/webgl-probe.ts`; `WebGLPreviewCanvas` component renders a rotating 3-D box with per-face warm oak shading via raw WebGL2; falls back to a descriptive `div` when WebGL unavailable. ARCHITECTURE.md updated with WebGL evaluation section. 7 new tests. Phase 7 WebGL evaluation check-off. (v3.53.40)

### Optimizer — Virtual Rendering (Phase 7)

- **Sprint 33** — `useIntersectionVisible<T>` hook + `VirtualSheetWrapper` component defer cut-sheet rendering until visible in the viewport (`IntersectionObserver`). Each `<SheetCard>` in `OptimizerView` is wrapped; reduces initial paint time for large sheet counts. 6 new tests. (v3.53.41)

### Validation (Phase 3)

- **Sprint 34** — `NARROW_BACK_OMITTED` warning rule in `src/engine/validation.ts`: fires when `hasBack === false && width < 400 mm && furnitureType !== 'panel'`. `field: 'hasBack'`, `suggestedValue: 'true'`. 6 new tests. (v3.53.42)

### URL State (Phase 6)

- **Sprint 35** — `compressConfigToBase64` / `decompressBase64ToConfig` in `src/utils/url-state.ts`: base64url-encoded compact form of the URL diff (30–50 % shorter for configs with many non-default fields). Produces a single `?c=` parameter. 8 new tests. (v3.53.43)

### Documentation (Phase 7)

- **Sprint 36** — `docs/USER-GUIDE.md`: complete user guide covering all 5 tabs, keyboard shortcuts, sharing/URL state, dark mode, RTL, tips & troubleshooting. `docs/index.md`: docs navigation portal. README links updated. Phase 7 marketing/docs ROADMAP item checked off. (v3.53.44)

### Export — DXF Layers (Phase 6)

- **Sprint 37** — `materialLayerName(material)` helper in `src/utils/dxf-export.ts` converts material keys to valid DXF layer names (`MAT_PLYWOOD-17`). Parts are now placed on per-material layers instead of the generic `PARTS` layer, enabling material-specific toolpaths in CAM software. Legacy `PARTS` layer retained for compatibility. 8 new tests. (v3.53.45)

### i18n (Phase 4)

- **Sprint 38** — Full i18n key parity audit: 406 EN keys, 406 HE keys, 100 % coverage, 0 empty values. (v3.53.46)

### ROADMAP Check-offs (Phase 2 + 7)

- **Sprint 39** — Checked off Phase 2: `SharedArrayBuffer` zero-copy investigation (done in Sprint 26). Checked off Phase 7: performance benchmarks in README (Sprint 28), WebGL evaluation (Sprint 32), marketing/docs portal (Sprint 36). Full test suite: 745 tests, 47 test files. (v3.53.47)

### Infrastructure

- **Sprint 40** — CHANGELOG updated for Sprints 31–40. `gh release v3.53.48` published. (v3.53.48)

## [3.53.37] — 2026-05-19

### Sprints 22–29 — Phase 4–7 Feature Sweep

Covers Sprints 22 through 29 (v3.53.30 → v3.53.37). Each sprint was independently committed; 704 tests passing across 44 test files.

### Accessibility (Phase 4)

- **Sprint 22** — ARIA-compliant ArrowLeft / ArrowRight / Home / End keyboard navigation within the main `role="tablist"` using the roving-tabindex pattern. Active tab gets `tabIndex={0}`; all others get `tabIndex={-1}`. 5 new tests in `Header.test.tsx`. (v3.53.30)

### Export (Phase 6)

- **Sprint 23** — `generateErpCsv` / `downloadErpCsv` in `src/utils/bom-export.ts` — normalised ERP/MRP/CAM CSV with snake\_case column headers (`part_no`, `material_key`, `area_m2`, `grain_direction`, `unit_weight_kg`). Schema version `bom-erp-csv-v1`. 8 new tests. Phase 6 ROADMAP check-off. (v3.53.31)

### Room Layout (Phase 7)

- **Sprint 24** — `RoomLayout` + `RoomCabinet` interfaces in `src/engine/types.ts`. New `useRoomStore` Zustand store (`src/store/room-store.ts`) with `addCabinetToRoom`, `removeCabinetFromRoom`, `updateCabinetPosition`, `addLayout`, `removeLayout`. 9 new tests. Phase 7 ROADMAP check-off. (v3.53.32)

### Security (Phase 7)

- **Sprint 25** — `Content-Security-Policy` meta tag added to `index.html` (`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'`). Inline SW registration extracted to `public/sw-register.js` to avoid `unsafe-inline` in `script-src`. Phase 7 CSP check-off. (v3.53.33)

### Workers / Infrastructure (Phase 2)

- **Sprint 26** — `trySharedArrayBuffer(size)` + `isSharedArrayBufferAvailable()` utilities in `src/workers/shared-buffer.ts`. Feature-detects `crossOriginIsolated` and returns `null` on GitHub Pages (not cross-origin isolated). ARCHITECTURE.md section added explaining COOP/COEP requirements. 6 new tests. (v3.53.34)

### Tests (Phase 4)

- **Sprint 27** — Playwright visual regression spec `tests/e2e/visual-regression.spec.ts` for 4 core views: configurator default, preview tab SVG, optimizer tab, header in dark mode. `toHaveScreenshot()` with 5 % pixel diff tolerance. Phase 4 ROADMAP check-off. (v3.53.35)

### Documentation (Phase 7)

- **Sprint 28** — Performance benchmarks table added to README (Lighthouse score 97/100, FCP ~0.4 s, LCP ~0.7 s, bundle sizes, cut-optimizer timing). (v3.53.36)
- **Sprint 29** — `MIGRATION.md` created: versioning policy, v3→v4 planned breaking changes, per-sprint migration notes for v3.53.28–v3.53.34, localStorage key registry, and data migration function reference. Phase 7 migration docs check-off. (v3.53.37)



### Sprints 11–18 — Phase 3–7 Feature Sweep

Covers Sprints 11 through 18 (v3.53.11 → v3.53.27). Each sprint was independently committed and tested.

### Accessibility (Phase 4 & 8)

- **Sprint 2** — WCAG AA high-contrast CSS design tokens; `wood-*` token palette extended with forced-colors media query fallbacks.
- **Sprint 3** — Tablet portrait layout fixes; Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) enforced throughout; RTL fixes.
- **Sprint 15** — Focus order and screen-reader narration tests: `ValidationPanel` ARIA attributes, radio group labeling, `fieldset`/`legend` patterns.
- **Sprint 18** — `aria-live="polite"` and `aria-atomic="false"` on validation issue list (`<ul id="validation-issue-list">`); 3 new a11y tests.

### UX and Interactivity (Phase 4)

- **Sprint 1** — Project snapshot diff view with visual side-by-side comparison.
- **Sprint 4** — Focus traps in all modals using `useFocusTrap` hook.
- **Sprint 5** — `TouchGestureTutorial` overlay for mobile/tablet swipe guidance.

### Coverage and Test Hardening (Phase 4)

- **Sprint 6** — Coverage thresholds raised: statements 85%, branches 78%, functions 83%, lines 85%. `eslint-plugin-testing-library` 7.16.2 configured.
- **Sprint 11** — `StorageQuotaBadge` component unit tests (quota usage display, threshold warning).
- **Sprint 16** — Store coverage boost: `toggleHighContrast`, `toggleUnits`, `setSawKerf` (clamping 0–8 mm), `setMaterialPriceOverride`, `setHardwarePriceOverride`, `setHardwareQtyOverride`, `setSheetSizeOverride` (set + null-delete paths). `useFocusTrap` branch coverage: non-last-element Tab, non-first Shift+Tab, empty-items Tab guard, unmount cleanup.

### Domain Intelligence (Phase 5)

- **Sprint 7** — `TALL_CARCASS_NO_SHELF` validation warning: emitted when carcass height > 900 mm with no shelf panel, 5 new tests.
- **Sprint 8** — Per-shelf `maxLoadKg` property; UI load-capacity badge; `validateConfig` extended with overloaded-shelf check.

### Interoperability and Plugin API (Phase 6)

- **Sprint 9** — Machine-readable export metadata schema added to BOM, DXF, G-code, and PDF export bundles (version, generator, timestamp, units).
- **Sprint 10** — Vendor hardware profiles: Blum, Hettich, and Grass named profiles with model numbers, hinge types, and auto-placement hints.
- **Sprint 12** — `PluginContract` interface with `PluginHookContract`, `PluginStability` tiers (`stable` / `experimental` / `deprecated`), and `getPluginContract()` accessor; 7 new tests.
- **Sprint 13** — `PluginRegistryPanel` UI component with enable/disable lifecycle, `aria-label`, i18n EN + HE; 9 component tests.
- **Sprint 17** — `runWithSandbox<T>()` function and `SandboxTimeoutError` class in `src/engine/plugin.ts`; catches plugin exceptions, measures wall-clock time, reports soft-limit violations via `onError`; 9 new tests.

### Export (Phase 7)

- **Sprint 14** — G-code arc interpolation: `circularPocketToGcode(cx, cy, radius, opts?)` emits `G2 I J` full CW arc when `useArcs=true`; falls back to 36-point G1 polygon; 9 new tests.

## [3.52.0] — 2025-07-21

### Production Audit

- Removed dead config files: `.hintrc` (webhint not suitable for React SPA), `.shellcheckrc` (no shell scripts in project).
- Pinned all GitHub Actions to verified stable `@v4` tags (checkout, upload-artifact, download-artifact, cache).
- Fixed accessibility: added `aria-label` with i18n key `optimizer.notesDismiss` on dismiss button in `OptimizationNotesPanel`.
- Fixed Tailwind logical property: `end-5` → `inset-e-5` in `ToastContainer`.
- Rewrote `ROADMAP.md` with expanded competitive benchmark (11 products), harvested best methods, and updated phase completion status.
- Added `secret-scan.yml` workflow action version fix.

## [3.51.0] — 2025-07-21

### Performance and Determinism Release

Optimized memoization, added large-project regression fixtures, and tightened quality gates.

### Performance

- Increased LRU memoization cache from 8 to 16 entries for multi-cabinet projects.
- Eliminated redundant `generateParts` call in `deriveBaseProject` — active cabinet parts are now reused in the `allParts` computation.

### Testing

- Added `LARGE_PROJECT_PARTS` fixture (100 parts simulating 10 kitchen cabinets) for optimizer stress testing.
- Added `OVERSIZED_PART` fixture for graceful handling of unplaceable parts.
- Added 7 new regression tests: placement correctness, yield ≥ 60%, overlap detection, bounds checking, determinism, and oversized part handling.

### Quality Gates

- Tightened coverage thresholds: statements 78%, branches 75%, functions 78%, lines 79% (calibrated to actual project coverage).
- Tightened bundle budget: JS from 2000KB to 1975KB, total from 2100KB to 2075KB (1800KB target deferred to Phase 5 pdf-renderer tree-shaking).

## [3.50.0] — 2026-05-19

### Production Hardening Release

Complete architectural decision audit, tooling cleanup, and production readiness pass.

### Architecture and Planning

- Rewrote `ROADMAP.md` with comprehensive strategic decision audit, competitive benchmark table (Fusion 360, SketchUp+OpenCutList, CutList Optimizer, Polyboard, Cabinet Vision, Onshape, Figma, KCD Software), and harvested best methods.
- Added forward-only phased program plan from v3.50 through v4.0.0.
- Documented persistence evolution roadmap (localStorage → IndexedDB → CRDTs).
- Codified continuous enhancement rules and release quality gate checklist.

### Configuration and Tooling

- Changed tsconfig target/lib from `es2023` to `ESNext` — eliminates VS Code JSON schema validation false positives while maintaining identical runtime behavior (Vite's `build.target: 'es2022'` controls actual output).
- Created `scripts/lighthouse.js` wrapper to redirect Lighthouse CI output to `$TEMP/WoodworkingShop/.lighthouseci` — ensures intermediate artifacts never pollute workspace root.
- Updated VS Code settings to properly suppress progressive-enhancement CSS property warnings (IE-related compat noise eliminated at settings level, not code level).
- Added `css.lint.validProperties` and `css.lint.unknownProperties` settings for intentional modern CSS features.

### Documentation

- Updated README badges: TypeScript 5.8 → 6.0, Vite 6 → 8, tests 280+ → 318+.
- All version indicators now match actual `package.json` dependencies.

### Verification

- `npm run typecheck` — zero errors.
- `npm run lint` — zero warnings.
- `npm run test` — all tests pass.
- `npm run build` — clean production build.

## [3.45.2] — 2026-05-18

### 🔧 Editor Diagnostics Cleanup

- Added `forceConsistentCasingInFileNames: true` to `tsconfig.test.json`.
- Replaced deprecated `flex-shrink-0` with modern `shrink-0` in `TemplatePicker.tsx`.
- Replaced inline `style` on print header with Tailwind utility classes (`float-end`, `font-normal`, `text-[9pt]`).
- Configured VS Code settings to suppress false-positive IE compatibility warnings (our `.browserslistrc` explicitly excludes IE) and vendor prefix noise.
- Removed duplicate `html.validate` entries from `.vscode/settings.json`.

### 🧪 Verification

- `npm run ci` passed (typecheck, lint, markdown lint, format, 318 tests, build, bundle budgets).

## [3.45.1] — 2026-05-18

### ✅ Production Hardening Follow-up

- Fixed `tsconfig.test.json` to use supported TypeScript target/lib values so editor diagnostics and build tooling stay aligned.
- Stabilized Firefox accessibility E2E execution by running axe-heavy checks serially with explicit per-test timeout headroom in `tests/e2e/accessibility.spec.ts`.
- Corrected and tightened documentation around the current toolchain, shared MyScripts tooling ownership, and OS TEMP-only intermediate artifact policy in `README.md`, `ROADMAP.md`, and `docs/ARCHITECTURE.md`.

### 🧪 Verification

- `npm run ci` passed.
- `npm run test:e2e` passed.

## [3.45.0] — 2026-05-18

### 🧭 Roadmap and Architecture

- Rewrote `ROADMAP.md` into a forward-only production program with consolidated legacy references, strategic phase gates, frontend/backend reconsideration, and release quality criteria.
- Added a benchmark comparison table against top-class tools and translated the findings into concrete engineering actions for v3.45.0-v4.0.0.
- Updated stale documentation metadata (`README.md`, `docs/ARCHITECTURE.md`, `docs/SPRINT-HISTORY.md`, `docs/banner.svg`, `.github/CONTRIBUTING.md`) to align with the current stack and test baseline.

### ✅ Quality and Tooling Hardening

- Removed suppression-oriented E2E accessibility filtering and enforced direct violation assertions in `tests/e2e/accessibility.spec.ts`.
- Enabled VS Code CSS/SCSS validators and removed ShellCheck ignore-pattern waivers from `.vscode/settings.json`.
- Replaced disabled markdownlint rules with explicit policy settings and fixed markdown structural violations across docs/templates.
- Fixed Playwright PDF tab smoke test determinism by using explicit tab interaction and unambiguous heading matching.

### ♿ Accessibility Fixes

- Fixed real WCAG contrast defects by upgrading low-contrast `text-wood-400` unit/disclaimer tokens in:
  - `src/components/configurator/DimensionSliders.tsx`
  - `src/components/configurator/SliderInput.tsx`
  - `src/components/configurator/CostEstimatePanel.tsx`
- Verified the full Playwright accessibility suite passes in both Chromium and Firefox.

### 🧪 Verification

- `npm run ci` passed (typecheck, lint, markdown lint, format check, 318 unit tests, build, bundle budgets).
- `npm run test:e2e` passed (16/16 Playwright tests).

## [3.44.0] — 2026-05-18

### 💾 Session Auto-Save

- **No more data loss on refresh** — The entire project state (`cabinets`, `activeCabinetIndex`, `projectName`, `sawKerf`, all price / quantity / sheet-size overrides, labour rate, labour hours, finish cost) is now automatically saved to `localStorage` under the key `woodworkingshop:session` after every state change (debounced 500 ms via `useCabinetStore.subscribe`).
- **Transparent restore on load** — When the app boots with no URL config params (normal refresh / HMR reload), the session is restored from localStorage so all in-progress work survives. A shared URL (with explicit config params) overrides only the active cabinet's config while keeping the rest of the session intact.
- **Forward-compat migration** — Each cabinet config is spread over `DEFAULT_CONFIG` on restore so new fields added in future versions fall back gracefully to their defaults.
- Undo/redo history stacks and derived state (parts, hardware, optimization) are deliberately excluded from the session snapshot — they are too large and are recomputed on restore.

## [3.43.0] — 2026-05-18

### ♿ Accessibility

- **Skip-nav functional** — `<main id="main-content">` now has `tabIndex={-1}` and `className="focus:outline-none"`. The existing skip-to-main link (`href="#main-content"`) in `App.tsx` now correctly moves keyboard focus to the main landmark rather than only scrolling there.
- **Focus restoration on tab switch** — A `useEffect` in `App.tsx` calls `mainRef.current?.focus()` whenever `activeTab` changes (initial render is skipped via `isFirstRender` ref). Keyboard and screen-reader users land at the start of the new panel content (WCAG 2.2 SC 2.4.3 Focus Order).
- **`aria-controls` on tab buttons** — Each tab `<button role="tab">` in `Header.tsx` now carries `aria-controls="main-content"`, correctly expressing the tabpanel relationship to AT.

### 📝 Documentation

- **`ROADMAP.md`** — Gantt chart updated to show all 10 completed sprints (v3.34.0–v3.43.0) with `done` status; new "Session Sprint Block" summary table added; v3.33.0 a11y certification items marked `[x]`; Feature Growth and Pro Features sections labelled ✅ Shipped.

## [3.42.0] — 2026-05-18

### 📝 Documentation

- **`docs/ARCHITECTURE.md` — Accessibility section added** (`## ♿ Accessibility (WCAG 2.2 AA)`): documents the compliance target, axe-core CI gate, focus trap pattern, skip-link, keyboard shortcuts, high-contrast mode, color-blind mode, `prefers-reduced-motion`, `prefers-color-scheme`, ARIA patterns, RTL support, and known limitations.
- **`.github/SECURITY.md` — Accessibility security stance added**: defines a11y violations as quality-blocking issues, documents the axe-core + Lighthouse CI gates, and provides an a11y responsible-disclosure process (public GitHub issue, 14-day/30-day SLA for AA violations).

## [3.41.0] — 2026-05-18

### ✅ Tests

- **`tests/engine/worker-integration.test.ts`** (9 tests): exercises the cut-optimizer sync fallback and `createJsonMemo` integration:
  - `optimization` is always defined and structurally valid regardless of Worker availability
  - optimization grows with cabinet size / kerf
  - `combinedOptimization` equals single-cabinet result for one cabinet and grows for two
  - all `PlacedPart` coordinates are within sheet bounds (y-axis along `sheetLength`, x-axis along `sheetWidth`)
  - `createJsonMemo` wrapping `computeDimensions` returns the same reference on cache hit and a new result on miss

## [3.40.0] — 2026-05-18

### ⚡ Performance

- **Lighthouse CI budget tightened** (`config/lighthouserc.json`):
  - `categories:performance` upgraded from `warn` → `error` (min 0.80 — now a CI blocker)
  - `largest-contentful-paint` tightened from 4 000 ms → **3 000 ms** (`warn` → `error`)
  - `interactive` (TTI) tightened from 5 000 ms → **3 500 ms** (`warn` → `error`)
  - `total-blocking-time` tightened from 500 ms → **400 ms**
  - Added `cumulative-layout-shift` assertion: `warn` at ≤ 0.1
- **`index.html` — CDN preconnect**: added `<link rel="preconnect">` and `<link rel="dns-prefetch">` for `cdnjs.cloudflare.com` (used by react-pdf Twemoji fallback at PDF generation time).

## [3.39.0] — 2026-05-18

### ✨ Enhanced

- **PDF cover page — cabinet count**: when the project contains more than one cabinet, the cover page info box now shows a `Cabinets in project` row (e.g. `3 cabinets`). New `cabinetCount` prop added to `CabinetPdfDocument`.
- **PDF page numbers** (confirmed): every content page already carries a running `Page X / Y` counter in the footer via react-pdf’s `render` callback — documented in changelog.

## [3.38.0] — 2026-05-18

### ✨ Added

- **Bulk material reassignment UI**: when a project has more than one cabinet, an `Apply to all cabinets` underline button appears below each material dropdown in the Material Selector. Clicking it calls the existing `bulkReplaceMaterial` store action, replacing every cabinet's carcass (or back panel) material with the currently-selected one. Shows a toast confirming success or informing the user all cabinets are already uniform. Fully undoable.
- `material.reassignAll`, `material.reassignAllTip`, `material.reassignedAll`, `material.alreadyUniform` i18n keys added to EN + HE.

## [3.37.0] — 2026-05-18

### ✨ Added

- **Multi-project bundle export/import**: new `exportProjectsBundle` and `importProjectsBundle` functions in `project-storage.ts` let users download all saved projects as a single `.cabinet-projects.json` envelope file and re-import it on another device (name-collision-safe, deduplication via `(imported)` suffix).
- **Save/Load panel — Export All / Import Bundle buttons**: two new buttons below the existing Export/Import row trigger the bundle workflow.
- `saves.exportAll`, `saves.importBundle`, `saves.noProjectsToExport`, `saves.exportedAll`, `saves.importedBundle` i18n keys added to EN + HE bundles.

## [3.36.0] — 2026-05-18

### ✨ Enhanced

- **Isometric preview — shelf grain lines**: each shelf top face now shows parallel grain lines (running depth-wise) consistent with the cabinet top panel grain.
- **Isometric preview — side panel grain**: the visible left-side outer panel face now carries horizontal grain lines matching its board direction.
- **Isometric preview — shaker door inner frame**: when the door style is `shaker`, a recessed inset frame rectangle is rendered on each door in the isometric view.

## [3.35.0] — 2026-05-18

### ✨ Added

- **Hardware supplier links**: key hardware items (Euro hinges, mounting plates, hinge dampers, drawer slides, leveller feet) now carry `supplierUrl` + `supplierName` fields. The Hardware List table shows a clickable supplier badge (opens in new tab, `rel="noopener noreferrer"`) next to items that have a reference.
- **`HardwareItem.supplierName`** field added to the domain type for display-friendly supplier names (e.g. `'Blum'`, `'Häfele'`).
- **`hardware.supplier`** i18n key added to EN + HE bundles.

## [3.34.0] — 2026-05-18

### ✨ Added

- **Template SVG mini-previews**: each template card in the Template Picker now shows an 80×60 schematic front-view SVG thumbnail — carcass outline, toe-kick shading, door divider + handle dots (for door styles), or shelf lines (for open/bookshelf styles). Renders in both light and dark mode via `currentColor`.

## [3.33.0] — 2026-07-06

### 🔧 Changed

- **ShellCheck 0.11.0 integration**: installed system-wide via winget; added `.shellcheckrc` at project root (`shell=bash`, `severity=warning`); configured VS Code to ignore YAML/JSON files (GitHub Actions `${{ }}` syntax is not valid Bash — validation handled by the `github.vscode-github-actions` extension instead).
- **CI workflow hardening** (`release.yml`): `cd dist` now uses `cd dist || exit 1` (SC2164 — prevents silent failure if directory is missing); all `>> $GITHUB_OUTPUT` occurrences now properly quoted as `>> "$GITHUB_OUTPUT"` (SC2086).
- **CI workflow hardening** (`ci.yml`): quoted `$GITHUB_OUTPUT` in the Playwright cache-key step (SC2086).
- **VS Code recommendations** (`.vscode/extensions.json`): added `timonwong.shellcheck` and `github.vscode-github-actions` — shellcheck extension uses the system binary; GitHub Actions extension validates workflow YAML natively.
- **Dead config cleanup**: removed `.hintrc` (webhint — no CI runner), `.htmlhintrc` (htmlhint — no CI runner), and WoodworkingShop-local `.npmrc` (caused `npm warn config ignoring workspace config` in npm workspace context).
- **`package.json`**: removed duplicate `bundle:report` alias (same as `bundle:check`); added `engines.node: >=22.0.0` constraint.
- **`tsconfig.test.json`**: added `erasableSyntaxOnly: true` — now consistent with `tsconfig.app.json` and `tsconfig.node.json`.
- **`playwright.config.ts`**: CI E2E runs now use the pre-built `dist/` via `npm run preview` (port 4173) instead of starting the dev server — matches production bundle, faster startup.

### 🛠 Tooling

- 0 errors, 0 warnings, 0 notes from: TypeScript, ESLint, Prettier, markdownlint, ShellCheck, Vitest (309/309 tests), bundle budget checks.

## [3.32.0] — 2026-07-06

### ✨ Added

- **npm workspace integration**: WoodworkingShop now resolves all packages from the shared `MyScripts/node_modules` central registry, eliminating ~420 duplicate packages and reducing local disk footprint to near zero.
- **Rolldown-powered builds** (Vite 8): production build now uses Rolldown (Rust-based bundler), cutting build time from ~6s to ~2s.

### 🔧 Changed

- **TypeScript 6.0.3** (from 5.8.3): updated `tsconfig.json` — continued clean compile with zero type errors.
- **Vite 8.0.13** (from 6.4.2): migrated `manualChunks` from object form (removed in Rollup 4) to function form; added `rolldown-runtime` micro-chunk to bundle budget allowlist.
- **ESLint 10.4.0** (from 9.x): rewrote `eslint.config.js` for new `defineConfig` / `globalIgnores` API; manually registered `eslint-plugin-react-hooks` v7 rules (old-style export no longer wraps in `defineConfig`); removed `eslint-plugin-jsx-a11y` (incompatible with ESLint 10 — accessibility covered by axe-core E2E tests).
- **vitest 4.1.6** (from 3.2.4): all 309 tests pass with no config changes required.
- **i18next 26.0.6 + react-i18next 17.0.4** (from 25.x / 15.x): zero breaking changes in this project; all tests pass.
- **@vitejs/plugin-react 6.0.2** (from 4.x), **tailwindcss 4.3.0**, **zustand 5.0.13**, **@playwright/test 1.60.0**: all upgraded to latest major; all tests and builds clean.
- **eslint-config-prettier 10.1.8**: added to central `MyScripts/package.json` devDependencies; removes all formatting rules that conflict with Prettier.
- **`src/engine/assembly.ts`**: fixed ESLint 10 `no-useless-assignment` rule — 3 final `n++` post-increments before `return steps` changed to `n` (value was never read after the increment).
- **`.npmrc`**: added to both project root and `MyScripts` root with `engine-strict`, `save-exact`, `fund=false`, `audit-level=high`.
- **`.editorconfig`**: extended glob to include `.mjs` and `.cjs` files.
- **`engines.node`**: bumped minimum from `>=20.0.0` to `>=22.0.0` in `package.json`.

### 🗑 Removed

- **`WoodworkingShop/node_modules/`**: local node_modules directory deleted; all packages now resolve from `MyScripts/node_modules` workspace root.
- **`eslint-plugin-jsx-a11y`**: removed from devDependencies (incompatible with ESLint 10).

## [3.31.0] — 2026-05-18

### ✨ Added

- **Comprehensive ROADMAP.md rewrite** with competitive landscape table (10 products compared across 18+ capabilities), architecture decision log, decisions reconsidered audit, production readiness checklist, and continuous enhancement guidelines.

### 🔧 Changed

- **`.vscode/settings.json`**: removed redundant `css.lint.compatibleVendorPrefixes`, `css.lint.vendorPrefix`, `css.lint.unknownProperties` waivers — `css.validate: false` already covers Tailwind 4 projects.
- **`.vscode/settings.json`**: removed `github-actions.workflows.pinned.enabled: false` waiver — extension auth issue, not a code problem.
- **`.hintrc`**: removed disabled `compat-api/css`, `compat-api/html`, `compat-api/js`, `no-inline-styles` hints — browserslist already handles exclusions.
- **`.prettierignore`**: added `coverage/`, `test-results/`, `playwright-report/` to prevent formatting of generated output.
- **Header test**: updated active tab class assertion from `bg-wood-500` to `bg-wood-600` (WCAG AA fix from v3.28.0).

### 🗑 Removed

- **`scripts/fix-wcag.cjs`**: one-shot WCAG contrast fixer already applied; dead code removed.

## [3.30.0] — 2026-06-01

### ✨ Added

- **URL state enhancements** (`src/utils/url-state.ts`, `src/components/layout/Header.tsx`):
  - `paramsToConfig` now clamps all numeric URL parameters (`w`, `h`, `d`, `sc`, `dr`, `drc`, `kh`) to their valid ranges defined in `CONSTRAINTS`, preventing crashes from malformed or malicious shared links.
  - `configToUrl` and the **Copy shareable link** button now include the project name (`?pn=`) so shared links faithfully reproduce the project name for recipients.
  - Clipboard write is now properly `await`-ed with error handling; if `navigator.clipboard` is unavailable the user sees a `toast.linkCopyFailed` message instead of a silent failure.
  - Added `toast.linkCopyFailed` i18n key in EN and HE.

### 🐛 Fixed

- **`smart-optimizer.ts`** (`src/engine/smart-optimizer.ts`, `tests/engine/smart-optimizer.test.ts`):
  - `configFingerprint` was using non-existent fields `cfg.numShelves` and `cfg.numDrawers`; corrected to `cfg.shelfCount` and `cfg.drawerCount`.
  - `buildExplanation` shelf-change detection likewise used `numShelves`; corrected.
  - Matching test descriptions and fixture data updated (`numShelves` → `shelfCount`).

## [3.29.0] — 2026-05-31

> Shipped as part of v3.30.0 release.

### ✨ Added

- URL numeric parameter clamping, project-name preservation in shareable links, and async clipboard error handling (see v3.30.0 above).

## [3.28.0] — 2026-05-30

### ✨ Added

- **Print stylesheet polish** (`src/index.css`):
  - Added `@page landscape-cut { size: A4 landscape; }` and `.print-landscape` class; the optimizer view applies it automatically when any cut sheet exceeds 1500 mm.
  - `.print-only-footer` utility class — hidden on screen, shown in print.
  - `tr { orphans: 3; widows: 3; }` keeps table rows from splitting across pages.
  - `-webkit-print-color-adjust: exact` on SVG elements and `.print-color` so cut diagrams print in colour.
  - Focus rings and tooltips suppressed in print media.

## [3.27.0] — 2026-05-30

### 🧪 Tests

- **Smart optimizer unit tests** (`tests/engine/smart-optimizer.test.ts`):
  - Added tests for `shelf-count-reduce` strategy (decrement, skip-if-fewer-than-2, fingerprint deduplication).
- **Cabinet store tests** (`tests/store/cabinet-store.test.ts`):
  - Added describe blocks for cost extras (`labourRate` default 75, clamp behaviour for `setLabourRate/Hours/FinishCost`), `optimizationPending` toggle, and `setEdgeBandingRate`.
- **Cost estimator tests** (`tests/engine/cost-estimator.test.ts`):
  - Added describe block for labour and finish coat: `labourCost = hours × rate`, defaults to 0, combined `totalCost`.

## [3.26.0] — 2026-05-30

### ✨ Added

- **Smart optimizer: `shelf-count-reduce` strategy** (`src/engine/smart-optimizer.ts`, `src/engine/types.ts`):
  - New strategy suggests reducing shelf count by 1 when `shelfCount ≥ 2`, potentially saving material.
  - `configFingerprint` extended to include `shelfCount`, `drawerCount`, and `doorStyle` so configs that differ only in shelves or drawers are not incorrectly deduplicated.
  - Strategy label added to `buildExplanation` in both EN and HE.

## [3.25.0] — 2026-05-29

### ✨ Added

- **Accessibility E2E gate** (`tests/e2e/accessibility.spec.ts`):
  - New Playwright spec using `@axe-core/playwright` runs WCAG 2.1 AA checks on the homepage and configurator tab.
  - `@axe-core/playwright` added as a dev dependency.
  - `KNOWN_VIOLATIONS_ALLOWLIST` pattern for future targeted suppressions.

## [3.24.0] — 2026-05-29

### ✨ Added

- **Module preload polyfill + code splitting** (`vite.config.ts`, `index.html`):
  - `modulePreload: { polyfill: true }` added to Vite config for cross-browser `<link rel="modulepreload">` support.
  - Manual chunks: `pdf-renderer`, `react-vendor`, `i18n-vendor`, `state-vendor` for better long-term caching.
  - `index.html` preloads `manifest.json` and `icon-192.png`.

## [3.23.0] — 2026-05-28

### ✨ Added

- **Labour hours + finish coat cost** (`src/engine/cost-estimator.ts`, `src/store/cabinet-store.ts`, `src/components/configurator/CostEstimatePanel.tsx`):
  - `estimateCost()` accepts optional `labourRate` (default `$75/hr`), `labourHours`, and `finishCost` parameters.
  - `CostBreakdown` now includes `labourHours`, `labourCost`, `finishCost`.
  - Store gains `labourRate`, `labourHours`, `finishCost` fields and matching actions (all clamp to ≥ 0).
  - `CostEstimatePanel` renders click-to-edit inputs for each; bar chart shows labour (brown) and finish (purple) segments.
  - i18n keys: `labour`, `labourRate`, `editLabourHours`, `editLabourRate`, `labourHoursAriaLabel`, `labourRateAriaLabel`, `finish`, `editFinish`, `finishAriaLabel`, `notSet`.

## [3.22.0] — 2026-05-27

### ✨ Added

- **DXF Web Worker** (`src/workers/dxf-export.worker.ts`):
  - DXF generation for cut sheets now runs off the main thread using a dedicated `?worker` module.
  - Supports `'single'` (one sheet by index) and `'all'` (combined DXF stacking sheets vertically with 100 mm spacing) modes.
  - `OptimizerView` uses the worker with request-ID stale-response cancellation and a sync fallback when workers are unavailable.
  - DXF export button shows a spinner while the worker is running and is disabled during export.

## [3.19.0] — 2026-05-19

### ✨ Added

- **PDF polish** (`src/components/pdf/CabinetPdfDocument.tsx`, `PdfExportPanel.tsx`):
  - Cover page now shows the project name (from the project name field) instead of a hardcoded title.
  - New `includeCover` prop lets callers omit the cover page.
  - `PdfExportPanel` gains an **"Include cover page"** checkbox and uses the project name in the PDF filename.
  - Page numbers (`Page N / Total`) were already in the fixed footer; this sprint confirms and documents that behavior.

## [3.18.0] — 2026-05-19

### ✨ Added

- **Bulk material replacement** (`src/components/optimizer/BulkReplaceModal.tsx`):
  - New modal (opened via the **Replace** toolbar button in the Optimizer) lets users swap any material with another across _all_ cabinets in one click.
  - Shows a summary of how many cabinets will be affected before applying.
  - Operation is fully undoable via the existing undo stack (`Ctrl+Z`).
- **`bulkReplaceMaterial(fromKey, toKey)`** action added to `cabinet-store.ts`; swaps `carcassMaterial` and `backPanelMaterial` on all cabinets.
- i18n keys: `bulkReplace.*` in `en.json` and `he.json`.

## [3.17.0] — 2026-05-19

### ✨ Added

- **Web Worker BOM CSV exporter** (`src/workers/bom-export.worker.ts`):
  - BOM CSV generation now runs off the main thread, preventing UI jank on large multi-cabinet projects.
  - The **BOM** export button in the Optimizer shows `…` and is disabled while exporting.
  - Automatic synchronous fallback for environments without `Worker` support or if the worker errors.
- Imports `triggerDownload` from `src/utils/download.ts` for a clean blob-URL download path.

## [3.16.0] — 2026-05-19

### ✨ Added

- **Multi-project workspace** (`src/utils/project-storage.ts`, `src/components/layout/ProjectManagerModal.tsx`):
  - Save, load, delete, export (JSON) and import (JSON) named projects to/from localStorage.
  - `ProjectManagerModal` provides full CRUD UI with focus trap and ESC-to-close.
  - Header exposes a **folder icon** button to open the modal.

## [3.15.0] — 2026-05-19

### ✨ Added

- **Hardware catalog expansion** (`src/engine/hardware.ts`): H18 Cam Lock Set, H19 Shelf Support Stud 5mm, H20 Corner Brace, H21 Plastic Corner Protector, H22 Wood Screw 3.5×35mm, H23 Sanding Pad Assorted Pack, H24 Edge Banding Iron Trimmer — all with unit prices.
- **Hardware qty overrides** (`hardwareQtyOverrides` in store): editable quantity cells in the hardware table; overridden rows are yellow-tinted.
- `supplierUrl` and `unitPrice` optional fields on `HardwareItem`.

## [3.14.0] — 2026-05-19

### ✨ Added

- **Cabinet template library** (`src/engine/templates.ts`): 12 presets (kitchen-base, kitchen-wall, tall-pantry, wardrobe, wardrobe-sliding, bookshelf, desk, bathroom-vanity, tv-unit, bedside, shaker-kitchen-base, open-display).
- **TemplatePicker modal**: browsable grid of templates; click to apply and set `?tpl=` URL deep-link.
- `readConfigFromUrl()` now merges `?tpl=` param from URL.

## [3.13.0] — 2026-05-19

### ✨ Added

- **Isometric view polish** (`src/components/preview/CabinetPreview.tsx`): interior side walls (visible when doors absent), kick panel, shelf front edges, drawer fronts with handles, grain lines on top face. Accepts `drawerCount`, `drawerHeights`, `kickHeight` props.

## [3.12.0] — 2026-05-18

### ✨ Added

- **High-contrast mode** toggle in header (`IconContrast`); CSS variables under `.high-contrast` class in `index.css`.
- **`prefers-reduced-motion`** CSS block suppresses transitions for users who request it.
- Focus trap utility used in modals (TemplatePicker, ProjectManagerModal).

## [3.10.0] — 2026-05-18

### ✨ Added

- **Shared tooling scaffold** at `MyScripts/.tools/` (one level above this repo): `.nvmrc`,
  `.npmrc`, shared `editorconfig.shared`, `prettierrc.shared.json`, and onboarding `README.md`
  for any sibling project under `MyScripts/` to inherit.
- **`.nvmrc` at repo root** — pins Node 22 LTS for `nvm` / `nvm-windows` / Corepack.
- **Auto-sync of service worker version**: new `scripts/sync-sw-version.js` runs as
  `prebuild`, copying `package.json.version` into `public/sw.js` `APP_VERSION`. No more
  drift; the PWA cache key is always correct on release.
- **`docs/SPRINT-HISTORY.md`** — archive of completed sprint plans (v2.7.0 → v3.9.x),
  freeing `ROADMAP.md` to be a forward-looking, production-grade roadmap.
- **Expanded competitive landscape** in `ROADMAP.md` — adds Fusion 360 and three new
  capability rows (shelf deflection, drawer slide configurator, plugin API) to the
  comparison matrix, plus a "What we harvest from the leaders" section.

### 🔄 Changed

- **`ROADMAP.md` rewritten** as a clean forward roadmap with: vision pillars, forward
  Gantt timeline (v3.10 → v4.0), release-by-release theme table, production readiness
  checklist, Architecture Decision Log, shared tooling section, and an explicit
  intermediate-files / `$TEMP` convention.
- **CI Lighthouse step** now invokes `npm run lighthouse` (which uses
  `--config=config/lighthouserc.json`) so the relocated Lighthouse config is honoured.
- **`.vscode/settings.json`** — removed `css.lint.unknownVendorSpecificProperties`,
  `compatibleVendorPrefixes`, and `ieHack` `"ignore"` waivers. Production-relevant CSS
  diagnostics now surface.
- **`.editorconfig`** — removed dead PowerShell (`*.ps1` / CRLF) section; this is a
  JS/TS-only project.
- **`.htmlhintrc`** — re-enabled `doctype-first: true` and `title-require: true`. Both
  pass against the current `index.html`.
- **`.markdownlint.json`** — removed the `MD060: false` waiver (rule renamed and never
  applied at this version anyway). MD013 (line length) and MD041 (first line h1) remain
  intentionally off with documented rationale.

### 🐛 Fixed

- **PWA cache key drift** at the build pipeline level: previously a release could ship
  with a stale `APP_VERSION` if a contributor forgot to update `public/sw.js`. The new
  `prebuild` hook makes this impossible — the SW version is regenerated from
  `package.json` on every build.
- **CI Lighthouse regression** after relocating `lighthouserc.json` into `config/`: the
  default `lhci autorun` invocation no longer found the config. Fixed by routing the
  workflow through `npm run lighthouse`.

### 🧪 Tests

- 288 unit tests passing across 23 files; 0 ESLint warnings; 0 markdownlint errors;
  Prettier clean; bundle budgets green.
- Production build verified end-to-end with the new prebuild hook in place.

## [3.9.2] — 2026-05-18

### 🔄 Changed

- **Service Worker** (`public/sw.js`): bump `APP_VERSION` from `3.0.0` to `3.9.2` so the PWA
  cache key matches the current release; old stale caches are evicted on the next visit.

### 🧪 Tests

- Full production build verified: 268 modules, bundle within all budgets
  (JS 1887 KB / 2000 KB, CSS 37 KB / 100 KB, total 1936 KB / 2100 KB).
- All 9 dist files present: `index.html`, `404.html`, `sw.js`, `manifest.json`,
  `favicon.svg`, `icon-192.png`, `icon-512.png`, `robots.txt`, `sitemap.xml`.
- 288 unit tests passing (23 test files), 0 ESLint warnings, 0 markdownlint errors.

## [3.9.1] — 2025-05-17

### ✨ Added

- **Emoji visual improvements** across all documentation files for better GitHub readability.

### 🔄 Changed

- **CHANGELOG.md**: section headers across all 13 versions now use ✨/🔄/🐛/🧪/🗑️ emojis
  (`### ✨ Added`, `### 🔄 Changed`, `### 🐛 Fixed`, `### 🧪 Tests`, `### 🗑️ Removed`).
- **README.md**: tech stack table updated with per-row technology emojis (⚛️ React, 🔷 TypeScript,
  🎨 Tailwind, 🐻 Zustand, 📄 PDF, 🌐 i18n, ⚡ Vite, 🧪 Vitest, 🎭 Playwright, 🧹 ESLint/Prettier,
  🤖 GitHub Actions, 🚀 GitHub Pages); fixed broken `U+FFFD` replacement character in
  `## GitHub Topics & Discoverability` heading.
- **ROADMAP.md**: sprint 174–181 topic emojis and section header emojis
  (📅 Release Timeline, 🔮 Future, 🏆 Competitive Landscape).
- **CONTRIBUTING.md**: subsection header emojis (🔷 TypeScript, 🎨 Style, 🌐 i18n, ⚙️ Engine vs UI).

## [3.9.0] — 2026-06-02

### ✨ Added

- **Three-tier shelf deflection rating** (Sprint 173) — `computeShelfDeflection()` now returns
  a `deflectionRating` field (`'safe'` / `'warning'` / `'danger'`) in addition to the existing
  `overLimit` boolean. The amber zone covers L/360–L/240 and the red zone covers > L/240 per
  furniture serviceability standards. `DerivedDimensions` gains a `shelfDeflections` array
  (one entry per shelf) populated by `computeDimensions()`, making the ratings available to
  every consumer without re-running the calculation. i18n: `shelves.deflectionSafe` and
  `shelves.deflectionDanger` keys added to `en.json` and `he.json`. 13 new tests.

### 🔄 Changed

- **ESLint ecmaVersion** raised from `2020` → `2023` to match TypeScript target ES2023.
- **Vitest coverage** expanded to include `src/store/**` and `src/hooks/**`; excluded
  non-executable files (`types.ts`, `index.ts`, `download.ts`, `useTouchGestures.ts`);
  thresholds raised to 80/75/75/80 (statements/branches/functions/lines).
- **Vite config** — added `resolve.alias {'@': './src'}` path alias and explicit
  `build.target: 'es2022'`.
- **Lighthouse CI** upload changed from anonymous `temporary-public-storage` to deterministic
  `filesystem` output in `.lighthouseci/`.
- **Config files** `lighthouserc.json` and `bundle-budget.json` moved to `config/` subdirectory.

### 🐛 Fixed

- **AssemblyGuide.tsx** — ternary expression used as statement replaced with `if/else`
  to satisfy `@typescript-eslint/no-unused-expressions`.
- **ShortcutsModal.tsx** — backdrop converted to accessible `<button>` element; dialog
  `<div>` properly uses `role="dialog" aria-modal="true"` without click-event violations.
- **Tables.tsx** — `aria-sort` attribute moved from `<button>` to its parent `<th>` element
  (WAI-ARIA spec requires `aria-sort` on `columnheader` role).
- **ESLint** — added `coverage` to `globalIgnores` to prevent generated Istanbul/v8 files
  from triggering unused-disable-directive warnings.
- **Prettier** — all markdown, YAML workflow files, and source files reformatted to ensure
  `format:check` passes cleanly.

## [3.8.0] — 2026-05-18

### ✨ Added

- **Saw Passes stat card** (Sprint 164) — a fifth stat card "Saw Passes" appears in
  the Optimizer summary row, showing the total number of unique cut lines across all
  sheets (mapped from `optimizer.cuts`).
- **Per-material sheet size overrides** (Sprint 165) — users can edit the sheet width
  and length for each material key directly in the Material Summary table inside the
  Optimizer tab. Overrides are stored in `sheetSizeOverrides` in the Zustand store
  and passed to `optimizeCutSheets()` as an optional third parameter. A reset button
  restores the default size for that material.
- **PWA share button** (Sprint 166) — a "Share Link" button in `SaveLoadPanel` calls
  the native Web Share API (`navigator.share`) when available, with a
  `navigator.clipboard.writeText` fallback that copies the URL to the clipboard.
- **Grain direction column in BOM CSV** (Sprint 167) — the exported Bill of Materials
  CSV now includes a `Grain Direction` column for every part row (`Along length` for
  materials with grain, `—` otherwise). All separator rows were updated to match the
  new 11-column width.
- **Alt+D keyboard shortcut for dark mode** (Sprint 168) — pressing `Alt+D` anywhere
  in the app toggles dark mode. The shortcut is listed in the Keyboard Shortcuts help
  modal.
- **Step count in Assembly Guide title** (Sprint 169) — the Assembly Guide heading
  now shows a secondary count badge, e.g. "Assembly Guide (12 steps)", keeping the
  user oriented without having to page through all steps.
- **Print-only project header** (Sprint 170) — a hidden `div.print-only-header` is
  injected at the top of the page containing the project name and current date. It is
  invisible on screen and becomes visible only when printing, giving printed sheets a
  proper title and date stamp.
- **Sortable columns in Parts Table** (Sprint 171) — clicking any column header in
  the Optimizer Parts Table sorts the rows by that column. Clicking the same header
  again reverses direction. An up/down arrow indicates the active sort column and
  direction. Sort is client-side (no re-optimization needed).
- **Material color swatches in selector** (Sprint 172) — a small 16×16 px colored
  square swatch (sourced from the material's `color` property) appears next to the
  Carcass and Back Panel label in `MaterialSelector`, giving an immediate visual
  preview of the selected material finish.

## [3.7.0] — 2026-05-17

### ✨ Added

- **Drawer slide type selection** (Sprint 154) — new `drawerSlideType` field
  (`'standard' | 'soft-close' | 'full-extension'`) on `CabinetConfig`. When
  `drawerCount > 0`, a radio group in `DrawerConfig` lets the user choose the slide
  type. Hardware list emits the correct slide name and adds an H17 soft-close damper
  (one per drawer) when `soft-close` is selected. URL state encodes `dst=` param.
- **Material density and panel weight estimation** (Sprint 155) — all 13 built-in
  materials now carry a `densityKgM3` property. New engine function
  `computePartWeightKg(l, w, t, qty, density)` computes kg from mm dimensions.
  `CostEstimatePanel` shows an "Estimated panel weight" line (e.g. `~12.4 kg`)
  computed across all cabinets in the project. Custom material editor defaults to
  `680 kg/m³`.
- **Export filenames use project name** (Sprint 156) — all DXF, G-code, BOM CSV, and
  hardware CSV downloads now use the current project name as filename prefix (e.g.
  `my-kitchen-bill-of-materials.csv`). Per-sheet files also include the prefix. Falls
  back to `'cabinet'` when no name is set.
- **Project name persisted in URL** (Sprint 157) — `setProjectName()` now calls
  `pushProjectNameToUrl()` which writes a `pn=` query param into the current URL
  without clearing other params. On store init, `readProjectNameFromUrl()` restores
  the name from the URL. `pushConfigToUrl()` preserves the `pn=` param across config
  changes.
- **Assembly hardware checklist** (Sprint 158) — a "Hardware Checklist" card at the
  bottom of the Assembly Guide lists all hardware items with interactive checkboxes.
  Checked items get a strikethrough style; when all items are ticked a "ready to
  assemble" confirmation appears. Print-friendly (checkboxes visible on paper).
- **100 mm scale bar on cut sheets** (Sprint 159) — each cut-sheet SVG now shows a
  small 100 mm reference bar with end-ticks and a label in the bottom-right margin
  area, making printed sheets immediately measurable.
- **Material usage summary panel** (Sprint 160) — a new collapsible table above the
  Shopping List in the Optimizer tab groups all sheets by material and thickness,
  showing sheet count, total area in m², and estimated cost per material type.
- **Cabinet notes in assembly guide** (Sprint 161) — when the active cabinet has
  notes set (via the project panel), a highlighted amber banner shows them at the top
  of the Assembly Guide page, both on screen and when printing.
- **Weight column in BOM CSV** (Sprint 162) — the exported Bill of Materials CSV now
  includes a `Weight (kg)` column for every part row. The material summary section
  also gains a weight column showing total kg per material.

### 🐛 Fixed

- **banner.svg broken by orphaned content** (Sprint 156) — the file contained a full
  1200×220 SVG followed by raw elements from an old 900×160 version outside any
  `<svg>` root, making it invalid XML. The orphaned block was removed. Version badge
  updated to v3.7.0.
- **i18n key parity** — `assembly.partsInStep` was present in `en.json` but missing
  from `he.json`; added Hebrew translation.

## [3.6.0] — 2026-05-17

### ✨ Added

- **SVG icon library** (Sprint 146+graphics) — new `src/components/layout/Icons.tsx`
  with 40+ inline SVG icon components (`IconSun`, `IconMoon`, `IconUndo`, `IconRedo`,
  `IconPrint`, `IconDownload`, `IconScissors`, `IconHammer`, `IconCabinet`, and more).
  All emoji and text-glyph buttons across the app replaced with proper SVG icons for
  accessibility, consistency, and high-DPI rendering.
- **Part name labels in cut sheets** (Sprint 146) — a "Labels" toggle button in the
  Optimizer toolbar switches `showPartNames` state. When enabled, each cut-sheet rect
  that is large enough (>12 mm wide, >16 mm tall) shows the abbreviated part name as
  a third text element inside the SVG rect, above the existing ID and dimensions text.
- **Enriched SVG cut sheet visualization** (Sprint 146+graphics) — viewBox expanded
  with 18 mm margin on all sides; ruler tick marks (every 100 mm, major at 500 mm)
  along top and left edges with numeric labels; sheet dimension labels; rounded rect
  corners; per-part drop shadow via `feDropShadow` SVG filter.
- **Usable offcuts panel** (Sprint 147) — a collapsible "Usable Offcuts" section in
  the Optimizer tab computes free right-side and bottom strips (≥100×100 mm) per
  sheet and lists them grouped by material, sorted largest-first, showing dimensions
  and area in m².
- **Hardware price overrides** (Sprint 148) — each hardware item in `CostEstimatePanel`
  now shows its per-item subtotal as a clickable button opening an inline price editor.
  Overridden prices are highlighted in amber. `estimateCost()` accepts a new
  `hardwarePriceOverrides` map; H-id price table (`H01`–`H10`) added to match real
  hardware IDs from `generateHardware()`.
- **Shopping list panel** (Sprint 150) — a new collapsible "Shopping List" panel in the
  Optimizer tab groups sheets by material, shows quantity and total cost (using current
  price overrides), and provides a supplier-order-ready summary with grand total.
- **Print cut sheets** (Sprint 151) — a "Print" button in the Optimizer toolbar calls
  `window.print()`. Enhanced `@media print` CSS with `[data-print-sheets]` attribute
  selector forces each sheet card onto its own page and hides analysis panels.
- **Project name field** (Sprint 152) — a free-text "Project Name" input at the top of
  `SaveLoadPanel` stores the name in `CabinetState.projectName`. The document `<title>`
  updates reactively (`<name> — Cabinet Planner`). The name is also used as the JSON
  export filename prefix.

### 🐛 Fixed

- **Drawer-parts tests** (Sprint 144) — `drawer-parts.test.ts` updated to use
  `.filter()` + `.includes()` for flexible part-name matching after the engine
  switched to indexed part names (`Bottom-0`, `Bottom-1` etc.).
- **Pre-existing compile error** — `SheetCard` prop type `t` widened from
  `(key: string) => string` to `(key: string, opts?: Record<string, unknown>) => string`
  to allow the interpolated `sheetWasteCost` translation call.
- **Hardware cost calculation** — `HARDWARE_PRICES` table now includes H-id aliases
  (`H01`–`H10`) matching the actual IDs emitted by `generateHardware()`, so hardware
  cost is no longer always 0.

## [3.5.0] — 2026-05-20

### ✨ Added

- **Custom material inline edit** (Sprint 134) — the custom materials list now
  shows a ✎ pencil button on each row that opens an inline edit form. All
  fields (name EN/HE, thickness, price, grain, kerf) are editable without a
  modal; Save / Cancel buttons confirm or discard the change. Tailwind v4
  `block flex` conflict resolved by removing `block` from label classNames.
- **Cabinet notes field** (Sprint 135) — each cabinet tab has a collapsible
  "Notes" area with a freeform textarea persisted in `CabinetEntry.notes`.
  Notes are included in BOM CSV exports as a comment row before the part list.
- **Configurable saw kerf** (Sprint 136) — a numeric input (0–8 mm, default
  4 mm) in the Optimizer tab controls how much material the blade removes
  per cut. The value is stored as `sawKerf` in the project state, passed
  through `optimizeCutSheets()`, and included in all yield calculations.
- **Hardware CSV export** (Sprint 137) — a new 🔧 Hardware button in the
  Optimizer header calls `downloadHardwareCsv()`, generating a CSV listing
  every hardware item (hinges, shelf pins, drawer slides, etc.) across all
  cabinets with ID, localised name, cabinet, quantity, and unit columns.
- **Total part count stat** (Sprint 138) — the Optimizer stats grid now shows
  four metrics: sheets used, overall yield, waste area, and total part count
  across all sheets.
- **Earliest-sheet packing fix** — the MaxRects bin-packer now always fills
  earlier sheets first before opening a new one.
  `SHEET_PREFERENCE_PENALTY = 1e12` per sheet index ensures the geometric
  BSSF score never beats the penalty of jumping to a fresher sheet.
- **OptimizationNotesPanel** — a new always-visible amber panel in the
  Optimizer tab auto-computes dimension / material suggestions with a
  configurable tolerance slider (2–60 mm). Each suggestion shows savings
  badges (sheets saved, yield gain, waste reduced) and Apply / Dismiss
  buttons; dismissed suggestions are tracked per session with a Restore link.
- **Material price overrides** (Sprint 139) — clicking any sheet-cost subtotal
  in the Cost Estimate panel opens an inline number input to override that
  material's price per sheet. Overrides are stored in `materialPriceOverrides`
  in the project state and highlighted in amber to distinguish them from
  catalogue defaults. A ↺ reset button removes the override.
- **Configurable edge-banding rate** (Sprint 141) — clicking the edge-banding
  cost line opens an inline input (₪/m) to adjust the rate used in cost
  calculations. Default remains ₪3/m; the value is stored as `edgeBandingRate`
  in the project state.
- **ROADMAP Mermaid timeline** (Sprint 142) — a `timeline` diagram at the top
  of `ROADMAP.md` charts all releases from v2.7.0 through v3.5.0 with key
  feature highlights per version.

### 🐛 Fixed

- **i18n key parity** — added `cost.editPrice`, `cost.resetPrice`, and
  `cost.editEbRate` to both `en.json` and `he.json` so the key-parity test
  continues to pass.

## [3.4.0] — 2026-05-19

### ✨ Added

- **OS dark-mode auto-detect** (Sprint 124) — `detectOsDarkMode()` reads
  `prefers-color-scheme` at startup so the app launches in the correct theme
  without requiring a manual toggle. A `matchMedia` listener in `main.tsx`
  keeps the store in sync when the OS theme changes at runtime (only when no
  saved preference exists in localStorage).
- **Cabinet duplication** (Sprint 125) — a ⧉ duplicate button appears next to
  each cabinet name in the project panel. Clicking it inserts an identical copy
  immediately after the source, with a `"Name (copy)"` / `"Name (copy 2)"` name
  to avoid collisions. The action is undoable via Ctrl+Z.
- **Assembly guide print button** (Sprint 127) — a 🖨 Print button in the
  assembly guide header calls `window.print()`. The print button and view-mode
  toggle are hidden via `print:hidden`; in paginated mode a hidden-on-screen
  div renders all steps so every step appears on paper regardless of which step
  is currently active. `data-assembly-step` / `data-assembly-controls`
  attributes enable precise CSS targeting.
- **BOM material area summary** (Sprint 128) — `generateBomCsv()` now prepends
  a Material Summary section to every exported CSV showing total panel area (m²)
  and nominal board-feet per material group, making material ordering easier.
- **Per-sheet waste cost badge** (Sprint 129) — when a material has
  `pricePerSheet` set, each cut-sheet card in the Optimizer tab displays an
  amber "Waste cost: ₪X.XX" badge calculated as
  `pricePerSheet × (1 − yieldPercent / 100)`.
- **Kick height quick-select presets** (Sprint 130) — four preset buttons
  (0 / 75 / 100 / 150 mm) appear below the toe kick slider for cabinet and
  wardrobe furniture types, with the active preset highlighted.
- **Grain direction legend row** (Sprint 131) — cut-sheet cards for
  grain-sensitive materials (plywood, OSB) now show a ↕ legend line reminding
  the user that parts were not rotated 90°.
- **ARCHITECTURE.md sprint timeline** (Sprint 132) — new Mermaid `timeline`
  diagram in `docs/ARCHITECTURE.md` summarising major feature milestones from
  v3.0.0 through v3.4.0 across four release sections.

### 🔄 Changed

- **Shelf span deflection warning** (Sprint 126) — `computeShelfDeflection()`
  in `dimensions.ts` uses the Euler-Bernoulli beam formula
  (δ = 5wL⁴/384EI, load 0.05 N/mm, limit L/360) with material-specific elastic
  modulus values. `ShelfConfig` shows an amber alert when the calculated sag
  exceeds the limit.
- `package.json` version bumped 3.3.1 → 3.4.0.

### 🐛 Fixed

- `ConfiguratorPanel.test.tsx` — `getByText(/height/i)` and `getByText(/reset/i)`
  updated to `getAllByText(...)` after new UI elements (Toe Kick Height label,
  Reset section legend) introduced ambiguous matches.

### 🧪 Tests

- 263 unit tests across 23 files, all passing.
- New tests: `detectOsDarkMode`, `duplicateCabinet`, `computeShelfDeflection`,
  BOM material area summary (area m², board-feet, aggregate across cabinets).

## [3.3.0] — 2026-05-18

### ✨ Added

- **Grain direction constraint** (Sprint 115) — new `hasGrain: boolean` field on
  `Material`. Plywood-17/18/4 and OSB-18 are grain-sensitive; MDF, melamine,
  chipboard, HDF, and glass are not. The cut optimizer's `packMaxRects` now
  accepts an `allowRotation` param and skips 90° part rotations for grain-
  sensitive materials. A "↕ grain" badge appears on affected cut sheets in
  `OptimizerView`.
- **Configurable toe kick / plinth** (Sprint 116) — new `kickHeight: number`
  field on `CabinetConfig` (default 100 mm for cabinet/wardrobe, 0 for
  desk/bookshelf). Generates 3 toe-kick parts (front + 2 sides) when non-zero.
  Assembly guide gains a toe-kick attachment step. The 2D front view renders a
  translucent kick strip at the base. URL-serialised as `kh=`.
- **Quick Presets panel** (Sprint 117) — new `PresetsPanel` component with 6
  one-click starter templates: Kitchen Base (600×720×550), Kitchen Wall Unit
  (600×700×300), Tall Pantry (600×2000×550), Bookcase (800×1800×300), Double
  Wardrobe (1200×2200×600), and Bathroom Vanity (800×850×450). Inserted at the
  top of the Configurator panel.
- **PNG export from preview** (Sprint 118) — `downloadPng()` helper rasterises
  the active SVG view at 2× scale via the Canvas API, producing a high-res PNG.
  A "⬇ PNG" button sits alongside the existing "⬇ SVG" button in the preview
  tab bar.
- **Keyboard shortcuts modal** (Sprint 119) — new `ShortcutsModal` listing all
  11 keyboard shortcuts (Alt+1–5 for tabs, Ctrl+Z/Y undo/redo, Ctrl+P print,
  `?` to open the modal). Press `?` anywhere or click the `?` button in the
  Header. The modal is accessible: `role="dialog"`, `aria-modal`, Escape to
  close, backdrop-click to close.
- **Per-drawer custom heights** (Sprint 120) — new `drawerHeights?: number[]`
  on `CabinetConfig`. When `drawerCount > 0` the Drawer Config section shows a
  SliderInput per drawer (80–250 mm soft range, 50–500 mm hard range, 5 mm
  steps). Parts generation now uses `drawerHeights[i] ?? 150` per drawer. URL-
  serialised as `dh=` (comma-separated mm values).
- **Maskable PWA icons** (Sprint 121) — `public/manifest.json` now includes
  separate `"purpose": "maskable"` entries for icon-192.png and icon-512.png,
  satisfying the Lighthouse PWA maskable-icon audit.
- **Playwright PDF panel test** (Sprint 122) — new behavioral e2e test in
  `tests/e2e/smoke.spec.ts`: navigates to the PDF tab (Alt+5), asserts the
  "Generate PDF" heading and button are visible and enabled, and that the
  content-summary section lists parts and cut sheets.
- **`apple-touch-icon` meta link** — added to `index.html` for iOS home-screen
  add-to-homescreen support.
- **`.browserslistrc`** — documents the modern-browser-only target
  (last 2 Chrome / Firefox / Safari / Edge, no IE) for compatibility tooling.

### 🔄 Changed

- **Mermaid 8.8.0 compatibility** — all 6 Mermaid diagram blocks across
  `README.md`, `docs/ARCHITECTURE.md`, and `.github/CONTRIBUTING.md` updated:
  emojis removed from node labels, `\n` replaced with spaces/colons, middle-dot
  `·` replaced with commas, `<br/>` in flowchart nodes replaced with comma-space.
- **CabinetPreview tablist fix** — `role="tablist"` moved to an inner `<div>`
  wrapping only the `role="tab"` view buttons; the Dimensions checkbox, SVG/PNG
  export buttons, and zoom reset are now proper siblings outside the tablist,
  correcting an ARIA ownership violation.
- **CabinetSelector rename input** — added `aria-label="Cabinet name"` to the
  inline rename `<input>`, resolving a form-control-without-label a11y warning.
- **GitHub repo docs** — `docs/banner.svg` (wood-themed SVG banner), full README
  rewrite with feature tables and tech stack, enhanced `CONTRIBUTING.md` and
  `SECURITY.md`, enriched `ARCHITECTURE.md` with section headers and 4 diagrams,
  YAML issue templates replacing plain Markdown forms.
- `package.json` version bumped 3.2.0 → 3.3.0.

### 🧪 Tests

- 249 unit tests across 23 files, all passing.
- New Playwright e2e test: PDF panel renders and generate button is enabled.

## [3.2.0] — 2026-05-17

### ✨ Added

- **2D preview dimension polish** (Sprint 114) — dimension lines throughout the
  2D preview (front, open-front, side, top, back) and the isometric 3D view now
  use `currentColor` so they adapt to the active colour theme (dark / light /
  high-contrast). Arrow-heads replace plain tick marks for standard drafting
  appearance. All labels now use the active unit system (`mm` or fractional
  inches) via `formatDim`. The open-front view adds per-bay height annotations
  in the cleared shelf compartments, making unequal shelf spacing easy to verify
  visually.
- **Optimizer yield-meter Playwright test** (Sprint 105) — behavioural e2e
  asserting the cut-sheet optimizer renders an accessible `<meter>` per sheet
  with a sane `aria-valuenow` in `[0, 100]`. Pixel-free, OS-font-stable.
- **Per-asset bundle budgets** (Sprint 106) — `bundle-budget.json` now exposes
  `perAssetKB` for PNG/SVG/ICO files; `scripts/bundle-report.js` checks each
  static asset against its limit. Favicon optimised with svgo (-40 % → 817 B).
- **MaxRects optimizer Mermaid diagram** (Sprint 107) — new flowchart in
  `docs/ARCHITECTURE.md` visualising the v3.1 MaxRects/BSSF packer pipeline.
- **2D preview scale bar** (Sprint 108) — every cabinet preview SVG now
  renders a labelled mm/m scale bar in the bottom-left corner, snapping to
  50 / 100 / 200 / 500 / 1000 / 2000 mm depending on viewport width.
- **Localised skip-link and main-landmark** (Sprint 109) — `a11y.skipToContent`
  and `a11y.mainWorkspace` keys for EN and HE; the skip-link target now uses
  i18n instead of a hardcoded English string.
- **Lazy-load Optimizer and Assembly routes** (Sprint 110) — both panels are
  now `React.lazy`/`Suspense` code-split into their own chunks (~13 KB each),
  keeping the initial entry bundle leaner alongside the existing PDF chunk.
- **Print stylesheet polish** (Sprint 111) — `@page A4 12mm`, forced-light
  override of the dark theme on paper, break-after/avoid hints for headings,
  `break-inside: avoid` for SVGs, new `.print-page-break` utility class.
- **Persistent unit preference + Header unit toggle** (Sprint 112) — `units`,
  `darkMode`, and `colorBlindMode` now survive reload via a small
  `woodworkingshop:prefs` localStorage layer in `cabinet-store`. The Header
  ships a dedicated mm / in toggle button.
- **Hardware library expansion** (Sprint 113) — soft-close hinge dampers
  (H13), silicone door bumper pads (H14), cabinet leveller feet (H15),
  edge-banding rolls (H16), and drawer slides now scale to cabinet depth
  via the nearest standard length (250–600 mm).
- **Assembly Guide "Show all stages" mode** — toggle group lets users
  switch between paginated and stacked-all-cards views; ideal for short
  builds and full-guide printing.
- **Custom shelf position editor** — picking the "Custom" shelf-spacing
  radio now reveals an editable grid of per-shelf mm inputs (seeded from
  equal spacing, clamped to internal height, sorted on blur) plus a
  "Reset to equal spacing" button.

### 🔄 Changed

- `package.json` version bumped 3.1.0 → 3.2.0.
- Tests: 252 → 258 passing across 23 files.

## [3.1.0] — 2026-05-15

### ✨ Added

- **Slider free-text numeric entry** (Sprint A1) — every dimension slider (width,
  height, depth, shelves, drawers, door reveal) now has a paired number input
  accepting values outside the slider's visual range up to engine hard limits,
  with inline mm/in validation. New `SliderInput` and rewritten `DimensionSliders`.
- **Optional cabinet back panel** (Sprint A2) — new `hasBack` config flag with a
  Configurator toggle. Back is omitted from parts, BOM, cost estimate, PDF and
  assembly guide when disabled; assembly substitutes a "square the carcass" step.
  Round-trips through shareable URL (`?hb=0`).
- **Maximal Rectangles cut optimizer** (Sprint A3 part 1) — replaces strip-FFD
  packer with a Best-Short-Side-Fit MaxRects implementation that tries free
  rectangles on all existing sheets in both orientations before opening a new
  one. Fixes the 2400×800×100 12-shelf bookshelf "40% + 8% across two sheets"
  case to fit on one sheet.
- **Per-sheet yield bars + advisory banners** (Sprint A3 part 2) — each cut sheet
  shows a color-coded utilisation bar (red <33%, amber <66%, green ≥66%). The
  view now surfaces a low-yield warning when any sheet falls below 25% and a
  material-swap hint when two sheets share thickness but use different materials.
- **Auto-landscape PDF cut sheets** (Sprint A4) — cut-sheet pages in the exported
  PDF rotate to A4 landscape when the sheet is wider than tall, so 2440×1220
  panels fill the page instead of being cramped.
- **Woodworking favicon + og:image** (Sprint A5) — replaces the placeholder
  purple "Z" icon with a cabinet glyph (gradient carcass, inset doors, brass
  knobs, grain hints) and adds `og:image` / `twitter:image` meta tags so link
  previews on social platforms render correctly.
- **gitleaks secret scanning** (Sprint 84) — `.gitleaks.toml` + GitHub Actions
  workflow `secret-scan.yml` runs on every push, PR, and weekly schedule.
- **Competitive landscape table** (Sprint 85) — ROADMAP.md now compares Cabinet
  Planner against nine cabinet/cut-list tools across sixteen capability axes.

### 🐛 Fixed

- **Dark mode toggle had no effect** — Tailwind 4 defaults to `prefers-color-scheme`
  for the `dark:` variant; added `@custom-variant dark` in `index.css` and an
  `<html>.dark` class sync in `App.tsx` so the user-controlled toggle actually
  switches themes.

### 🧪 Tests

- 252 unit tests across 23 files (was 249); added bookshelf cut-optimizer
  regression test and two `hasBack` tests.

## [3.0.0] — 2026-04-20

### ✨ Added

- **Cost estimator tests** — 11 tests covering sheet costs, grouping, edge banding, hardware pricing, waste calc, zero-sheet edge case, bilingual names
- **BOM export tests** — 10 tests covering CSV headers, EN/HE values, hardware section, multi-cabinet, empty array, comma/quote escaping, unknown material fallback
- **Local storage tests** — 9 tests with custom in-memory localStorage mock for `loadSavedConfigs`, `saveConfig`, `deleteSavedConfig`
- **i18n key parity test** — 5 tests verifying en.json/he.json identical key structure, count, no missing keys, all leaf values non-empty
- **Bundle analysis script** (`scripts/bundle-report.js`) — file-size report by type, enforces 2 MB JS budget in CI
- **i18n coverage script** (`scripts/i18n-coverage.js`) — reports key parity and empty values across locales
- **Lighthouse CI config** (`lighthouserc.json`) — performance ≥ 0.8, accessibility ≥ 0.9, best-practices ≥ 0.8, SEO ≥ 0.8
- `npm run i18n:coverage` and `npm run bundle:report` convenience scripts

### 🔄 Changed

- Coverage thresholds raised to 70/60/60/70 (statements/branches/functions/lines)
- CI workflow: added bundle size report step (Node 22 only)
- 249 tests across 23 test files, all passing

## [2.9.0] — 2026-04-20

### ✨ Added

- `tests/helpers.ts` — shared test fixtures (`cfg()`, `mockSheet`, `mockPart`)
- `tests/assertions.ts` — reusable assertion helpers (`expectBilingualNames`, `expectSequentialSteps`, `expectBilingualSteps`)
- `it.each` parameterized test for material bilingual names in `materials.test.ts`
- npm cache in Pages workflow for faster deploys

### 🔄 Changed

- Consolidated duplicate `cfg()` helper from 3 test files into shared `tests/helpers.ts`
- Consolidated duplicate `mockSheet`/`mockPart` from dxf + gcode tests into `tests/helpers.ts`
- Replaced 6× inline bilingual name assertions with shared `expectBilingualNames()`
- Replaced 2× inline sequential step assertions with shared `expectSequentialSteps()`
- Release workflow: consolidated 4 separate check steps into single `npm run ci`
- Updated ARCHITECTURE.md directory layout (added `download.ts`, test helpers, fixed `index.html` location)
- Disabled MD022/MD024 in markdownlint config (false positives on CODEOWNERS and changelog)

### 🗑️ Removed

- `public/icons.svg` — unused social brand icon sprite (bluesky, discord, github, x)
- Legacy Python entries from `.gitignore` (`__pycache__`, `.mypy_cache`, `*.pyc`)

## [2.8.0] — 2026-04-20

### ✨ Added

- `eslint-plugin-jsx-a11y` — accessibility linting for all JSX components
- `@vitest/coverage-v8` — test coverage reporting with thresholds (60% statements/lines)
- `triggerDownload()` shared utility — deduplicated 5 Blob+anchor download patterns
- `npm run clean` script — cross-platform build artifact cleanup via `rimraf`
- PNG icon fallbacks (192×192, 512×512) for PWA manifest
- CI/deploy badges in README
- Component tree and state flow Mermaid diagrams in `ARCHITECTURE.md`
- Coverage step in CI workflow (Node 22 only)
- Auto-extracted changelog notes in release workflow

### 🔄 Changed

- Service worker cache versioned to `cabinet-planner-v2.8.0` (was hardcoded `v1`)
- PWA manifest SVG icon: `purpose` changed from `any maskable` to `any` (per spec)
- ESLint config: added jsx-a11y recommended ruleset
- Release workflow: body auto-generated from CHANGELOG.md section

### 🐛 Fixed

- 11 accessibility lint errors across `CabinetSelector`, `Header`, `OnboardingOverlay`, `Sidebar`
  - Replaced `autoFocus` prop with `ref` callback focus
  - Replaced `<nav role="tablist">` with `<div role="tablist">`
  - Added `tabIndex`, keyboard listeners, and ARIA roles to modal overlays
  - Removed redundant `role="complementary"` on `<aside>` elements

### 🗑️ Removed

- `src/assets/hero.png`, `react.svg`, `vite.svg` — unused Vite scaffold assets
- `.mypy_cache/` — leftover Python type-checker cache
- Vestigial Python (`*.py`) and Makefile sections from `.editorconfig`

## [2.7.0] — 2026-04-20

### ✨ Added

- `docs/ARCHITECTURE.md` — full architecture documentation with Mermaid diagrams
- `CHANGELOG.md` — adopting Keep a Changelog format with SemVer
- `.prettierrc.json` + `.prettierignore` — Prettier formatting standards
- `eslint-config-prettier` — ESLint/Prettier integration
- `npm run format` / `npm run format:check` scripts
- `.vscode/extensions.json` — recommended VS Code extensions
- `.vscode/tasks.json` — build/lint/test task shortcuts
- `.vscode/launch.json` — Chrome debug launch config
- SHA-256 checksums in release workflow artifacts
- Format check step in CI and release workflows

### 🔄 Changed

- Enabled TypeScript strict mode (`strict: true` in `tsconfig.app.json`)
- Updated `.vscode/settings.json` with formatter, ESLint, and TypeScript SDK config
- Updated README with tech stack table, dev commands, troubleshooting, deploy instructions
- Updated `.github/CONTRIBUTING.md` — Node.js/web project instructions (was Python)
- Updated `.github/SECURITY.md` — npm audit, removed Python references
- Updated `.github/CODEOWNERS` — web project paths
- Updated `.github/dependabot.yml` — npm ecosystem (was pip)
- Updated `.github/PULL_REQUEST_TEMPLATE.md` — web verification checklist
- Updated all issue templates — web/browser context (was Python)
- Updated `pages.yml` to use `npm ci` and `npm run build` consistently
- `chunkSizeWarningLimit` set to 1600 for expected @react-pdf/renderer chunk
- `.editorconfig` updated — added TS/TSX indent rules

### 🐛 Fixed

- `useTouchGestures.ts` — removed unused `ref` parameter, fixed `React.Touch` type mismatch
- `cabinet-store.ts` — replaced missing `pushHistory()` call with inline history logic
- `bom-export.ts` — removed unused `_BomRow` interface
- `CabinetPreview.tsx` — updated `useTouchGestures()` call site for new signature

### 🗑️ Removed

- `legacy/` directory — Python plan generators, ruff config, requirements.txt, reference files
- `generate_md_svgs.py` — Python SVG generator script
- `svg/` directory — generated SVG assets (replaced with Mermaid in Markdown)
- `release-notes.tmp` — temporary file

## [2.6.0]

### ✨ Added

- G-code export for CNC routers
- BOM CSV export for multi-cabinet projects
- Touch gesture support (pinch-to-zoom, swipe)

## [2.5.0]

### ✨ Added

- Desk and wardrobe furniture types
- Custom Materials Editor (persisted in localStorage)
- Shaker door style option
- SVG export for preview views
- G-code export for CNC cut sheets
- Help / onboarding overlay (5-step walkthrough)
- Focus trap in modals, Escape key dismissal
- ARIA labels, roles, and expanded states across interactive elements
- 197 tests across 18 test files

## Version Bump Rules

- **Major** (X.0.0): Breaking changes to config format, engine API, or store shape
- **Minor** (x.Y.0): New features, new furniture types, new export formats
- **Patch** (x.y.Z): Bug fixes, documentation, CI changes, dependency updates
