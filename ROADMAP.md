# Roadmap

> **Last strategic review**: 2026-05-24 · **Current version**: 3.67.0
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

## Strategic Architecture Review

### 1. Language & Toolchain Decisions

| Decision              | Current                            | Verdict      | Analysis                                                                                                                                                                         |
| --------------------- | ---------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript 6 strict   | `erasableSyntaxOnly`, zero `any`   | **Keep**     | Aligns with TC39 stripping direction (Node 22 `--experimental-strip-types`). `noImplicitOverride` + `allowUnreachableCode: false` prevent entire bug classes.                    |
| Vite 8 (Rolldown)     | Rust-based bundler, native ESM     | **Keep**     | Fastest HMR; Rolldown outperforms esbuild on large codebases. Turbopack is Next.js-specific; Rspack lacks plugin maturity. Rolldown natively handles CSS/Workers.                |
| Node ≥ 22 LTS         | Native `structuredClone`, streams  | **Keep**     | V8 22 gives native WeakRef, ReadableStream, and faster JSON. CI tests 22/24/26.                                                                                                  |
| npm 11 workspaces     | Parent `MyScripts/` hoisting       | **Evaluate** | Works but `pnpm` would reduce disk usage 60%, provide stricter dependency isolation, and eliminate phantom deps. **Action**: benchmark migration effort vs. benefit in Phase 17. |
| ESLint 10 flat config | 8 plugins, Sonar, a11y             | **Simplify** | Too many plugins. Drop `sonarjs` (duplicates TS strict + regexp); keep jsx-a11y, react-hooks, no-only-tests, regexp. Reduces config from 130 → 70 lines.                         |
| Prettier 3            | Format-on-commit                   | **Keep**     | Non-negotiable for consistent formatting. `prettier-plugin-tailwindcss` handles class sorting.                                                                                   |
| Stylelint 17          | Tailwind + standard + browserslist | **Simplify** | Only 1 CSS file (`index.css`). Switch to `stylelint-config-tailwindcss` alone — drops 15 lines of `ignoreAtRules` overrides.                                                     |
| Vitest 4              | jsdom, V8 coverage                 | **Keep**     | Fastest test runner in ecosystem. Browser-mode (Playwright backend) available for future component tests needing real DOM.                                                       |
| Playwright 1.60       | E2E + axe-core a11y                | **Keep**     | Cross-browser a11y testing. Chrome/Firefox/WebKit coverage.                                                                                                                      |

### 2. Frontend Architecture Decisions

| Decision            | Current                                 | Verdict      | Analysis                                                                                                                                        |
| ------------------- | --------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| React 19            | Concurrent features + Compiler          | **Keep**     | React Compiler brings automatic memoization. PDF/SVG/i18n ecosystem is unmatched. Signals frameworks (Solid, Preact) lack this ecosystem depth. |
| Zustand 5           | Single store + slices + undo/redo       | **Keep**     | 1.1 KB bundle. Excellent TS inference. Slice architecture delivered. Redux adds 15 KB for identical semantics.                                  |
| Tailwind CSS v4     | Design tokens, logical RTL props        | **Keep**     | `ms-*`/`me-*` logical properties are correct for RTL. JIT compilation, zero-runtime. `wood-*` tokens are the single brand-colour source.        |
| @react-pdf/renderer | PDF off main thread (300 KB chunk)      | **Evaluate** | Largest dep. Investigate `pdfme` (~80 KB, JSON-template based) for equivalent quality. **Action**: Phase 17 spike.                              |
| i18next 26          | 6 locales, lazy loading                 | **Keep**     | Proven, mature. Lazy locale loading implemented. Namespace splitting would add complexity without benefit for 500-key files.                    |
| Web Workers (3)     | Cut optimizer, cost estimator, assembly | **Enhance**  | Add **Comlink** for transparent typed RPC (1.4 KB). Eliminates all message-passing boilerplate across 3 workers.                                |
| idb-keyval          | IndexedDB persistence                   | **Keep**     | 1 KB, does exactly what's needed. No alternative is simpler.                                                                                    |

### 3. Engine Architecture Decisions

| Decision                     | Current                             | Verdict        | Analysis                                                                                                                                                          |
| ---------------------------- | ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure TS, no React imports    | All `src/engine/**` files           | **Keep**       | Non-negotiable. Enables CLI tools, workers, WASM targets, and test harnesses without browser.                                                                     |
| Flat `src/engine/*.ts` files | 30+ files, single barrel            | **Reorganize** | Too many files at one level. Group into: `engine/optimizer/`, `engine/hardware/`, `engine/materials/`, `engine/export/`, `engine/validation/`. Barrel stays flat. |
| MaxRects BSSF optimizer      | Single-pass per material            | **Enhance**    | Add multi-start (3 rotations × 2 sort orders), pick best result. 6× iterations, still < 50 ms for 200 parts.                                                      |
| Branded measurement types    | `Mm`, `Kg`, `Percent` nominal types | **Keep**       | Delivered Phase 11. Zero runtime cost; prevents unit-mismatch at compile time.                                                                                    |
| Result<T,E> error signalling | Engine returns Result, no throws    | **Keep**       | Delivered. Catches at store/worker boundaries. Error cases visible in signatures.                                                                                 |
| Guillotine + Freeform modes  | Dual optimizer algorithms           | **Keep**       | Essential for real shops. Panel saws can only make through-cuts.                                                                                                  |

### 4. Infrastructure & Deployment Decisions

| Decision                     | Current                   | Verdict     | Analysis                                                                                                                                  |
| ---------------------------- | ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Pages hosting         | Static, free, CDN         | **Migrate** | No custom headers (CSP, COOP/COEP for SharedArrayBuffer). Migrate to **Cloudflare Pages**: free, 250+ PoPs, PR previews, `_headers` file. |
| Workbox SW (vite-plugin-pwa) | Cache-first, auto-update  | **Keep**    | Reliable offline. Properly handles cache invalidation.                                                                                    |
| Cloudflare Web Analytics     | Privacy-first, no cookies | **Keep**    | Zero GDPR friction. Already integrated via `VITE_CF_ANALYTICS_TOKEN`.                                                                     |
| No backend requirement       | 100% client-side          | **Keep**    | Core value prop. Optional Supabase for collaboration only (BYO instance, never required).                                                 |
| CycloneDX SBOM               | Generated on release      | **Keep**    | Enterprise requirement. Already automated in `release.yml`.                                                                               |
| Lighthouse CI                | Budgets in CI             | **Tighten** | Current: TBT < 300 ms. **New**: TBT < 200 ms, FCP < 1.2 s.                                                                                |

### 5. Database & Storage Architecture

| Layer            | Technology             | Purpose                           | Verdict        |
| ---------------- | ---------------------- | --------------------------------- | -------------- |
| Primary storage  | IndexedDB (idb-keyval) | Projects, snapshots, offcuts      | **Keep**       |
| Settings         | localStorage           | UI preferences, last active tab   | **Keep**       |
| URL state        | URL query params       | Shareable configs < 2 KB          | **Keep**       |
| Overflow storage | IndexedDB `?ref=`      | Large configs exceeding URL limit | **Keep**       |
| Sync (optional)  | Supabase Postgres      | Multi-device sync, sharing        | **Keep** (BYO) |
| CRDT merge       | Custom vector clock    | Conflict resolution for sync      | **Keep**       |

**No external database is required for any core workflow.** All data lives in the browser. The Supabase integration is strictly opt-in, self-hosted, and has zero impact on the offline-first architecture.

### 6. External APIs & Integrations

| Integration              | Status       | Protocol      | Notes                                                     |
| ------------------------ | ------------ | ------------- | --------------------------------------------------------- |
| Cloudflare Web Analytics | Deployed     | Beacon script | No API key needed; privacy-first, no cookies              |
| Supabase (optional)      | Implemented  | REST + WS     | BYO instance; env vars `VITE_SUPABASE_URL` + anon key     |
| BYO AI (optional)        | Implemented  | REST (OpenAI) | User-supplied API key in localStorage; zero telemetry     |
| WebSerial CNC            | Planned Ph19 | WebSerial API | Browser API, no external service; Grbl/LinuxCNC           |
| Community catalog        | Planned Ph19 | JSON REST     | Public read-only API; community-contributed material data |

**Zero required external APIs.** The app works fully offline with zero network access.

### 7. Documentation & Content Strategy

| Asset                             | Status  | Action Required                                                               |
| --------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `ROADMAP.md`                      | Current | This file — consolidated strategic document                                   |
| `docs/ARCHITECTURE.md`            | Current | Add auto-generated dep graph via TypeDoc; keep Mermaid for high-level flow    |
| `docs/USER-GUIDE.md`              | Current | Add annotated screenshots in `docs/images/` (Phase 18)                        |
| `docs/SPRINT-HISTORY.md`          | Current | Archive-only. New phases append. No active planning.                          |
| `docs/MIGRATION.md`               | Current | Version upgrade notes                                                         |
| `CHANGELOG.md`                    | Current | Keep-a-Changelog format. Continues as-is.                                     |
| `.github/copilot-instructions.md` | Current | Update after ESLint simplification (Phase 16)                                 |
| `docs/PLUGIN-API.md`              | Missing | **Create Phase 17**: hook catalog, stability matrix, version compat, examples |
| `docs/CONFIGURATION.md`           | Missing | **Create Phase 16**: all user-facing settings, defaults, units, currencies    |

---

## Industry Competitor Benchmark

### Feature Comparison Matrix

| Capability                   | Cabinet Planner (us)     | CutList Optimizer (web) | CutList Plus fx       | OpenCutList (SketchUp)    | Polyboard           | Cabinet Vision      | Fusion 360        |
| ---------------------------- | ------------------------ | ----------------------- | --------------------- | ------------------------- | ------------------- | ------------------- | ----------------- |
| **Platform**                 | Browser PWA (all OS)     | Browser                 | Desktop (Win)         | SketchUp plugin (Win/Mac) | Desktop (Win)       | Desktop (Win)       | Cloud + Desktop   |
| **Price**                    | Free / MIT               | Freemium                | $149                  | Free / LGPL               | €500+               | $5000+/yr           | $680/yr           |
| **Cut optimizer**            | MaxRects + Guillotine    | Guillotine + MaxRects   | Guillotine + MaxRects | Guillotine strip          | Proprietary nesting | Proprietary nesting | CAM toolpath      |
| **Multi-start optimization** | ❌ (Phase 16)            | ❌                      | ✅                    | ❌                        | ✅                  | ✅                  | ✅                |
| **Grain direction**          | ✅ Hatch overlay         | ✅ Basic                | ✅                    | ✅                        | ✅                  | ✅                  | N/A               |
| **Kerf compensation**        | ✅ 5 profiles            | ✅ Single value         | ✅                    | ✅                        | ✅                  | ✅                  | ✅ (CAM)          |
| **Edge banding BOM**         | ✅ Linear metres         | ❌                      | ✅                    | ✅                        | ✅                  | ✅                  | N/A               |
| **3D preview**               | ✅ WebGL isometric       | ❌                      | ❌                    | SketchUp 3D               | 2D only             | Photorealistic      | Photorealistic    |
| **DXF export**               | ✅ AutoCAD 2018          | ❌                      | ✅ Basic              | ❌                        | ✅                  | ✅                  | ✅                |
| **G-code export**            | ✅ G2/G3 + M6            | ❌                      | ❌                    | ❌                        | ❌                  | ✅ CNC              | ✅ Full CAM       |
| **PDF assembly guide**       | ✅ Multi-page RTL        | ❌                      | Print only            | ❌                        | ❌                  | ✅                  | ✅                |
| **RTL / i18n**               | ✅ 6 locales, full RTL   | ❌                      | EN only               | 10 locales                | EN + DE             | EN only             | 15+ locales       |
| **Plugin API**               | ✅ Versioned, sandboxed  | ❌                      | Script macros         | Ruby API                  | ❌                  | VB macros           | Python/C++ Add-in |
| **Offline (PWA)**            | ✅ Full                  | ❌                      | ✅ (Desktop native)   | ✅ (Desktop)              | ✅ (Desktop)        | ✅ (Desktop)        | Partial           |
| **Real-time collaboration**  | ✅ CRDT + Supabase (BYO) | ❌                      | ❌                    | ❌                        | ❌                  | Shop-floor MES      | ✅ Real-time      |
| **AI assistance**            | ✅ BYO API key           | ❌                      | ❌                    | ❌                        | ❌                  | ❌                  | Generative design |
| **Accessibility (WCAG AA)**  | ✅ Audited + axe-core    | ❌                      | ❌                    | ❌                        | ❌                  | ❌                  | Partial           |
| **Open source**              | ✅ MIT                   | ❌ Proprietary          | ❌ Proprietary        | ✅ LGPL                   | ❌ Proprietary      | ❌ Proprietary      | ❌ Proprietary    |
| **Unit test coverage**       | 90%+ engine (1915 tests) | Unknown                 | Unknown               | Minimal                   | Unknown             | Unknown             | Internal          |
| **Bundle size (JS)**         | < 2.2 MB (target < 1.8)  | Unknown                 | N/A                   | N/A                       | N/A                 | N/A                 | N/A               |
| **CNC direct send**          | ❌ (Phase 19)            | ❌                      | ❌                    | ❌                        | ❌                  | ✅                  | ✅                |

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

---

## Active Roadmap

### Phase 16: Optimizer Mastery & Config Minimalism (v3.68.0) — **NEXT**

**Goal**: World-class optimizer yield. Simplified tooling config. Tighter Lighthouse targets.

**Exit criteria**: Multi-start optimizer deployed, parametric constraints active, ESLint config simplified (drop sonarjs + promise), Lighthouse TBT < 200 ms, `docs/CONFIGURATION.md` created.

| Sprint | Deliverable                                                      | Type    |
| ------ | ---------------------------------------------------------------- | ------- |
| 51     | Multi-start MaxRects (6 rotation×sort combos, return best yield) | Engine  |
| 52     | Parametric constraint solver (min/max bounds per dimension)      | Engine  |
| 53     | Optimizer yield comparison report (tabular strategy comparison)  | Engine  |
| 54     | ESLint simplification: remove sonarjs + promise plugins          | Config  |
| 55     | Stylelint simplification: single extend, remove manual rules     | Config  |
| 56     | Lighthouse target tightening (TBT < 200, FCP < 1.2)              | CI      |
| 57     | Config panel UX: template presets dropdown, quick-start wizard   | UI      |
| 58     | Create `docs/CONFIGURATION.md` — all settings documented         | Docs    |
| 59     | Version bump 3.68.0, CHANGELOG, GH release                       | Release |

### Phase 17: DX & Bundle Optimization (v3.69.0)

**Goal**: Bundle < 1.8 MB. Streamlined DX. Documented plugin API.

**Exit criteria**: Bundle under 1.8 MB, Comlink workers, Plugin API documented, PDF alternative evaluated.

| Sprint | Deliverable                                                      | Type     |
| ------ | ---------------------------------------------------------------- | -------- |
| 60     | Comlink worker RPC (replace workerCall — 3 workers)              | Engine   |
| 61     | Tree-shake audit: eliminate dead paths in engine barrel          | Build    |
| 62     | PDF renderer spike: benchmark pdfme vs @react-pdf/renderer       | Research |
| 63     | Chunk strategy: split Three.js chunk, eliminate react-vendor     | Build    |
| 64     | pnpm migration evaluation (install time, disk, CI comparison)    | Research |
| 65     | Create `docs/PLUGIN-API.md` — hooks, stability, versions         | Docs     |
| 66     | Merge vitest.bench.config into vitest.config (workspace pattern) | Config   |
| 67     | Version bump 3.69.0, CHANGELOG, GH release                       | Release  |

### Phase 18: Visual Fidelity & UX (v3.70.0)

**Goal**: Photorealistic materials in 3D, placement animation, print polish.

| Sprint | Deliverable                                                       | Type    |
| ------ | ----------------------------------------------------------------- | ------- |
| 68     | Material texture atlas (8 species + composites, 512×512 tiles)    | Assets  |
| 69     | Three.js material-mapped cabinet render (replace flat colours)    | UI      |
| 70     | Nesting placement animation (step-by-step sequence with timeline) | UI      |
| 71     | Onboarding wizard redesign (3-step guided flow, skippable)        | UX      |
| 72     | Print stylesheet optimization (A4/Letter margins, break control)  | CSS     |
| 73     | Version bump 3.70.0, CHANGELOG, GH release                        | Release |

### Phase 19: Machine Integration & Community (v4.0.0)

**Goal**: Design-to-fabrication bridge. Community material data.

| Sprint | Deliverable                                           | Type    |
| ------ | ----------------------------------------------------- | ------- |
| 74     | WebSerial API integration (Grbl G-code streaming)     | Feature |
| 75     | Machine profile registry (Grbl, LinuxCNC, Mach3)      | Engine  |
| 76     | Community material catalog schema (JSON API contract) | Design  |
| 77     | Material price import from community catalog          | Feature |
| 78     | Version bump 4.0.0, CHANGELOG, GH release             | Release |

### Phase 20: Enterprise & Mobile (v4.1.0)

| Sprint | Deliverable                                                    | Type     |
| ------ | -------------------------------------------------------------- | -------- |
| 79     | IFC export (Industry Foundation Classes for BIM)               | Engine   |
| 80     | STEP export (AP214 furniture geometry profile)                 | Engine   |
| 81     | Capacitor iOS/Android wrapper (camera, haptics)                | Platform |
| 82     | Mobile-first touch UI (swipe tabs, pinch preview, thumb zones) | UI       |
| 83     | Version bump 4.1.0, CHANGELOG, GH release                      | Release  |

### Phase 21+: Future Horizons (Unscoped)

| Track         | Candidate                                           | Trigger                              |
| ------------- | --------------------------------------------------- | ------------------------------------ |
| Rendering     | WebGPU path-traced material preview                 | WebGPU > 85% browser support         |
| Collaboration | Figma-style multiplayer cursors                     | User base demands real-time editing  |
| AI            | On-device LLM (WebLLM/WASM) for offline suggestions | Model quality adequate for furniture |
| Standards     | glTF 2.0 export for AR/VR placement                 | WebXR API stabilizes                 |
| Marketplace   | Plugin marketplace with community contributions     | Plugin count > 10                    |
| Embedded      | Raspberry Pi shop-floor kiosk mode                  | Community request                    |

---

## Configuration Optimization Plan

### Current: 25 root config artifacts → Target: 21

| Action                                                        | Saves                  | Phase |
| ------------------------------------------------------------- | ---------------------- | ----- |
| Remove `eslint-plugin-sonarjs` (redundant with TS strict)     | 40 config lines, 1 dep | 16    |
| Remove `eslint-plugin-promise` (all rules disabled)           | 10 config lines, 1 dep | 16    |
| Stylelint: single `extends: ['stylelint-config-tailwindcss']` | 20 lines               | 16    |
| Merge `vitest.bench.config.ts` into `vitest.config.ts`        | 1 file                 | 17    |
| Merge `tsconfig.test.json` inline into vitest config          | 1 file                 | 17    |
| Inline `config/lighthouserc.json` into lighthouse script      | 1 file                 | 17    |
| Remove `tsconfig.e2e.json` (Playwright uses tsconfig.json)    | 1 file                 | 17    |

### ESLint Config Target (Phase 16)

```javascript
// eslint.config.js — simplified (target ~65 lines)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import regexp from 'eslint-plugin-regexp';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import eslintConfigPrettier from 'eslint-config-prettier';
// Removed: sonarjs (redundant), promise (all rules off), testing-library (moved to test-only)
```

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
