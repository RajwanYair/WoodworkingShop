# Roadmap

> **Last strategic review**: 2026-05-26 · **Current version**: 4.3.0
> **Sprint history archive**: [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)

This document is the single source of truth for the Cabinet Planner project's
technical strategy, architecture decisions, competitive positioning, and
forward-looking roadmap. Every decision below has been re-examined from first
principles as of the date above.

---

## North Star

Build the **best-in-class browser-based cabinet planning application** for
professional and advanced-DIY workflows. Every decision serves these pillars:

| Pillar         | Target Metric                                                           |
| -------------- | ----------------------------------------------------------------------- |
| **Fast**       | Lighthouse TBT < 200 ms, FCP < 1.2 s, sub-100 ms config → preview       |
| **Accurate**   | Manufacturing-grade DXF/G-code that goes to the CNC unchanged           |
| **Accessible** | WCAG 2.2 AA, ARIA-complete; EN + HE RTL primary; 6 locales total        |
| **Reliable**   | Zero waivers, zero `eslint-disable`, zero `@ts-ignore`, 90%+ engine cov |
| **Portable**   | Local-first, zero-backend for all core workflows; PWA offline-capable   |
| **Extensible** | Versioned plugin API with stability tiers (`stable` / `experimental`)   |
| **Open**       | MIT license; no proprietary cloud APIs in the critical path             |
| **Minimal**    | < 7 production dependencies; < 1.8 MB bundle; < 22 config files at root |

---

> Architecture decisions and ADRs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Industry Competitor Benchmark

### Competitive Advantages (Unique to This Project)

1. **Only fully-accessible (WCAG AA) cut optimizer** in the market
2. **Only browser-based app with G-code export** (G2/G3 arcs, tool change M6)
3. **Only OSS app with a formal versioned plugin API** with stability contracts
4. **Only app combining cut optimization + assembly guide + hardware BOM** in browser
5. **Only RTL-first (Hebrew + Arabic) woodworking planner** in existence
6. **Only app with CRDT collaboration** in the cut-list space (without enterprise pricing)
7. **Smallest dependency footprint**: 7 production deps vs. 50+ in comparable tools

### Gaps to Close (Priority-Ordered)

| #   | Gap                                         | Competitor Has It          | Target Phase | Impact   |
| --- | ------------------------------------------- | -------------------------- | ------------ | -------- |
| 1   | Multi-start optimizer (yield optimization)  | CutList Plus fx, Polyboard | Phase 16     | Critical |
| 2   | Parametric constraints (min/max validation) | Fusion 360, Cabinet Vision | Phase 16     | High     |
| 3   | Material texture atlas (photorealistic)     | Pro100, Cabinet Vision     | Phase 18     | Medium   |
| 4   | Direct CNC machine communication            | WoodWOP, Cabinet Vision    | Phase 19     | Medium   |
| 5   | IFC/STEP export (BIM interop)               | Fusion 360, Onshape        | Phase 20     | Low      |
| 6   | Mobile native app                           | Fusion 360                 | Phase 20     | Low      |

---

## Completed Phases Summary

| Phase | Version         | Title                            | Key Deliverables                                                                                               |
| ----- | --------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1     | v3.50.0         | Production Hardening             | Zero warnings, zero waivers, all CI gates green                                                                |
| 2     | v3.51.0         | Performance & Determinism        | Web Workers, bench CI, SharedArrayBuffer probe, memoization                                                    |
| 3     | v3.52.0         | Persistence & Versioning         | IndexedDB, snapshot timeline, diff view, JSON import/export                                                    |
| 4     | v3.53.0         | Test Hardening & a11y            | 85%+ coverage, visual regression, keyboard-only, high-contrast, RTL                                            |
| 5     | v3.54.0         | Domain Intelligence              | Manufacturing constraints, deflection, substitution, grain conflict                                            |
| 6     | v3.55.0         | Interop & Plugin API             | ERP/MRP schemas, plugin stability contract, sandbox, vendor hinge profiles                                     |
| 7     | v3.56.0         | Advanced Features                | Room layout, G-code G2/G3, CSP hardening, WebGL exploration                                                    |
| 8     | v3.54.0         | Hardening Round 2                | jsx-a11y flat config, Stylelint + browserslist, label associations                                             |
| 9     | v3.57.0         | Advanced Export & EventBus       | Rotation lock, G-code M6, DXF layers, Plugin EventBus                                                          |
| 10    | v3.58.0         | ESLint 10 + CI Modernization     | ESLint 10 peer-dep fix, lockfile, TS strictness, knip, typedoc                                                 |
| 11    | v3.59.0–v3.61.4 | Engine Quality & DX Hardening    | Branded types, Result<T,E>, slices, typed RPC, lazy i18n, Workbox, Lighthouse, Codecov, fast-check, Guillotine |
| 12    | v3.61.0–v3.62.0 | Optimizer Intelligence           | Offcut catalog, Cloudflare Pages, validation registry, WebGL, grain hatching, SBOM, DAG                        |
| 13    | v3.62.1–v3.64.0 | Hardware Depth & Export Fidelity | Vendor catalog, DXF compliance, G-code hooks, multi-currency, co-nesting, checksums                            |
| 14    | v3.64.1–v3.66.0 | Collaboration & AI               | Supabase (BYO), CRDT, branching, BYO AI, voice annotation, PWA file handlers                                   |
| 15    | v3.66.1–v3.67.0 | Manufacturing Intelligence       | Kerf, zone validator, templates, batch replace, project settings, i18n audit — 74 tests                        |
| 16    | v3.68.0         | Optimizer Mastery & Config Min.  | Multi-start MaxRects, parametric constraints, ESLint simplification (drop sonarjs/promise), Lighthouse targets |
| 16.5  | v3.68.1         | Code Quality & Housekeeping      | it.each parameterization, CI composite action, Phase-16 doc-comment sweep, copilot-instructions update         |
| 16.6  | v3.70.0         | Code Hygiene & CI Speed          | CI composite action, test file shortening, doc consolidation, VS Code tuning                                   |
| 17    | v3.71.0         | DX & Bundle Optimization         | Comlink workers, tree-shake audit, PDF renderer spike, chunk strategy, pnpm eval, PLUGIN-API.md                |
| 17.1  | v3.71.1         | JSDoc D1–D3 (optimizer layer)    | JSDoc: types.ts, parts/dimensions/materials, cut-optimizer/smart-optimizer; markdownlint CI fixes              |
| 17.2  | v3.72.0         | Production Readiness & DX        | Partial: fix-buttons, i18n keys, VS Code snippets/tasks, Copilot prompts, dependabot, CODEOWNERS, SECURITY.md  |
| 17.3  | v3.73.0         | Test Efficiency & DX Elevation   | it.each parameterization, source file splitting, CI slim, docs consolidation, CONTRIBUTING.md                  |
| 18    | v3.75.0         | Visual Fidelity & UX             | Material texture atlas, SVG isometric render, nesting animation, onboarding wizard, print stylesheet           |
| 19    | v4.0.0          | Machine Integration & Community  | WebSerial Grbl streaming, machine profile registry, community material catalog                                 |
| 20    | v4.1.0          | Enterprise & Mobile              | IFC/STEP export, Capacitor iOS/Android, mobile touch UI, glTF 2.0, measurement assistant, ZIP bundle           |
| 21    | v4.2.0          | Marketplace + Build UX           | Plugin marketplace, finish/paint calculator, project build log, focus/kiosk mode, workspace DX                 |

---

## Active Roadmap

### Phase 17.3: Test Efficiency, Source Splitting & DX Elevation (v3.73.0) — **HIGH PRIORITY / NEXT**

**Goal**: Measurably shorter tests, split oversized source files, slimmer CI
workflows, consolidated docs, clean comment style, and best-in-class Copilot /
VS Code integration. Delivers a leaner, faster-to-navigate codebase before
resuming the Phase 17.1 JSDoc D-series.

**Data-driven baselines** (measured 2026-06-04, after v3.72.0):

| Metric                   | Current                        | Target      |
| ------------------------ | ------------------------------ | ----------- |
| Longest test file        | validation.test.ts 609 L       | ≤ 400 L     |
| 10th-longest test file   | voice-annotation.test.ts 277 L | ≤ 200 L     |
| Longest source file      | validation.ts 1033 L           | ≤ 600 L     |
| 10th-longest source file | types.ts 533 L                 | ≤ 400 L     |
| Longest GH workflow      | ci.yml 90 L / release.yml 85 L | ≤ 80 L each |

**Exit criteria**: Top-10 longest test files each shortened ≥ 20%; top-10
longest source files each ≤ 600 lines; `ci.yml` and `release.yml` each < 80
lines; ARCHITECTURE.md strategy section merged with zero duplication; all
standalone `// comment` lines in `src/` converted to `/** JSDoc */` or
removed; `CONTRIBUTING.md` added; `copilot-instructions.md` reflects v3.73.0
state; GH release published.

| Sprint | Deliverable                                                                                                                                         | Status   | Type     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| E1     | Shorten top-5 tests (validation 609 L, cut-optimizer 409 L, bom-export 392 L, url-state 345 L, cabinet-store 354 L) via `it.each` + shared fixtures | **DONE** | Tests    |
| E2     | Shorten next-5 tests (plugin 338 L, hardware 335 L, templates 302 L, project-storage 280 L, voice-annotation 277 L)                                 | DONE     | Tests    |
| E3     | ~~Split `CabinetPdfDocument.tsx`~~ — already 173 L (sections extracted in v3.71–v3.72)                                                              | **DONE** | Refactor |
| E4     | Split `CabinetPreview.tsx` and `OptimizerView.tsx` if over 600 L (verify sizes)                                                                     | **DONE** | Refactor |
| E5     | Split `validation.ts` (1033 L) by domain: dimension-rules, door-rules, shelf-rules; split `cabinet-store.ts` (968 L): extract PDF + room slices     | **DONE** | Refactor |
| E6     | Split `templates.ts` (660 L) into `engine/templates/`; split `dxf-export.ts` (544 L) into geometry + labeling layers                                | **DONE** | Refactor |
| E7     | Slim `ci.yml` (90 L) + `release.yml` (85 L): consolidate steps; target < 80 L each                                                                  | **DONE** | CI       |
| E8     | Consolidate docs: merge ARCHITECTURE.md strategy section into ROADMAP.md; retire duplication; trim to pure module reference                         | **DONE** | Docs     |
| E9     | Convert all standalone `// comment` lines in `src/` to `/** JSDoc */` blocks or remove where trivial; update `copilot-instructions.md`              | **DONE** | Docs     |
| E10    | VS Code: `snippets.code-snippets` (6 snippets, done), check task done, dead:check task done                                                         | **DONE** | DX       |
| E11    | Copilot: `.github/prompts/` seeded (done), `dependabot.yml` (done), `CODEOWNERS` (done); add `CONTRIBUTING.md`                                      | **DONE** | DX       |
| E12    | Version bump 3.73.0, CHANGELOG, GH release                                                                                                          | **DONE** | Release  |

### Phase 18: Visual Fidelity & UX (v3.75.0)

**Goal**: Photorealistic materials in 3D, placement animation, print polish.

| Sprint | Deliverable                                                       | Type     |
| ------ | ----------------------------------------------------------------- | -------- | ------- |
| 68     | Material texture atlas (8 species + composites, 512×512 tiles)    | **DONE** | Assets  |
| 69     | SVG pattern-mapped isometric cabinet render (no Three.js)         | **DONE** | UI      |
| 70     | Nesting placement animation (step-by-step sequence with timeline) | **DONE** | UI      |
| 71     | Onboarding wizard redesign (3-step guided flow, skippable)        | **DONE** | UX      |
| 72     | Print stylesheet optimization (A4/Letter margins, break control)  | **DONE** | CSS     |
| 73     | Version bump 3.74.0, CHANGELOG, GH release                        | **DONE** | Release |

### Phase 19: Machine Integration & Community (v4.0.0)

**Goal**: Design-to-fabrication bridge. Community material data.

| Sprint | Deliverable                                           | Type |
| ------ | ----------------------------------------------------- | ---- |
| 74     | WebSerial API integration (Grbl G-code streaming)     | DONE |
| 75     | Machine profile registry (Grbl, LinuxCNC, Mach3)      | DONE |
| 76     | Community material catalog schema (JSON API contract) | DONE |
| 77     | Material price import from community catalog          | DONE |
| 78     | Version bump 4.0.0, CHANGELOG, GH release             | DONE |

### Phase 20: Enterprise & Mobile (v4.1.0)

| Sprint | Deliverable                                                     | Type |
| ------ | --------------------------------------------------------------- | ---- |
| 79     | IFC export (Industry Foundation Classes for BIM)                | DONE |
| 80     | STEP export (AP214 furniture geometry profile)                  | DONE |
| 81     | Capacitor iOS/Android wrapper (camera, haptics)                 | DONE |
| 82     | Mobile-first touch UI (swipe tabs, pinch preview, thumb zones)  | DONE |
| 83     | Version bump 4.1.0, CHANGELOG, GH release                       | DONE |
| 84     | glTF 2.0 export (AR/VR 3D model)                                | DONE |
| 85     | Cabinet measurement assistant (ergonomic + best-practice hints) | DONE |
| 86     | ZIP bundle export (PDF + DXF + BOM + glTF in one download)      | DONE |

### Phase 21: Marketplace + Build UX (v4.2.0) — **DONE**

**Goal**: Plugin marketplace panel, finish/paint calculator, build log, focus mode.

| Sprint | Deliverable                                         | Status   | Type    |
| ------ | --------------------------------------------------- | -------- | ------- |
| 87     | Plugin Marketplace Panel (browse, install, rate)    | **DONE** | UI      |
| 88     | Finish/Paint Calculator (coverage, coats, dry time) | **DONE** | Engine  |
| 89     | Project Build Log (timestamped notes per project)   | **DONE** | UI      |
| 90     | Focus/Kiosk Mode (hide chrome, Ctrl+Shift+K toggle) | **DONE** | UX      |
| 91     | Version bump 4.2.0, CHANGELOG, GH release           | **DONE** | Release |

### Phase 22 — Workshop Intelligence · v4.3.0 · **DONE**

> **Status**: Released · **Version**: 4.3.0 · **Goal**: Analytics, mirroring, checklists, cost export

| Sprint | Feature                                               | Status   | Track   |
| ------ | ----------------------------------------------------- | -------- | ------- |
| 92     | Smart Waste Analytics Panel (efficiency, offcuts)     | **DONE** | Engine  |
| 93     | Cabinet Mirror & Clone (isMirrored, suffix series)    | **DONE** | Engine  |
| 94     | Part Cutting Checklist (progress, groups, persist)    | **DONE** | UX      |
| 95     | Project Cost Summary Export (breakdown, CSV)          | **DONE** | UX      |
| 96     | Version bump 4.3.0, CHANGELOG, GH release             | **DONE** | Release |

### Phase 23 — Precision Workflows · v4.4.0 · **DONE**

> **Status**: Released · **Version**: 4.4.0 · **Goal**: Shop-floor precision — stock tracking, grain validation, cost auditing, part labelling

| Sprint | Feature                                               | Status   | Track   |
| ------ | ----------------------------------------------------- | -------- | ------- |
| 97     | Stock Tracker Dashboard (availability, shortfalls)    | **DONE** | UX      |
| 98     | Grain Direction Report Panel (per-material, bars)     | **DONE** | UX      |
| 99     | Cost Variance Tracker (estimated vs actual, CSV)      | **DONE** | UX      |
| 100    | Part Label Sheet (sequential IDs, print window)       | **DONE** | UX      |
| 101    | Version bump 4.4.0, CHANGELOG, GH release             | **DONE** | Release |

### Phase 23+: Future Horizons (Unscoped)

| Track         | Candidate                                           | Trigger                              |
| ------------- | --------------------------------------------------- | ------------------------------------ |
| Rendering     | WebGPU path-traced material preview                 | WebGPU > 85% browser support         |
| Collaboration | Figma-style multiplayer cursors                     | User base demands real-time editing  |
| AI            | On-device LLM (WebLLM/WASM) for offline suggestions | Model quality adequate for furniture |
| Standards     | glTF 2.0 export for AR/VR placement                 | WebXR API stabilizes                 |
| Marketplace   | Plugin marketplace with community contributions     | Plugin count > 10                    |
| Embedded      | Raspberry Pi shop-floor kiosk mode                  | Community request                    |

---

## Dependency Budget

### Production (max 7)

| #   | Package             | Bundle KB | Justification                              |
| --- | ------------------- | --------- | ------------------------------------------ |
| 1   | react               | 7         | UI framework                               |
| 2   | react-dom           | 130       | DOM renderer                               |
| 3   | zustand             | 1.1       | State management                           |
| 4   | i18next             | 16        | i18n core                                  |
| 5   | react-i18next       | 8         | React bindings for i18n                    |
| 6   | @react-pdf/renderer | 300       | PDF generation (evaluate replacement Ph17) |
| 7   | idb-keyval          | 1         | IndexedDB wrapper                          |

**Rule**: No new production dependency without removing an existing one OR proving > 50 KB savings elsewhere.

### DevDependencies Target (Phase 16–17)

Remove 4 packages:

- `eslint-plugin-sonarjs` — redundant with TS strict + regexp
- `eslint-plugin-promise` — all rules disabled
- `eslint-plugin-testing-library` — move to test-only override (already barely used)
- `globals` — ESLint 10 provides `browser` globals natively

---

## Release Quality Gates

| #   | Command                 | Check                                      | Target        |
| --- | ----------------------- | ------------------------------------------ | ------------- |
| 1   | `npm run typecheck`     | Zero TS errors (4 tsconfigs)               | 0 errors      |
| 2   | `npm run lint`          | Zero ESLint warnings                       | 0 warnings    |
| 3   | `npm run lint:css`      | Zero Stylelint warnings                    | 0 warnings    |
| 4   | `npm run lint:md`       | Zero markdownlint issues                   | 0 issues      |
| 5   | `npm run format:check`  | Zero Prettier drift                        | 0 drift       |
| 6   | `npm run i18n:coverage` | 100% key parity (6 locales)                | 100%          |
| 7   | `npm test`              | All unit tests pass                        | 1915+ pass    |
| 8   | `npm run build`         | Clean production build                     | 0 warnings    |
| 9   | `npm run bundle:check`  | JS ≤ budget (target < 1800 KB by Phase 17) | ≤ budget      |
| 10  | `npm run bench:check`   | Benchmarks within 5× baseline              | < 5× baseline |
| 11  | `npm run test:e2e`      | All E2E + a11y pass                        | 100% pass     |
| 12  | `npm run dead:check`    | No dead files/exports                      | 0 dead        |
| 13  | Lighthouse CI           | TBT < 200 ms, FCP < 1.2 s, a11y ≥ 95       | All pass      |

---

## Architecture Decisions — Closed (ADR Log)

| Decision                       | Why Closed                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| React over Solid/Svelte        | PDF renderer + i18next deep integration. Rewrite cost > benefit. React Compiler closes reactivity gap. |
| Zustand over Redux Toolkit     | RTK = +15 KB + 40% more boilerplate for identical semantics. Slice pattern achieves same modularity.   |
| Tailwind over CSS-in-JS        | Runtime CSS-in-JS = +10 KB, breaks SSR, prevents static extraction. Tailwind v4 JIT strictly superior. |
| No server on critical path     | Core value: zero-install, zero-signup. Server dependency would destroy this. Optional Supabase only.   |
| Engine as pure TypeScript      | Must work in CLI, CI, workers, WASM targets without React or DOM.                                      |
| Vite over Next.js/CRA          | CRA deprecated. Next.js SSR = no value for client-side SPA. Vite Rolldown = fastest.                   |
| `erasableSyntaxOnly`           | Aligns with TC39 type-stripping. Compatible with esbuild/oxc-transform/Node `--strip-types`.           |
| Tool configs at root           | Vite/ESLint/TS expect root. Subdirs = churn without benefit.                                           |
| Intermediates in OS $TEMP      | Workspace must be commit-clean after any build. Zero cache/coverage/report artifacts in repo.          |
| Zero `eslint-disable`/`as any` | Every suppression hides a real issue. Fix root cause or redesign the type.                             |

---

## Continuous Enhancement Rules

1. **No suppression-first fixes** — fix root cause. Never disable a check to silence it.
2. **No dead code** — unused exports, unreachable branches, orphaned files removed same PR.
3. **No dead docs** — stale sections updated or deleted same commit as code change.
4. **No dead config** — commented-out settings, disabled rules, empty overrides deleted.
5. **No hardcoded measurements** — all dimensions in mm via `Mm` branded type.
6. **No hardcoded colours** — `wood-*` tokens only. No inline hex in TSX.
7. **RTL-first layout** — logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) everywhere.
8. **i18n parity every PR** — every `t('key')` → `en.json` + `he.json` in same commit.
9. **Engine stays pure** — `src/engine/` has no React, no side effects, no DOM.
10. **Intermediates to $TEMP** — no build artifacts in workspace.
11. **≤ 7 production deps** — no additions without removal or exceptional justification.
12. **Config minimalism** — prefer tool defaults; only configure what diverges.
13. **Commit after each sprint** — atomic, bisectable history.
14. **GH release every 5 sprints** — semver minor bump, `--generate-notes`.

---

## Toolchain & Environment

| Tool       | Version | Purpose                         | Config Location           |
| ---------- | ------- | ------------------------------- | ------------------------- |
| Node.js    | ≥ 22    | Runtime                         | `engines` in package.json |
| npm        | 11.x    | Package management + workspaces | package.json              |
| TypeScript | 6.x     | Compiler (`erasableSyntaxOnly`) | tsconfig\*.json           |
| Vite       | 8.x     | Build + dev server (Rolldown)   | vite.config.ts            |
| ESLint     | 10.x    | Linting (flat config)           | eslint.config.js          |
| Prettier   | 3.x     | Formatting                      | defaults (no .prettierrc) |
| Stylelint  | 17.x    | CSS lint                        | stylelint.config.js       |
| Vitest     | 4.x     | Unit + bench tests              | vitest.config.ts          |
| Playwright | 1.60.x  | E2E + a11y (axe-core)           | playwright.config.ts      |
| Knip       | 6.x     | Dead code detection             | `"knip"` in package.json  |
| TypeDoc    | 0.28.x  | API documentation               | typedoc.json              |
| gh CLI     | 2.60+   | Release automation              | System install            |

### Intermediate Artifact Policy

| Artifact           | Path                                       |
| ------------------ | ------------------------------------------ |
| Vite cache         | `$TEMP/WoodworkingShop/.vite_cache`        |
| ESLint cache       | `$TEMP/WoodworkingShop/.eslintcache`       |
| Vitest coverage    | `$TEMP/WoodworkingShop/coverage`           |
| Bench results      | `$TEMP/WoodworkingShop/bench-results.json` |
| Playwright results | `$TEMP/WoodworkingShop/test-results`       |
| Playwright report  | `$TEMP/WoodworkingShop/playwright-report`  |
| Lighthouse output  | `$TEMP/WoodworkingShop/.lighthouseci`      |
| TypeDoc output     | `docs/api/` (committed on release only)    |
