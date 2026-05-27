# Roadmap

> **Last strategic review**: 2026-05-27 · **Current version**: 5.20.0
> **Next target**: v5.21.0 (Phase 45 — TBD)
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

| Feature / Capability            | Cabinet Planner (this) | CutList Optimizer | SketchList 3D | Polyboard    | CutList Plus fx | Cabinet Vision | Fusion 360  | Mozaik       | Roomle         | KitchenDraw   |
| ------------------------------- | ---------------------- | ----------------- | ------------- | ------------ | --------------- | -------------- | ----------- | ------------ | -------------- | ------------- |
| **Price**                       | Free / MIT OSS         | Free (basic)      | $167–$497/yr  | €330 one-off | $79–$159        | Enterprise $   | $545/yr     | $99–$499/yr  | Free (B2B lic) | €1,500–€4,000 |
| **Platform**                    | Browser (PWA)          | Browser           | Windows only  | Windows only | Windows only    | Windows only   | Cloud + Win | Windows only | Browser        | Windows only  |
| **Cut optimization**            | MaxRects BSSF multi    | Simple 2D         | Basic         | Guillotine   | Advanced        | Proprietary    | None        | Basic 2D     | None           | None          |
| **G-code export**               | Yes (G2/G3 arcs, M6)   | No                | No            | WoodWOP only | No              | WoodWOP/Grbl   | Yes         | Yes (CNC)    | No             | DXF only      |
| **DXF export**                  | Yes (layers, colors)   | No                | Basic         | Yes          | No              | Yes            | Yes         | Yes          | Limited        | Yes           |
| **PDF build plans**             | Yes (off-thread)       | No                | Yes           | Yes          | Yes             | Yes            | Yes         | Yes          | Yes            | Yes           |
| **3D preview**                  | SVG isometric + WebGPU | No                | Full 3D       | 3D           | No              | Full 3D        | Full 3D     | Full 3D      | Full 3D WebGL  | Full 3D       |
| **Assembly guide**              | Yes (DAG + timer)      | No                | No            | No           | No              | Yes            | No          | Yes          | Basic          | No            |
| **Hardware BOM**                | Yes (vendor catalog)   | No                | Basic         | Yes          | No              | Yes            | No          | Yes          | Yes            | Yes           |
| **Grain direction**             | Yes (report + lock)    | Yes               | No            | Yes          | Yes             | Yes            | No          | Yes          | No             | Yes           |
| **WCAG 2.2 AA accessible**      | Yes                    | No                | No            | No           | No              | No             | Partial     | No           | Partial        | No            |
| **RTL support (Hebrew/Arabic)** | Yes (6 locales)        | No                | No            | No           | No              | No             | UI only     | No           | No             | No            |
| **Offline capable (PWA)**       | Yes                    | No                | N/A (desktop) | N/A          | N/A             | N/A            | No          | N/A          | No             | N/A           |
| **Plugin API**                  | Yes (versioned)        | No                | No            | No           | No              | Proprietary    | Yes         | No           | Embed API      | No            |
| **Open source**                 | MIT                    | No                | No            | No           | No              | No             | No          | No           | No             | No            |
| **Community material catalog**  | Yes                    | No                | No            | Limited      | No              | No             | Yes         | Yes          | Manufacturer   | No            |
| **IFC/STEP/glTF export**        | Yes                    | No                | No            | No           | No              | No             | Yes         | No           | STEP           | No            |
| **WebSerial CNC streaming**     | Yes                    | No                | No            | No           | No              | No             | CAM only    | No           | No             | No            |
| **Cost estimation**             | Yes (variance tracker) | No                | Manual        | Yes          | Manual          | Yes            | No          | Yes          | Yes            | Yes           |
| **Stock management**            | Yes                    | No                | No            | Yes          | No              | Yes            | No          | Yes          | No             | No            |
| **Mobile support**              | PWA + Capacitor        | Responsive        | No            | No           | No              | No             | iOS app     | No           | Responsive     | No            |
| **Production dependencies**     | 8                      | Unknown           | 50+           | Desktop      | Desktop         | Desktop        | Cloud       | Desktop      | ~80+           | Desktop       |
| **Bundle size (JS)**            | < 1.8 MB               | ~500 KB           | Desktop       | Desktop      | Desktop         | Desktop        | Cloud       | Desktop      | ~3 MB          | Desktop       |
| **Zero-install / zero-signup**  | Yes                    | Signup required   | Download      | Download     | Download        | Download       | Signup      | Download     | Signup         | Download      |

### Competitive Advantages (Unique to This Project)

1. **Only fully-accessible (WCAG AA) cut optimizer** in the market
2. **Only browser-based app with G-code export** (G2/G3 arcs, tool change M6)
3. **Only OSS app with a formal versioned plugin API** with stability contracts
4. **Only app combining cut optimization + assembly guide + hardware BOM** in browser
5. **Only RTL-first (Hebrew + Arabic) woodworking planner** in existence
6. **Smallest dependency footprint**: 8 production deps vs. 50+ in comparable tools
7. **Only zero-install, zero-signup** professional-grade cabinet planner

### Methods Harvested from Competitors

| From              | Method / Pattern                             | Adoption Status                          |
| ----------------- | -------------------------------------------- | ---------------------------------------- |
| SketchList 3D     | Parametric constraint engine (min/max/ratio) | ✅ Done — Phase 25 Sprint 109            |
| SketchList 3D     | Reusable design template library             | ✅ Done — Phase 27 Sprint 120            |
| Polyboard         | Guillotine-first then MaxRects fallback      | ✅ Done — Phase 25 co-nesting            |
| Cabinet Vision    | Joint library with automatic selection       | ✅ Done — Phase 25 Sprint 108            |
| CutList Plus fx   | Multi-material co-nesting on shared sheets   | ✅ Done — Phase 25 Sprint 107            |
| Fusion 360        | WebGPU PBR material rendering                | ✅ Done — Phase 26 Sprint 113            |
| Fusion 360        | Generative design suggestions                | ✅ Done — Phase 27 Sprint 119            |
| Figma             | CRDT multiplayer with conflict-free cursors  | ✅ Done — Phase 27 Sprint 117–118        |
| CutList Optimizer | Instant optimization preview (< 50 ms)       | ✅ Achieved — maintained via bench gates |
| Mozaik            | Full-room layout with wall/floor placement   | Phase 34 — Room Planner v2               |
| Mozaik            | Cabinet-to-machining center direct link      | Phase 35 — CNC integration               |
| Roomle            | Manufacturer catalog embedding API           | Phase 34 — Community Catalog v2          |
| Roomle            | AR walkthrough / first-person view           | Phase 35 — WebXR immersive               |
| KitchenDraw       | Appliance clearance zone validation          | Phase 34 — Room Planner v2               |

### Gaps to Close (Priority-Ordered)

| #   | Gap                                        | Best-in-Class Reference      | Target Phase | Impact   |
| --- | ------------------------------------------ | ---------------------------- | ------------ | -------- |
| 1   | Automated Lighthouse CI gates (GH Actions) | vercel/next.js, Astro        | Phase 33     | Critical |
| 2   | CSP headers + Subresource Integrity        | Security-hardened SPAs       | Phase 33     | Critical |
| 3   | Error monitoring (privacy-first)           | Sentry, Cloudflare Analytics | Phase 33     | High     |
| 4   | Full-room layout (appliance clearances)    | Mozaik, KitchenDraw, Roomle  | Phase 34     | High     |
| 5   | Manufacturer catalog embedding             | Roomle, IKEA Planner         | Phase 34     | High     |
| 6   | Cloud sync with E2E encryption             | Figma, Onshape               | Phase 35     | Medium   |
| 7   | AR walkthrough / first-person view         | Roomle, Matterport           | Phase 35     | Medium   |
| 8   | Native mobile app (full offline)           | Fusion 360 iOS, Mozaik       | Phase 35     | Low      |

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
| 29    | v5.5.0      | Plugin Marketplace & Mobile     | Plugin registry, Capacitor native, analytics dashboard, bundle < 1.4 MB        |
| 30    | v5.6.0      | AI Assistant & Advanced Export  | AI design assistant, glTF/IFC 4.3, WebSerial v2, stock management              |
| 31    | v5.7.0      | UI Polish & Accessibility       | WCAG 2.2 AA audit, dark mode, component splitting, bundle < 400 KB gzipped     |
| 32    | v5.8.0      | Developer Experience & Plugins  | Plugin API v2, TypeDoc site, 88% test coverage, Vitest reporter, lint summary  |
| 33    | v5.9.0      | Production Infrastructure       | Lighthouse CI, CSP hardening, PWA v2, error monitoring                         |
| 34    | v5.10.0     | Room Planner v2 & Community     | Room layout v2, manufacturer catalog, appliance clearance, machining link      |
| 35    | v5.11.0     | CNC Workflow & Cloud Sync       | CNC job queue, E2E cloud sync, multi-machine distribution, project sharing     |
| 36    | v5.12.0     | Advanced Workflows & Design     | Parametric templates, batch export, material yield optimizer, version history  |
| 37    | v5.13.0     | Advanced Manufacturing Tools    | Production schedule, nesting patterns, tool wear tracker, design comparison    |

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

> **Status**: ✅ COMPLETE · **Released**: 2026-06-10

| Sprint | Deliverable                                                                   | Track   |
| ------ | ----------------------------------------------------------------------------- | ------- |
| 132    | AI design assistant engine (constraint-based layout suggestions)              | AI      |
| 133    | glTF 2.0 / IFC 4.3 export (standards-grade 3D output)                         | Export  |
| 134    | WebSerial CNC streaming v2 (real-time progress, pause/resume, error recovery) | CNC     |
| 135    | Advanced stock management (purchase orders, reorder alerts, waste tracking)   | Feature |
| 136    | Release v5.6.0                                                                | Release |

### Phase 31 — UI Polish & Accessibility · v5.7.0 ✅ COMPLETE

> **Status**: COMPLETE · **Goal**: WCAG 2.2 AA audit remediation, dark mode, component splitting, performance

| Sprint | Deliverable                                                            | Track       |
| ------ | ---------------------------------------------------------------------- | ----------- |
| 137    | WCAG 2.2 AA full audit & remediation (axe-core zero violations)        | A11y        |
| 138    | Dark mode (design tokens + Tailwind CSS v4 theme switching)            | UI          |
| 139    | Large component splitting (≤ 600 lines each, react-refresh compliance) | Refactor    |
| 140    | Bundle optimisation (lazy chunks, tree-shaking, < 400 KB gzipped)      | Performance |
| 141    | Release v5.7.0                                                         | Release     |

### Phase 32 — Developer Experience & Plugin Ecosystem · v5.8.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2026-06-10 · **Coverage achieved**: 88.65% statements / 89.08% lines

| Sprint | Deliverable                                                         | Track   |
| ------ | ------------------------------------------------------------------- | ------- |
| 142    | Plugin API v2 (typed event bus, lifecycle hooks, sandboxed context) | DX      |
| 143    | TypeDoc API documentation site (auto-generated from engine JSDoc)   | Docs    |
| 144    | Test coverage uplift to 85% — 88.65% stmts / 89.08% lines achieved  | Quality |
| 145    | DX tooling (Vitest reporter, structured lint summary, Vitest 4 fix) | DX      |
| 146    | Release v5.8.0                                                      | Release |

### Phase 33 — Production Infrastructure & Observability · v5.9.0

> **Status**: ✓ DONE · **Goal**: Lighthouse CI gates, security hardening, PWA v2, error monitoring

| Sprint | Deliverable                                                              | Track  |
| ------ | ------------------------------------------------------------------------ | ------ |
| 147    | Lighthouse CI automation (GH Actions gates: TBT < 200 ms, FCP < 1.2 s)   | ✓ Done |
| 148    | Security hardening (CSP headers, Subresource Integrity, OWASP audit)     | ✓ Done |
| 149    | PWA v2 (enhanced offline caching, install prompt refinement)             | ✓ Done |
| 150    | Error monitoring — privacy-first telemetry (Cloudflare Analytics/Sentry) | ✓ Done |
| 151    | Release v5.9.0                                                           | ✓ Done |

### Phase 44 — Advanced Joinery Planning Tools · v5.20.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2026-05-27 · **Goal**: Mortise-tenon sizing, shelf deflection, router pass depth, biscuit layout, sanding progression

- Sprint 205: Mortise & tenon calculator (joint sizing, glue area, chisel recommendation) — ✓ Done
- Sprint 206: Shelf deflection calculator (sag estimate, ratio checks, modulus lookup) — ✓ Done
- Sprint 207: Router depth-of-cut calculator (pass schedule, chip load, RPM guidance) — ✓ Done
- Sprint 208: Biscuit joinery calculator (size selection, slot depth, layout positions) — ✓ Done
- Sprint 209: Sanding progression planner (grit sequence, effort and sheet estimates) — ✓ Done

### Phase 43 — Precision Workshop Calculators · v5.19.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2025-07-18 · **Goal**: Precision calculators for angles, shelf pins, drawer slides, drying, dovetails

| Sprint | Deliverable                                                                | Track  |
| ------ | -------------------------------------------------------------------------- | ------ |
| 200    | Miter & compound angle calculator (polygon, compound, crown molding)       | ✓ Done |
| 201    | Shelf pin spacing calculator (single/double/euro 32, drill depth)          | ✓ Done |
| 202    | Drawer slide calculator (side/under/center mount, box dimensions)          | ✓ Done |
| 203    | Wood drying time estimator (air/kiln, species, defect risk)                | ✓ Done |
| 204    | Dovetail layout calculator (through/half-blind, pin/tail spacing)          | ✓ Done |

### Phase 42 — Advanced Joinery & Workshop Tools · v5.18.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2025-07-18 · **Goal**: Pocket hole, veneer, clamp pressure, drill press, board-feet

| Sprint | Deliverable                                                                | Track  |
| ------ | -------------------------------------------------------------------------- | ------ |
| 195    | Pocket hole joinery calculator (screw length, drill angle, spacing)        | ✓ Done |
| 196    | Veneer calculator (sheet count, strip layout, adhesive volume)             | ✓ Done |
| 197    | Clamp pressure calculator (force distribution, spacing, clamping time)     | ✓ Done |
| 198    | Drill press speed calculator (RPM by bit type, material, diameter)         | ✓ Done |
| 199    | Board-feet calculator (nominal-to-actual, species cost, linear conversion) | ✓ Done |

### Phase 41 — Measurement & Estimation Tools · v5.17.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2025-07-18 · **Goal**: Wood movement, feed rate, weight estimation, dowel joints, panel labels

| Sprint | Deliverable                                                               | Track  |
| ------ | ------------------------------------------------------------------------- | ------ |
| 190    | Wood movement calculator (seasonal expansion/contraction by species)      | ✓ Done |
| 191    | Toolpath feed rate calculator (chip load, spindle speed, feed rate)       | ✓ Done |
| 192    | Cabinet weight estimator (panel weights, hardware, total assembly)        | ✓ Done |
| 193    | Dowel joint calculator (diameter, depth, spacing, pull-out strength)      | ✓ Done |
| 194    | Panel layout label generator (QR codes, part IDs, grain arrows)           | ✓ Done |

### Phase 40 — Material Management & Templates · v5.16.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2025-07-15 · **Goal**: Material cost tracking, inventory management, template library, edge banding

| Sprint | Deliverable                                                                | Track  |
| ------ | -------------------------------------------------------------------------- | ------ |
| 182    | Material cost tracker (historical prices, trends, budget alerts)           | ✓ Done |
| 183    | Shop inventory manager (stock levels, reorder lists, fulfilment check)     | ✓ Done |
| 184    | Cabinet template library (6 built-in parametric templates)                 | ✓ Done |
| 185    | Edge banding calculator (exposure detection, grouping, wastage)            | ✓ Done |
| 186    | Release v5.16.0                                                            | ✓ Done |

### Phase 38 — Shop Floor Intelligence & Workflow Automation · v5.14.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2025-07-15 · **Goal**: Dust collection sizing, cut-list grouping, assembly scheduling, workshop safety

| Sprint | Deliverable                                                                | Track  |
| ------ | -------------------------------------------------------------------------- | ------ |
| 172    | Dust collection estimator (CFM sizing, duct loss, HP recommendation)       | ✓ Done |
| 173    | Cut-list grouping engine (multi-criteria batching, grain merge)            | ✓ Done |
| 174    | Assembly dependency resolver (topo-sort, CPM, parallel waves)              | ✓ Done |
| 175    | Workshop safety checker (clearance zones, PPE, noise, safety score)        | ✓ Done |
| 176    | Release v5.14.0                                                            | ✓ Done |

### Phase 37 — Advanced Manufacturing Tools · v5.13.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2026-07-01 · **Goal**: Production scheduling, nesting pattern library, tool wear tracking, design comparison

| Sprint | Deliverable                                                                | Track  |
| ------ | -------------------------------------------------------------------------- | ------ |
| 167    | Production schedule planner (jobs, priorities, conflict detection)         | ✓ Done |
| 168    | Nesting pattern library (save/recall/score cut-sheet patterns)             | ✓ Done |
| 169    | Tool wear tracker (inventory, usage log, maintenance alerts)               | ✓ Done |
| 170    | Design comparison engine (7-criterion weighted scoring, radar chart data)  | ✓ Done |
| 171    | Release v5.13.0                                                            | ✓ Done |

### Phase 36 — Advanced Workflows & Design Exploration · v5.12.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2026-06-29 · **Goal**: Parametric templates, batch export, material yield optimization, version history

| Sprint | Deliverable                                                                | Track  |
| ------ | -------------------------------------------------------------------------- | ------ |
| 162    | Parametric template engine (reusable templates, expressions, validation)   | ✓ Done |
| 163    | Batch export pipeline (multi-format, multi-cabinet, progress tracking)     | ✓ Done |
| 164    | Material yield optimizer (multi-sheet scheduling, waste minimization)      | ✓ Done |
| 165    | Version history & branching (timeline, diff, branch/merge)                 | ✓ Done |
| 166    | Release v5.12.0                                                            | ✓ Done |

### Phase 35 — CNC Workflow & Cloud Sync · v5.11.0 ✅ COMPLETE

> **Status**: COMPLETE · **Released**: 2026-06-10 · **Goal**: CNC job scheduling, encrypted cloud sync, multi-machine distribution, project sharing

| Sprint | Deliverable                                                            | Track  |
| ------ | ---------------------------------------------------------------------- | ------ |
| 157    | CNC job queue with priority scheduling (critical/high/normal/low)      | ✓ Done |
| 158    | Cloud sync engine with E2E encryption (AES-256-GCM, PBKDF2)            | ✓ Done |
| 159    | Multi-machine workflow distribution (capability-match, load balancing) | ✓ Done |
| 160    | Project sharing links with expiration (token-based, permissions)       | ✓ Done |
| 161    | Release v5.11.0                                                        | ✓ Done |

### Future Horizons (Unscoped)

| Track         | Candidate                                        | Trigger                           |
| ------------- | ------------------------------------------------ | --------------------------------- |
| Rendering     | Ray-traced preview (WebGPU compute shaders)      | WebGPU > 90% browser support      |
| Collaboration | Cloud sync with E2E encryption                   | User base > 10K MAU               |
| AI            | Generative design (auto-layout from constraints) | On-device models reach 7B quality |
| Standards     | IFC 4.3 compliance certification                 | Industry demand                   |
| Platform      | Raspberry Pi shop-floor kiosk (Electron-lite)    | Community request + sponsorship   |
| Marketplace   | Paid plugin monetization (Stripe Connect)        | Plugin count > 20                 |
| Room Planner  | Full-room layout v2 (appliance + clearances)     | Phase 34                          |
| Community     | Manufacturer catalog embedding API               | Phase 34                          |
| CNC           | Cabinet-to-machine-center direct link            | Phase 35                          |
| XR            | AR walkthrough / first-person room view          | Phase 35 + WebXR Device API GA    |

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
