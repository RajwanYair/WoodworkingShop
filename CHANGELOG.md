# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.4.0] — 2026-05-19

### Added

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

### Changed

- **Shelf span deflection warning** (Sprint 126) — `computeShelfDeflection()`
  in `dimensions.ts` uses the Euler-Bernoulli beam formula
  (δ = 5wL⁴/384EI, load 0.05 N/mm, limit L/360) with material-specific elastic
  modulus values. `ShelfConfig` shows an amber alert when the calculated sag
  exceeds the limit.
- `package.json` version bumped 3.3.1 → 3.4.0.

### Fixed

- `ConfiguratorPanel.test.tsx` — `getByText(/height/i)` and `getByText(/reset/i)`
  updated to `getAllByText(...)` after new UI elements (Toe Kick Height label,
  Reset section legend) introduced ambiguous matches.

### Tests

- 263 unit tests across 23 files, all passing.
- New tests: `detectOsDarkMode`, `duplicateCabinet`, `computeShelfDeflection`,
  BOM material area summary (area m², board-feet, aggregate across cabinets).

## [3.3.0] — 2026-05-18

### Added

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

### Changed

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

### Tests

- 249 unit tests across 23 files, all passing.
- New Playwright e2e test: PDF panel renders and generate button is enabled.

## [3.2.0] — 2026-05-17

### Added

- **2D preview dimension polish** (Sprint 114) — dimension lines throughout the
  2D preview (front, open-front, side, top, back) and the isometric 3D view now
  use `currentColor` so they adapt to the active colour theme (dark / light /
  high-contrast).  Arrow-heads replace plain tick marks for standard drafting
  appearance.  All labels now use the active unit system (`mm` or fractional
  inches) via `formatDim`.  The open-front view adds per-bay height annotations
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

### Changed

- `package.json` version bumped 3.1.0 → 3.2.0.
- Tests: 252 → 258 passing across 23 files.

## [3.1.0] — 2026-05-15

### Added

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

### Fixed

- **Dark mode toggle had no effect** — Tailwind 4 defaults to `prefers-color-scheme`
  for the `dark:` variant; added `@custom-variant dark` in `index.css` and an
  `<html>.dark` class sync in `App.tsx` so the user-controlled toggle actually
  switches themes.

### Tests

- 252 unit tests across 23 files (was 249); added bookshelf cut-optimizer
  regression test and two `hasBack` tests.

## [3.0.0] — 2026-04-20

### Added

- **Cost estimator tests** — 11 tests covering sheet costs, grouping, edge banding, hardware pricing, waste calc, zero-sheet edge case, bilingual names
- **BOM export tests** — 10 tests covering CSV headers, EN/HE values, hardware section, multi-cabinet, empty array, comma/quote escaping, unknown material fallback
- **Local storage tests** — 9 tests with custom in-memory localStorage mock for `loadSavedConfigs`, `saveConfig`, `deleteSavedConfig`
- **i18n key parity test** — 5 tests verifying en.json/he.json identical key structure, count, no missing keys, all leaf values non-empty
- **Bundle analysis script** (`scripts/bundle-report.js`) — file-size report by type, enforces 2 MB JS budget in CI
- **i18n coverage script** (`scripts/i18n-coverage.js`) — reports key parity and empty values across locales
- **Lighthouse CI config** (`lighthouserc.json`) — performance ≥ 0.8, accessibility ≥ 0.9, best-practices ≥ 0.8, SEO ≥ 0.8
- `npm run i18n:coverage` and `npm run bundle:report` convenience scripts

### Changed

- Coverage thresholds raised to 70/60/60/70 (statements/branches/functions/lines)
- CI workflow: added bundle size report step (Node 22 only)
- 249 tests across 23 test files, all passing

## [2.9.0] — 2026-04-20

### Added

- `tests/helpers.ts` — shared test fixtures (`cfg()`, `mockSheet`, `mockPart`)
- `tests/assertions.ts` — reusable assertion helpers (`expectBilingualNames`, `expectSequentialSteps`, `expectBilingualSteps`)
- `it.each` parameterized test for material bilingual names in `materials.test.ts`
- npm cache in Pages workflow for faster deploys

### Changed

- Consolidated duplicate `cfg()` helper from 3 test files into shared `tests/helpers.ts`
- Consolidated duplicate `mockSheet`/`mockPart` from dxf + gcode tests into `tests/helpers.ts`
- Replaced 6× inline bilingual name assertions with shared `expectBilingualNames()`
- Replaced 2× inline sequential step assertions with shared `expectSequentialSteps()`
- Release workflow: consolidated 4 separate check steps into single `npm run ci`
- Updated ARCHITECTURE.md directory layout (added `download.ts`, test helpers, fixed `index.html` location)
- Disabled MD022/MD024 in markdownlint config (false positives on CODEOWNERS and changelog)

### Removed

- `public/icons.svg` — unused social brand icon sprite (bluesky, discord, github, x)
- Legacy Python entries from `.gitignore` (`__pycache__`, `.mypy_cache`, `*.pyc`)

## [2.8.0] — 2026-04-20

### Added

- `eslint-plugin-jsx-a11y` — accessibility linting for all JSX components
- `@vitest/coverage-v8` — test coverage reporting with thresholds (60% statements/lines)
- `triggerDownload()` shared utility — deduplicated 5 Blob+anchor download patterns
- `npm run clean` script — cross-platform build artifact cleanup via `rimraf`
- PNG icon fallbacks (192×192, 512×512) for PWA manifest
- CI/deploy badges in README
- Component tree and state flow Mermaid diagrams in `ARCHITECTURE.md`
- Coverage step in CI workflow (Node 22 only)
- Auto-extracted changelog notes in release workflow

### Changed

- Service worker cache versioned to `cabinet-planner-v2.8.0` (was hardcoded `v1`)
- PWA manifest SVG icon: `purpose` changed from `any maskable` to `any` (per spec)
- ESLint config: added jsx-a11y recommended ruleset
- Release workflow: body auto-generated from CHANGELOG.md section

### Fixed

- 11 accessibility lint errors across `CabinetSelector`, `Header`, `OnboardingOverlay`, `Sidebar`
  - Replaced `autoFocus` prop with `ref` callback focus
  - Replaced `<nav role="tablist">` with `<div role="tablist">`
  - Added `tabIndex`, keyboard listeners, and ARIA roles to modal overlays
  - Removed redundant `role="complementary"` on `<aside>` elements

### Removed

- `src/assets/hero.png`, `react.svg`, `vite.svg` — unused Vite scaffold assets
- `.mypy_cache/` — leftover Python type-checker cache
- Vestigial Python (`*.py`) and Makefile sections from `.editorconfig`

## [2.7.0] — 2026-04-20

### Added

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

### Changed

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

### Fixed

- `useTouchGestures.ts` — removed unused `ref` parameter, fixed `React.Touch` type mismatch
- `cabinet-store.ts` — replaced missing `pushHistory()` call with inline history logic
- `bom-export.ts` — removed unused `_BomRow` interface
- `CabinetPreview.tsx` — updated `useTouchGestures()` call site for new signature

### Removed

- `legacy/` directory — Python plan generators, ruff config, requirements.txt, reference files
- `generate_md_svgs.py` — Python SVG generator script
- `svg/` directory — generated SVG assets (replaced with Mermaid in Markdown)
- `release-notes.tmp` — temporary file

## [2.6.0]

### Added

- G-code export for CNC routers
- BOM CSV export for multi-cabinet projects
- Touch gesture support (pinch-to-zoom, swipe)

## [2.5.0]

### Added

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
