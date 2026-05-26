# Roadmap

> **Last strategic review**: 2026-06-09 · **Current version**: 5.5.0
> **Next target**: v5.6.0 (Phase 30 — AI Assistant & Advanced Export)
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
| **Minimal**    | ≤ 8 production dependencies; < 1.5 MB bundle; ≤ 18 config files at root |

---

## Industry Competitor Benchmark

### Comparison Table

| Feature / Capability            | Cabinet Planner (this) | CutList Optimizer | SketchList 3D | Polyboard    | CutList Plus fx | Cabinet Vision | Fusion 360  |
| ------------------------------- | ---------------------- | ----------------- | ------------- | ------------ | --------------- | -------------- | ----------- |
| **Price**                       | Free / MIT OSS         | Free (basic)      | $167–$497/yr  | €330 one-off | $79–$159        | Enterprise $   | $545/yr     |
| **Platform**                    | Browser (PWA)          | Browser           | Windows only  | Windows only | Windows only    | Windows only   | Cloud + Win |
| **Cut optimization**            | MaxRects BSSF multi    | Simple 2D         | Basic         | Guillotine   | Advanced        | Proprietary    | None        |
| **G-code export**               | Yes (G2/G3 arcs, M6)   | No                | No            | WoodWOP only | No              | WoodWOP/Grbl   | Yes         |
| **DXF export**                  | Yes (layers, colors)   | No                | Basic         | Yes          | No              | Yes            | Yes         |
| **PDF build plans**             | Yes (off-thread)       | No                | Yes           | Yes          | Yes             | Yes            | Yes         |
| **3D preview**                  | SVG isometric          | No                | Full 3D       | 3D           | No              | Full 3D        | Full 3D     |
| **Assembly guide**              | Yes (DAG + timer)      | No                | No            | No           | No              | Yes            | No          |
| **Hardware BOM**                | Yes (vendor catalog)   | No                | Basic         | Yes          | No              | Yes            | No          |
| **Grain direction**             | Yes (report + lock)    | Yes               | No            | Yes          | Yes             | Yes            | No          |
| **WCAG 2.2 AA accessible**      | Yes                    | No                | No            | No           | No              | No             | Partial     |
| **RTL support (Hebrew/Arabic)** | Yes (6 locales)        | No                | No            | No           | No              | No             | UI only     |
| **Offline capable (PWA)**       | Yes                    | No                | N/A (desktop) | N/A          | N/A             | N/A            | No          |
| **Plugin API**                  | Yes (versioned)        | No                | No            | No           | No              | Proprietary    | Yes         |
| **Open source**                 | MIT                    | No                | No            | No           | No              | No             | No          |
| **Community material catalog**  | Yes                    | No                | No            | Limited      | No              | No             | Yes         |
| **IFC/STEP/glTF export**        | Yes                    | No                | No            | No           | No              | No             | Yes         |
| **WebSerial CNC streaming**     | Yes                    | No                | No            | No           | No              | No             | CAM only    |
| **Cost estimation**             | Yes (variance tracker) | No                | Manual        | Yes          | Manual          | Yes            | No          |
| **Stock management**            | Yes                    | No                | No            | Yes          | No              | Yes            | No          |
| **Mobile support**              | PWA + Capacitor        | Responsive        | No            | No           | No              | No             | iOS app     |
| **Production dependencies**     | 8                      | Unknown           | 50+           | Desktop      | Desktop         | Desktop        | Cloud       |
| **Bundle size (JS)**            | < 1.8 MB               | ~500 KB           | Desktop       | Desktop      | Desktop         | Desktop        | Cloud       |
| **Zero-install / zero-signup**  | Yes                    | Signup required   | Download      | Download     | Download        | Download       | Signup      |

### Competitive Advantages (Unique to This Project)

1. **Only fully-accessible (WCAG AA) cut optimizer** in the market
2. **Only browser-based app with G-code export** (G2/G3 arcs, tool change M6)
3. **Only OSS app with a formal versioned plugin API** with stability contracts
4. **Only app combining cut optimization + assembly guide + hardware BOM** in browser
5. **Only RTL-first (Hebrew + Arabic) woodworking planner** in existence
6. **Smallest dependency footprint**: 8 production deps vs. 50+ in comparable tools
7. **Only zero-install, zero-signup** professional-grade cabinet planner

### Methods Harvested from Competitors

| From              | Method / Pattern                             | Adoption Plan                               |
| ----------------- | -------------------------------------------- | ------------------------------------------- |
| SketchList 3D     | Parametric constraint engine (min/max/ratio) | Phase 25 Sprint 109                         |
| SketchList 3D     | Reusable design template library             | Phase 27 Sprint 120                         |
| Polyboard         | Guillotine-first then MaxRects fallback      | Evaluate for Phase 25 co-nesting            |
| Cabinet Vision    | Joint library with automatic selection       | Phase 25 Sprint 108                         |
| CutList Plus fx   | Multi-material co-nesting on shared sheets   | Phase 25 Sprint 107                         |
| Fusion 360        | WebGPU PBR material rendering                | Phase 26 Sprint 113                         |
| Fusion 360        | Generative design suggestions                | Phase 27 Sprint 119                         |
| Figma             | CRDT multiplayer with conflict-free cursors  | Phase 27 Sprint 117–118                     |
| CutList Optimizer | Instant optimization preview (< 50 ms)       | Already achieved — maintain via bench gates |

### Gaps to Close (Priority-Ordered)

| #   | Gap                                    | Best-in-Class Reference    | Target Phase | Impact   |
| --- | -------------------------------------- | -------------------------- | ------------ | -------- |
| 1   | Full parametric 3D (WebGPU)            | Fusion 360, SketchList 3D  | Phase 26     | Critical |
| 2   | Constraint-based parametric joints     | Cabinet Vision, SolidWorks | Phase 25     | High     |
| 3   | Multi-material nesting co-optimization | CutList Plus fx, Polyboard | Phase 25     | High     |
| 4   | Real-time collaboration (multiplayer)  | Figma, Onshape             | Phase 27     | Medium   |
| 5   | AI-powered design suggestions          | Fusion 360 Generative      | Phase 27     | Medium   |
| 6   | Native mobile app (full offline)       | Fusion 360 iOS             | Phase 26     | Low      |

---

## Completed Phases Summary

| Phase | Version     | Title                           | Key Deliverables                                                               |
| ----- | ----------- | ------------------------------- | ------------------------------------------------------------------------------ |
| 1–11  | v3.50–v3.61 | Foundation → Quality → DX       | Zero warnings, workers, IndexedDB, a11y, plugins, G-code, ESLint 10            |
| 12–14 | v3.61–v3.66 | Optimizer → Hardware → Collab   | Offcuts, DXF, vendor catalog, CRDT, SBOM, multi-currency                       |
| 15–17 | v3.66–v3.73 | Manufacturing → DX → Efficiency | Kerf, templates, batch replace, Comlink, it.each, docs consolidation           |
| 18    | v3.75.0     | Visual Fidelity & UX            | Material textures, isometric SVG, nesting animation, onboarding, print         |
| 19    | v4.0.0      | Machine Integration & Community | WebSerial Grbl, machine profiles, community material catalog                   |
| 20    | v4.1.0      | Enterprise & Mobile             | IFC/STEP/glTF export, Capacitor, mobile touch UI, ZIP bundle                   |
| 21    | v4.2.0      | Marketplace + Build UX          | Plugin marketplace, finish calculator, build log, focus mode                   |
| 22    | v4.3.0      | Workshop Intelligence           | Waste analytics, mirror/clone, cut checklist, cost summary export              |
| 23    | v4.4.0      | Precision Workflows             | Stock tracker, grain report, cost variance, part labels                        |
| 24    | v5.0.0      | Production Hardening & Reset    | Zero errors/warnings/dead code, full CI pass, architecture reset               |
| 25    | v5.1.0      | Optimizer Intelligence v2       | Multi-material co-nesting, joint library, constraint solver, suggestions panel |
| 26    | v5.2.0      | Visual Engine Upgrade           | WebGPU renderer, PBR materials, 3D preview, WebXR AR placement                 |
| 27    | v5.3.0      | Collaboration & Intelligence    | CRDT sync, cloud queue, AI layout suggestions, shared project library          |
| 28    | v5.4.0      | Performance & Plugin Ecosystem  | ERP/MRP export, ISO 7171 compliance, multi-project workspace, audit trail      |

---

## Active Roadmap

### Phase 26 — Visual Engine Upgrade · v5.2.0 ✓ COMPLETE

> **Status**: COMPLETE · **Released**: 2026-05-26

| Sprint | Deliverable                                                     | Status | Track   |
| ------ | --------------------------------------------------------------- | ------ | ------- |
| 112    | WebGPU renderer scaffolding (fallback to WebGL2)                | ✓ Done | Engine  |
| 113    | PBR material system (wood grain, edge banding, hardware chrome) | ✓ Done | Assets  |
| 114    | Interactive 3D cabinet preview (orbit, pan, zoom, explode view) | ✓ Done | UI      |
| 115    | AR placement via WebXR (scan room → place cabinet)              | ✓ Done | Feature |
| 116    | Version bump 5.2.0, CHANGELOG, GH release                       | ✓ Done | Release |

### Phase 25 — Optimizer Intelligence v2 · v5.1.0 ✓ COMPLETE

> **Status**: COMPLETE · **Released**: 2026-05-26

| Sprint | Deliverable                                                          | Status | Track   |
| ------ | -------------------------------------------------------------------- | ------ | ------- |
| 107    | Multi-material co-nesting optimizer (shared sheets across materials) | ✓ Done | Engine  |
| 108    | Parametric joint library (mortise-tenon, dovetail, pocket-hole)      | ✓ Done | Engine  |
| 109    | Constraint solver (min/max/ratio rules for dimensions)               | ✓ Done | Engine  |
| 110    | Optimization suggestions panel (AI-free heuristic recommendations)   | ✓ Done | UI      |
| 111    | Version bump 5.1.0, CHANGELOG, GH release                            | ✓ Done | Release |

### Phase 27 — Collaboration & Intelligence · v5.3.0 ✅ COMPLETE

> **Goal**: Real-time multiplayer editing and AI-powered design assistance.

| Sprint | Deliverable                                                                | Track   |
| ------ | -------------------------------------------------------------------------- | ------- |
| 117    | CRDT collaboration presence layer (LWW-Register + Lamport timestamps)      | Engine  |
| 118    | Cloud project sync engine (IndexedDB-to-remote queue with delta/merge)     | Engine  |
| 119    | AI layout suggestions heuristic engine (7 rule-based heuristics + scoring) | AI      |
| 120    | Shared project library & catalog (search / filter / sort / export/import)  | Feature |
| 121    | Version bump 5.3.0, CHANGELOG, GH release                                  | Release |

### Phase 28 — Performance & Plugin Ecosystem · v5.4.0 ✅ COMPLETE

> **Goal**: Bundle performance, plugin marketplace foundation, and enterprise export standards.

| Sprint | Deliverable                                                    | Track   |
| ------ | -------------------------------------------------------------- | ------- |
| 122    | ERP/MRP export format (SAP, Oracle, custom webhook)            | Export  |
| 123    | ISO 7171 compliance validation (furniture dimension standards) | Engine  |
| 124    | Multi-project workspace (tabs, cross-project material sharing) | UI      |
| 125    | Audit trail and version diffing (full project history)         | Feature |
| 126    | Version bump 5.4.0, CHANGELOG, GH release                      | Release |

### Phase 29 — Plugin Marketplace & Mobile Native · v5.5.0

> **Status**: ✅ COMPLETE · **Released**: 2026-06-09

| Sprint | Deliverable                                                       | Track   |
| ------ | ----------------------------------------------------------------- | ------- |
| 127    | Plugin marketplace foundation (registry, install, enable/disable) | Feature |
| 128    | Native mobile app (Capacitor iOS/Android + offline-first sync)    | Mobile  |
| 129    | Advanced analytics dashboard (usage, material, cost trends)       | Feature |
| 130    | Bundle performance (code-splitting, lazy chunks, < 1.4 MB target) | Perf    |
| 131    | Release v5.5.0                                                    | Release |

### Phase 30 — AI Assistant & Advanced Export · v5.6.0

> **Status**: PLANNED · **Goal**: AI design assistant, advanced 3D export, WebSerial CNC streaming improvements

| Sprint | Deliverable                                                                   | Track   |
| ------ | ----------------------------------------------------------------------------- | ------- |
| 132    | AI design assistant engine (constraint-based layout suggestions)              | AI      |
| 133    | glTF 2.0 / IFC 4.3 export (standards-grade 3D output)                         | Export  |
| 134    | WebSerial CNC streaming v2 (real-time progress, pause/resume, error recovery) | CNC     |
| 135    | Advanced stock management (purchase orders, reorder alerts, waste tracking)   | Feature |
| 136    | Release v5.6.0                                                                | Release |

### Future Horizons (Unscoped)

| Track         | Candidate                                        | Trigger                           |
| ------------- | ------------------------------------------------ | --------------------------------- |
| Rendering     | Ray-traced preview (WebGPU compute shaders)      | WebGPU > 90% browser support      |
| Collaboration | Cloud sync with E2E encryption                   | User base > 10K MAU               |
| AI            | Generative design (auto-layout from constraints) | On-device models reach 7B quality |
| Standards     | IFC 4.3 compliance certification                 | Industry demand                   |
| Platform      | Raspberry Pi shop-floor kiosk (Electron-lite)    | Community request + sponsorship   |
| Marketplace   | Paid plugin monetization (Stripe Connect)        | Plugin count > 20                 |

---

## Dependency Budget

### Production (max 8)

| #   | Package             | Bundle KB | Justification                            |
| --- | ------------------- | --------- | ---------------------------------------- |
| 1   | react               | 7         | UI framework                             |
| 2   | react-dom           | 130       | DOM renderer                             |
| 3   | zustand             | 1.1       | State management (smallest option)       |
| 4   | i18next             | 16        | i18n core                                |
| 5   | react-i18next       | 8         | React bindings for i18n                  |
| 6   | @react-pdf/renderer | 300       | PDF generation (evaluate jsPDF Phase 25) |
| 7   | idb-keyval          | 1         | IndexedDB wrapper                        |
| 8   | comlink             | 2         | Worker RPC (typed, minimal)              |

**Rule**: No new production dependency without removing an existing one OR
proving > 50 KB savings elsewhere.

---

## Architecture Decisions — Closed (ADR Log)

| Decision                       | Rationale                                                                                              |
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
| `skipLibCheck: true`           | Required: @react-pdf/types ships `const enum` in .d.ts (TS18055). Remove once upstream fixes.          |
| 8 prod deps (not 7)            | comlink added Phase 17 for typed worker RPC. Justified by DX + type safety gain.                       |

---

## Toolchain & Environment

| Tool       | Version | Purpose                         | Config Location           |
| ---------- | ------- | ------------------------------- | ------------------------- |
| Node.js    | ≥ 22    | Runtime                         | `engines` in package.json |
| npm        | 11.x    | Package management + workspaces | package.json              |
| TypeScript | 6.x     | Compiler (`erasableSyntaxOnly`) | tsconfig\*.json           |
| Vite       | 8.x     | Build + dev server (Rolldown)   | vite.config.ts            |
| ESLint     | 10.x    | Linting (flat config)           | eslint.config.js          |
| Prettier   | 3.x     | Formatting                      | .prettierrc.json          |
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

---

## Release Quality Gates

| #   | Command                 | Check                                | Target        |
| --- | ----------------------- | ------------------------------------ | ------------- |
| 1   | `npm run typecheck`     | Zero TS errors (4 tsconfigs)         | 0 errors      |
| 2   | `npm run lint`          | Zero ESLint warnings                 | 0 warnings    |
| 3   | `npm run lint:css`      | Zero Stylelint warnings              | 0 warnings    |
| 4   | `npm run lint:md`       | Zero markdownlint issues             | 0 issues      |
| 5   | `npm run format:check`  | Zero Prettier drift                  | 0 drift       |
| 6   | `npm run i18n:coverage` | 100% key parity (6 locales)          | 100%          |
| 7   | `npm test`              | All unit tests pass                  | 100% pass     |
| 8   | `npm run build`         | Clean production build               | 0 warnings    |
| 9   | `npm run bundle:check`  | JS ≤ budget (< 1500 KB target)       | ≤ budget      |
| 10  | `npm run bench:check`   | Benchmarks within 5× baseline        | < 5× baseline |
| 11  | `npm run test:e2e`      | All E2E + a11y pass                  | 100% pass     |
| 12  | `npm run dead:check`    | No dead files/exports                | 0 dead        |
| 13  | Lighthouse CI           | TBT < 200 ms, FCP < 1.2 s, a11y ≥ 95 | All pass      |

---

## Continuous Enhancement Rules

1. **No suppression-first fixes** — fix root cause. Never disable a check to silence it.
2. **No dead code** — unused exports, unreachable branches, orphaned files removed same PR.
3. **No dead docs** — stale sections updated or deleted same commit as code change.
4. **No dead config** — commented-out settings, disabled rules, empty overrides deleted.
5. **No hardcoded measurements** — all dimensions in mm via `Mm` branded type.
6. **No hardcoded colours** — `wood-*` tokens only. No inline hex in TSX.
7. **RTL-first layout** — logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) everywhere.
8. **i18n parity every PR** — every `t('key')` → all 6 locale files in same commit.
9. **Engine stays pure** — `src/engine/` has no React, no side effects, no DOM.
10. **Intermediates to $TEMP** — no build artifacts in workspace.
11. **≤ 8 production deps** — no additions without removal or exceptional justification.
12. **Config minimalism** — prefer tool defaults; only configure what diverges.
13. **Commit after each sprint** — atomic, bisectable history.
14. **GH release every 5 sprints** — semver minor bump, `--generate-notes`.
15. **Progressive enhancement** — CSS features that lack universal support use `@supports`.
