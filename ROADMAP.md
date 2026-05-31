# Roadmap

> Last strategic reset: 2026-05-30
> Current release line: 5.27.x

This roadmap is intentionally rewritten from first principles and constrained to verifiable repository reality. Historical sprint detail remains in [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md) and release detail remains in [CHANGELOG.md](CHANGELOG.md).

## Product Direction

Build a best-in-class, local-first woodworking planner that is trusted for production output and safe for long-term maintenance.

### North Star KPIs

| Area          | KPI                                                                                 | Gate                      |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------- |
| Reliability   | Typecheck, lint, tests, build, bundle, bench all pass                               | Required on every release |
| Correctness   | No suppressed diagnostics in source (`eslint-disable`, `@ts-ignore`, `@ts-nocheck`) | Required                  |
| Performance   | Lighthouse budgets pass and bundle budget pass                                      | Required                  |
| Accessibility | WCAG 2.2 AA in automated and manual audits                                          | Required                  |
| Security      | No high/critical findings in dependency and code scanning                           | Required                  |
| i18n quality  | EN and HE parity plus full-locale coverage                                          | Required                  |

## Decision Reset

### Frontend

| Topic         | Current Decision                                   | Rethink Outcome                                                                  |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| UI platform   | React + TypeScript + Vite                          | Keep; optimize architecture boundaries                                           |
| State         | Zustand single-store plus slices                   | Keep; enforce selector hygiene and action contracts                              |
| Styling       | Tailwind v4 tokenized approach                     | Keep; expand token governance and visual regression tests                        |
| Rendering     | SVG-first preview with optional advanced rendering | Keep SVG as canonical manufacturing view, isolate advanced rendering experiments |
| Accessibility | Lint + Playwright axe coverage                     | Expand with keyboard-path regression matrix                                      |

### Backend and Data

| Topic                | Current Decision                 | Rethink Outcome                                                  |
| -------------------- | -------------------------------- | ---------------------------------------------------------------- |
| Runtime architecture | Local-first, no required backend | Keep as default product architecture                             |
| Persistence          | Browser storage and file exports | Keep; define migration/versioning policy for stored project data |
| Cloud integration    | Optional/future                  | Keep optional; no cloud dependency for core workflows            |
| Database             | No central DB in critical path   | Keep; if introduced later, require offline-first sync model      |

### Language, Methods, and Architecture

| Topic            | Current Decision                     | Rethink Outcome                                            |
| ---------------- | ------------------------------------ | ---------------------------------------------------------- |
| Language         | Strict TypeScript 6                  | Keep and tighten invariant checks                          |
| Engine design    | Pure compute modules in `src/engine` | Keep; enforce purity and deterministic tests               |
| Component design | Feature-grouped components           | Keep; split overgrown files and remove cross-layer leakage |
| Testing method   | Unit + bench + e2e                   | Keep; add mutation-risk suites for core formulas           |

### Configuration and Toolchain

| Topic                 | Current Decision                         | Rethink Outcome                                        |
| --------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Quality orchestration | Parallel scripts + CI pipelines          | Keep; remove any hidden non-blocking behavior          |
| Release flow          | Tag-driven GitHub Actions                | Keep; add mandatory check gate inside release workflow |
| Editor config         | Some validators disabled to reduce noise | Shift to stricter defaults for production mode         |
| Intermediate outputs  | Temp-first policy                        | Keep and verify in scripts/workflows                   |

## External Sources and API Strategy

| Source Type         | Policy                                                           |
| ------------------- | ---------------------------------------------------------------- |
| NPM dependencies    | Pin by semver ranges with regular audit and update cadences      |
| Browser APIs        | Prefer stable evergreen APIs; guard optional capabilities        |
| External cloud APIs | Non-critical path only; app remains functional without them      |
| CI services         | GitHub Actions as source of truth, local parity via `npm run ci` |

## Benchmark Comparison and Method Harvest

The table below focuses on methods worth adopting, not unverifiable marketing claims.

| Reference Class                 | Mature Practice                                           | Gap in This Project                       | Adoption Plan                                              |
| ------------------------------- | --------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Figma-class web app quality     | Schema-versioned local document model + robust migrations | Partial migration discipline only         | Add explicit schema registry and migration tests           |
| Next.js/Astro quality pipelines | Hard quality gates in all pipelines, no soft-fail checks  | Spell check currently soft-fails in CI    | Make spelling gate blocking and fix violations             |
| Fusion 360 export discipline    | Golden-file verification for export formats               | Limited golden regression for exports     | Add DXF/G-code golden snapshots per release                |
| Sentry-class observability      | Structured client errors and release health dashboards    | Incomplete release health contract        | Define production telemetry contract with privacy controls |
| VS Code / JetBrains mature DX   | Zero-warning workspace defaults for core validators       | Disabled validators in workspace settings | Remove disabled options or justify in policy doc           |
| Enterprise release rigor        | Release pipeline reruns core checks before publish        | Release workflow skips quality rerun      | Add `npm run check` in release workflow                    |

## Best-in-Class Competitor Comparison

Direct feature comparison against the leading tools in the cabinet/woodworking
planning space. Goal: identify the strongest method in each capability and adopt
it where it fits a local-first, zero-install web product.

| Capability           | This Project          | SketchUp + OpenCutList | Fusion 360        | Cabinet Vision / PolyBoard | CutList Optimizer | Best Method to Harvest                                     |
| -------------------- | --------------------- | ---------------------- | ----------------- | -------------------------- | ----------------- | ---------------------------------------------------------- |
| Install / onboarding | Zero-install web/PWA  | Desktop install        | Desktop + account | Heavy desktop license      | Web               | Keep our zero-install edge; add guided first-run tour      |
| Parametric modeling  | Config-driven engine  | Plugin/manual          | Full parametric   | Full parametric            | None              | Adopt named parameter expressions with dependency graph    |
| Cut optimization     | MaxRects BSSF         | Guillotine + grain     | Add-in            | Industry nesting           | Strong 2D nesting | Add kerf-aware grain-locked nesting + multi-stock strategy |
| Manufacturing export | PDF/DXF/G-code        | DXF/PDF                | Full CAM          | CNC post-processors        | PDF/CSV           | Golden-file contract tests per export format               |
| Offline capability   | Full offline-first    | Partial                | No                | No                         | Partial           | Keep; document storage schema + migration policy           |
| i18n / RTL           | 6 locales incl. RTL   | Limited                | Multi-locale      | Multi-locale               | Limited           | Keep; lock parity gate at 100% across all locales          |
| Accessibility (WCAG) | 2.2 AA audited        | Not a focus            | Partial           | Not a focus                | Minimal           | Keep as differentiator; add keyboard-path regression       |
| Pricing              | Free/open             | Freemium               | Subscription      | Enterprise license         | Freemium          | Keep open; optional plugin marketplace later               |
| Extensibility        | Plugin API (internal) | Ruby plugins           | Add-in SDK        | Vendor macros              | None              | Version the plugin API independently from app version      |
| Collaboration        | Local + share links   | Cloud (Trimble)        | Cloud (Autodesk)  | File-share                 | None              | Optional E2E-encrypted sync, never on critical path        |
| Observability        | Privacy-first opt-in  | Vendor telemetry       | Vendor telemetry  | Limited                    | None              | Structured client errors + release health, opt-in only     |

### Harvested Improvements (Backlog Seeds)

| Idea                                          | Source Class                | Target Phase |
| --------------------------------------------- | --------------------------- | ------------ |
| Named parameter expressions + dependency DAG  | Fusion 360 / Cabinet Vision | 53           |
| Kerf-aware, grain-locked multi-stock nesting  | CutList Optimizer           | 53           |
| Golden-file export contract tests (DXF/Gcode) | Fusion 360                  | 52           |
| Schema registry + storage migration tests     | Figma-class document model  | 52           |
| Independent plugin-API semver line            | VS Code extension model     | 54           |
| Guided first-run product tour                 | Onboarding best practice    | 54           |

## Consolidated Legacy Roadmap

Historical phases and sprint narratives are preserved but no longer duplicated in this file:

| Legacy Content           | Canonical Location                               |
| ------------------------ | ------------------------------------------------ |
| Sprint-by-sprint archive | [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md) |
| Version release notes    | [CHANGELOG.md](CHANGELOG.md)                     |
| Architecture detail      | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     |

This roadmap now tracks forward execution only.

## Phase 52: Production Hardening Program (v5.28.0)

### Sprint 245: Truth Alignment and Governance ✅ DONE

| Deliverable          | Acceptance Criteria                                                                        | Status                                           |
| -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Strategic doc reset  | Roadmap reflects verifiable repo state only                                                | ✅ Done — ROADMAP.md reset 2026-05-30            |
| Claim audit baseline | README, architecture, and roadmap high-risk claims reviewed and tagged verified/unverified | ✅ Done — `docs/CLAIM-AUDIT.md` created          |
| Governance policy    | One-page policy for when claims may be marked "done"                                       | ✅ Done — `.github/GOVERNANCE-POLICY.md` created |

### Sprint 246: Code and Config Hardening

| Deliverable                | Acceptance Criteria                                                  |
| -------------------------- | -------------------------------------------------------------------- |
| Remove soft-fail checks    | CI has no `\|\| true` on quality/security checks                     |
| Strict editor profile      | Workspace settings avoid disabled validators unless policy-justified |
| Quality runner reliability | Parallel quality script has no buffering deadlock risk               |

### Sprint 247: Structural Cleanup and Dead Asset Elimination

| Deliverable              | Acceptance Criteria                                                     |
| ------------------------ | ----------------------------------------------------------------------- |
| Dead code removal        | `npm run dead:check` clean                                              |
| Dead docs/config cleanup | Every root/config/doc file has an owner and purpose                     |
| Root layout policy       | Non-essential files moved only when not violating tool-root constraints |

### Sprint 248: Production Verification Matrix

| Deliverable                   | Acceptance Criteria                                            |
| ----------------------------- | -------------------------------------------------------------- |
| Full local gates              | `npm run ci` pass on clean tree                                |
| Security and dependency audit | No high/critical unresolved findings                           |
| Release rehearsal             | Tag candidate built and validated without publish side effects |

### Sprint 249: Release v5.28.0

| Deliverable               | Acceptance Criteria                             |
| ------------------------- | ----------------------------------------------- |
| Version and changelog     | Semver bump, changelog finalized                |
| GitHub release            | Release workflow passes and publishes artifacts |
| Post-release verification | Smoke tests and docs links validated            |

## Open Architecture Questions

1. Should cloud sync remain feature-flagged or become a first-class optional module with a formal API boundary?
2. Should plugin API stability be versioned independently from app versioning?
3. Should export engines (PDF/DXF/G-code) move to contract-tested packages under `src/engine/export` to reduce cross-layer coupling?

## Production Readiness Checklist

| Checklist Item                        | Status Tracking                       |
| ------------------------------------- | ------------------------------------- |
| Zero suppressed diagnostics in source | Automated via grep + lint             |
| No non-blocking quality checks in CI  | Workflow review + CI run              |
| No dead code/docs/config              | `npm run dead:check` + docs owner map |
| All intermediate artifacts in temp    | Script/workflow audit                 |
| Release path reproducible locally     | `npm run ci` + release rehearsal      |

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
