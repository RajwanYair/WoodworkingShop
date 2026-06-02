# Roadmap

> Last updated: 2026-06-02
> Current app version: v5.30.0
> Next release target: v5.31.0
> Strategy: best-in-class, local-first, production-grade woodworking planning platform

---

## 1. Purpose of This Document

This is a **living decision ledger** — not a sprint backlog.
Every major engineering, product, and tooling decision is re-opened, evaluated, and either confirmed with rationale or upgraded with a clear migration path.

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

| Area                 | Current                             | Decision    | Next Action                                                  |
| -------------------- | ----------------------------------- | ----------- | ------------------------------------------------------------ |
| Component boundaries | ≤600 lines enforced with exceptions | **Keep**    | Add visual regression via Playwright screenshots             |
| Error resilience     | Ad-hoc try/catch                    | **Improve** | Add React Error Boundaries per route/panel with recovery UI  |
| Preview rendering    | SVG 6-view + WebGL orbit            | **Keep**    | Remove pseudo-3D SVG fallback; commit to WebGL for 3D        |
| PDF rendering        | @react-pdf off main thread          | **Keep**    | Contract-test output size/page count per scenario            |
| Worker architecture  | Comlink + ?worker suffix            | **Keep**    | Add worker health check and timeout recovery                 |
| Routing              | Single-page, tab-based              | **Keep**    | Add URL-driven tab state for deep-linking                    |
| Design tokens        | wood-\* CSS vars via Tailwind v4    | **Keep**    | Document token catalog in docs/DESIGN-TOKENS.md              |
| Form validation      | Inline engine guards (RangeError)   | **Keep**    | Surface validation in UI with field-level error messaging    |
| Code splitting       | Route-based lazy() + Suspense       | **Enhance** | Add granular chunk splitting for heavy panels (PDF, preview) |

### 3.3 Backend, Data, and API

| Area              | Current                    | Alternatives Considered              | Verdict              | Rationale                                                                  |
| ----------------- | -------------------------- | ------------------------------------ | -------------------- | -------------------------------------------------------------------------- |
| Topology          | Local-first SPA, no server | Supabase, Firebase, Convex           | **Keep local-first** | Privacy, offline, no vendor lock-in; sync is adapter layer                 |
| Persistence       | IndexedDB + JSON export    | SQLite/WASM, OPFS, Dexie.js          | **Evaluate OPFS**    | Origin Private File System gives file-like access without IndexedDB quirks |
| Schema versioning | Implicit in JSON structure | Protobuf, JSON Schema, Zod           | **Add JSON Schema**  | Validate imports without runtime deps; schema lives in `config/schemas/`   |
| Cloud sync        | Not implemented            | CRDTs (Yjs), Cloudflare D1, PGlite   | **Defer**            | No user demand; CRDT engine exists but has no production backend           |
| External APIs     | None required              | Lumber price APIs, hardware catalogs | **Keep zero-API**    | All data is user-owned; optional catalog import via JSON                   |
| Analytics         | None                       | Plausible, PostHog, Umami            | **Keep none**        | Privacy-first; if added, must be default-off with consent UI               |
| Database          | idb-keyval (thin wrapper)  | Dexie.js, OPFS SQLite                | **Keep idb-keyval**  | Minimal footprint; migrate to OPFS when browser support is ≥95%            |
| Infrastructure    | GitHub Pages (static CDN)  | Cloudflare Pages, Vercel, Netlify    | **Keep GH Pages**    | Free, immutable, CI-integrated; CF Pages for PR previews only              |

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

| Tool         | Version | Update Policy                       |
| ------------ | ------- | ----------------------------------- |
| Node.js      | 26 LTS  | Follow LTS schedule                 |
| npm          | 11.x    | Latest stable                       |
| TypeScript   | 6.0.x   | Pin major; update patch promptly    |
| React        | 19.x    | Pin major; follow canary for 20     |
| Vite         | 8.x     | Pin major; Rolldown is default      |
| Vitest       | 4.x     | Pin major; align with Vite          |
| Playwright   | 1.60+   | Latest stable; browsers auto-update |
| Tailwind CSS | 4.x     | Pin major; v4 syntax only           |
| ESLint       | 10.x    | Flat config only                    |
| Prettier     | 3.x     | Latest stable                       |
| Stylelint    | 17.x    | Latest stable                       |
| ripgrep      | 15.x    | System install via scoop/brew       |
| GitHub CLI   | Latest  | System install via winget/brew      |

---

## 4. Best-in-Class Benchmark Comparison

| Capability                | WoodworkingShop              | Fusion 360              | SketchUp + OpenCutList | Cabinet Vision / PolyBoard | Shapr3D         | CutList Optimizer | Method To Harvest                        |
| ------------------------- | ---------------------------- | ----------------------- | ---------------------- | -------------------------- | --------------- | ----------------- | ---------------------------------------- |
| Parametric control        | Strong config model          | Excellent (timeline)    | Medium                 | Excellent (rules)          | Medium          | Low               | Named expressions + dependency graph     |
| Cut optimization          | MaxRects BSSF, multi-sheet   | Basic nesting           | Good (bin-pack)        | Excellent (proprietary)    | None            | Excellent         | Multi-stock/kerf/grain matrix            |
| Manufacturing output      | PDF + DXF + G-code           | DXF/STEP/CAM            | DXF/SVG                | DXF/CNC post               | STEP/DXF        | PDF labels        | Golden fixture contracts per format      |
| Multi-project             | JSON project files           | Cloud project hub       | .skp files             | Project database           | Cloud           | Single session    | Project template library + batch export  |
| Accessibility             | WCAG 2.2 AA, RTL, 6 locales  | Medium                  | Low                    | Low                        | Medium          | Low               | **Our differentiator** — keep leading    |
| Offline capability        | Full (PWA)                   | Limited                 | Desktop only           | Desktop only               | Limited         | Online only       | Harden with OPFS migration path          |
| Open source               | MIT, full codebase           | Proprietary             | Proprietary + plugin   | Proprietary                | Proprietary     | Proprietary       | **Our differentiator** — community trust |
| Price                     | Free                         | $70/mo                  | $120/yr + free plugin  | $3000+ license             | $25/mo          | $50 one-time      | **Our differentiator** — zero cost       |
| Extensibility             | Plugin API (internal)        | SDK                     | Ruby API               | Macros                     | None            | None              | Publish plugin API with versioned schema |
| Code quality / governance | Zero-suppression, 4360 tests | Unknown                 | Community              | Enterprise                 | Unknown         | Unknown           | Keep leadership in automated gates       |
| Assembly instructions     | Step-by-step PDF             | Timeline animation      | None                   | CNC program                | None            | None              | Add animated SVG assembly sequence       |
| Material database         | User-managed JSON catalog    | Built-in + Fusion store | Plugin-provided        | Extensive built-in         | None            | Manual entry      | Community catalog import/export          |
| Hardware catalog          | JSON hardware definitions    | McMaster integration    | Plugin-provided        | Built-in library           | None            | None              | Standardized hardware schema             |
| Version control           | Git-based (JSON export)      | Cloud versioning        | Manual save            | Database revisions         | Cloud auto-save | None              | Diff-friendly JSON + schema versioning   |
| Collaboration             | Git + PR workflow            | Cloud sharing           | Trimble Connect        | Network license            | Cloud sharing   | None              | CRDT-based real-time (future)            |

### Key Takeaways From Comparison

1. **Parametric expressions**: Fusion 360 and PolyBoard allow formula-based dimensions. We should add a named-expression system for power users.
2. **Optimization depth**: Cabinet Vision supports grain direction, edge banding, and multi-stock. Our MaxRects can add grain-aware rotation and multi-material strategies.
3. **Output contracts**: We already lead in contract testing but should add per-format schema versioning headers.
4. **Our unique edge**: Accessibility + RTL + offline + free + open-source. No competitor matches all four.
5. **Assembly animations**: Fusion 360's timeline is the gold standard — we can approximate with step-by-step SVG sequences.
6. **Community data**: OpenCutList's plugin model for materials is worth emulating with importable JSON catalogs.

---

## 5. Consolidated Legacy Plan

All prior roadmap phases (1–52) are fully executed. Their output lives in:

- Sprint history: [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md) (Sprints 1–249)
- 50+ calculator engines, full cut optimizer, PDF/DXF/G-code export
- Complete i18n (6 locales), WCAG 2.2 AA, RTL support
- 249 test files, 4360+ tests, 80%+ engine coverage

---

## 6. Production Readiness Gates (Blocking)

All release candidates must pass every gate before tagging:

| Gate             | Command                          | Threshold                          |
| ---------------- | -------------------------------- | ---------------------------------- |
| TypeScript       | `npm run typecheck`              | Zero errors                        |
| ESLint           | `npm run lint`                   | Zero warnings (`--max-warnings 0`) |
| Stylelint        | `npm run lint:css`               | Zero warnings                      |
| Markdownlint     | `npm run lint:md`                | Zero warnings                      |
| Prettier         | `npm run format:check`           | All files formatted                |
| i18n coverage    | `npm run i18n:coverage`          | 100% EN/HE parity                  |
| Unit tests       | `npm test`                       | All 4360+ tests pass               |
| Golden exports   | `npm run exports:golden:check`   | BOM/DXF/G-code match fixtures      |
| PDF budget       | `npm run pdf:budget`             | Size within bounds, zero errors    |
| Component budget | `npm run components:budget`      | ≤600 lines or explicit exception   |
| Bundle size      | `npm run bundle:check`           | Within `config/bundle-budget.json` |
| Benchmarks       | `npm run bench:check`            | Within `config/bench-budget.json`  |
| Dead code        | `npm run dead:check`             | Zero unused exports/files          |
| Security         | Dependency review + secret scan  | No high/critical CVEs              |
| Template sync    | `npm run template:sync:validate` | All 11 assets verified             |
| Agent contracts  | `npm run agents:validate`        | All 9 agents parse correctly       |
| Prompt contracts | `npm run prompts:validate`       | All 22 prompts parse correctly     |

Combined: `npm run ci` runs all of the above in CI.

---

## 7. Forward Program Plan (v5.31.0+)

### Phase A: Engine Excellence (v5.31.0–v5.32.0)

| Item                     | Description                                                             | Priority |
| ------------------------ | ----------------------------------------------------------------------- | -------- |
| Named expressions        | User-defined formulas for parametric dimensions (`width = depth * 0.6`) | High     |
| Grain-aware optimization | MaxRects respects grain direction constraint per part                   | High     |
| Multi-material strategy  | Optimizer handles mixed stock (plywood + solid + MDF in one project)    | Medium   |
| Schema versioning        | Export headers include schema version for forward compatibility         | Medium   |
| Property-based tests     | fast-check / hypothesis-style fuzz for geometry invariants              | Medium   |

### Phase B: UX and Reliability (v5.32.0–v5.33.0)

| Item                    | Description                                           | Priority |
| ----------------------- | ----------------------------------------------------- | -------- |
| Error boundaries        | React Error Boundary per panel with graceful recovery | High     |
| Visual regression       | Playwright screenshot comparison for preview SVGs     | Medium   |
| Keyboard journey matrix | Blocking E2E tests for all primary workflows          | High     |
| Deep-linking            | URL encodes active tab + cabinet index for sharing    | Medium   |
| Mobile gesture parity   | Pinch-zoom and swipe navigation in preview            | Low      |

### Phase C: Data and Persistence (v5.33.0–v5.34.0)

| Item              | Description                                                        | Priority |
| ----------------- | ------------------------------------------------------------------ | -------- |
| OPFS migration    | Move project storage from IndexedDB to Origin Private File System  | Medium   |
| Import validation | JSON Schema validation on project import with clear error messages | High     |
| Project templates | Built-in starter templates (kitchen, bathroom, closet, workshop)   | Medium   |
| Batch export      | Export all cabinets in one ZIP (PDF + DXF + G-code per cabinet)    | Medium   |

### Phase D: Governance and DevEx (v5.34.0+)

| Item                     | Description                                                    | Priority |
| ------------------------ | -------------------------------------------------------------- | -------- |
| Release readiness report | Script generates pre-release checklist with pass/fail per gate | High     |
| Docs ownership file      | Each doc has owner + last-verified date, validated in CI       | Medium   |
| Extension review log     | Quarterly review with keep/remove/add rationale                | Low      |
| MCP ownership table      | Document purpose, owner, secret requirements per server        | Medium   |
| OpenSSF Scorecard        | Achieve and badge ≥7.0 score                                   | Medium   |

---

## 8. VS Code, Copilot, MCP, and GitHub Integration

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

## 9. Repository Structure Policy

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

## 10. Execution Backlog

### Completed (v5.30.0)

1. ~~Template sync rollout to MyScripts parent~~ — DONE
2. ~~Template drift diff reporting script~~ — DONE
3. ~~Export golden fixture baseline~~ — DONE
4. ~~PDF warning budget gate~~ — DONE
5. ~~Component budget exceptions policy~~ — DONE

### Next (v5.31.0)

1. Add docs ownership file and freshness validation
2. Add release readiness report generator
3. Add React Error Boundaries per panel
4. Add import validation with JSON Schema
5. Grain-aware cut optimization (rotation constraint)

### Future (v5.32.0+)

1. Named parametric expressions system
2. OPFS persistence migration
3. Visual regression testing pipeline
4. Project template library (kitchen, bathroom, closet)
5. Batch ZIP export (all cabinets, all formats)
6. OpenSSF Scorecard badge (≥7.0)
7. Plugin API public documentation
8. Multi-material optimizer strategy

---

## 11. Definition of Done

The project achieves best-in-class status when:

- All production readiness gates pass on every commit (CI enforced)
- Export outputs are contract-tested with golden fixtures across all formats
- Accessibility and 6-locale i18n are continuously validated
- Governance automation prevents silent drift in code, docs, AI assets, and workflows
- Parent MyScripts template receives validated governance baseline
- Zero suppression policy has zero exceptions (no eslint-disable, no ts-ignore, no as any)
- OpenSSF Scorecard ≥ 7.0
- All comparison-table gaps from Section 4 are addressed or explicitly deferred with rationale
