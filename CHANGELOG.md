<div align="center">
  <img src="docs/banner.svg" alt="Cabinet Planner" width="100%"/>
</div>

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
