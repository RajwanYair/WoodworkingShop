# Roadmap

This roadmap is the single source of truth for the Cabinet Planner program.
Completed sprint detail lives in [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md).

---

## North Star

Build the best-in-class browser-based cabinet planning application for
professional and advanced DIY workflows:

- **Fast** — sub-second interactions, predictable optimization latency, Lighthouse TBT < 300 ms.
- **Accurate** — manufacturing-grade outputs (BOM, DXF, G-code, PDF) that go to the shop floor unchanged.
- **Accessible** — WCAG 2.2 AA by default; bilingual (EN + HE RTL) by design; six locales in total.
- **Reliable** — strict type/lint/test/build/bench gates; zero waivers; zero disabled checks.
- **Portable** — no backend required for any core workflow; local-first is non-negotiable.
- **Extensible** — formal versioned plugin API with stability guarantees.
- **Open** — fully open-source; zero dependency on proprietary cloud APIs in the critical path.

---

## Strategic Decision Audit

Every major architectural choice has been re-examined from first principles.
Verdicts: **Keep** (validated), **Enhance** (right direction, needs work),
or **Rewrite** (fundamental issue identified).

### Language and Toolchain

| Decision                    | Current State                   | Verdict     | Reasoning                                                                                                                                                       |
| --------------------------- | ------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language**                | TypeScript 6 strict, zero `any` | **Keep**    | `erasableSyntaxOnly` aligns with TC39/JavaScript direction; `noImplicitOverride` + `allowUnreachableCode: false` prevent entire bug classes at compile time.    |
| **Measurement types**       | Plain `number` for mm/kg        | **Enhance** | Introduce branded `Mm`, `Kg`, `Percent` nominal types — zero runtime cost; prevents unit-mismatch bugs that the optimizer and estimator currently cannot catch. |
| **Engine error signalling** | `throw` + implicit `undefined`  | **Enhance** | Adopt explicit `Result<T, E>` type (inlined, no dependency). Visible failure modes in signatures; catches moved to store and worker boundaries only.            |
| **Build tool**              | Vite 8 (Rolldown bundler)       | **Keep**    | Fastest HMR and native ESM chunking; Rolldown's Rust core overtakes esbuild on large repos. Turbopack remains Next.js-specific; Rspack lacks plugin maturity.   |
| **Node version**            | ≥ 22 LTS                        | **Keep**    | V8 22 ships native `structuredClone`, `ReadableStream`, faster JSON. CI matrix (22 / 24 / 26) tests forward compatibility.                                      |
| **Package manager**         | npm 11 workspaces               | **Keep**    | Workspaces with parent `MyScripts/` hoisting is intentional. `pnpm` would shrink `node_modules` but offers no functional gain for a single-project workspace.   |

### Frontend Architecture

| Decision                | Current State                                 | Verdict     | Reasoning                                                                                                                                                                       |
| ----------------------- | --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI framework**        | React 19 + concurrent features                | **Keep**    | React Compiler brings automatic memoization. Signals-based frameworks (Solid, Preact Signals) offer finer reactivity but lack the PDF/SVG/i18n ecosystem depth required here.   |
| **State management**    | Zustand 5 single store + undo/redo            | **Keep**    | Minimal API, excellent TS inference. The worker-singleton pattern (module-level `let _worker`) is intentional — Zustand state is serialized; `Worker` objects are not.          |
| **Store architecture**  | Flat single store (~1400 lines)               | **Enhance** | Split into `configSlice`, `optimizerSlice`, `uiSlice`, `snapshotSlice` combined via Zustand `combine()`. Each slice tested independently.                                       |
| **Worker architecture** | 3 worker singletons + manual `_currentReqId`  | **Enhance** | Replace the fragile stale-message guard with a typed RPC wrapper `workerCall<I,O>(worker, msg): Promise<O>` that manages request IDs internally.                                |
| **CSS framework**       | Tailwind CSS v4, design tokens, logical props | **Keep**    | Utility-first with RTL logical properties (`ms-*`, `me-*`) is correct. `wood-*` tokens are the only source of brand colour truth.                                               |
| **PDF generation**      | `@react-pdf/renderer` off main thread         | **Keep**    | No viable alternative for complex multi-page plans with Hebrew RTL and custom fonts without a server. Must stay in a worker.                                                    |
| **i18n loading**        | All 6 locales loaded eagerly                  | **Enhance** | Lazy-load non-active locales on language switch. Six 512-key JSON files add ~45 KB to initial JS. Load only `en` upfront; others on demand via `i18next.loadLanguages()`.       |
| **Component splits**    | Some heavy components not code-split          | **Enhance** | Wrap `AssemblyGuide`, `PdfExportPanel`, `OptimizerView`, `RoomLayoutView` in `React.lazy` behind tab activation. Each saves 10–60 KB from initial parse budget.                 |
| **URL state**           | Diff-from-default encoding                    | **Enhance** | Fails silently near the ~2 KB URL limit. Add IndexedDB fallback: store config under a short hash key, share `?ref=<key>`. Reading link restores from IDB if present.            |
| **Preview renderer**    | SVG/CSS (2D plan view only)                   | **Enhance** | Complete WebGL work in `WebGLPreviewCanvas.tsx` for material texture + isometric 3D preview. Three.js r170+ (tree-shakeable, <100 KB). SVG fallback for non-WebGL environments. |

### Engine Architecture

| Decision                     | Current State                           | Verdict     | Reasoning                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Engine structure**         | Flat `src/engine/*.ts` files            | **Enhance** | Split into domain sub-modules: `geometry/`, `optimizer/`, `hardware/`, `materials/`, `export/`, `validation/`, `plugin/`. Public barrel (`engine/index.ts`) unchanged. Enables tree-shaking.             |
| **Cut optimizer**            | MaxRects BSSF, single pass per material | **Enhance** | Add: (1) Guillotine cut mode (many shops can only cross-cut), (2) waste offcut catalog (reuse leftover sheets), (3) defect-zone avoidance, (4) cross-material co-nesting for identical-thickness groups. |
| **Optimizer property tests** | None                                    | **Enhance** | Add `fast-check` property tests: yield ≤ 100%, no overlapping placements, rotation lock respected, all parts placed. Catches bugs deterministic fixtures cannot.                                         |
| **Validation rule engine**   | Flat function with if/switch chain      | **Enhance** | Promote to a typed rule registry: `{ id, severity, furnitureTypes, check(cfg, dims) }`. Plugin API gets `registerRule()` for community-contributed checks.                                               |
| **Branded measurements**     | Plain `number` for mm/kg/percent        | **Enhance** | Wrap with `Mm`, `Kg`, `Percent` nominal types. Zero runtime cost; prevents silent unit confusion in `computeDimensions`, `estimateCost`, `optimizeCutSheets`.                                            |
| **Assembly engine**          | Linear step list                        | **Enhance** | Model as a dependency graph (DAG). Steps truly independent of each other flagged as parallelisable on the shop floor — genuinely useful for small team shops.                                            |

### Infrastructure and Deployment

| Decision               | Current State                           | Verdict     | Reasoning                                                                                                                                                                               |
| ---------------------- | --------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hosting**            | GitHub Pages (static, CDN)              | **Enhance** | Migrate to **Cloudflare Pages**: free, edge CDN in 250+ PoPs, native SPA URL rewrite (`_redirects`), PR preview deployments, no ops burden.                                             |
| **Service worker**     | Hand-rolled cache-first SW              | **Rewrite** | Replace with **Workbox** (`vite-plugin-pwa`). The hand-rolled SW has documented edge cases on version mismatch; Workbox handles cache invalidation, SWR, and offline fallback reliably. |
| **Analytics**          | None                                    | **Enhance** | Add **Cloudflare Web Analytics**: privacy-first, no cookies, no GDPR consent, free. Understand which furniture types and exports are used.                                              |
| **Security headers**   | CSP present, no `report-uri`            | **Enhance** | Add `Content-Security-Policy-Report-Only` with a free reporting endpoint (Sentry CSP, Report URI). Surface violations from real users before exploits.                                  |
| **SBOM**               | None                                    | **Add**     | Generate a **CycloneDX** SBOM on every release. Required for enterprise adopters; increasingly required for open-source supply-chain posture.                                           |
| **Lighthouse CI**      | Manual script (`scripts/lighthouse.js`) | **Enhance** | Run Lighthouse in CI on every PR with budgets enforced. Currently a run-only script.                                                                                                    |
| **Backend (optional)** | None                                    | **Defer**   | Keep zero-server as the primary mode. **Supabase BYO** option (Postgres + Auth + Storage) scoped for the Collaboration track only; users can self-host. Never required.                 |

### Documentation and Content

| Decision                 | Current State                           | Verdict     | Reasoning                                                                                                                                                         |
| ------------------------ | --------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture docs**    | `docs/ARCHITECTURE.md` + static Mermaid | **Enhance** | Diagrams drift from code. Generate engine dependency graph via `madge` or TypeDoc in CI; flag PRs that desync the documented graph from the live one.             |
| **Plugin API changelog** | None                                    | **Add**     | Plugin authors need a separate `docs/PLUGIN-CHANGELOG.md` documenting hook additions, stability changes, and removals between API versions.                       |
| **Coverage badge**       | Runs to `$TEMP`, not surfaced           | **Enhance** | Upload to **Codecov** (free for OSS) on every CI run. Surface badge in README; block PRs that drop engine coverage below 85%.                                     |
| **User guide**           | `docs/USER-GUIDE.md` (text only)        | **Enhance** | Add short video walkthroughs for cut-sheet optimization, G-code export, and room layout. Embed via `<video>` in the user guide; videos stored on GitHub Releases. |

---

## Industry Benchmark

Comparison across the dimensions that matter most for a woodworking planning application.
Each gap maps to a concrete harvested action.

| Product                           | Type                   | Optimizer                          | Rendering               | Collaboration          | Export Formats             | Plugin / Extensibility     | AI Surface           | Platform              | Pricing        |
| --------------------------------- | ---------------------- | ---------------------------------- | ----------------------- | ---------------------- | -------------------------- | -------------------------- | -------------------- | --------------------- | -------------- |
| **Cabinet Planner** _(this app)_  | Browser PWA            | MaxRects BSSF + Smart heuristics   | SVG/CSS + WebGL (WIP)   | None (local-first)     | PDF, DXF, G-code, BOM, ERP | Formal API v1 (stable)     | None (planned BYO)   | Web (all)             | Free / OSS     |
| **CutList Optimizer (web)**       | Browser                | Guillotine + MaxRects              | SVG sheet layout        | None                   | SVG, PDF                   | None                       | None                 | Web                   | Freemium       |
| **CutList Plus fx**               | Desktop                | Guillotine + MaxRects              | 2D sheet views          | None                   | CSV, DXF, print            | Script macros              | None                 | Desktop only          | $149 one-off   |
| **OpenCutList (SketchUp plugin)** | SketchUp plugin        | Guillotine strip-packing           | SketchUp 3D + 2D sheets | None                   | PDF, SVG, CSV              | SketchUp Extension API     | None                 | Desktop (SketchUp)    | Free / OSS     |
| **Polyboard**                     | Desktop (Windows)      | Nesting (DXF-based)                | 2D assembly views       | None                   | DXF, CSV, CNC              | None                       | None                 | Windows only          | €500+          |
| **Cabinet Vision**                | Desktop (Windows)      | Proprietary nesting                | Photorealistic 3D       | Shop-floor integration | CNC, XML, ERP              | VB macros                  | None                 | Windows only          | $5,000+/yr     |
| **KCD Software**                  | Desktop + cloud hybrid | Custom heuristic                   | Photorealistic 3D       | Dealer sharing         | CNC, PDF, DXF              | None public                | None                 | Windows + limited web | $3,000+/yr     |
| **Mozaik Software**               | Desktop (Windows)      | Optimized nesting                  | Photorealistic 3D       | None                   | CNC, PDF, DXF, MRP         | Scripting                  | None                 | Windows only          | $2,500+/yr     |
| **Pronester**                     | Desktop                | Guillotine + nesting               | 2D only                 | None                   | DXF, CNC                   | None                       | None                 | Windows only          | €300+          |
| **SketchUp + OpenCutList**        | Desktop CAD            | External plugin (OpenCutList)      | Full 3D (SketchUp)      | Limited                | Many via plugins           | Rich (Ruby Extension API)  | None native          | Desktop + limited web | Freemium       |
| **Fusion 360**                    | Cloud CAD/CAM          | Proprietary nesting + CAM toolpath | Full 3D photorealistic  | Real-time multi-user   | STEP, IGES, DXF, G-code    | Add-in API (Python/C++)    | Generative design    | Web + Desktop         | $680/yr        |
| **Onshape**                       | Cloud CAD              | None (CAD only)                    | Full 3D (WebGL)         | Real-time multi-user   | STEP, IGES, DXF, STL       | FeatureScript API          | AI doc search        | Web (any device)      | Free–$1500/yr  |
| **Blum DYNALOG**                  | Web tool               | None (hardware only)               | Isometric illustration  | None                   | PDF hardware list          | None                       | None                 | Web                   | Free           |
| **eCabinet Systems**              | Desktop (Windows)      | Integrated nesting                 | Photorealistic          | Dealer portal          | CNC, DXF, PDF              | None public                | None                 | Windows only          | ~$200/mo       |
| **Pro100**                        | Desktop (Windows)      | Material optimizer                 | Photorealistic, AR      | None                   | DXF, PDF, BoM              | None                       | None                 | Windows + limited     | €400–€2000     |
| **Shaper Origin Plan (web)**      | Browser CAM tool       | None (CAM only)                    | SVG + toolpath preview  | None                   | SVG, G-code                | None                       | None                 | Web                   | Free with tool |
| **WoodWOP (Homag)**               | Desktop (Windows)      | Industrial nesting + optimization  | 3D machine simulation   | Shop-floor MES         | DXF, Homag native, CNC     | Machine-specific scripting | None                 | Windows + machine     | Enterprise     |
| **Autodesk Construction Cloud**   | Cloud platform         | BIM coordination                   | BIM viewer (WebGL)      | Real-time, versioned   | IFC, RVT, DWG, PDF         | Forge/APS API (REST)       | AI doc search        | Web + mobile          | $500+/yr       |
| **Figma** _(UX reference)_        | Browser design tool    | N/A                                | Vector (WebGL)          | Real-time multiplayer  | PNG, SVG, PDF              | Plugin API (sandbox JS)    | AI fill, design copy | Web                   | Free–$75/mo    |
| **Linear** _(PWA reference)_      | Browser issue tracker  | N/A                                | React SVG               | Real-time sync         | CSV, JSON                  | API + webhooks             | AI issue creation    | Web + desktop app     | Free–$16/mo    |

### Harvested Best Methods (Priority-Ordered)

| #   | Method                                                                                                            | Sourced From                       | Target Phase |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------ |
| 1   | **Guillotine cut mode** — many shops can only cross-cut; MaxRects layouts are physically uncut-able on panel saws | CutList Plus fx, Pronester         | Phase 11     |
| 2   | **Lazy locale loading** — non-active i18n files add ~45 KB parse cost at startup                                  | Figma, Linear (dynamic imports)    | Phase 11     |
| 3   | **Branded measurement types** (`Mm`, `Kg`) — prevents silent unit-mismatch bugs in optimizer + estimator          | Fusion 360 type discipline         | Phase 11     |
| 4   | **Workbox SW** — replace hand-rolled service worker; fixes cache invalidation on version mismatch                 | Linear, Figma (Workbox-based PWAs) | Phase 11     |
| 5   | **`Result<T, E>` pattern** for engine functions — visible error handling in types                                 | Rust / TS OSS best practice        | Phase 11     |
| 6   | **Property-based optimizer tests** (`fast-check`) — invariants catch what fixtures cannot                         | OpenCutList test approach          | Phase 11     |
| 7   | **Explainability tooltips on sheet layout** — surface BSSF rationale per placed part                              | CutList Optimizer web (UX)         | Phase 11     |
| 8   | **Waste offcut catalog** — track leftover sheets; use as starting material for next job                           | CutList Plus fx, Polyboard         | Phase 12     |
| 9   | **Cloudflare Pages migration** — edge CDN, PR previews, SPA rewrite, zero ops                                     | Onshape, Figma infra               | Phase 12     |
| 10  | **Validation rule registry** — typed `{ id, severity, check }` registry; plugins can inject custom rules          | Fusion 360, Cabinet Vision         | Phase 12     |
| 11  | **WebGL isometric preview** — material textures + 3D isometric; Three.js tree-shakeable                           | Pro100, Cabinet Vision, KCD        | Phase 12     |
| 12  | **Assembly DAG** — parallel steps flagged for team shop floors                                                    | Autodesk Construction Cloud        | Phase 12     |
| 13  | **Lighthouse CI on every PR** — perf/a11y regressions blocked at the gate                                         | Google, Figma CI                   | Phase 11     |
| 14  | **Codecov coverage badge** — surface engine coverage delta on every PR                                            | OpenCutList, Fusion 360 SDK        | Phase 11     |
| 15  | **Privacy-first analytics** (Cloudflare) — no cookies, no GDPR friction                                           | Linear, Figma                      | Phase 12     |
| 16  | **SBOM generation** (CycloneDX) — required for enterprise + OSS supply-chain posture                              | Autodesk, enterprise toolchains    | Phase 12     |
| 17  | **Sheet defect map** — mark unusable sheet areas (knots, damage); optimizer avoids them                           | Polyboard, WoodWOP                 | Phase 13     |
| 18  | **Grain direction hatching** — SVG hatch overlay on sheet preview                                                 | CutList Plus fx, Polyboard         | Phase 13     |
| 19  | **Vendor hardware catalog API** — structured JSON for Blum/Hettich/Grass parts with auto-placement                | Blum DYNALOG, Cabinet Vision       | Phase 13     |
| 20  | **BYO AI panel** (optional, telemetry-free) — natural-language design suggestions via user API key                | Fusion 360 Generative, Onshape AI  | Phase 14     |

---

## Completed Phases Summary

| Phase | Version | Title                        | Key Deliverables                                                                                                                                 |
| ----- | ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | v3.50.0 | Production Hardening         | Zero warnings, zero waivers, all CI gates green, VS Code diagnostics resolved at root cause                                                      |
| 2     | v3.51.0 | Performance & Determinism    | Web Workers for cost + assembly, bench CI, SharedArrayBuffer probe, memoization boundaries                                                       |
| 3     | v3.52.0 | Persistence & Versioning     | IndexedDB migration, snapshot timeline, diff view, JSON import/export, storage quota badge                                                       |
| 4     | v3.53.0 | Test Hardening & a11y        | 85%+ coverage, visual regression baselines, keyboard-only workflow, high-contrast mode, RTL tablet fixes                                         |
| 5     | v3.54.0 | Domain Intelligence          | Manufacturing constraint validation, deflection/span warnings, material substitution rationale, grain conflict detection, weight, explainability |
| 6     | v3.55.0 | Interop & Plugin API         | ERP/MRP export schemas, machine-readable metadata, plugin stability contract, sandbox, registry UI, vendor hinge profiles                        |
| 7     | v3.56.0 | Advanced Features            | Room layout view, arc-interpolation G-code (G2/G3), CSP hardening, migration docs, WebGL exploration                                             |
| 8     | v3.54.0 | Hardening Round 2            | jsx-a11y flat config, Stylelint + browserslist, root cleanup, label associations, extension recommendations                                      |
| 9     | v3.57.0 | Advanced Export & EventBus   | Rotation lock, G-code M6 tool-change, assembly weight, DXF layers, Plugin EventBus, all 956 unit tests green                                     |
| 10    | v3.58.0 | ESLint 10 + CI Modernization | ESLint 10 peer-dep override, lockfile regenerated, GH Actions updated, TS strictness expanded, knip fixed, dead bench removed, typedoc added     |

Full sprint-level history: [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md).

---

## Active Program

### Phase 11: Engine Quality & DX Hardening ✅ (v3.59.0 → v3.61.4)

Exit criteria: branded measurement types adopted in engine, Workbox SW, lazy i18n, Lighthouse CI gate, Codecov wired, property-based optimizer tests passing, Guillotine cut mode usable. **All exit criteria met.**

- [x] **Branded measurement types** — introduce `Mm`, `Kg`, `Percent` nominal types in `engine/types.ts`. Migrate all engine signatures and `CabinetConfig` fields. Zero runtime cost.
- [x] **`Result<T, E>` pattern** — define a minimal `Result<T, E>` type (no external dep). Replace `throw` in engine functions with `Result` returns. Catches move to store + worker boundaries only.
- [x] **Zustand store slices** — split `cabinet-store.ts` into `configSlice`, `optimizerSlice`, `uiSlice`, `snapshotSlice`. Each slice has its own test file. Combined via `combine()`.
- [x] **Typed worker RPC** — replace manual `_currentReqId` stale-message guards with a `workerCall<I,O>(worker, msg): Promise<O>` utility that manages request IDs internally. Eliminates the fragile requestId handshake.
- [x] **Lazy i18n locale loading** — load only `en` at startup; lazy-load `he`, `ar`, `de`, `es`, `fr` on first language switch. Estimated saving: ~45 KB initial JS.
- [x] **`React.lazy` for heavy tabs** — wrap `AssemblyGuide`, `PdfExportPanel`, `OptimizerView`, `RoomLayoutView` in `React.lazy` + `Suspense` with skeleton fallbacks.
- [x] **Workbox SW migration** — replace `public/sw.js` with `vite-plugin-pwa` (Workbox `generateSW`). Fixes cache invalidation on version mismatch; SWR handled correctly.
- [x] **Lighthouse CI gate** — integrate `@lhci/cli` into `ci.yml`. Budgets: TBT < 300 ms, FCP < 1.5 s, a11y ≥ 95, best-practices ≥ 90. Block regressing PRs.
- [x] **Codecov integration** — wire coverage upload to Codecov in CI. README badge. Block PRs that drop engine layer below 85% statement coverage.
- [x] **Property-based optimizer tests** (`fast-check`) — fuzz `optimizeCutSheets` with random valid part lists. Assert: no overlaps, yield ≤ 100%, rotation-locked parts never rotated, all parts placed.
- [x] **Guillotine cut mode (engine)** — add `cutMode: 'guillotine' | 'freeform'` to `CabinetConfig`. When `guillotine`, the optimizer uses a strip-based algorithm. Toggle surfaced in the optimizer settings panel.
- [x] **Explainability tooltips** — surface the `rationale` string already on `CutRect` as hover tooltips in the sheet layout view.
- [x] **i18n parity for Phase 11** — `en.json` + `he.json` for all new UI strings; remaining 4 locales kept at 100% parity.

### Phase 12: Optimizer Intelligence & Platform ✅ (v3.61.0 → v3.62.0)

Exit criteria: waste offcut catalog usable, Cloudflare Pages deployed, validation rule registry active, WebGL preview in beta, SBOM generated on release. **All exit criteria met.**

- [x] **Engine sub-module split** — reorganize `engine/` into `engine/geometry/`, `engine/optimizer/`, `engine/hardware/`, `engine/materials/`, `engine/validation/`, `engine/plugin/`. Each gets its own barrel. Public `engine/index.ts` unchanged. Enables per-feature tree-shaking.
- [x] **Validation rule registry** — replace flat `validation.ts` with `type ValidationRule = { id; severity; furnitureTypes; check(cfg, dims) }`. Existing rules migrated. Plugin API adds `registerRule()`.
- [x] **Assembly step DAG** — model `AssemblyStep` as DAG nodes with dependency edges. Independent steps flagged `parallel: true`. AssemblyGuide renders parallel steps visually grouped.
- [x] **Waste offcut catalog** — add `OffcutEntry` to IndexedDB (partial sheet dims + material). Optimizer accepts offcuts as starting sheets before opening new ones. UI in the Materials panel.
- [x] **Sheet defect avoidance** — add `defectZones: Rect[]` per material sheet. MaxRects treats defects as pre-placed parts that cannot overlap.
- [x] **WebGL isometric preview** — complete `WebGLPreviewCanvas.tsx` with Three.js r170+ (tree-shakeable). Per-material colour texture, isometric 3D. SVG fallback for non-WebGL. Feature-flagged via `VITE_ENABLE_WEBGL=true`.
- [x] **Grain direction hatching** — SVG hatch pattern overlay on each part in sheet layout. Colour-coded: green = grain aligned, amber = grain conflict.
- [x] **Cloudflare Pages migration** — move hosting from GitHub Pages. Update `pages.yml`. Configure `_redirects` for SPA fallback. Enable PR preview deployments.
- [x] **Privacy-first analytics** — add Cloudflare Web Analytics snippet (no cookies, no consent). Track page views + custom events (tab switches, export types). No PII.
- [x] **SBOM generation** — add `npm run sbom` using `@cyclonedx/cyclonedx-npm`. Emit `sbom.json` as a release artefact in `release.yml`.
- [x] **CSP `report-uri`** — `public/_headers` (Cloudflare Pages) adds `Report-To` group + `report-to`/`report-uri` directives pointing at `https://csp.cabinet-planner.workers.dev/report`. Replace URL with your own Sentry or Report URI endpoint.

### Phase 13: Hardware Depth & Export Fidelity ⭐ (v3.62.1 → v3.64.0) — **ACTIVE**

Exit criteria: Blum/Hettich/Grass catalog complete, DXF layer compliance, G-code post-processor hooks, BOM multi-currency.

- [x] **Vendor hardware catalog (JSON)** — `src/catalog/hardware.json` with 16 entries (hinges, drawer slides, handles, shelf pins, cam locks). `getHardwareCatalog()`, `getHardwareCatalogByCategory()`, `getHardwareCatalogEntry()` exported. `VENDOR_HINGE_PROFILES` derived from catalog (single source of truth).
- [x] **Hardware compatibility validation** — validate selected vendor hinge profile against door dimensions and material thickness at config time, not at export time. Show error with substitution link.
- [x] **DXF layer standard compliance** — bring DXF output to AutoCAD 2018 DXF spec. Add `DIMENSION` entities. Verify import in LibreCAD, DraftSight, AutoCAD LT.
- [x] **G-code post-processor plugin hook** — expose `onGcodeGenerated(raw: string): string` hook (stability: `experimental`). Allows community plugins to target specific controllers (Mach3, LinuxCNC, Fanuc).
- [x] **BOM multi-currency** — `currencyCode?: string` on `Material`; built-in materials ship with `'ILS'`; BOM CSV material summary uses `Intl.NumberFormat` for locale-aware price/cost columns.
- [x] **Parametric templates v2** — per-template default overrides + computed fields (e.g. `drawerHeight = Math.floor(internalHeight / 4) - 2`). Constrained expression DSL evaluated at instantiation.
- [x] **Cross-material co-nesting** — when two materials share thickness + sheet size, offer to nest on the same sheet (opt-in). Reduces sheet count for small projects.
- [x] **Export integrity checksums** — `sha256Hex` / `appendChecksumToDxf` / `appendChecksumToGcode` in `src/utils/checksum.ts`; DXF embeds `999; SHA-256: <hash>` before `EOF`; G-code appends `; SHA-256: <hash>` footer; download functions are async.
- [ ] **Offline-capable URL share** — when config exceeds ~2 KB URL limit, store in IndexedDB under a short random key, share `?ref=<key>`. Falls back to server decode if not present.

### Phase 14: Collaboration & AI (v4.0.0)

Exit criteria: optional Supabase sync working self-hosted, BYO AI panel behind feature flag, CRDT merge working for two concurrent users.

- [ ] **Optional Supabase backend** — add `src/services/supabase.ts` behind `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` build-time flags. When configured: project sync, user accounts, shareable project links. When not: pure local-first (no behaviour change). BYO instance; no hosted-platform dependency.
- [ ] **Yjs CRDT sync layer** — replace snapshot model with Yjs documents. `CabinetConfig` maps to a `Y.Map`; changes merged CRDT-style. Two users editing the same project converge. Requires optional Supabase for WebSocket transport.
- [ ] **Project branching** — fork a project to an independent branch (separate IDB entry / Supabase row). Merge branches with visual diff. Git mental model for non-technical users.
- [ ] **BYO AI design assistant** — optional panel activated by user-supplied API key (OpenAI, Anthropic, or local Ollama endpoint). Sends only current `CabinetConfig` JSON (no PII). Prompts: "suggest dimensions for a tall pantry", "what material substitution reduces cost 15%?". Zero telemetry; key in localStorage only.
- [ ] **Voice annotation on assembly steps** — record short voice note per step (Web Audio API, Opus blob in IndexedDB). Plays on shop floor without a screen.
- [ ] **PWA file handlers** — register URL handlers for `.cabinetplan` files via Web Share Target API + File Handling API. OS file-manager double-click launches the app and loads the project.

---

## Future Horizons (Unscoped)

Exploratory candidates beyond Phase 14. Each requires its own discovery sprint.

| Track               | Candidate                                                       | Why It Matters                                                                        |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Standards           | IFC / STEP export for BIM / CAD interoperability                | Opens enterprise + architectural integration; no current browser-only solution exists |
| Mobile native       | Capacitor wrapper for iOS / Android shop-floor app              | React codebase reusable; native file access + camera for defect marking               |
| Machine integration | Direct send-to-machine (WebSerial / WebUSB for CNC controllers) | Closes loop between design and cutting; eliminates file-transfer friction             |
| Photorealistic      | WebGPU-based path-traced rendering for material previews        | WebGPU Compute Shaders make sub-second path tracing viable in browser ~2027           |
| Community catalog   | Crowd-sourced material database with community pricing          | Self-updating price + availability per region; GrabCAD-style for sheet goods          |
| AR placement        | WebXR room-scale AR to preview cabinet in actual room           | Apple Vision Pro + WebXR; zero install for end user                                   |
| ~~Localization~~    | ~~Add ES / DE / FR / AR translations~~                          | **Done in v3.56.x** — EN, HE, AR, DE, ES, FR all ship at 100% key parity              |

---

## Architecture Decisions Not to Revisit (ADR Log)

These decisions are **closed**. Reconsidered in this audit and confirmed correct.
Do not re-open without concrete measurement showing they are wrong.

| Decision                         | Why It Is Closed                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React over Solid / Svelte        | `@react-pdf/renderer`, i18next deep integration, test infra cannot migrate without rewriting half the app. React 19 Compiler closes the reactivity gap. |
| Zustand over Redux Toolkit       | RTK adds >15 KB and ~40% more boilerplate for identical semantics. The slice pattern (Phase 11) achieves the same modularity without the weight.        |
| Tailwind over CSS-in-JS          | Runtime CSS-in-JS adds ~10 KB, breaks SSR, prevents static extraction. Tailwind v4 JIT is strictly superior for a statically-deployed SPA.              |
| No server requirement            | The app's value proposition is zero-install, zero-signup access. Adding a server to the critical path would destroy this. Optional backend only.        |
| `engine/` as pure TypeScript     | Engine portability is a first-class requirement. Must be importable by CLI tools, CI scripts, future native wrappers without React.                     |
| Vite over CRA / Next.js          | CRA is deprecated. Next.js adds SSR infra that adds no value for a fully-client-side SPA with static export. Vite 8 Rolldown is faster than both.       |
| TypeScript `erasableSyntaxOnly`  | Aligns with TC39 direction. Compatible with future TypeScript-stripping tools (esbuild, oxc-transform).                                                 |
| Tool configs at workspace root   | Vite/ESLint/Stylelint/TypeScript expect them at root. Moving into subdirs creates churn without benefit. Only docs and non-tool assets go in `docs/`.   |
| Intermediate files in OS `$TEMP` | Workspace must be commit-clean after a build. No caches, no reports, no coverage in the repo or `node_modules/.cache`.                                  |

---

## Toolchain and Environment

### Shared Development Tools (`MyScripts/.tools/`)

One level above this project for sibling projects to share the same baseline.

| Tool        | Version | Location                                | Purpose                         |
| ----------- | ------- | --------------------------------------- | ------------------------------- |
| Node.js LTS | 22.x    | `.nvmrc`, `MyScripts/.tools/.nvmrc`     | Runtime                         |
| npm         | 11.x    | System (via Node 22)                    | Package management, workspaces  |
| TypeScript  | 6.x     | `devDependencies` (hoisted)             | Compiler — `erasableSyntaxOnly` |
| Vite        | 8.x     | `devDependencies`                       | Build + dev server (Rolldown)   |
| ESLint      | 10.x    | `devDependencies`                       | Flat config, `--max-warnings 0` |
| Prettier    | 3.x     | `devDependencies`                       | Formatting (JS/TS/JSON/MD/CSS)  |
| Stylelint   | 17.x    | `devDependencies`                       | CSS + Tailwind lint             |
| Vitest      | 4.x     | `devDependencies`                       | Unit + bench tests              |
| Playwright  | 1.60.x  | `devDependencies`                       | E2E + a11y (axe-core)           |
| Knip        | 6.x     | `devDependencies`                       | Dead code detection             |
| TypeDoc     | 0.28.x  | `devDependencies`                       | Plugin API documentation        |
| gh CLI      | 2.60+   | System (`Install-DevTools.ps1` / `.sh`) | Release automation              |
| Lighthouse  | 0.15+   | System (`@lhci/cli`)                    | Performance + a11y audits       |

### Intermediate Artifact Policy

All generated/transient outputs write to OS `$TEMP` only. The workspace root contains
exclusively source, configuration, and documentation.

| Artifact           | Path                                            |
| ------------------ | ----------------------------------------------- |
| Vite cache         | `$TEMP/WoodworkingShop/.vite_cache`             |
| ESLint cache       | `$TEMP/WoodworkingShop/.eslintcache`            |
| Vitest coverage    | `$TEMP/WoodworkingShop/coverage`                |
| Bench results      | `$TEMP/WoodworkingShop/bench-results.json`      |
| Playwright results | `$TEMP/WoodworkingShop/test-results`            |
| Playwright report  | `$TEMP/WoodworkingShop/playwright-report`       |
| Lighthouse output  | `$TEMP/WoodworkingShop/.lighthouseci`           |
| TypeDoc output     | `docs/api/` (committed; regenerated on release) |

---

## Release Quality Gates

Every release is **blocked** until all gates pass. No exceptions, no overrides.

| #   | Command                 | Checks                                                    |
| --- | ----------------------- | --------------------------------------------------------- |
| 1   | `npm run typecheck`     | Zero TypeScript errors across all 4 tsconfigs             |
| 2   | `npm run lint`          | Zero ESLint warnings (`--max-warnings 0`)                 |
| 3   | `npm run lint:css`      | Zero Stylelint warnings                                   |
| 4   | `npm run lint:md`       | Zero markdownlint issues                                  |
| 5   | `npm run format:check`  | Zero Prettier drift                                       |
| 6   | `npm run i18n:coverage` | 100% key parity across all 6 locales                      |
| 7   | `npm test`              | All unit tests pass                                       |
| 8   | `npm run build`         | Clean production build, no warnings                       |
| 9   | `npm run bundle:check`  | Total JS ≤ 2175 KB, Total ≤ 2255 KB                       |
| 10  | `npm run bench:check`   | All engine benchmarks within 5× baseline                  |
| 11  | `npm run test:e2e`      | All E2E + a11y tests pass (Phase 11 adds Lighthouse gate) |
| 12  | `npm run dead:check`    | No newly introduced dead files or dead exports            |

---

## Continuous Enhancement Rules

1. **No suppression-first fixes** — fix root cause. Never disable a check to silence it.
2. **No dead code** — unused exports, unreachable branches, orphaned files are removed in the same PR.
3. **No dead docs** — documentation reflects current implementation. Stale sections updated or deleted in the same commit.
4. **No dead config** — commented-out settings, unused keys, disabled rules, empty overrides are deleted.
5. **No hardcoded measurements** — all dimensions in mm; use `Mm` branded type (Phase 11). No pixels except CSS utilities.
6. **No hardcoded colours** — `wood-*` design tokens only. No inline hex values in TSX.
7. **RTL-first layout** — Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) everywhere. Physical `ml-*` / `mr-*` are forbidden.
8. **i18n parity on every PR** — every `t('key')` call has a matching entry in both `en.json` and `he.json` in the same commit. Machine-translate remaining 4 locales same PR when possible.
9. **Engine stays pure** — `src/engine/` has no React, no side effects, no DOM. Must remain importable by CLI tools, workers, and tests without a browser.
10. **Intermediate files go to TEMP** — no build artefacts, no coverage, no caches in the workspace root. The workspace is commit-clean after every build.
