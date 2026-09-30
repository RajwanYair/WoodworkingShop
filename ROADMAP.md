# Roadmap

> Last updated: 2026-09-30 (Sprint 305 component coverage increased)
> Current app version: v5.33.0
> Next release target: v5.34.0 (Phase 64 — Real User Journeys and Browser Confidence)
> Program horizon: Phases 63–72 · Sprints 300–370 · v5.33.0 → v6.0.0
> Strategy: best-in-class, local-first, production-grade woodworking planning platform

---

## 0. How To Use This Roadmap With The AI Agents

Every unit of work below is written as a **self-contained sprint contract** so that development can be requested one sprint (or one task) at a time:

| You want to…                     | Say this to Copilot                                             | Agent reads                                                                      |
| -------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Build the next planned sprint    | `Execute Sprint 300` (or `@sprint`)                             | Active Sprint table in `.github/copilot-instructions.md` → sprint contract in §7 |
| Build one task inside a sprint   | `Implement task T3 of Sprint 311`                               | The task row (files, tests, acceptance) in §7                                    |
| Build one component end-to-end   | `Scaffold <Feature> per Sprint 325` (or `@feature`)             | Sprint contract + `.github/agents/feature.agent.md`                              |
| Add the tests for a surface only | `Implement the E2E journeys for the Optimizer tab (Sprint 311)` | §8 test matrices + sprint contract                                               |
| Cut a release                    | `Release v5.34.0` (or `@release`)                               | §6 gates + phase release sprint                                                  |

Sprint contract fields (§7): **Goal · Priority (P0 blocker → P3 nice-to-have) · Size (S ≤ ½ day, M ≤ 2 days, L ≤ 5 days) · Depends on · Tasks (T1…Tn with file paths) · Tests (unit / component / E2E) · Acceptance (observable, measurable)**.

Rules of engagement for every sprint: engine → store → component → i18n (en + he + 4 others) → mount → tests, then `npm run check`, then ROADMAP row → DONE, CHANGELOG `[Unreleased]` entry, conventional commit.

---

## 1. Purpose of This Document

This document is both the **living decision ledger** (§3) and the **executable program plan** (§7–§8).
Every major engineering, product, and tooling decision is re-opened, evaluated, and either confirmed with rationale or upgraded with a clear migration path.
Every planned feature is decomposed to tasks with file paths, test obligations, and acceptance criteria.

Historical artifacts:

- Sprint execution history → [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)
- Release changelog → [CHANGELOG.md](CHANGELOG.md)
- Architecture deep-dive → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- User guide → [docs/USER-GUIDE.md](docs/USER-GUIDE.md)

---

## 2. Product North Star

**Build the most reliable local-first cabinet and furniture planning application that a real woodworker can trust in the workshop.**

### Core Pillars

| Pillar                       | Meaning                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| **Deterministic geometry**   | Same inputs always produce same cuts, same part lists, same assembly sequence       |
| **Manufacturing confidence** | Export outputs (PDF, DXF, G-code) are contract-tested and match physical materials  |
| **Instant authoring**        | Multi-cabinet projects configure in seconds with live visual feedback               |
| **Universal access**         | WCAG 2.2 AA, full RTL (Hebrew, Arabic), 6 locales, keyboard-first, mobile-ready     |
| **Zero-compromise quality**  | No lint suppressions, no type hacks, no dead code — production discipline at scale  |
| **Offline-first**            | No server required. All computation client-side. Optional cloud is strictly adapter |

### Non-Goals (Intentional Exclusions)

- 3D solid modeling (leave to Fusion 360 / FreeCAD)
- CNC post-processor library (we generate safe G-code, not machine-specific posts)
- Cloud-mandatory workflows (everything works offline; cloud is opt-in sync only)
- Payment/subscription infrastructure (MIT open-source, no monetization layer)

---

## 3. Decision Ledger (Full Strategic Review)

### 3.1 Language and Framework

| Decision     | Current               | Alternatives Considered                   | Verdict              | Rationale                                                                                                          |
| ------------ | --------------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Language     | TypeScript 6 (strict) | Rust+WASM, Dart/Flutter, plain JS, Go     | **Keep TS 6**        | Best DX for browser-first apps; `erasableSyntaxOnly` eliminates enum/namespace footguns; ecosystem depth unmatched |
| UI framework | React 19              | Svelte 5, SolidJS, Vue 3.5, Qwik          | **Keep React 19**    | Largest ecosystem, best Copilot/tooling support, concurrent rendering for heavy previews                           |
| Styling      | Tailwind CSS v4       | CSS Modules, Vanilla Extract, Panda CSS   | **Keep Tailwind v4** | Zero-runtime, design token system via CSS vars, logical properties for RTL                                         |
| State        | Zustand 5 (slices)    | Jotai, Redux Toolkit, Signals, Nanostores | **Keep Zustand**     | Minimal API, no boilerplate, excellent TS inference, undo/redo via middleware                                      |
| Build        | Vite 8 (Rolldown)     | Turbopack, Rspack, esbuild-only, Farm     | **Keep Vite 8**      | Fastest HMR, native Rolldown perf, worker import syntax, proven plugin ecosystem                                   |
| Testing      | Vitest 4 + Playwright | Jest, Cypress, Testing Library only       | **Keep Vitest + PW** | Same config as Vite, bench support, component + E2E in one stack                                                   |
| i18n         | i18next 26            | Paraglide, LinguiJS, FormatJS             | **Keep i18next**     | Mature, massive plugin ecosystem, works with react-i18next, i18n-ally extension                                    |
| PDF          | @react-pdf/renderer   | pdfkit, jsPDF, Puppeteer PDF              | **Keep @react-pdf**  | React component model for layouts, off-main-thread support, no headless browser needed                             |

### 3.2 Frontend Architecture

| Area                 | Current                             | Decision    | Next Action                                                    |
| -------------------- | ----------------------------------- | ----------- | -------------------------------------------------------------- |
| Component boundaries | ≤600 lines enforced with exceptions | **Keep**    | Maintain reviewed exceptions; test user-visible behavior       |
| Error resilience     | ErrorBoundary per panel             | **Improve** | Test recovery/reset UI and isolation in Sprint 317             |
| Preview rendering    | SVG 6-view + WebGL orbit            | **Keep**    | Test six view outputs and WebGL fallback in Sprint 310         |
| PDF rendering        | @react-pdf off main thread          | **Keep**    | Parse generated PDFs and verify pages/content in Sprint 312    |
| Worker architecture  | Comlink + ?worker suffix            | **Keep**    | Add health checks and timeout recovery in Sprint 317           |
| Routing              | Single-page; `?tab=` deep-link      | **Keep**    | Add browser history and cabinet journey coverage in Sprint 307 |
| Design tokens        | wood-\* CSS vars via Tailwind v4    | **Keep**    | Document source-backed catalog in Sprint 362                   |
| Form validation      | Engine guards + field-level errors  | **Keep**    | Verify invalid, repair and screen-reader states in Sprint 308  |
| Code splitting       | Route-based lazy() + Suspense       | **Enhance** | Add granular chunk splitting for heavy panels (PDF, preview)   |

### 3.3 Backend, Data, and API

| Area              | Current                             | Alternatives Considered              | Verdict                | Rationale                                                                                 |
| ----------------- | ----------------------------------- | ------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------- |
| Topology          | Local-first SPA, no server          | Supabase, Firebase, Convex           | **Keep local-first**   | Privacy, offline, no vendor lock-in; sync is adapter layer                                |
| Persistence       | IndexedDB + JSON export             | SQLite/WASM, OPFS, Dexie.js          | **Evaluate OPFS**      | Benchmark and compatibility decision before any migration (S322–S324)                     |
| Schema versioning | Export versions; project schema TBD | Protobuf, JSON Schema, Zod           | **Add project schema** | Define project/catalog schema and migrations in S319; avoid runtime dependency by default |
| Cloud sync        | Not implemented                     | CRDTs (Yjs), Cloudflare D1, PGlite   | **Defer**              | No user demand; CRDT engine exists but has no production backend                          |
| External APIs     | None required                       | Lumber price APIs, hardware catalogs | **Keep zero-API**      | All data is user-owned; optional catalog import via JSON                                  |
| Analytics         | None                                | Plausible, PostHog, Umami            | **Keep none**          | Privacy-first; if added, must be default-off with consent UI                              |
| Database          | idb-keyval (thin wrapper)           | Dexie.js, OPFS SQLite                | **Keep IDB default**   | Minimal footprint; OPFS only if benchmarks show a material benefit                        |
| Infrastructure    | GitHub Pages (static CDN)           | Cloudflare Pages, Vercel, Netlify    | **Keep GH Pages**      | Free, immutable, CI-integrated; CF Pages for PR previews only                             |

### 3.4 Documentation Strategy

| Area           | Current State                                       | Decision        | Standard                                         |
| -------------- | --------------------------------------------------- | --------------- | ------------------------------------------------ |
| Amount         | 12 docs in `docs/`, plus README, ROADMAP, CHANGELOG | **Right-sized** | No doc without an owner and freshness date       |
| API docs       | TypeDoc auto-generated                              | **Keep**        | Generated on `npm run docs:api`, not committed   |
| User guide     | `docs/USER-GUIDE.md`                                | **Keep**        | Update per feature release                       |
| Architecture   | `docs/ARCHITECTURE.md`                              | **Keep**        | Decision records with dates                      |
| Sprint history | `docs/SPRINT-HISTORY.md`                            | **Keep**        | Append-only log                                  |
| Dead docs      | None detected                                       | **Enforce**     | `npm run dead:check` catches unused              |
| Code methods   | Engine functions are pure, fully tested             | **Keep**        | Boundary guards with RangeError, no side-effects |

### 3.5 Configuration and Governance

| Area             | Current                                 | Decision  | Next Action                                       |
| ---------------- | --------------------------------------- | --------- | ------------------------------------------------- |
| Tool configs     | All at workspace root (Vite convention) | **Keep**  | Never move; documented in copilot-instructions    |
| Budget configs   | `config/` directory                     | **Keep**  | Add JSON Schema validation for budget files       |
| VS Code settings | Comprehensive, well-sectioned           | **Clean** | Remove disabled/suspended entries                 |
| Extensions       | 22 recommended, 60+ unwanted            | **Keep**  | Periodic review; document keep/remove rationale   |
| MCP servers      | 10 servers with clear ownership         | **Keep**  | Add health-check ping in CI                       |
| Copilot assets   | 9 agents, 22 prompts, 9 instructions    | **Keep**  | Version-align with release; test for parse errors |

### 3.6 Infrastructure and Deployment

| Area            | Current                        | Decision | Next Action                                             |
| --------------- | ------------------------------ | -------- | ------------------------------------------------------- |
| Hosting         | GitHub Pages (static)          | **Keep** | Free, fast, immutable deploys per release               |
| Preview deploys | Cloudflare Pages PR previews   | **Keep** | Validate preview URLs in PR checks                      |
| CI              | GitHub Actions (14 workflows)  | **Keep** | Harden with `permissions: read-all`, pin actions by SHA |
| SBOM            | CycloneDX generation           | **Keep** | Attach to GitHub releases as artifact                   |
| Supply chain    | Dependabot + dependency-review | **Keep** | Add Scorecard badge                                     |
| Secrets         | Zero secrets in codebase       | **Keep** | Secret scan workflow blocks PRs                         |

### 3.7 Tooling Versions (Pinned)

| Tool         | Version                                          | Update Policy                                               |
| ------------ | ------------------------------------------------ | ----------------------------------------------------------- |
| Node.js      | ≥ 22 (`package.json#engines`); CI on current LTS | Follow LTS schedule; raise floor only with a CHANGELOG note |
| npm          | 11.x                                             | Latest stable                                               |
| TypeScript   | 6.0.x                                            | Pin major; update patch promptly                            |
| React        | 19.x                                             | Pin major; follow canary for 20                             |
| Vite         | 8.x                                              | Pin major; Rolldown is default                              |
| Vitest       | 4.x                                              | Pin major; align with Vite                                  |
| Playwright   | 1.61+                                            | Latest stable; browsers auto-update                         |
| Tailwind CSS | 4.x                                              | Pin major; v4 syntax only                                   |
| ESLint       | 10.x                                             | Flat config only                                            |
| Prettier     | 3.x                                              | Latest stable                                               |
| Stylelint    | 17.x                                             | Latest stable                                               |
| ripgrep      | 15.x                                             | System install via scoop/brew                               |
| GitHub CLI   | Latest                                           | System install via winget/brew                              |

### 3.8 Testing Strategy (New Decisions — 2026-09-27)

| Area                    | Current                                       | Decision                             | Rationale / Migration                                                                                               |
| ----------------------- | --------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| E2E browsers            | Chromium + Firefox, desktop only              | **Add WebKit + 2 mobile emulations** | iOS Safari is the dominant workshop tablet; pinch/swipe code paths are untested today                               |
| E2E structure           | Flat specs with ad-hoc selectors              | **Page Object Model + fixtures**     | 4 specs / 12 tests cannot scale to ~400 journeys without shared page objects and an onboarding-dismiss fixture      |
| Selector policy         | 11 `data-testid`s, mostly role/name selectors | **Typed test-id registry**           | `src/test-ids.ts` (`as const`) imported by components and tests; roles/names remain first choice, ids for ambiguity |
| Download verification   | None (buttons only checked for visibility)    | **Parse every artifact**             | CSV rows, DXF entities, G-code tokens, PDF header + page count, SVG/PNG dimensions asserted against oracles         |
| Component coverage      | Excluded from thresholds                      | **Include with ratchet**             | Start at measured baseline, `scripts/coverage-ratchet.js` forbids regressions, +2 pp per release until 80 %         |
| Test strength           | Line coverage only                            | **Mutation testing (Stryker)**       | Coverage proves execution, not assertion. Score gate on engine hot paths; weekly full run                           |
| Oracles for calculators | Hard-coded expected numbers per test          | **Shared oracle tables**             | `tests/fixtures/oracles/*.json` used by both unit tests and E2E so UI results are checked against engine truth      |
| Flake policy            | 2 retries in CI                               | **Quarantine + 0 retries locally**   | `@flaky` tag moves a test to a non-blocking project for ≤ 1 sprint; retries never mask determinism bugs             |
| Visual regression       | 4 screenshots, 5 % threshold                  | **Per-view baselines, 1 %**          | One baseline per preview view × furniture type × theme; threshold lowered once fonts are self-hosted (already)      |
| Network mocking (MSW)   | Not used                                      | **Keep none**                        | App makes zero network calls; mocking would test nothing real. Catalog/plugin fetch is tested with `page.route()`   |

---

## 4. Verified Status Audit — Plan vs Reality (2026-09-27)

This section is the honest baseline the program plan in §7 is built on. Every row was verified by reading the code, not the docs.

### 4.1 Claim Corrections (stale statements found in project docs)

| Where                              | Claim                                                          | Reality                                                                                              | Fix (Sprint 300)                                     |
| ---------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| ROADMAP §5 / §6 (old)              | "4360+ tests"                                                  | 253 unit/component test files; live count is printed by `npm run test:summary` — badge must track it | Replace hard-coded counts with generated badge value |
| README badge                       | "950+ tests"                                                   | Same as above — two documents disagree with each other and with the suite                            | Single source: `scripts/vitest-reporter.js` output   |
| AGENTS.md → Docs                   | "Active roadmap → ROADMAP.md (Phase 33 — active)"              | Active phase is 62 (done) → 63 (next)                                                                | Update link text                                     |
| ROADMAP §3.7 (old)                 | "Node.js 26 LTS"                                               | `package.json#engines` says `>= 22`; CI matrix must match the documented floor                       | Corrected above                                      |
| ROADMAP §10 "Next (v5.31.0)" (old) | Listed error boundaries, grain-aware, docs ownership as _next_ | All three shipped (`ErrorBoundary.tsx`, `grain-constraint.ts`, `check-docs-freshness.js`)            | Section rewritten (§11)                              |
| ROADMAP §7 Phase B (old)           | Deep-linking, visual regression, mobile gestures "planned"     | All shipped (`url-state.ts`, `visual-regression.spec.ts`, `useTouchGestures.ts`)                     | Marked DONE below                                    |
| ROADMAP §4 (old)                   | "Hardware catalog: JSON hardware definitions"                  | True, but no drilling patterns — competitors ship boring/hinge patterns; recorded as a gap           | Phase 68 / Sprint 338                                |
| E2E docs                           | "E2E smoke + accessibility tests"                              | 4 spec files, 12 tests total, Chromium + Firefox only; no WebKit, no mobile, no download assertions  | Phases 63–64                                         |

### 4.2 Roadmap Item Status (30 items, evidence-based)

| #   | Item                                    | Status  | Evidence                                                                                             | Follow-up              |
| --- | --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | React Error Boundaries per panel        | DONE    | `src/components/layout/ErrorBoundary.tsx`; wraps all panels in `App.tsx`                             | Recovery UX → S318     |
| 2   | Visual regression (Playwright)          | PARTIAL | `tests/e2e/visual-regression.spec.ts` — 4 screenshots, 5 % threshold                                 | S316                   |
| 3   | Keyboard journey matrix                 | PARTIAL | `tests/components/keyboard-journeys.test.tsx` (jsdom only, Alt+N / Alt+D / ?)                        | S307, S316             |
| 4   | URL deep-linking `?tab=`                | DONE    | `url-state.ts#readTabFromUrl/pushTabToUrl`, 8 tests                                                  | E2E → S307             |
| 5   | Mobile gestures (pinch / swipe)         | DONE    | `useTouchGestures.ts`, `CabinetPreview.tsx` pointer + touch handlers; **untested in a real browser** | S310 mobile project    |
| 6   | OPFS persistence                        | MISSING | No `navigator.storage.getDirectory` anywhere; `idb-keyval` only                                      | S324                   |
| 7   | JSON Schema import validation           | PARTIAL | `schemaVersion` fields exist; no schema file, no structural validator with paths                     | S322–S323              |
| 8   | Project templates (kitchen/bath/closet) | PARTIAL | `cabinet-templates.ts`, `template-data.ts` (single cabinets incl. blind corner); no room-level kits  | S325                   |
| 9   | Batch ZIP export                        | PARTIAL | `utils/zip-writer.ts` + `utils/batch-export.ts` exist; no UI, no manifest, no E2E                    | S326                   |
| 10  | Release readiness report                | MISSING | No `scripts/release-readiness*`                                                                      | S360                   |
| 11  | Docs ownership / freshness              | DONE    | `scripts/check-docs-freshness.js`, `docs/OWNERSHIP.md`                                               | CI gate → S363         |
| 12  | OpenSSF Scorecard                       | MISSING | No workflow, no badge                                                                                | S361                   |
| 13  | Named expressions                       | DONE    | `parameter-expressions.ts`, `NamedExpressionsPanel.tsx`, `namedExpressionsSlice.ts`                  | E2E → S309             |
| 14  | Per-part grain constraint               | DONE    | `grain-constraint.ts`, `Part.grainConstraint`                                                        | —                      |
| 15  | Multi-material optimizer                | PARTIAL | `multi-stock-optimizer.ts`, `material-yield.ts`; one material per sheet by design (correct for wood) | Strategy search → S330 |
| 16  | Property-based tests                    | DONE    | `fast-check` 4.x; 3 `*.property.test.ts` files                                                       | Extend → S306, S329    |
| 17  | Export schema versioning                | DONE    | `export-schema.ts` (DXF / G-code / BOM CSV versions)                                                 | Doc → S342             |
| 18  | Worker health check / timeout           | MISSING | No timeout or supervisor in `src/workers/`, `src/store/worker-schedule.ts`                           | S317                   |
| 19  | WebGL / 3D orbit preview                | DONE    | `WebGLPreviewCanvas.tsx`, `webgl-probe.ts`, `webgpu-renderer.ts`, flag `VITE_ENABLE_WEBGL`           | E2E → S310             |
| 20  | Field-level validation messaging        | DONE    | `aria-invalid` + `aria-describedby` in `DimensionSliders.tsx`, `SliderInput.tsx`                     | E2E → S308             |
| 21  | Animated SVG assembly sequence          | MISSING | `AssemblyGuide.tsx` has CSS transitions only                                                         | S354                   |
| 22  | Plugin API                              | DONE    | `plugin.ts` v1.2, `plugin-v2.ts` v2.0, `plugin-marketplace.ts`, `docs/PLUGIN-API.md`                 | Publish → S364         |
| 23  | CRDT engine                             | DONE    | `crdt-sync.ts` (LWW); no backend by decision                                                         | Deferred               |
| 24  | Design tokens doc                       | MISSING | No `docs/DESIGN-TOKENS.md`                                                                           | S362                   |
| 25  | Community catalog import                | DONE    | `CatalogImportPanel.tsx`, `community-catalog.ts`, `catalog-import.ts`                                | v2 schema → S350       |
| 26  | Analytics engine (local)                | DONE    | `analytics.ts` — local usage events, no network                                                      | —                      |
| 27  | AI design assistant (rule-based)        | DONE    | `ai-assistant.ts` — constraint suggestions, no LLM                                                   | —                      |
| 28  | Undo / redo                             | DONE    | `cabinet-store.ts` past/present/future, 50 states                                                    | E2E → S307             |
| 29  | PWA / service worker / file handlers    | DONE    | `vite-plugin-pwa`, `manifest.json` file handlers, `usePwaFileHandlers.ts`                            | Offline E2E → S315     |
| 30  | Hardware catalog                        | PARTIAL | `catalog/hardware.json` 20+ items, bilingual; **no drilling patterns / SKUs**                        | S338, S351             |

### 4.3 Test-Suite Baseline (measured)

| Layer                   | Files | Notes                                                                                                       |
| ----------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| Unit — engine           | 175   | File count only; module-to-test mapping and assertion depth are unknown until Sprint 301                    |
| Unit — store            | 8     | 4 slices + 6 standalone stores; `cost-variance-store`, `stock-tracker-store`, `worker-schedule` uncovered   |
| Unit — utils            | 33    | Golden fixtures for BOM/DXF/G-code exist (`export-golden-baseline.test.ts`)                                 |
| Unit — hooks            | 3     | 8 hooks; `useCamera`, `useHaptics`, `useIntersectionVisible`, `useSwUpdate`, `useTouchGestures` uncovered   |
| Component (RTL + jsdom) | 31    | File count only; mounted component/control coverage must be mapped in Sprint 301                            |
| E2E (Playwright)        | 4     | 26 tests discovered across Chromium + Firefox; 5 Chromium smoke tests passed                                |
| Property-based          | 3     | cut-optimizer, geometry, stair/taper invariants                                                             |
| Bench                   | ✓     | `tests/bench/`, gated by `config/bench-budget.json`                                                         |
| Coverage thresholds     | —     | 85 / 78 / 83 / 85 (stmts / branches / funcs / lines) on engine + utils + store + hooks; components excluded |

The current run was measured on 2026-09-27 after `npm ci`: `npm test` passed
4,415 tests across 254 files; `npm run test:summary` reported 4,415 passed, 0
failed and 0 skipped (100%). `npm run test:coverage` passed with 91.64%
statements, 84.91% branches, 92.83% functions and 92.18% lines. Reports are
written under `%TEMP%\\WoodworkingShop\\` (`test-results.json`,
`test-summary.md`, and `coverage/`). Playwright discovered 26 tests across
Chromium and Firefox; `npm run test:e2e -- --project=chromium
tests/e2e/smoke.spec.ts` passed all 5 smoke tests. `npm run quality:fast` and
`npm run build` also passed. Reproduce with those repository-local commands; no
test count is inferred from the file inventory.

---

## 5. Best-in-Class Benchmark Comparison

### 5.1 Direct Competitors (refreshed)

| Capability                | WoodworkingShop                                           | Fusion 360           | SketchUp + OpenCutList    | Cabinet Vision / PolyBoard       | Shapr3D         | CutList Optimizer                        | Gap → Sprint                               |
| ------------------------- | --------------------------------------------------------- | -------------------- | ------------------------- | -------------------------------- | --------------- | ---------------------------------------- | ------------------------------------------ |
| Parametric control        | Named expressions + constraints                           | Excellent (timeline) | Medium                    | Excellent (rules)                | Medium          | Low                                      | Dependency graph view → S348               |
| Cut optimization          | MaxRects BSSF + guillotine, kerf, grain, offcuts, defects | Basic nesting        | Good (bin-pack, offcuts)  | Excellent (proprietary)          | None            | Excellent (multi-strategy, cut sequence) | Strategy search + cut sequence → S330–S331 |
| Edge banding in optimizer | Reported, costed; not applied to part size                | —                    | Yes (oversize + schedule) | Yes                              | —               | Yes                                      | S333                                       |
| Manufacturing output      | PDF + DXF + G-code + SVG + glTF + STEP + IFC              | DXF/STEP/CAM         | DXF/SVG                   | DXF/CNC post                     | STEP/DXF        | PDF labels                               | Toolpath simulator → S337                  |
| Drilling / hardware ops   | Calculators only (hinge bore, shelf pin)                  | CAM                  | —                         | Full (System 32, hinges, slides) | —               | —                                        | S338, S351                                 |
| Labels                    | Print sheet (text)                                        | —                    | Labels with QR / barcode  | Barcode labels                   | —               | Labels                                   | QR + Avery templates → S334                |
| Multi-project             | JSON project files + IDB                                  | Cloud project hub    | .skp files                | Project database                 | Cloud           | Single session                           | Templates + batch ZIP → S325–S326          |
| Accessibility             | WCAG 2.2 AA, RTL, 6 locales                               | Medium               | Low (13 langs, no RTL)    | Low                              | Medium          | Low                                      | **Lead — keep**; every-tab axe → S316      |
| Offline capability        | Full PWA                                                  | Limited              | Desktop only              | Desktop only                     | Limited         | Online only                              | OPFS + offline E2E → S315, S324            |
| Open source               | MIT, full codebase                                        | Proprietary          | GPLv3 plugin              | Proprietary                      | Proprietary     | Proprietary                              | **Lead — keep**                            |
| Price                     | Free                                                      | $70/mo               | $120/yr + free plugin     | $3000+                           | $25/mo          | $50 one-time                             | **Lead — keep**                            |
| Extensibility             | Plugin API v1.2 / v2.0                                    | SDK                  | Ruby API                  | Macros                           | None            | None                                     | Publish + template repo → S364             |
| Code quality / governance | Zero-suppression, gates, governance validators            | Unknown              | Community                 | Enterprise                       | Unknown         | Unknown                                  | Mutation score + Scorecard → S306, S361    |
| Assembly instructions     | Step-by-step + DAG + timer + PDF                          | Timeline animation   | None                      | CNC program                      | None            | None                                     | Animated sequence → S354                   |
| Material database         | User JSON catalog + community import                      | Built-in + store     | Plugin-provided           | Extensive built-in               | None            | Manual                                   | Species data v2 → S350                     |
| Version control           | JSON + snapshots + diff                                   | Cloud versioning     | Manual save               | DB revisions                     | Cloud auto-save | None                                     | Schema + migrations → S319, S322           |
| Units                     | Metric ↔ imperial decimal                                 | Both                 | Fractional inches         | Both                             | Both            | Both                                     | Fractional inches → S343                   |

### 5.2 Additional Projects Mined For Capabilities (new)

Capability sources reviewed on 2026-09-27: [OpenCutList repository](https://github.com/lairdubois/lairdubois-opencutlist-sketchup-extension), [OpenCutList product page](https://extensions.sketchup.com/extension/00f0bf69-7a42-4295-9e1c-226080814e3e/opencutlist), [Sparrow](https://github.com/JeroenGar/sparrow), [Boxes.py](https://github.com/florianfesti/boxes), and [Blender Home Builder](https://github.com/CreativeDesigner3D/home_builder).

Product capabilities are directional and must be reverified against official documentation before implementation. License labels apply to referenced software, not to ideas or independent implementations.

| Project (license)                                    | Category                  | Capability worth harvesting                                                                                                                             | Where it lands         |
| ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **OpenCutList** (GPLv3, SketchUp)                    | Cut list / diagrams       | Offcut & panel-of-any-size reuse, veneer + edge-banding material types, part outliner, labels with QR, CSV import of parts, weight report, 13 languages | S332, S333, S334, S350 |
| **Sparrow / jagua-rs** (MIT, Rust + WASM)            | Irregular 2D nesting      | State-of-the-art irregular strip packing in the browser (Sparrow Studio); SVG-as-exact-solution output                                                  | Spike S335 (deps rule) |
| **Deepnest / SVGnest** (MIT)                         | Irregular nesting         | DXF/SVG import of arbitrary shapes, genetic placement — reference for irregular part support                                                            | S335                   |
| **Boxes.py** (GPLv3, Python)                         | Parametric generators     | 100+ parametrised box/tray/shelf generators, finger-joint auto-sizing from thickness, kerf ("burn") compensation, flex/living-hinge cuts                | S349                   |
| **MakerCase** (web)                                  | Box generator             | Instant finger/T-slot box SVG; simple UI pattern for generators                                                                                         | S349                   |
| **Blender Home Builder** (GPLv3, add-on)             | Interior / cabinet design | Wall-based room layout, cabinet library drops snapping to walls, fillers/end panels, countertops, appliance library, 2D layout views with page sizes    | S345, S347             |
| **Sweet Home 3D** (GPLv2, Java)                      | Interior design           | Room drawing with walls/doors/windows, furniture catalog import, plan + 3D views, huge locale set                                                       | S347                   |
| **FreeCAD Woodworking Workbench** (LGPL)             | CAD                       | Timber list from solids, grain direction on parts, exploded assembly views                                                                              | S354                   |
| **Easel / Carbide Create** (web, proprietary)        | Browser CAM               | 2D toolpath preview and simulation, material/bit library, cut-depth passes, time estimate                                                               | S337                   |
| **Kiri:Moto / jscut / OpenBuilds CAM** (MIT/Apache)  | Browser CAM               | Client-side G-code generation with live 3D toolpath viewer, machine profiles, WebSerial streaming                                                       | S337                   |
| **ncviewer.com** (web)                               | G-code viewer             | Drag-and-drop G-code parsing and visualisation — pattern for our G-code preview modal                                                                   | S337                   |
| **CNCjs / UGS** (MIT)                                | G-code sender             | Job queue, macros, probing, serial reconnection — hardening ideas for `webserial-cnc.ts`                                                                | S317, S338             |
| **Shaper Studio** (web, proprietary)                 | SVG for handheld CNC      | Colour-coded SVG cut types (on-line / inside / outside / pocket / guide)                                                                                | S339                   |
| **Woodgears BigPrint** (proprietary)                 | Tiled printing            | 1:1 tiled printing of templates with registration marks across A4/Letter pages                                                                          | S340                   |
| **Blum DYNAPLAN / Hettich configurators** (web)      | Hardware                  | Hinge/slide selection driving exact drilling patterns and cup-hole positions                                                                            | S338, S351             |
| **Sagulator / Woodbin Shrinkulator** (web)           | Calculators               | Shelf sag & wood movement calculators — we already have these; cross-check numbers as oracles                                                           | S314 oracles           |
| **The Wood Database** (web)                          | Species data              | Janka, density, T/R shrinkage — schema for species records in the material catalog                                                                      | S350                   |
| **CutList Plus fx / MaxCut / OptiCut** (proprietary) | Cut list software         | Cut sequence for panel saws, label printing, shopping list by supplier, cost per project                                                                | S331, S334             |
| **Mozaik / Microvellum / eCabinet Systems**          | Cabinet manufacturing     | Door/drawer-front splitting rules, reveal/overlay calculators, 5-piece door parts, nested CNC output                                                    | S346                   |
| **Onshape FeatureScript** (proprietary)              | Parametric CAD            | Named variables with dependency introspection — informs the expression graph view                                                                       | S348                   |
| **Polyboard / Wood Designer** (proprietary)          | Cabinet design            | Rule-based construction methods (joinery per edge, hardware rules) applied project-wide                                                                 | S351, S352             |

### 5.3 Key Takeaways

1. **We already lead** on accessibility, RTL, offline, price, openness, export breadth (7 formats), and calculator breadth (50+ engines). No competitor combines these.
2. **Where we lose today**: optimizer _depth_ (cut sequencing, banding-aware sizing, multi-strategy search), hardware-driven **drilling patterns**, **fractional imperial**, **room-level design**, and **shop-floor labels with QR**.
3. **The single largest quality gap is verification**: 12 E2E tests for ~80 components and 7 tabs. Phase 63–64 fixes this before new features are added, so every later sprint ships with journey tests by contract.
4. **Irregular nesting** is the only capability requiring a new runtime dependency (WASM). It is a spike with a written decision, not a commitment.
5. **Community data** (OpenCutList model) remains the right path for materials/hardware — importable JSON with schemas, no vendor APIs.

---

## 6. Production Readiness Gates (Blocking)

All release candidates must pass every gate before tagging:

| Gate             | Command                          | Threshold                                                    |
| ---------------- | -------------------------------- | ------------------------------------------------------------ |
| TypeScript       | `npm run typecheck`              | Zero errors                                                  |
| ESLint           | `npm run lint`                   | Zero warnings (`--max-warnings 0`)                           |
| Stylelint        | `npm run lint:css`               | Zero warnings                                                |
| Markdownlint     | `npm run lint:md`                | Zero warnings                                                |
| Prettier         | `npm run format:check`           | All files formatted                                          |
| i18n coverage    | `npm run i18n:coverage`          | 100% EN/HE parity                                            |
| Unit tests       | `npm test`                       | All tests pass; publish measured count from a successful run |
| Golden exports   | `npm run exports:golden:check`   | BOM/DXF/G-code match fixtures                                |
| PDF budget       | `npm run pdf:budget`             | Size within bounds, zero errors                              |
| Component budget | `npm run components:budget`      | ≤600 lines or explicit exception                             |
| Bundle size      | `npm run bundle:check`           | Within `config/bundle-budget.json`                           |
| Benchmarks       | `npm run bench:check`            | Within `config/bench-budget.json`                            |
| Dead code        | `npm run dead:check`             | Zero unused exports/files                                    |
| Security         | Dependency review + secret scan  | No high/critical CVEs                                        |
| Template sync    | `npm run template:sync:validate` | All 11 assets verified                                       |
| Agent contracts  | `npm run agents:validate`        | All 9 agents parse correctly                                 |
| Prompt contracts | `npm run prompts:validate`       | All 22 prompts parse correctly                               |

Combined: `npm run ci` runs all of the above in CI.

---

## 7. Forward Program Plan (Phases 63–72)

### 7.1 Priorities, Sizing, and Sprint Contract

Priority: **P0** release blocker / data correctness / safety; **P1** core workshop workflow; **P2** competitive capability; **P3** optional polish. Size: **S** ≤ 0.5 day, **M** ≤ 2 days, **L** ≤ 5 days. A sprint is intentionally limited to a cohesive change and its tests; split any L sprint if implementation discovery increases scope.

No sprint is approved merely because a competitor has a feature. Benchmark-derived work must preserve local-first operation, deterministic geometry, zero production dependencies by default, MIT project licensing, and explicitly measured user value. In particular, do not copy GPL code or assets; learn from product behavior and implement independently. Revisit external project/license status before each feature begins.

The sprint contracts below are planned work, not claims of implementation. Sprint rows move to DONE only after acceptance evidence exists in CI and the shipped behavior is recorded in CHANGELOG and SPRINT-HISTORY.

### Phase 63 — Trustworthy Test Foundation (Sprints 300–306; target v5.33.0)

**Exit:** reproducible baseline; the test command works from a clean install; engine/store/hooks/components coverage has a baseline and no regression; all existing E2E specs run deterministically.

**Sprint 300 — Evidence baseline and roadmap correction** — P0 · M · no dependency.

- T1: Verify clean install (`npm ci`), Node/npm engines, lockfile and workspace/hoisting assumptions; record exact supported command and do not approve any interactive `npx` fallback.
- T2: Run `npm test`, `npm run test:summary`, `npm run test:coverage`, and `npm run test:e2e` using the declared local executables. Capture exit code, test/file counts, skipped tests, coverage report location and browser versions in CI artifacts.
- T3: Resolve why Vitest was not found in this environment; make `test:summary` use the repository-local Vitest binary and emit a useful missing-install diagnostic without silently fetching a different major version.
- T4: Reconcile ROADMAP, README badges, AGENTS.md, copilot instructions, `vitest.config.ts`, `playwright.config.ts`, and sprint history. Remove unverified fixed test counts; record date and reproducible source for all counts.
- Tests: script tests for missing executable, JSON output missing/invalid, zero tests, failed tests, skipped tests; clean-checkout smoke.
- Accept: `npm ci` then `npm test`, `npm run test:summary`, and one Chromium E2E smoke finish without network package resolution; documents agree on phase/version and describe actual gates.

**Sprint 301 — Coverage map and ownership** — P0 · M · S300 · DONE 2026-09-28.

- T1: Generate a source-to-test inventory for `src/engine`, `src/utils`, `src/store`, `src/hooks`, and `src/components`; distinguish direct tests, indirect integration-only coverage, and uncovered production modules.
- T2: Add focused unit tests first for uncovered stores (`cost-variance-store`, `stock-tracker-store`, worker scheduling) and uncovered hooks (`useCamera`, `useHaptics`, `useIntersectionVisible`, `useSwUpdate`, `useTouchGestures`).
- T3: Baseline per-directory statements/branches/functions/lines; add a coverage ratchet that cannot lower baseline and raises targets only after the measured baseline is committed.
- Tests: fake timers, storage failures/quota, permission denied, observer unavailable/intersection transitions, worker rejected/timed-out/aborted.
- Accept: coverage report names every uncovered file; no silent exclusion beyond generated/types/barrel files with written rationale; store/hook behaviors tested at boundary conditions.

Evidence: 351 production modules inventoried (257 direct, 71 indirect integration-only, 23 uncovered, 0 not measured); all Sprint 301 store/hook targets have direct tests. Coverage exclusions are limited to engine type declarations and the public API barrel. The full suite passed 4,465 tests and the coverage ratchet passed.

**Sprint 302 — Test fixtures, accessibility queries, and deterministic reset** — P1 · M · S300 · DONE 2026-09-28.

- T1: Establish shared app fixture that dismisses onboarding and gesture tutorial, resets IndexedDB/localStorage, controls time, and starts from a named cabinet state.
- T2: Create typed test fixture builders for projects, materials, hardware, optimizer outputs and downloadable formats; prohibit shared mutable fixtures between tests.
- T3: Add accessible-name/role queries first; add `data-testid` only for genuinely unnamed SVG/canvas/virtualized targets, with one registry and lint rule if justified.
- Tests: fixture isolation order randomization; RTL render helpers; confirm no test depends on execution order.
- Accept: any test can run alone or shuffled; no selectors depend on styling class names; test setup restores mocks, timers, storage and URL after each case.

Evidence:

- Shared Playwright contexts reset IndexedDB per test; the app fixture clears local/session storage, fixes time, dismisses overlays, and verifies the default `Cabinet 1` state.
- Typed fixture builders return independent nested data, and the legacy shared sheet fixture is frozen. Added isolated RTL render support and centralized per-test cleanup.
- Migrated accessible queries, removed serial execution and style-dependent assertions, and fixed a storage-mock leak exposed by shuffled tests.
- Seeded shuffle passed 4,470 tests; all 26 Chromium/Firefox E2E tests passed; `npm run ci` passed quality, tests, build, bundle, and all 16 benchmark budgets.

**Sprint 303 — Pure-engine invariant matrix I** — P0 · L · S301 · IN PROGRESS 2026-09-28.

- T1: Inventory each exported engine function in `src/engine/` and map happy path, boundary, invalid input, unit system, determinism, and interaction/composition cases to tests.
- T2: Expand `fast-check` coverage for dimensions, part generation, grain/rotation, kerf, cut bounds, no-overlap, material yield, cost, joinery, and named expressions; persist minimal shrunk regression seeds.
- T3: Cross-check engineering calculators against independently sourced reference examples and dated provenance in `tests/fixtures/oracles/`; never treat a second call to the same function as an oracle.
- Tests: finite-number constraints; min/max and just-outside values; zero/negative/NaN/infinity; mm/inches conversion; reproducibility under fixed seeds; multi-cabinet composition.
- Accept: engine inventory has an explicit status per exported function; high-risk geometry/optimizer modules have independent invariants and oracle tests; every regression is a named example plus generated property.

Progress (2026-09-28): Added generated checks for shelf deflection, hinge positions, panel weight, part generation, optimizer bounds and kerf clearance, material-yield conservation, cost arithmetic, box-joint geometry, and named-parameter dependency order.

Added a dated JSON birch-weight oracle sourced from Engineering ToolBox (510–770 kg/m³ for seasoned, dry wood). The generated optimizer property exposed a diagonal placement with insufficient kerf; candidate-level clearance checks and a named regression now cover it.

The TEMP function inventory lists 632 exported engine functions: 614 have a recognized direct test-file call and body-line hits, 13 have body-line hits without a recognized direct call, none are uncovered, and 5 declarations are not measured. These are static call-site and LCOV line-hit indicators, not per-function behavioral coverage guarantees.

The function CSV maps literal direct test titles to 612 exports, including `it.each` cases. The remaining two direct-call matches do not have a statically recognized literal test title; this is AST traceability, not proof that every listed test asserts every behavior.

`getMaterialResult` has direct success, custom-material, and error-result tests; `getMachineProfile` has cases for all registered IDs and an unknown ID; `defaultTokenGenerator` has length and URL-safe alphabet checks; `applyValidationPlugins` has empty-registry, transformation, and registration-order checks; and the Web Serial adapter has availability, connection, streaming, abort, and disconnect tests.

Latest verification: `npm run ci` passes with 4,593 tests across 283 files, all configured quality gates, the production build, bundle budgets, and all 16 benchmarks within budget.

**Sprint 304 — Store, persistence, import/export contract matrix** — P0 · L · S301.

- T1: Exercise every exported store action: initial state, valid transition, invalid/no-op input, undo/redo, reset, persistence, reload and cross-slice effects. DONE.
- T2: Test IDB/localStorage unavailable, corrupted record, stale schema, quota, partial write, duplicate project id, concurrent save, deletion and migration recovery. DONE.
- T3: Verify each import/export round trip preserves semantically relevant state and intentionally omits ephemeral UI state. DONE.
- Tests: fake-indexeddb transaction failures; legacy fixtures; unknown and future schema versions; Unicode/RTL names; empty and very large projects.
- Accept: corrupted input never mutates live state; recoverable errors are actionable; round-trip comparison uses canonical normalized project snapshots.

Progress (2026-09-28): `migrateProject` rejects malformed cabinet entries and incomplete cabinet configs before import persistence; regression tests cover null entries, missing names/configs, and invalid config objects.

Persisted project reads validate every record through the same migration boundary. Corrupt IndexedDB data and unsupported future schema versions produce an actionable error and are not overwritten by a later save; regression tests cover corrupt reads and write preservation.

Imported snapshot history validates each snapshot record and its nested cabinets before either project or snapshot storage is changed. Regression cases cover null records, missing fields, and malformed nested cabinets while preserving valid snapshot round-trips.

Project imports compensate for cross-store partial writes: if project persistence fails after snapshot history is saved, the prior snapshot list is restored. Tests cover successful rollback and report both errors if rollback itself fails.

Legacy localStorage migration now rejects malformed JSON and non-array payloads instead of silently caching an empty list; migration writes occur only after the legacy value passes the array-shape check. Projects, saved configs, and snapshots also reject corrupt non-array IndexedDB values rather than treating them as empty storage.

Unavailable localStorage during first-run migration produces an actionable failure and leaves the IndexedDB key unset; a regression simulates browser `SecurityError` behavior.

Persistence operations now fail with an explicit `IndexedDB is unavailable` error when the browser API is absent, before attempting legacy localStorage migration. A regression verifies the failure is surfaced and no legacy-storage read occurs.

T2 is complete: regressions cover unavailable IndexedDB and localStorage, corrupt and unsupported-schema data, quota failures, snapshot rollback after partial writes, project-ID collisions, concurrent saves, deletion failure/retry, and legacy migration recovery.

New project IDs use `crypto.randomUUID()` and are checked against existing IDs for saves, single-project imports, and bundle imports. A fixed-clock regression covers same-millisecond saves; the PWA parser test verifies the generated UUID format.

Project-list mutations are serialized across saves, deletes, single-project imports, and bundle imports. A concurrent-save regression first reproduced a lost project, then verified both writes survive through the mutation queue.

Deletion failure coverage verifies the storage error is propagated, raw project data remains unchanged, and a subsequent retry succeeds without poisoning the mutation queue.

Quota failure coverage verifies the error propagates, existing project data remains intact, and a later save succeeds. The same regression exercises recovery of the serialized mutation queue after the failed write.

Single-project and bundle export/import round-trip coverage verifies cabinets and snapshot history survive, project IDs are regenerated, and ephemeral UI-only fields are omitted from the exported JSON. Both exporters serialize an explicit `SavedProject` field allowlist so runtime-only properties cannot leak into downloads. Hebrew, Arabic and Japanese names, empty projects, and 250-cabinet projects are covered across the export/import paths.

Cabinet-store action coverage verifies `resetConfig` resets only the active cabinet, recomputes derived dimensions, and restores the prior config through undo/redo.

Store-level integration tests also verify mirror creation, project loading with undo, empty-project load as a no-op, bulk material replacement across cabinets with undo and same-key no-op behavior, and invalid-index no-ops for remove, rename, notes, duplicate, mirror, select, move, and defect-zone removal actions. Selecting different cabinets verifies the active config and derived dimensions update together. Invalid defect-zone indices return before shared catalog mutation or optimizer scheduling.

Optimizer `loadSettings` coverage verifies full-state hydration, numeric clamping, and exactly-once rescheduling. The regression caught raw negative cost values reaching the cost callback despite normalized store values; both now use the same normalized settings snapshot.

UI-slice action tests now cover trimmed build-log insertion, deletion and clear persistence, focus-mode toggling, and cut-checklist completion, unchecking, and clearing with persistence.

T1 is complete: exported actions across the cabinet, UI, optimizer-settings, snapshot, and named-expression slices have action-level coverage for state transitions, applicable invalid/no-op cases, undo/redo, persistence/reload, and cross-slice derived-state or rescheduling effects.

Sprint 304 verification: `npm run ci` passes with 4,592 tests across 283 files; production build, bundle budgets, and all 16 benchmarks pass. T1, T2, and T3 are complete. T3 covers single-project and bundle round-trips with snapshots, omitted ephemeral state, Unicode/RTL names, empty projects, and 250-cabinet projects.

Session persistence coverage verifies the cabinet store's debounced autosave writes the latest active configuration after 500 ms and a fresh store initialization after simulated reload restores cabinet config, project name and notes from localStorage.

Worker-backed store action tests cover rotation-lock toggling, offcut catalog set/add/remove, and material-scoped defect-zone add/remove behavior.

Full `npm run ci` passed with 4,583 tests across 283 files, production build and bundle budgets passing, and all 16 benchmarks within budget. Remaining store-action, IndexedDB failure, and round-trip matrix tasks are still open.

**Sprint 305 — Component behavior foundation** — P1 · L · S302.

- T1: Build a component test inventory from rendered components and their interactive controls; cover every high-use parent/panel and error/loading/empty states.
- T2: Add `userEvent` interaction tests for configuration fields and conditional panel visibility; test observable store/preview/parts changes rather than implementation calls.
- T3: Add component coverage to the measured ratchet, beginning at current baseline; prioritize reducers and UI branches with user-facing effects.
- Tests: accessible labels, keyboard input, validation, disabled states, async completion/error, focus restore, RTL direction, locale formatting.
- Accept: all controls touched in this sprint have positive and negative behavior assertions; no suppression, brittle shallow rendering, or class-based selector.

Progress (2026-09-29): Optimizer table tests now exercise material filtering and reset, part search and bidirectional dimension sorting, hardware search by supplier, and quantity override/reset/sorting through accessible controls. The broader component inventory and remaining high-use panel coverage are still open. Full `npm run ci` passed with 4,641 tests across 284 files, production build, bundle budgets, and all 16 benchmarks.

Follow-up (2026-09-29): Added `userEvent` journeys for furniture-type conditional controls and generated
panel parts, joinery selection, custom shelf-position editing/reset, door count/style effects on
generated parts and hinges, drawer-count-dependent slide selection, and reset confirmation/cancellation.
The coverage report now measures 48.4% component statements (up from 41.3% in the prior baseline);
`npm run test:coverage:ratchet:update` passed without lowering any area floor. Full `npm run ci`
passes with 4,648 tests across 284 files, production build, bundle budgets, and all 16 benchmarks.

Follow-up (2026-09-29): Added user-level calculator journeys for dado/rabbet validation and
conditional inputs, stair-stringer IRC warnings, symmetric taper settings, finish-dependent volume
and drying time, and glue volume across joint count and glue type. Component coverage increased to
49.95% statements (1,787/3,577); the coverage ratchet update passed without lowering any area floor.
Full `npm run ci` passed with 4,653 tests across 289 files, production build, bundle budgets, and
all 16 benchmarks. The broader component inventory and remaining high-use panel coverage are still open.

Follow-up (2026-09-29): Added user-level Configure journeys for cabinet add/rename/remove, dimension
unit conversion and hard-limit rollback, back-panel/material conditional state, door style and
hardware changes, and drawer slide/height/count behavior. The component coverage ratchet now measures
50.62% statements (1,811/3,577), 45.29% branches, 41.83% functions, and 51.58% lines; no area floor
was lowered. The coverage run passed 4,658 unit tests and 288 component tests across 53 files.
Full `npm run ci` passed with 4,658 tests across 293 files, production build, bundle budgets, and all
16 benchmarks.

Follow-up (2026-09-29): Added project-manager save/load/search interactions, snapshot comparison and
close behavior, community-material preview/add and fetch-error preservation, custom-material add/edit/remove,
and hardware-catalog replace/invalid-file preservation. Corrected invalid nested buttons in the snapshot
panel by making compare and expand actions siblings. Component coverage now measures 54.54% statements
(1,951/3,577), 47.95% branches, 46.24% functions, and 55.55% lines; the ratchet passed with no lowered
area floor. The coverage run passed 4,666 unit tests and 296 component tests across 58 files. Full
`npm run ci` passed: 4,666 tests across 298 files, production build and bundle budgets passed, and all
16 benchmarks stayed within budget. Sprint 305's broader component inventory and remaining high-use
panel coverage are still open.

Follow-up (2026-09-29): Added interaction coverage for quick presets, saved configurations,
constraint repairs, cost editing, and custom shelf spacing. Fixed custom clearance entry so replacing
the value does not clamp each intermediate keystroke, and labeled the finish-cost edit button for
assistive technology. Component coverage now measures 55.72% statements, 49.19% branches, 48.48%
functions, and 56.70% lines; the ratchet passed with 4,677 unit tests and 307 component tests and no
lowered area floor. Full `npm run ci` passed with 4,677 tests across 303 files, production build and
bundle budgets passing, and all 16 benchmarks within budget. Sprint 305's broader component inventory
remains open.

Follow-up (2026-09-30): Added interaction coverage for cost summary export, actual-cost variance editing,
optimizer suggestion apply/restore, material sheet-size overrides, and shopping-list grouping/collapse.
Added translated accessible names for the material summary's icon-only size controls. The coverage
ratchet passed with 4,682 unit tests and 312 component tests; component coverage now measures 57.40%
statements, 50.87% branches, 51.02% functions, and 58.24% lines without lowering an area floor.
Sprint 305's broader component inventory remains open.

Follow-up (2026-09-30): Added interaction coverage for project-wide material replacement, optimized-vs-original
comparison metrics, template application, persisted CNC machine-profile selection, and PDF page settings/download.
The template journey exposed 16 built-in templates referencing the nonexistent `hdf-3` key; these now use the
registered `mdf-3` material. The coverage ratchet passed with 4,687 unit tests and 317 component tests;
component coverage now measures 61.03% statements, 53.41% branches, 53.87% functions, and 62.00% lines,
without lowering an area floor. Added an engine regression guard requiring every built-in template's carcass
and back-panel materials to exist in the material registry. Full `npm run ci` passed with 4,688 unit tests
across 313 files, production build and bundle budgets passing, and all 16 benchmarks within budget.
Sprint 305's broader component inventory remains open.

Follow-up (2026-09-30): Added interaction coverage for cut-plan material grouping, cut checklist progress/reset,
stock tracking, offcut catalog save/delete, and waste analytics. Associated the stock-add labels with their inputs
so the fields expose accessible names. The coverage ratchet passed with 322 component tests; component coverage
now measures 62.01% statements, 54.70% branches, 56.16% functions, and 62.92% lines without lowering an area floor.
Full `npm run ci` passed with 4,693 unit tests across 318 files, a 2,791.4 KB bundle under the 2,960 KB budget,
and all 16 benchmarks within budget. Sprint 305's broader component inventory remains open.

Follow-up (2026-09-30): Added component journeys for build-log keyboard save/focus/clear, grain-report grouping,
quantity-expanded part labels and print output, G-code preset regeneration/download, and optimizer explanation
statistics. Added cabinet-store recovery coverage for malformed, missing, and unavailable session data plus
shared-link overrides.
The coverage ratchet passed with 4,703 unit tests and 328 component tests; component coverage now measures
64.05% statements, 57.12% branches, 59.10% functions, and 64.83% lines without lowering an area floor.
Full `npm run ci` passed with 4,703 tests across 323 files, a 2,791.4 KB bundle under the 2,960 KB budget,
and all 16 benchmarks within budget. Sprint 305's broader component inventory remains open.

Follow-up (2026-09-30): Added calculator interaction coverage for cabinet-door sizing, drawer slide clearances,
kerf-bend material feasibility, screw pull-out density/rating changes, and wood-turning operation/diameter speeds.
The coverage ratchet passed with 4,708 unit tests and 333 component tests; component coverage now measures
65.90% statements, 59.03% branches, 61.30% functions, and 66.86% lines without lowering an area floor.
Full `npm run ci` passed with 4,708 tests across 328 files, a 2,791.4 KB bundle under the 2,960 KB budget,
and all 16 benchmarks within budget. Sprint 305's broader component inventory remains open.

Follow-up (2026-09-30): Added component interaction coverage for defect-zone validation, camera support and retake
states, Web Serial support and empty-sheet guards, Smart Optimizer strategy selection/results, and saved-configuration
deletion. The coverage ratchet passed with 4,715 unit tests and 340 component tests; component coverage now measures
66.76% statements, 60.56% branches, 62.77% functions, and 67.69% lines without lowering an area floor. Full
`npm run ci` passed with 4,715 tests across 332 files, a 2,791.4 KB bundle under the 2,960 KB budget, and all 16
benchmarks within budget. Sprint 305's broader component inventory remains open.

Follow-up (2026-09-30): Added component interaction coverage for Marketplace filtering/install persistence, mobile
Sidebar Escape-close, snapshot save/restore/delete, PDF render-error recovery, and optimizer cutting controls. The
coverage ratchet passed with 4,720 unit tests and 345 component tests; component coverage now measures 67.94%
statements, 61.53% branches, 64.73% functions, and 68.83% lines without lowering an area floor. `npm test` passed
with 4,720 tests across 335 files. The production build, bundle check (2,791.4 KB / 2,960 KB), and all 16
benchmarks passed. Full `npm run ci` remains blocked by the pre-existing expired component-budget exception for
`src/components/preview/CabinetPreview.tsx`; Sprint 305 remains open.

Follow-up (2026-09-30): Added component behavior coverage for Marketplace no-results search, live mobile Sidebar
summary totals, empty snapshot history, PDF project-settings export, and optimizer low-yield/material-consolidation
recommendations. The coverage ratchet passed with 4,725 unit tests and 350 component tests; component coverage now
measures 68.13% statements, 62.04% branches, 64.97% functions, and 69.01% lines without lowering an area floor.
`npm test` passed across 335 files. Production build, bundle check (2,791.4 KB / 2,960 KB), and all 16 benchmarks
passed. Full quality/CI remains blocked by the pre-existing expired component-budget exception for
`src/components/preview/CabinetPreview.tsx`; Sprint 305 remains open.

Follow-up (2026-09-30): Added 25 component behavior tests across material usage, optimizer controls, Marketplace,
PDF import/full-project export, and saved-project workflows. The coverage ratchet passed with 4,750 unit tests and
375 component tests; component coverage now measures 69.98% statements, 63.37% branches, 66.61% functions, and
70.89% lines without lowering an area floor. The full unit suite, production build, bundle check (2,791.4 KB /
2,960 KB), and all 16 benchmarks passed. Quality remains blocked only by the pre-existing expired component-budget
exception for `src/components/preview/CabinetPreview.tsx`; Sprint 305 remains open.

**Sprint 306 — Mutation testing and quality evidence** — P1 · M · S303–S305.

- T1: Evaluate Stryker on a bounded set of critical pure-engine modules (`dimensions`, `parts`, `cut-optimizer`, `validation`, export serializers); record runtime and mutant categories.
- T2: Fix surviving mutants by improving assertions; document equivalent mutants and explicitly exclude only those with evidence.
- T3: Add weekly/nightly mutation workflow; begin with report-only threshold, then set a measured blocking threshold after one baseline cycle.
- Tests: mutation run in a dedicated isolated command; CI does not run the full suite on every PR until runtime is proven acceptable.
- Accept: score and surviving mutants are artifacts; CI primary workflow remains within agreed budget; no score threshold invented before baseline.

### Phase 64 — Real User Journeys and Browser Confidence (Sprints 307–318; target v5.34.0)

**Exit:** each primary workflow is exercised in a real browser through user-visible controls; export downloads are opened and checked; Chromium, Firefox, WebKit and selected mobile projects pass; accessibility scans cover all tabs and modal states.

**Sprint 307 — App shell journeys** — P0 · L · S302.

- T1: Header tabs by click, Alt+1…6 and direct `?tab=` URL; assert selected tab, panel content, browser back/forward and invalid-tab fallback.
- T2: Undo/redo by header button and Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z after changing a dimension; assert value and generated part list restoration.
- T3: Dark mode, metric/imperial, language (EN/HE/AR/DE/ES/FR), focus mode, help/onboarding, keyboard-shortcuts modal, Escape/focus return.
- T4: Reset config and add/switch/rename cabinet; assert confirmation behavior, active index URL, project state and toast.
- Tests: desktop keyboard journey matrix, role/name assertions, keyboard-only flow, browser history.
- Accept: every global header control has a browser test proving its visible state/result; shortcuts do not trigger while typing in editable controls.

Progress (2026-09-28): Sprint 307 T1–T4 are DONE. The 32-test smoke spec passes in Chromium and Firefox. T1 covers click and Alt+1…6 navigation across six panels, direct URLs for all seven tabs, Back/Forward panel restoration, shortcut suppression while editing, and invalid-tab fallback.

T2 is DONE: header Undo and keyboard Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z restore both the dimension value and generated Top Panel length. Fixed Enter followed by blur committing the same dimension twice. Full CI passes: 4,593 tests across 283 files, all quality/build/bundle gates, and 16 benchmarks within budget.

T3 is DONE: browser journeys cover dark mode by button and Alt+D, metric/imperial conversion, all six locale labels and RTL/LTR direction, focus mode, onboarding and keyboard-shortcuts dialogs, Escape dismissal, and focus restoration. The shared focus trap restores focus to its opener.

T4 is DONE: reset requires localized confirmation, and cabinet add/switch/rename/reload/shortcut journeys verify URL index, project state, and toast. The browser test proves a valid `?cab=` index takes precedence over conflicting persisted session state. Full CI passes with 4,603 tests across 283 files, all quality/build/bundle gates, and all 16 benchmarks within budget; all 32 smoke tests pass in Chromium and Firefox.

**Sprint 308 — Configurator and validation journeys** — P0 · L · S305, S307.

- T1: Test every dimension slider and adjacent numeric text entry both directions; assert normalized value, part dimensions and preview update; include bounds, invalid text and reset.
- T2: Click each furniture type, joinery type, carcass/back material, back panel, shelf count/spacing/support, door count/style/handle, drawer count/slide, edge banding and panel thickness source; assert dependent controls and generated parts update correctly.
- T3: Exercise validation warnings and each repair/fix action; verify selected value, message removal, focus and screen-reader relation.
- T4: Test cabinet selector add/remove/rename/duplicate/mirror/reorder and active cabinet switch; verify multi-cabinet optimizer/assembly/PDF reflect intended cabinet.
- Accept: all rendered controls in `ConfiguratorPanel` and children are enumerated and covered; each option has an asserted state or output delta, not just “click succeeded”.

Progress (2026-09-28): Sprint 308 T1 is DONE. Browser coverage verifies width, height, and depth slider/text synchronization in both directions, an exact 20 mm Top Panel cut-list delta, updated preview part titles, recommended-range clamping, hard-limit rejection and recovery, and reset to the initial configuration. All 34 smoke tests pass in Chromium and Firefox; `npm run ci` passes with 4,603 tests across 283 files, all quality/build/bundle gates, and all 16 benchmarks within budget.

T2 is DONE: browser journeys cover all furniture types, joinery selections, carcass/back materials, back-panel inclusion, panel thickness source, shelf count/spacing/support, door count/style/handles, and drawer count/slides. Each option has a resulting part or hardware assertion. Fixed `doors-only` edge banding so non-door parts remain unbanded.

All 56 E2E tests pass in Chromium and Firefox. `npm run ci` passes with 4,606 tests across 283 files, all quality/build/bundle gates, and all 16 benchmarks within budget.

T3 is DONE: component coverage exercises all 11 distinct repair actions against production-generated validation issues,
asserting the resulting configuration, issue removal, keyboard focus continuity, and the live issue-list relationship.
Browser coverage verifies centre-support and back-panel repairs update their controls, clear warnings, preserve focus, and
retain the polite live region. Fixed the wide-span warning so adding the recommended centre support resolves the
condition. All 58 E2E tests pass in Chromium and Firefox; `npm run ci` passes with 4,620 tests across 283 files, all
quality/build/bundle gates, and all 16 benchmarks within budget.

T4 is DONE: browser journeys cover cabinet add/remove/rename/duplicate/mirror/reorder and active-cabinet switching, including accessible cabinet-specific remove names. Assertions verify the optimizer's multi-cabinet summary and active parts, assembly updates, and current-cabinet/full-project PDF download names. All 62 E2E tests pass in Chromium and Firefox; `npm run ci` passes with 4,620 tests across 283 files, all quality/build/bundle gates, and all 16 benchmarks within budget.

**Sprint 309 — Save/load, templates, catalogs, expressions and project management** — P1 · L · S304, S307.

- T1: Save/load project, import/export JSON, share URL/copy, snapshots save/restore/delete/diff, branch/compare; include cancel, invalid file, corrupt data and duplicate names.
- T2: Apply every built-in preset; assert configuration and generated parts; save and reload a user preset.
- T3: Add/edit/delete custom material; import valid/invalid catalog and hardware data; assert schema errors, merge/replace choice and no partial write on failure.
- T4: Add/edit/evaluate/remove named expressions; test dependency order, cycles, unknown names, invalid math, dimension bounds and resulting preview/cut-list change.
- Accept: each SaveLoadPanel/ProjectManagerModal action completes its intended persistence/download/URL behavior with a browser-observable assertion.

T1 is DONE: browser journeys verify project save/load, same-name replacement, JSON export/import, canceled save,
malformed and structurally invalid imports, native-share cancellation with clipboard fallback, and snapshot
save/restore/delete/diff. Fixed snapshot ID collisions when multiple saves occur in the same millisecond. Branch/fork
and project diff remain utility-level operations, covered by `tests/utils/project-branching.test.ts`. All 66 E2E tests
pass in Chromium and Firefox; `npm run ci` passes with 4,620 tests across 283 files, all quality/build/bundle gates,
and all 16 benchmarks within budget.

T2 is DONE: browser coverage applies all six built-in presets and asserts their dimensions, furniture type, and
representative generated cut-list parts. A named saved configuration survives page reload, restores its dimensions,
and regenerates the expected cut-list output. All 68 E2E tests pass in Chromium and Firefox; `npm run ci` passes
with 4,620 tests across 283 files, all quality/build/bundle gates, and all 16 benchmarks within budget.

T3 is DONE: browser journeys cover custom-material add/edit/delete, valid/invalid community URL catalog imports, and
custom-hardware JSON import with schema validation, duplicate-ID rejection, merge/replace selection, and failure
atomicity. Invalid community catalog rows are rejected before cached materials or metadata are written. `npm run ci`
passes with 4,632 tests across 284 files; all 74 Chromium/Firefox E2E tests pass with two workers.

T4 is DONE: mounted the named-expression panel and added edit, remove, live evaluation, and applying expressions to
width/height/depth with hard dimension bounds. The evaluator now uses the existing allowlisted arithmetic parser,
avoiding CSP-blocked dynamic code execution; errors for cycles, unknown variables, unsupported math, and non-finite
results are surfaced. Component and browser tests verify out-of-range non-mutation and a valid width expression
changes generated Top Panel geometry. `npm run ci` passes with 4,638 tests across 284 files; all 76 Chromium/Firefox
E2E tests pass with two workers.

**Sprint 310 — Preview, gestures, canvas and 3D** — P1 · L · S307.

- T1: DONE — Browser coverage clicks all six views and asserts active selection, 2D viewBox geometry, non-empty drawing geometry, and dimension-toggle visibility/resizing.
- T2: DONE — Browser coverage parses the exported SVG and validates its selected-view geometry; checks the PNG signature, IHDR dimensions at 2×, sanitized filenames, and current-view exports after switching views. All 80 Chromium/Firefox E2E tests pass.
- T3: DONE — Added touch-cancel lifecycle handling and synchronized pinch zoom state on successful view swipes. Hook tests cover pinch/swipe cleanup and thresholds; browser checks cover wheel zoom bounds, orbit dragging and pointer cancellation, swipe boundaries, pinch scale, and touch cancellation. All 82 Chromium/Firefox E2E tests pass.
- T4: DONE — Mounted the existing interactive 3D panel in Preview, verified explode/wireframe/edge-band/zoom controls, feature-disabled behavior, capability fallback, and nonblank WebGL canvas with a flag-enabled production build. Static WebGL rendering preserves its drawing buffer for visible output. Full `npm run ci` passes with 4,641 tests across 284 files; all 86 Chromium/Firefox E2E tests pass.
- Accept: DONE — Chromium, Firefox, WebKit desktop, and iPhone WebKit render all six views without document overflow; 24 canonical Chromium baselines cover cabinet/bookshelf, light/dark, and LTR/RTL combinations. The screenshot assertion is intentionally Chromium-only; responsive/view behavior runs in all four projects.

**Sprint 311 — Optimizer controls and table journeys** — P0 · L · S305, S307.

- T1: DONE — E2E verifies kerf changes part placement; sheet-size overrides update SVG dimensions; material, edge-band, labour and finish edits increase visible costs; guillotine mode updates cut rationale; rotation lock, auto co-nest, color-blind mode, grain hatch and labels update accessible or rendered output. Six optimizer E2E tests pass in Chromium and Firefox.
- T2: Search/filter/sort parts and hardware tables; bulk replace material; add/remove stock and offcuts; create/edit defect zones; verify constraints and persistent settings.
- T3: Exercise SmartOptimizer strategies, compare runs, cut checklist and sheet virtualization; assert source candidate/config and selected parts correspond to rendered sheet.
- T4: Assert yield meter range and accessible value, waste analytics, grain conflicts, material summary and shopping list against engine oracles.
- Accept: every visible optimizer option has a browser test with a specific expected state/data delta; no reliance on invisible React state.

**Sprint 312 — Export downloads as real artifacts** — P0 · L · S304, S311.

- T1: Trigger BOM CSV and hardware CSV; assert filename, UTF-8/BOM policy, delimiter, headers, row count, quantities, locale, escaping and no formula injection.
- T2: Trigger DXF and G-code; parse entities/commands, units, extents, kerf, tool settings, safe retract, bounds, part labels and schema header against golden/oracle fixtures.
- T3: Generate part labels and print sheets; assert QR payload resolves to part, SVG/print page size, clipping and repeated labels.
- T4: Generate PDF; assert `%PDF-`, page count, text extraction for critical headings/dimensions, options and multi-cabinet inclusion, no overflow/warnings beyond budget.
- T5: Generate ZIP and inspect every entry, manifest, path safety, checksums and file contents once batch UI exists; until then cover existing writer/engine at unit level.
- Accept: tests listen for actual browser download events, read bytes and validate content; a visible button alone never counts as export coverage.

**Sprint 313 — Assembly, build log, camera and machine flows** — P1 · L · S305, S307.

- T1: Next/previous step, all-steps mode, tips toggle, mark/unmark/reset completion; assert dependency gating and progress/time counters.
- T2: Add/edit/delete build log entry; Ctrl/Cmd+Enter; reload persistence; attach/capture camera photo with denied permission, no device and granted permission.
- T3: Select machine profile; validate G-code compatibility and serial connection lifecycle with browser API stubs (connect, send, pause, disconnect, reconnect, errors).
- T4: Print and download checklist; parse expected step order/text and filename.
- Accept: each step control changes progress/instructions, persisted build state reloads accurately and permissions/device failures remain recoverable.

**Sprint 314 — All calculator panels and numeric oracles** — P0 · L · S303, S305.

- T1: Add component-level browser interactions for every calculator panel mounted by `CalculatorsPanel`: expand/collapse, enter valid values, choose each option and assert computed output/units.
- T2: Cover calculators: finish, face frame, cabinet door, drawer box, screw pullout, kerf bending, dado/rabbet, finishing coat, wood turning, frame/panel, taper jig, stair stringer, box joint, glue coverage, planer passes, honing guide, crown moulding, router circle, cove cut, moisture shrinkage, rafter length, router template, half-lap and spline joint. Reconcile list against actual `CalculatorsPanel.tsx` before implementation; it is the source of truth.
- T3: For each engine, assert minimum, nominal, maximum, invalid/out-of-range, unit conversion, rounding and one published/reference oracle case; link fixtures to calculator and source.
- T4: Test numeric entry by typing, keyboard increment/decrement and clearing; assert debounce/recompute and no NaN/Infinity leaks to UI.
- Accept: zero mounted calculator is untested; each visible option causes a checked output change; independent test fixtures state expected units and precision.

**Sprint 315 — PWA, offline, updates and storage pressure** — P1 · M · S307.

- T1: Browser tests for install manifest, service worker registration, cached app shell reload offline and update-ready banner dismiss/reload.
- T2: Simulate storage quota warning and unavailable storage; assert status, actions and no data loss.
- T3: Open `.cabinetplan` file via supported file handler path; test unsupported/invalid file recovery.
- Accept: offline start works after one online load in supported browser; explain unsupported API status without blocking core workflows.

**Sprint 316 — Accessibility, visual and responsive matrix** — P0 · L · S307–S315.

- T1: Axe WCAG 2.2 AA scan for all seven tabs, six locales, light/dark, mobile nav, onboarding, shortcuts, project manager, import errors, export modal and optimizer error/loading states.
- T2: Keyboard-only journeys: skip link, tab order, visible focus, no traps outside dialogs, dialog focus containment/return, Escape, native controls and reduced motion.
- T3: Responsive widths: 320, 375, 768, 1024, 1440 CSS px; assert no horizontal overflow, clipped labels, overlapped actions or unreachable controls. Cover RTL at narrow and wide viewports.
- T4: Visual snapshots for stable user-critical states, fonts loaded, animations disabled, data fixed, correct device/browser baseline; review updates as intentional diffs.
- Accept: no serious/critical axe violations; all discovered issues have explicit exception owner/expiry; screenshots do not replace semantic behavior assertions.

**Sprint 317 — Worker, async and error recovery** — P0 · M · S301, S312.

- T1: Test each worker request resolves, rejects, times out, aborts, terminates and recovers; stale replies cannot overwrite newer project results.
- T2: Trigger one controlled crash in each panel boundary; assert localized fallback, retry/reset action, accessible alert and unaffected sibling panel.
- T3: Exercise slow generation, double submission, navigation during generation and unmount cleanup.
- Accept: no indefinite loading after worker failure; recovery is user-visible and worker termination does not corrupt project state.

**Sprint 318 — v5.34.0 verification release** — P0 · M · S300–S317.

- T1: Run full `npm run check`, E2E browser matrix, export artifact suite, visual snapshots, bundle and bench gates; attach test-count/coverage/browser artifacts.
- T2: Update README/docs only from measured results; add zero-flake baseline and known browser limitations.
- Accept: all P0 workflows pass from clean checkout; every release claim links to an automated gate or observable evidence.

### Phase 65 — Versioned Data, Import Safety, and Durable Offline Projects (Sprints 319–326; target v5.35.0)

**Exit:** project/catalog schemas validate before mutation; upgrades are lossless and tested; IDB remains default until OPFS is proven; batch export is deterministic and safe.

**Sprint 319 — Canonical project format and migration policy** — P0 · M · S304.

- T1: Define versioned project envelope and JSON Schema under `config/schemas/`; document stable/optional/derived fields and compatibility guarantees.
- T2: Add a migration registry with pure `vN → vN+1` functions and explicit future-version rejection.
- T3: Fixture every historic schema actually present in repository/history; test migration idempotence and canonical serialization.
- Accept: imports are validated and migrated before store mutation; unknown fields policy and future-version behavior are explicit.

**Sprint 320 — Validation diagnostics and safe import UI** — P0 · M · S319.

- T1: Report JSON path, expected type/range, actual value and localized recovery action; cap displayed errors safely.
- T2: Test malformed JSON, wrong root, missing/extra fields, prototype-pollution keys, oversized files, invalid enum, impossible dimensions and hostile filenames.
- T3: UI preview/confirm step before applying imported project/catalog; transactional all-or-nothing behavior.
- Accept: no import creates partial state; error details are screen-reader accessible and do not expose executable HTML.

**Sprint 321 — Persistence resilience baseline** — P0 · M · S304.

- T1: Inventory durable and ephemeral state, data size, write frequency and multi-tab interactions.
- T2: Add IDB upgrade, interrupted write, blocked upgrade, quota, private-mode/unavailable and recovery tests.
- T3: Expose storage health/export-backup action and test restore through browser UI.
- Accept: existing IndexedDB remains source of truth; every failure mode either recovers or clearly preserves downloadable user data.

**Sprint 322 — OPFS feasibility and adapter decision** — P2 · M · S321.

- T1: Browser compatibility/security review, storage API quota/atomicity/worker requirements and static-host deployment constraints.
- T2: Benchmark IDB vs OPFS for representative cabinet projects and large generated exports; capture latency/size, not claims.
- T3: ADR recommends keep IDB, hybrid large-file OPFS, or migration; include fallback, backup, rollback and support matrix.
- Accept: no default migration until at least Chromium/Firefox/WebKit behavior and quota failure are tested; if OPFS provides no material benefit, close item as deferred.

**Sprint 323 — OPFS opt-in adapter prototype** — P2 · L · S322 approval.

- T1: Implement behind adapter/feature flag with IDB fallback and explicit transaction/flush behavior.
- T2: Test page close/reopen, offline, concurrent tab, quota, browser lacking API, export/restore, interrupted migration and rollback.
- Accept: zero user data loss in fault injection; measurable win over IDB; preserve IDB as default until next release decision.

**Sprint 324 — Data migration and backup/restore decision** — P1 · M · S323.

- T1: Only if prototype passes: one-way verified migration with checksums, backup and resumable batches.
- T2: Browser E2E with old/new storage and rollback; test delete/clear data and restore.
- Accept: migration is opt-in first, then defaults only after telemetry-free opt-in field trial and a release decision; do not force cloud/analytics.

**Sprint 325 — Whole-project templates and room kits** — P2 · L · S319.

- T1: Define template bundle schema for multi-cabinet kitchen, bath vanity, closet/wardrobe, workshop storage and accessible clearances; include provenance, units and editable assumptions.
- T2: Generate kits as ordinary project data; never encode unverified construction dimensions as authoritative standards.
- T3: UI browse/search/preview/apply/undo with localized descriptions; include fillers, toe kicks, countertop/appliance placeholders only when geometry is modeled.
- Tests: schema, project expansion, dimension/clearance constraints, apply/cancel/undo browser journeys.
- Accept: each template creates a valid editable project; all assumptions are disclosed in project notes; no unsupported appliance fit claim.

**Sprint 326 — Batch export UX and archive contract** — P1 · L · S312, S319.

- T1: Multi-select cabinets and formats; progress/cancel/retry; deterministic file names and a manifest containing project id, schema/export version, units and checksums.
- T2: Harden `src/utils/zip-writer.ts` against traversal, duplicate/Unicode filenames, ZIP size limits and partial failure.
- T3: Download ZIP in browser and inspect archive entries/content; test one/all cabinet, format toggles, no selection, cancellation and failed PDF.
- Accept: archive can be unpacked by a standard ZIP reader; every manifest entry matches bytes; partial failures are surfaced and never mislabelled as success.

### Phase 66 — Cut-List and Optimizer Leadership (Sprints 327–335; target v5.36.0)

**Exit:** cut results are benchmarked for quality, manufacturability and determinism; no optimization strategy can violate grain, kerf, stock, defect or material constraints.

**Sprint 327 — Optimizer benchmark corpus** — P0 · M · S303.

- T1: Curate licensed synthetic and user-generated fixture cases spanning small/large sheets, long strips, mixed thickness, rotation constraints, defects and offcuts.
- T2: Record baseline material count, waste, runtime, cut count, constraint violations and deterministic seed.
- Accept: reproducible harness, inputs and scoring definitions checked in; fixtures contain no proprietary project data.

**Sprint 328 — Multi-strategy optimizer evaluation** — P1 · L · S327.

- T1: Compare existing BSSF, guillotine and smart strategies across corpus; report Pareto frontier (waste vs runtime vs cut count) per scenario.
- T2: Add seeded strategy selection/time budget and deterministic tie-breaking if evidence supports it.
- Accept: new strategy improves declared benchmark slices without regression in constraint validity or unacceptable runtime; otherwise document no-go.

**Sprint 329 — Property-based cut correctness expansion** — P0 · M · S303, S327.

- T1: Assert every part is placed exactly once, in bounds, non-overlapping including kerf, material-compatible, grain-valid and defect-clear.
- T2: Generate adversarial dimensions, duplicate parts, impossible stock, exact-boundary fits and large coordinates; shrink failures to fixtures.
- Accept: invariants are independent of strategy and run in CI at bounded sample count; extended corpus nightly.

**Sprint 330 — Cut sequence and panel-saw manufacturability** — P1 · L · S328–S329.

- T1: Represent cuts as a guillotine tree with kerf-adjusted stages, tool/access constraints and residual offcuts.
- T2: Add sequence visualization and step-by-step instructions; reject sequences not realizable by selected cut mode.
- Tests: replay cuts against geometry oracle; assert each cut separates intended pieces and residual stock is valid.
- Accept: distinguish layout optimization from an executable cut sequence in UI/exports; label assumptions and machine limitations.

**Sprint 331 — Edge banding-aware part sizing and operation schedule** — P1 · L · S329.

- T1: Model per-edge material allowance, trim/finished dimensions, grain and band thickness without double-counting stock.
- T2: Apply allowances to optimizer dimensions only under explicit material/process configuration; show finished vs raw dimensions.
- T3: Export banding schedule and add geometric property tests.
- Accept: raw stock bounds and finished dimensions both reconcile in BOM, drawing and cost totals; all optional allowance states tested.

**Sprint 332 — Offcut and stock reuse workflow** — P1 · L · S329, S331.

- T1: Offcut catalog with dimensions, material identity, thickness, grain, defects, source and remaining quantity; support arbitrary-size panel inventory.
- T2: Consume offcuts before new sheets under configurable policy; preserve traceability back to source sheet.
- Tests: repeated projects, stale stock, duplicate consumption, same size/different material and grain conflict.
- Accept: inventory never goes negative; optimizer reports old stock use and new purchase separately.

**Sprint 333 — Material types, veneer and edge banding inventory** — P2 · M · S331–S332.

- T1: Extend catalog schema for sheet goods, solid lumber, veneer, banding and hardware/accessory stock as distinct types.
- T2: Material conversion/import/export and migration; UI filters by type and thickness/grain suitability.
- Accept: one type cannot accidentally be packed with another; catalog import and legacy material fixtures pass.

**Sprint 334 — Shop-floor labels v2** — P1 · M · S312.

- T1: Add configurable label layout, QR with non-sensitive stable part/project reference, material/dimensions/grain/edge banding and quantity.
- T2: Support standard page sizes and user-defined grid; test print CSS and QR payload with parser.
- Accept: printed label remains legible at supported sizes, has text fallback when QR scan unavailable, and never embeds private share tokens.

**Sprint 335 — Irregular nesting feasibility spike** — P3 · M · S327.

- T1: Evaluate Sparrow/jagua-rs, Deepnest/SVGnest algorithm behavior, package/runtime size, WASM loading, browser support, licenses and maintenance risk.
- T2: Prototype only with separate sample app or temporary directory, using synthetic profiles; compare against rectangular optimizer and capture exact benchmark results.
- T3: ADR: proceed/defer/reject. Any dependency must pass MIT policy, bundle budget, deterministic correctness and maintenance requirements.
- Accept: no runtime dependency or production feature lands from the spike; implementation proceeds only with explicit user value and compatibility proof.

### Phase 67 — CNC, Hardware and Manufacturing Assurance (Sprints 336–343; target v5.37.0)

**Exit:** generated files are simulation-checked, operation data is explicit, machine communication is recoverable, and unit representation is unambiguous.

**Sprint 336 — G-code parser and simulator model** — P0 · L · S312, S327.

- T1: Define supported safe G-code subset and reject unsupported modal commands; parse units, plane, coordinate modes, spindle/feed, tool changes and limits.
- T2: Render toolpath with rapid/cut distinction, bounds, depth passes, retracts and work envelope; scrub playback.
- T3: Compare interpreted moves to generator intent for golden jobs; malformed/truncated/adversarial input tests.
- Accept: simulator reports unsupported semantics instead of claiming safety; hard limits and no-move cases are tested.

**Sprint 337 — Tool/material profiles and machine envelopes** — P1 · M · S336.

- T1: Versioned user-owned tool and machine profile schema (bit diameter, flute, feed/plunge limits, spindle range, travel envelope, safe Z).
- T2: Validate generated toolpaths against selected profile; warnings are explicit and configurable.
- Accept: no profile silently becomes a real machine-specific postprocessor; all constraints are unit tested and browser selectable.

**Sprint 338 — Hardware catalog and parametric drilling patterns** — P1 · L · S319, S337.

- T1: Define hardware SKU/catalog schema with manufacturer, dimensions, source/date, compatible panel thickness and non-authoritative data flag.
- T2: Add parametric hinge cup, mounting plate, shelf pin/System 32, drawer slide and connector drilling pattern definitions; user selects exact product/profile.
- T3: Preview holes on part and export drilling coordinates to dimensioned PDF/DXF/CSV; coordinate handedness and datum explicit.
- Tests: fixture dimensions from manufacturer documentation, tolerance/boundary, mirrored door, overlay/inset, units and panel clearance.
- Accept: no default pattern is claimed compatible without sourced dimensions; every pattern has provenance and independent coordinate oracle.

**Sprint 339 — CNC job safety checklist and serial resilience** — P0 · M · S317, S336–S338.

- T1: Preflight stock, clamp, tool, work origin, bounds, spindle/feeds, units and emergency stop acknowledgement.
- T2: Test serial disconnect mid-send, queue backpressure, duplicate command, pause/resume and cancel; never auto-resume motion.
- Accept: destructive/motion actions require deliberate user confirmation and error state; never auto-connect or stream on page load.

**Sprint 340 — 1:1 tiled templates and registration** — P2 · M · S312.

- T1: Add tiled print layout with overlap/registration marks, scale bar and calibration page for selected SVG templates.
- T2: Validate exact dimensions via PDF physical page units and browser print margins; print dialogs are user-controlled.
- Accept: scale mismatch is detectable from calibration ruler; page cropping/overlap checked in browser PDF artifacts.

**Sprint 341 — Export format conformance matrix** — P0 · M · S312, S336–S340.

- T1: BOM/CSV, PDF, DXF, G-code, SVG/PNG, GLTF/GLB, STEP, IFC and ZIP: define formal units, coordinate axes, schema/export versions, supported subset and failure behavior.
- T2: Parser-based golden and round-trip tests where an independent parser exists; maintain fixtures per format/version.
- Accept: every UI export button maps to a named contract suite; unsupported or lossy formats disclose limitations.

**Sprint 342 — Imperial fractions and shop notation** — P1 · M · S303.

- T1: Add exact rational inch/fraction formatter/parser with configurable denominator, mixed fractions, tolerance and arithmetic conversion; retain millimeters as canonical internal storage.
- T2: Test 1/64 through 1/2 in fractions, negative/zero, rounding ties, Unicode fraction display, typed fraction input and metric/imperial round trip.
- T3: Browser E2E settings switch and verify configurator, cut list, dimensions, labels, PDF and exports all use chosen display units without changing physical geometry.
- Accept: no binary floating-point drift accumulates across repeated toggles; display precision policy documented.

**Sprint 343 — Manufacturing dossier release** — P0 · M · S336–S342.

- T1: Assemble versioned PDF/ZIP dossier with BOM, cut sequence, hardware drilling sheets, labels, material purchase list and assembly instructions.
- T2: Full browser workflow builds a multi-cabinet project, downloads dossier and validates every file against contracts.
- Accept: all exports describe the same project snapshot and schema versions; inconsistent/stale async results cannot mix.

### Phase 68 — Room Design, Cabinet Rules, and Parametric Authoring (Sprints 344–352; target v5.38.0)

**Exit:** room planning is a usable, accessible 2D layout workflow; cabinet modifications remain dimensionally valid and explainable.

**Sprint 344 — Room-planner product boundary and geometry model** — P1 · M · S303.

- T1: Define room coordinate frame, units, wall segments, openings, obstacles, cabinet footprints, snap grid and clearance semantics.
- T2: Property tests for segment intersection, wall closure, polygon validity, overlap and numeric extremes.
- Accept: 2D layout scope stays separate from 3D BIM/structural claims; invalid geometry cannot persist.

**Sprint 345 — Room layout editor browser workflow** — P1 · L · S344.

- T1: Draw/edit walls and openings; add, move, rotate, align and remove cabinet instances by mouse and keyboard.
- T2: Snap grid, dimension entry, zoom/pan, undo/redo, selection list and focusable non-canvas alternative controls.
- T3: Save/load/import/export room plan; mobile touch interactions and narrow-screen fallback.
- Accept: drag, keyboard and numeric entry produce identical geometry; every canvas action has accessible equivalent.

**Sprint 346 — Clearance, filler and countertop rules** — P1 · L · S344–S345.

- T1: Model appliance/door swing/service/accessibility clearances with source and user-defined rule sets.
- T2: Parametric filler/end panel/countertop surfaces and dimensions; mark estimate vs verified manufacturer data.
- T3: Visualize conflicts, focus offending item, offer reversible repair suggestions.
- Accept: clearance checks are geometrically tested and never silently auto-adjust a design.

**Sprint 347 — Room kits, appliance library and layout sheet** — P2 · M · S325, S345–S346.

- T1: Add sourceable appliance placeholders/clear dimensions; searchable user-imported library.
- T2: Export dimensioned room layout PDF with scale, legend and page tiling.
- Accept: data source and date accompany hardware/appliance dimensions; editable custom objects work offline.

**Sprint 348 — Named-expression dependency graph** — P2 · M · S303.

- T1: Evaluate current expression parser constraints and define dependency/error graph without dynamic evaluation.
- T2: UI graph/list with cycle, invalid dependency, recompute order and per-expression preview.
- T3: Browser test add/edit/remove/cycle and demonstrate downstream dimensions update while undo/redo works.
- Accept: no eval/new Function, no cyclic partial state, every displayed edge matches engine dependencies.

**Sprint 349 — Parametric box and furniture generators** — P2 · L · S303, S325.

- T1: Generator schema for trays, boxes, drawer organizers, shelves and finger/T-slot joints; adjust joinery for material thickness and kerf.
- T2: Generate standard project/parts data so optimizer/PDF/assembly work without special cases.
- T3: Property tests for fit, thickness, kerf, finger count and assemblyability; browser generator input/output journey.
- Accept: independent geometry fixtures prove parts mate; all generated projects are editable afterward.

**Sprint 350 — Materials/species catalog v2** — P2 · M · S319, S333.

- T1: Optional provenance-aware species records (density, Janka, shrinkage, modulus, source URL/date, uncertainty); user/community additions remain local.
- T2: CSV/JSON import/export, search/filter, units and license/attribution policy.
- Accept: sourced values are not presented as universal guarantees; calculators surface ranges and data provenance.

**Sprint 351 — Rule-based construction methods and hardware presets** — P1 · L · S338, S348.

- T1: User-authored rules for joinery by edge/part/material, hardware compatibility, reveals/overlays and pilot/drilling locations.
- T2: Explain rule source and precedence, dry-run diff, apply to selected/all cabinets, undo.
- T3: Property + browser tests for precedence conflicts, invalid combination, localized labels and version migration.
- Accept: rules do not mutate geometry without preview/confirmation; deterministic ordering and conflict diagnostics documented.

**Sprint 352 — Cabinet construction release** — P1 · M · S344–S351.

- T1: Full room-to-cabinet-to-optimizer-to-dossier journey on desktop and tablet, including offline save/reload.
- Accept: clearance and production outputs match same revision; all new controls covered by interaction matrix.

### Phase 69 — Assembly, Collaboration Boundaries, and Plugin Ecosystem (Sprints 353–359; target v5.39.0)

**Sprint 353 — Assembly animation and synchronized 3D steps** — P2 · M · S313.

- T1: Connect DAG steps to highlighted/exploded parts with play/pause/scrub and reduced-motion mode.
- T2: Browser test next/previous/play/pause, keyboard, reduced motion and step-to-part mapping.
- Accept: animation supplements full textual instructions and does not convey essential information alone.

**Sprint 354 — Assembly troubleshooting and verification** — P1 · M · S353.

- T1: Add per-step confirmation, tool/material checklist, user note/photo association and optional pause reasons.
- T2: Test persistence, offline use, camera permission failure, print/PDF step map and reset confirmation.
- Accept: assembly state is project-scoped and recoverable; photos remain local unless explicitly exported by user.

**Sprint 355 — Plugin sandbox and permissions audit** — P0 · M · S303.

- T1: Threat model plugin execution, permissions, storage, export APIs, CSP and untrusted catalog/plugin content.
- T2: Test malicious HTML/script URLs, prototype payloads, oversized plugin, API abuse and permission denial.
- Accept: no plugin gains ambient DOM/network/storage access without explicit capability; document residual sandbox limitations.

**Sprint 356 — Public plugin API conformance suite** — P1 · M · S355.

- T1: Publish versioned type/schema conformance fixtures and compatibility matrix for v1/v2 API.
- T2: Test install/update/disable/remove, invalid signature/hash, API version mismatch and rollback.
- Accept: APIs stable only after compatibility tests and deprecation policy; plugin code never silently bypasses host validation.

**Sprint 357 — CRDT sync boundary and offline conflict review** — P3 · M · S304.

- T1: Test current LWW engine across concurrent edits, duplicate/reordered delivery, clock skew, delete-vs-edit and schema upgrades.
- T2: ADR deciding whether collaboration warrants a production sync adapter; address privacy, identity, hosting, cost and conflict UX.
- Accept: CRDT presence is not represented as shipped collaboration until multi-client E2E with real transport passes; otherwise explicitly defer.

**Sprint 358 — Project comparison and design review collaboration** — P2 · M · S304, S356.

- T1: Shareable redacted project diff/export; define explicit consent and what leaves device.
- T2: Test compare/merge of selected fields, conflict resolution, rollback and no implicit network activity.
- Accept: offline remains complete; cloud transport remains optional and separately approved.

**Sprint 359 — v5.39.0 quality release** — P0 · M · S353–S358.

- T1: Full test and artifact matrix; publish plugin compatibility and data migration notes.
- Accept: all active P0 gates pass; deferred collaboration has a clear boundary and no misleading UI claim.

### Phase 70 — Governance, Documentation, and Supply Chain (Sprints 360–364; target v5.40.0)

**Sprint 360 — Release readiness report** — P1 · M · existing quality scripts.

- T1: Read command outputs/exit codes for typecheck, lint, CSS, markdown, formatting, i18n, tests, E2E, golden exports, budgets, security and docs freshness.
- T2: Emit text + machine-readable JSON in `$TEMP`; do not duplicate gate logic or claim success on missing command/output.
- T3: Test pass/fail/missing/timeout and ensure report command does not modify repository.
- Accept: one command gives truthful gate status, evidence path and next action; CI and release agent consume the same schema.

**Sprint 361 — OpenSSF Scorecard readiness** — P2 · M · S360.

- T1: Run current Scorecard against repository; record per-check score and remediation cost.
- T2: Improve only material issues (branch protection, pinned actions, token permissions, signed releases, security policy, dependency updates); avoid badge chasing.
- Accept: publish actual score/date and remaining exceptions; ≥7.0 is a target, not a fabricated guarantee.

**Sprint 362 — Design token reference generated from source** — P2 · M · inspect `src/index.css` and Tailwind theme.

- T1: Document token name, value/source, semantic role, light/dark mapping and contrast requirements.
- T2: Validate examples against CSS tokens; optionally generate palette table from source to prevent drift.
- Accept: no invented token names; docs freshness test detects stale token inventory.

**Sprint 363 — Documentation ownership and freshness enforcement** — P1 · M · existing ownership/freshness scripts.

- T1: Verify owners, sources and last-verified date for each maintained doc; do not count generated/API output as manually maintained.
- T2: CI validates required metadata and stale date; add test fixtures for malformed/unknown ownership.
- Accept: every public doc has owner and refresh trigger; no date-only churn required without meaningful source change.

**Sprint 364 — Plugin/catalog contribution workflow** — P2 · M · S319, S356.

- T1: Define independently authored contribution schema, validation, provenance, security review, license/attribution and deprecation rules.
- T2: Add sample validation command and contributor templates only if repository maintainers approve added governance.
- Accept: community content cannot execute code through catalog path; no GPL source/assets are copied into MIT project.

### Phase 71 — Performance, Resilience, and Inclusive Access (Sprints 365–368; target v5.41.0)

**Sprint 365 — Realistic project performance budget** — P1 · M · S327, S318.

- T1: Benchmark cold load, interaction latency, optimizer runtime, memory, PDF generation and large project import on representative low/mid hardware.
- T2: Define user-centric budgets and sample projects; capture regressions in Lighthouse/browser performance artifact.
- Accept: budgets derive from measured baseline and target devices; no arbitrary numbers without measurements.

**Sprint 366 — Large project and memory stress** — P1 · L · S365.

- T1: Test hundreds of cabinets/parts, many sheets, long history, large catalogs and repeated PDF/image generation.
- T2: Observe UI responsiveness, worker memory, cleanup, virtualization and tab switch retention.
- Accept: stress run documents maximum supported profile and graceful limits; no silent truncation/data loss.

**Sprint 367 — Browser compatibility and recovery matrix** — P1 · M · S316, S365.

- T1: Run current Chromium, Firefox, WebKit plus mobile emulation on feature detection, storage, download, touch, WebGL, service worker and file handlers.
- T2: Test forced context loss, missing APIs, interrupted reload and storage denial; ensure fallbacks.
- Accept: support matrix lists tested real-browser versions; capability badges describe current state, not assumed hardware.

**Sprint 368 — Accessibility and localization field review** — P1 · M · S316.

- T1: Review keyboard/voiceover workflows with non-color cues, zoom/reflow, 200% text, reduced motion, Hebrew/Arabic shaping and mixed-direction dimensions.
- T2: Validate translations for calculators, error recovery, print/PDF and tooltips; test long labels at all breakpoints.
- Accept: WCAG 2.2 AA automated suite plus documented manual screen-reader/keyboard review; automate regressions where feasible.

### Phase 72 — v6.0 Readiness and Strategic Reassessment (Sprints 369–370; target v6.0.0)

**Sprint 369 — v6 migration and compatibility contract** — P0 · M · S319, S341, S356.

- T1: Decide which data/plugin/export API changes justify v6; provide migration tool, compatibility docs and rollback/backup story.
- T2: Test project files from every supported schema, plugin API compatibility and export version consumers.
- Accept: no major release based solely on version number; all breaking changes have migration fixtures and deprecation window.

**Sprint 370 — Best-in-class benchmark review and release gate** — P0 · L · all phases.

- T1: Re-run capability comparison against current Fusion, OpenCutList, Cabinet Vision/PolyBoard, Shapr3D, CutList Optimizer, MaxCut and open-source alternatives; cite official/current sources and date.
- T2: Measure workflow completion time, output correctness, accessibility, offline behavior, browser performance and optimizer quality on common fixtures.
- T3: Review each planned feature for adoption, maintenance, security, license and usability; close low-value work rather than carrying roadmap debt.
- Accept: v6 readiness report lists shipped/partial/deferred by evidence, test artifacts, known risks and next program; never state “best” without a measurable comparison method.

---

## 8. Complete Verification Plan — Unit Through Real Browser

This is the quality contract for the project, not a promise that each test already exists. Every production module and visible interactive option must map to a test ID, an observable result, and a reliable oracle. The source inventories in `src/engine`, `src/store`, `src/hooks`, `src/utils`, `src/components`, and `src/i18n` are authoritative and must be regenerated during Sprint 301 so additions cannot bypass the plan.

### 8.1 Test Pyramid and Required Evidence

| Layer                 | What it proves                                                                | Required technique                                                | Blocking policy                                                                   |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Engine unit/property  | Formula, geometry, validation, determinism, bounds                            | Vitest, `it.each`, `fast-check`, independent oracle fixtures      | Blocking; all pure exports mapped; no unreviewed coverage exclusions              |
| Store/persistence     | State transitions, undo/redo, serialization, recovery                         | Vitest + fake-indexeddb + storage fault injection                 | Blocking for data loss, mutation and migration defects                            |
| Component interaction | Each control produces expected visible/state/output transition                | Testing Library + `userEvent`; semantic queries                   | Blocking for core configurator/export/accessibility; expand ratchet progressively |
| Browser journey       | Actual browser clicks/typing/keyboard/touch, URL, storage, workers, downloads | Playwright projects, real app server, browser APIs where possible | Blocking all primary workflows; no “renders” only tests as behavior evidence      |
| Visual regression     | Geometry/layout appearance under fixed data                                   | Playwright screenshot baseline after fonts and stable viewport    | Blocking only reviewed stable scenes; never substitute for behavior tests         |
| Accessibility         | Semantics, keyboard, focus, contrast and reflow                               | axe-core WCAG 2.2 AA + manual screen-reader/keyboard review       | Blocking serious/critical; exceptions owned, scoped and dated                     |
| Performance/stress    | Real workload latency, memory and output size                                 | Playwright traces, Lighthouse, Vitest bench, large fixtures       | Measured budgets; do not introduce arbitrary thresholds                           |
| Mutation              | Whether assertions detect behavioral changes                                  | Stryker for selected critical engine paths                        | Report-only baseline first; block after stable baseline                           |

### 8.2 Unit-Test Checklist For Every Pure Engine Export

For every exported function or constant with behavioral meaning, create or map tests for ordinary known input; minimum and maximum inputs; just-below/above bounds; zero and empty input; negative values where meaningful; non-finite values; invalid enum/unknown key; rounding and numerical stability; metric/imperial conversion; locale-independent determinism; immutability; repeated-call determinism; and error type/message or structured diagnostic.

Also cover composition with neighboring engine functions and regression fixtures for historical defects.

Remove a case only with documented proof that it cannot occur at the API boundary.

For geometry and optimization, additionally assert finite coordinates, positive thickness, count and identity conservation, no overlap, kerf separation, stock/material match, grain and rotation validity, defect avoidance, sheet bounds, offcut conservation, and deterministic results for a fixed seed.

Infeasible cases must be reported rather than partially packed. Totals for area, weight, cost and waste must reconcile within declared precision. Property generators include adversarial aspect ratios, duplicate dimensions, tiny/huge values, exact-fit edges, impossible cases and mixed constraints; retain shrunk seeds.

For exports additionally assert canonical header/schema version, units/axis, encoding, delimiters/escaping, filenames, quantity/row/entity conservation, finite values, declared precision, stable ordering, no formula injection, no path traversal, exact snapshot consistency and parser/readback validity. Golden updates require reviewed semantic diff; never update snapshots only to silence failure.

### 8.3 User-Interface Interaction Inventory (Must Be Fully Covered)

For each visible control below: use the control as a user would; assert changed visible state AND the downstream result it is meant to control; assert keyboard operation and accessible name; verify disabled/invalid/loading/error/cancel where applicable. Build a generated control inventory per panel and fail CI if a new interactive control is absent from the matrix or explicitly waived.

| Surface                 | Controls/options to exercise                                                                                                                                                                               | Observable behavior to assert                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell/header        | 7 tabs by click and Alt+1…6; `?tab=`; browser back/forward; dark mode; language 6 locales; metric/imperial; undo/redo; reset; add cabinet; focus mode; help; shortcuts; mobile overflow/sidebar            | Active tab/panel, selected/RTL state, URL, theme class, unit display without geometry drift, undo/redo restores values, reset/add confirmation, focus and modal lifecycle |
| Onboarding and dialogs  | Next/back/skip/get started; project manager search/sort/save/load/import/export; snapshot create/restore/delete/diff; marketplace/plugin registry; Escape, backdrop, close, focus trap                     | Correct step/content, cancellation has no mutation, dialog focus enters/returns, data persists, import errors are actionable                                              |
| Configurator dimensions | Width/height/depth/kick sliders and numeric fields; keyboard arrows; clear/re-enter; unit switch                                                                                                           | Exact normalized values, validation state, generated parts and all preview views reflect updated dimensions                                                               |
| Configurator choices    | Furniture type (all supported); joinery; carcass/back materials; include back; thickness source; shelf count/spacing/custom positions/supports; doors/count/style/handle/edge banding; drawers/count/slide | Conditional options show/hide correctly; selected value persists; parts/hardware/weight/cost/assembly change to expected oracle                                           |
| Materials/catalog       | Add/edit/delete custom sheet material; price/color/grain/thickness; import community/hardware catalog; merge/replace/cancel                                                                                | Validation, catalog contents and optimizer material choice; malformed file leaves previous state unchanged                                                                |
| Presets/expressions     | Each preset; save user preset; expression add/edit/remove; dependent/cyclic/invalid expression                                                                                                             | Preset dimensions/parts; evaluation/error message; dependency propagation; undo/redo and persistence                                                                      |
| Preview 2D              | Front, front-open, side, top, back, isometric; dimensions toggle; zoom/pan; swipe; pinch; SVG and PNG downloads                                                                                            | Correct view geometry, dimension labels, bounded transform, view change and parsed artifact dimensions/content                                                            |
| Preview 3D              | WebGPU/WebGL/SVG fallback, orbit, explode slider, wireframe, edge banding                                                                                                                                  | Canvas actually draws, controls alter rendered state; supported fallback is semantic and usable; WebGL unavailable path tested                                            |
| Optimizer               | Kerf; sheet size; material/hardware prices and quantities; labor/finish; edge banding; grain/rotation; auto co-nest; color-blind; hatch/name; filters/sorts                                                | Sheet count/yield/waste/cost/cut list changes to expected results; no invalid packing; accessible meter values                                                            |
| Optimizer panels        | Smart strategies; before/after compare; cut checklist; waste/offcut analytics; grain report; stock tracker; defect zones; shopping list; material summary; virtual sheet navigation                        | Every action changes expected specific rows/parts/sheets; no virtualization omission; table search/sort is correct                                                        |
| Export and labels       | BOM/hardware CSV; DXF; G-code; PDF single/all; labels/print; ZIP where wired; all format options                                                                                                           | Listen for download, inspect bytes with parser, filename/schema/units/content/options/page count; no stale data or false success toast                                    |
| Assembly                | Previous/next/all steps; tips; completion checkboxes; reset; timer; print/checklist; build log; camera; machine profile; serial connection                                                                 | Step text and dependencies, count/time, persistence, downloaded checklist, camera permission branches, safe serial lifecycle                                              |
| Calculators             | Every panel and every select/radio/input/toggle; collapse/expand                                                                                                                                           | Numeric result/units/precision against independent oracle; valid and invalid values; each option causes output delta                                                      |
| PWA/storage             | Offline reload, SW update dismiss/reload, file open, quota warning, storage unavailable                                                                                                                    | App shell/core project remain usable, recovery and user data visible, no reload/data loss surprises                                                                       |
| Responsive/RTL          | 320/375/768/1024/1440 widths; EN/HE/AR; zoom/reflow and mobile nav                                                                                                                                         | No horizontal overflow or overlap; labels fit; RTL direction/order correct; all controls remain reachable                                                                 |

### 8.4 Calculator and Engine Domain Inventory

Use `src/engine/index.ts` and submodule barrels as the export inventory; do not rely on module filename counts.

At minimum map cabinet dimensions; parts/BOM; materials/hardware; cut optimization; grain/defects/offcuts; expressions/templates; validation; assembly; cost/yield/waste; room/layout; project persistence/sharing/sync; plugin/sandbox; catalogs; analytics/AI; units; PWA/device adapters; and every woodworking calculator.

`CalculatorsPanel.tsx` is the source of truth for mounted calculators. Reconcile the current planning inventory there: finish, face frame, cabinet door, drawer box, screw pullout, kerf bending, dado/rabbet, finishing coat, wood turning, frame/panel, taper jig, stair stringer, box joint, glue coverage, planer passes, honing guide, crown moulding, router circle, cove cut, moisture shrinkage, rafter length, router template, half-lap and spline joint.

Sprint 314 must inspect actual imports/mounts and correct this list before test implementation.

Every component test file should map to a feature surface, not merely snapshot markup. Cover loading/empty/valid/invalid/error/success and keyboard/focus states. Every hook/store action/worker message and every serializer/deserializer is explicitly mapped in the Sprint 301 inventory. A missing test mapping is an open defect, even when aggregate coverage is above threshold.

### 8.5 Playwright Browser Project and Journey Policy

Add Chromium and Firefox desktop, WebKit desktop, and focused mobile emulations (Android Chrome and iPhone Safari/WebKit). Keep a small PR-critical suite across all projects; run the full matrix nightly and before release if runtime exceeds the PR budget. Install browser binaries only via the locked Playwright version. Do not claim an emulated mobile run is a physical-device test.

Use robust role/name/label locators first. Use explicit test ids only for canvas, generated SVG, virtualization or unnamed system surfaces. For each browser test: start from known app state, dismiss onboarding through UI, perform realistic clicks/typing/keyboard/touch, assert the result, and restore state. Do not mock the code under test. Stub only unavailable OS/browser permissions or remote third-party responses and state that boundary in the test.

Capture console/page errors and uncaught rejections; fail on unexpected errors. For downloads use `page.waitForEvent('download')`, inspect saved bytes and parse format. For print/PDF inspect bytes/content, not only button state. For PWA/offline use browser context routing/network controls and service worker registration checks. Use traces on failure and no retries locally; CI retry is diagnostic only and a flaky test stays visible as flaky. Any quarantine needs owner, issue and one-sprint expiry.

### 8.6 Coverage and Release Evidence

Retain existing 85 statements / 78 branches / 83 functions / 85 lines as the current configured engine/utils/store/hooks gate until a successful baseline run confirms them. Do not increase thresholds without measured trend; include components via a ratchet after baseline. Coverage exclusions require a named reason and testability review. Aggregate percentages never replace per-file mapping or behavior assertions.

Each release artifact records: commit SHA; Node/npm/browser versions; pass/fail/skipped test totals from a completed run; unit and E2E durations; coverage by directory; flaky/quarantined tests; axe violations/exceptions; export contracts; screenshot changes; benchmark/bundle budgets; and gate exit codes. If a command cannot run because dependencies are absent, report NOT RUN and the exact blocker, not PASS.

---

---

## 9. VS Code, Copilot, MCP, and GitHub Integration

### VS Code Extensions (22 Recommended)

All recommended extensions provide direct value for this TypeScript/React/Tailwind stack:

| Extension                       | Purpose                |
| ------------------------------- | ---------------------- |
| prettier-vscode                 | Format on save         |
| vscode-eslint                   | Inline lint errors     |
| vscode-stylelint                | CSS lint               |
| errorlens                       | Inline error display   |
| vscode-typescript-next          | Latest TS features     |
| vscode-tailwindcss              | Tailwind IntelliSense  |
| vitest.explorer                 | Test runner UI         |
| ms-playwright.playwright        | E2E test runner        |
| vscode-coverage-gutters         | Coverage overlay       |
| i18n-ally                       | Translation management |
| vscode-markdownlint             | Markdown lint          |
| code-spell-checker              | Typo detection         |
| jock.svg                        | SVG preview            |
| github.copilot                  | AI completions         |
| github.copilot-chat             | AI chat + agents       |
| vscode-pull-request-github      | PR workflow            |
| vscode-github-actions           | Workflow status        |
| ms-vscode.powershell            | Terminal               |
| eamodio.gitlens                 | Git blame/history      |
| editorconfig.editorconfig       | Editor consistency     |
| redhat.vscode-yaml              | YAML schema validation |
| deque-systems.vscode-axe-linter | Accessibility lint     |

### Copilot Agents (9)

| Agent    | Scope                                         |
| -------- | --------------------------------------------- |
| sprint   | Execute current roadmap sprint item           |
| release  | Full automated release workflow               |
| feature  | Scaffold engine + store + UI + i18n + tests   |
| debug    | Diagnose and fix failures without suppression |
| a11y     | WCAG 2.2 AA audit and fix                     |
| i18n     | Key management with 6-locale parity           |
| cleanup  | Dead code, lint, $TEMP enforcement            |
| security | OWASP Top 10 audit and CSP hardening          |
| perf     | Lighthouse CI and Core Web Vitals             |

### MCP Servers (10)

| Server             | Type  | Purpose                           |
| ------------------ | ----- | --------------------------------- |
| github             | HTTP  | PRs, issues, Actions, code search |
| filesystem         | stdio | Scoped workspace file access      |
| fetch              | stdio | Web page/API retrieval            |
| playwright         | stdio | Browser automation for E2E debug  |
| memory             | stdio | Persistent agent notes            |
| sequentialthinking | stdio | Multi-step reasoning              |
| context7           | stdio | Up-to-date library docs           |
| gitkraken          | HTTP  | Git ops, blame, diff              |
| cloudflare         | HTTP  | Pages/Workers management          |
| brave-search       | stdio | Web search fallback               |

### GitHub Actions (14 Workflows)

| Workflow                  | Trigger     | Purpose                   |
| ------------------------- | ----------- | ------------------------- |
| ci.yml                    | push/PR     | Full quality gate         |
| release.yml               | tag push    | Build + GH release        |
| pages.yml                 | main push   | Deploy to GitHub Pages    |
| codeql.yml                | schedule/PR | Security analysis         |
| dependency-review.yml     | PR          | Dep vulnerability check   |
| secret-scan.yml           | push/PR     | Secret leak prevention    |
| lighthouse.yml            | PR          | Performance budget        |
| size-limit.yml            | PR          | Bundle size gate          |
| labeler.yml               | PR          | Auto-label by path        |
| stale.yml                 | schedule    | Close stale issues        |
| pr-title.yml              | PR          | Conventional commit title |
| dependabot-auto-merge.yml | PR          | Auto-merge patch deps     |
| preview-deploy.yml        | PR          | Cloudflare preview URL    |
| cloudflare-pages.yml      | main push   | Production deploy         |

---

## 10. Repository Structure Policy

```text
/ (root)
├── Tool configs only: vite.config.ts, eslint.config.js, tsconfig*.json, etc.
├── Project essentials: package.json, index.html, README.md, ROADMAP.md, CHANGELOG.md
├── config/         Budget files, schema definitions, sync manifests
├── docs/           Architecture, user guide, sprint history, API docs
├── public/         Static assets served as-is (manifest, fonts, SVGs)
├── scripts/        Build/CI helper scripts (Node.js)
├── src/            Application source code
├── tests/          All test files mirroring src/
└── .github/        CI, agents, prompts, instructions, actions
```

Rules:

- No intermediate/generated files in workspace — all go to `$TEMP/WoodworkingShop/`
- No new root files without explicit justification in this document
- Dead files caught by `npm run dead:check` (Knip)
- Template assets synced to parent `MyScripts/templates/` via `npm run template:sync`

---

---

## 11. Definition of Done

The project may claim best-in-class status only when:

- Every public engine export, store action, hook, serializer and user-facing interactive control maps to a focused test or an explicit reviewed exclusion.
- Unit/property tests prove geometry, validation boundaries, migrations and export contracts; browser tests prove real interactions and parsed downloads.
- P0 workflows pass in supported browser projects, desktop/mobile widths, keyboard operation, RTL and accessibility checks.
- Releases publish measured test totals, coverage by directory, browser matrix, accessibility, export, benchmark/bundle and gate evidence.
- No release claim says PASS, complete or best-in-class without reproducible evidence; unavailable checks are marked NOT RUN with the blocker.
- Production gates pass and there are no unresolved P0/P1 security or data-loss issues.
- Export formats have explicit versions, unit/coordinate contracts and independently parsed fixtures.
- Accessibility and all six locale key sets are continuously validated; RTL and long-string responsive behavior are included.
- Governance prevents silent drift in code, docs, AI assets and workflows; zero-suppression policy has no exceptions.
- The parent MyScripts template receives a validated governance baseline; OpenSSF score is reported from a dated run, not presumed.
- Every benchmark gap is closed with evidence or deferred with an owner, reason and revisit trigger.
- Local-first operation remains complete; network/cloud behavior is opt-in, disclosed and independently threat-modeled.
