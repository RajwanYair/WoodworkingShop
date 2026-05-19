# Roadmap

This roadmap replaces legacy sprint fragments with a production-focused program plan.
Historical details are consolidated in [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md).

---

## North Star

Build the best-in-class browser-based cabinet planning application for professional and advanced DIY workflows:

- **Fast**: sub-second interactions and predictable optimization latency.
- **Accurate**: manufacturing-grade outputs (BOM, DXF, G-code, PDF).
- **Accessible**: WCAG 2.2 AA by default, no waivers.
- **Reliable**: strict type/lint/test/build gates across local and CI.
- **Portable**: no backend dependency required for core workflows.
- **Extensible**: formal plugin API with stability guarantees.

---

## Strategic Decision Audit

Every major architectural decision has been reconsidered against industry best practices:

### Frontend Architecture

| Decision             | Current State                      | Reconsidered Outcome                                                                                                                                                                       |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI Framework**     | React 19 + TypeScript 6 (strict)   | **Keep** — React 19 compiler optimizations, concurrent features, and ecosystem maturity make it the strongest choice. Solid/Svelte offer smaller bundles but lack PDF/SVG ecosystem depth. |
| **State Management** | Zustand 5 single store + undo/redo | **Keep** — minimal API surface, excellent TS inference, no boilerplate. Redux Toolkit is heavier with no added benefit for this domain.                                                    |
| **CSS Framework**    | Tailwind CSS v4 with design tokens | **Keep** — utility-first with logical properties (RTL), JIT compilation, zero runtime. CSS-in-JS alternatives add bundle weight.                                                           |
| **Build Tool**       | Vite 8 (Rolldown bundler)          | **Keep** — fastest HMR, native ESM, proven chunking. Turbopack is Next.js-specific; Rspack lacks plugin maturity.                                                                          |
| **i18n**             | i18next 26 + react-i18next         | **Keep** — strongest namespace/pluralization support. FormatJS is comparable but more verbose.                                                                                             |
| **PDF Generation**   | @react-pdf/renderer (off-thread)   | **Keep** — declarative React-based PDF layout; only viable option for complex multi-page build plans without a server.                                                                     |
| **Type Safety**      | TypeScript 6 strict, zero `any`    | **Keep** — `erasableSyntaxOnly` + strict mode catches entire classes of runtime errors.                                                                                                    |

### Backend / Infrastructure

| Decision                    | Current State                | Reconsidered Outcome                                                                                                                                         |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Server dependency**       | None (pure client SPA)       | **Keep as primary** — zero-server architecture eliminates hosting cost, latency, and auth complexity. Optional collaboration service is a future track only. |
| **Persistence**             | localStorage + URL state     | **Enhance** — add IndexedDB via idb-keyval for large project sets. localStorage 5MB limit is a real constraint for multi-cabinet projects.                   |
| **Hosting**                 | GitHub Pages (static)        | **Keep** — free, CDN-backed, no ops burden. Cloudflare Pages is an upgrade path if analytics/edge functions are needed.                                      |
| **PWA**                     | Service worker (cache-first) | **Keep and harden** — add Workbox for reliable cache invalidation on deploy. Current hand-rolled SW has edge cases on version mismatch.                      |
| **Database**                | None (browser storage)       | **Future optional** — IndexedDB for local, CRDTs for eventual sync. No external DB until collaboration is scoped.                                            |
| **API / External Services** | None                         | **Keep zero-dependency** — no third-party APIs in critical path. Material databases are embedded.                                                            |

### Code Quality and Tooling

| Decision          | Current State                                      | Reconsidered Outcome                                                                                |
| ----------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Testing**       | Vitest 4 (unit) + Playwright 1.60 (E2E) + axe-core | **Keep** — fastest unit test runner, Playwright cross-browser, axe-core for a11y regression.        |
| **Linting**       | ESLint 10 flat config + Prettier                   | **Keep** — flat config is the forward standard. Add eslint-plugin-testing-library for test quality. |
| **CI Matrix**     | Node 22, 24, 26                                    | **Keep** — tests against current LTS + upcoming releases.                                           |
| **Coverage**      | V8 provider, 80% threshold                         | **Tighten to 85%** — engine code should reach 90%+.                                                 |
| **Bundle Budget** | 2000KB JS, 100KB CSS                               | **Tighten** — target 1800KB JS after tree-shaking improvements.                                     |

### Documentation and Content

| Decision              | Current State                             | Reconsidered Outcome                                         |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| **Architecture docs** | Single ARCHITECTURE.md + Mermaid diagrams | **Keep** — living document with visual flow diagrams.        |
| **Changelog**         | Keep a Changelog format                   | **Keep** — machine-parseable and human-readable.             |
| **Roadmap**           | This file (forward-only)                  | **Keep** — no mixing of history and plans.                   |
| **API docs**          | JSDoc on engine exports                   | **Enhance** — add TypeDoc generation for plugin API surface. |

---

## Competitive Benchmark

Comparison with category leaders — methods to harvest:

| Product                    | Category         | Key Strength                                                    | Our Gap                                     | Harvest Action                                                       |
| -------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| **Fusion 360**             | Desktop CAD      | End-to-end manufacturability checks, collision detection        | Limited manufacturing constraint validation | Add joinery + collision + tolerance checks to engine validation      |
| **SketchUp + OpenCutList** | Plugin ecosystem | Mature extension marketplace, community plugins                 | No public extension API                     | Define plugin contract with versioned stability guarantees (Phase 6) |
| **CutList Optimizer**      | Web optimizer    | Optimization explainability, "why this layout"                  | Optimizer is a black box to users           | Add placement rationale and waste-reduction explanation per sheet    |
| **Polyboard**              | Cabinet CAD      | Deep parametric rule modeling (hinge clearances, shelf loading) | Partial rule depth                          | Expand rule graph: hinge interference, max span, nesting rules       |
| **Cabinet Vision**         | Enterprise       | ERP/MRP integration, shop floor workflow                        | No export adapters for downstream systems   | Add standardized CSV/JSON schema adapters for ERP ingestion          |
| **Onshape**                | Cloud CAD        | Real-time collaboration, version history with diff              | Local-only, no versioning                   | Add project snapshot timeline with visual diff (Phase 3)             |
| **Figma**                  | Design system    | Design token discipline, visual regression per release          | Token docs can drift from code              | Enforce token audit and visual regression in CI                      |
| **KCD Software**           | Kitchen design   | Room-level multi-cabinet layout                                 | Single cabinet focus                        | Add multi-cabinet room layout view (v4.0 scope)                      |

### Harvested Best Methods (Priority Order)

1. **Explainable optimization** — show WHY each part was placed where it is.
2. **Manufacturing constraint engine** — validate before export, not after cutting.
3. **IndexedDB persistence** — unlock multi-project workflows without server.
4. **Versioned project snapshots** — diff and rollback without git.
5. **Public plugin API** — allow community extensions with stability contract.
6. **Stronger interop schemas** — machine-readable exports for shop floor systems.
7. **Visual regression CI** — catch UI drift automatically on every PR.
8. **Multi-cabinet room layout** — the natural next product boundary.

---

## Production Program (v3.49 to v4.0)

### Phase 1: Production Hardening (v3.50.0) — Current

Exit criteria: zero warnings, zero disabled checks, zero dead code.

- [x] Remove all residual suppressions/waivers from code, config, and docs.
- [x] Enforce zero warnings across lint/typecheck/tests locally and in CI.
- [x] Align all documentation with current implementation and versions.
- [x] Ensure all intermediate artifacts write to OS TEMP only.
- [x] Fix all VS Code extension diagnostic false positives at root cause.
- [ ] Add visual regression baseline snapshots for core views.
- [ ] Tighten coverage thresholds to 85% statements, 80% branches.
- [ ] Add eslint-plugin-testing-library for test file quality.

### Phase 2: Performance and Determinism (v3.51.0)

Exit criteria: stable optimization runtime, no performance regressions.

- [ ] Expand Web Worker coverage for cost estimation and assembly generation.
- [ ] Add deterministic fixtures for optimizer regression benchmarks.
- [ ] Profile large multi-cabinet projects (10+ cabinets) and optimize.
- [ ] Improve memoization boundaries — avoid recomputing unaffected cabinets.
- [ ] Add performance budget CI check (Lighthouse TBT < 300ms).
- [ ] Investigate SharedArrayBuffer for zero-copy worker communication.

### Phase 3: Persistence and Versioning (v3.52.0)

Exit criteria: projects persist reliably across sessions, snapshots are diffable.

- [ ] Migrate from localStorage to IndexedDB (via idb-keyval).
- [ ] Add project snapshot/version timeline with named checkpoints.
- [ ] Implement diff view between any two project versions.
- [ ] Add import/export in standardized JSON schema with version migration.
- [ ] Add project size indicator and storage quota monitoring.

### Phase 4: Accessibility and UX Excellence (v3.53.0)

Exit criteria: all a11y tests pass without allowlists, keyboard-only workflow complete.

- [ ] Strengthen keyboard-only workflow for all tabs and dialogs.
- [ ] Add focus order and screen-reader narration tests for critical journeys.
- [ ] Add high-contrast mode support beyond `forced-colors`.
- [ ] Add touch gesture tutorial overlay for mobile/tablet users.
- [ ] Implement responsive layout for tablet portrait orientation.

### Phase 5: Domain Intelligence (v3.54.0)

Exit criteria: users receive actionable warnings before export.

- [ ] Introduce manufacturing constraint validation layer (joinery, clearances).
- [ ] Add assembly-risk warnings (deflection, unsupported spans, hinge interference).
- [ ] Improve material substitution recommendations with rationale text.
- [ ] Add grain direction conflict detection in optimizer.
- [ ] Add weight estimation per shelf with load capacity warnings.

### Phase 6: Interoperability and Plugin API (v3.55.0)

Exit criteria: one pilot plugin validates the extension API.

- [ ] Normalize export schemas for ERP/MRP/CAM ingestion.
- [ ] Add machine-readable version metadata to export bundles.
- [ ] Publish extension API draft with typed contracts.
- [ ] Implement plugin sandbox with resource limits.
- [ ] Add plugin registry UI and lifecycle management.

### Phase 7: v4.0.0 Launch

Exit criteria: full CI green, reproducible builds, complete docs.

- [ ] Multi-cabinet room layout view.
- [ ] Explainable optimizer with per-part placement rationale.
- [ ] Complete security audit and CSP hardening.
- [ ] Publish migration notes and breaking change documentation.
- [ ] Performance benchmarks published in README.
- [ ] Marketing site and documentation portal.

---

## Frontend Enhancement Priorities

- Improve render segmentation for large project previews (virtualize off-screen parts).
- Add visual regression tests for core configurator and preview states.
- Harden error boundaries around heavy tabs and export workflows.
- Lazy-load optimizer tab until first visit (reduces initial bundle).
- Add skeleton loading states for worker-dependent computations.

## Backend / Infrastructure Posture

- Keep backend **optional** for core planner operations (non-negotiable).
- Define optional service endpoints only for collaboration/version history.
- Keep local-first workflow as the fundamental guarantee.
- No external API calls in the critical rendering/export path.

## Database Direction (Optional Track)

| Stage   | Technology               | Purpose                                  |
| ------- | ------------------------ | ---------------------------------------- |
| Current | localStorage + URL state | Simple persistence, shareable links      |
| Next    | IndexedDB (idb-keyval)   | Large projects, snapshots, offline-first |
| Future  | CRDTs (Yjs/Automerge)    | Optional real-time collaboration         |
| Never   | Server-required DB       | Core workflows must remain serverless    |

---

## Toolchain and Environment Standardization

### Shared Development Tools (MyScripts scope)

Common tools are centralized one level up at `MyScripts/`:

| Tool           | Location                                  | Purpose                                |
| -------------- | ----------------------------------------- | -------------------------------------- |
| Node.js 22 LTS | System / `.nvmrc` at MyScripts root       | Runtime for all JS/TS projects         |
| npm workspaces | `MyScripts/package.json`                  | Hoisted dependencies, single lock file |
| EditorConfig   | `MyScripts/.editorconfig`                 | Shared formatting baseline             |
| Prettier       | `MyScripts/.tools/prettierrc.shared.json` | Shared style rules                     |
| TypeScript     | `MyScripts/node_modules/typescript`       | Shared compiler binary                 |

### Project-Specific Configuration

| Config             | Location                    | Notes                                                |
| ------------------ | --------------------------- | ---------------------------------------------------- |
| tsconfig (4 files) | Workspace root              | App, node, test, e2e — all reference a solution root |
| ESLint flat config | `eslint.config.js`          | Project-specific rules                               |
| Vite config        | `vite.config.ts`            | Build/dev/preview configuration                      |
| Vitest config      | `vitest.config.ts`          | Test environment, coverage                           |
| Playwright config  | `playwright.config.ts`      | E2E browser matrix                                   |
| Bundle budgets     | `config/bundle-budget.json` | JS/CSS size limits                                   |
| Lighthouse         | `config/lighthouserc.json`  | Performance/a11y thresholds                          |

### Intermediate Artifact Policy

All generated/transient outputs write to OS TEMP:

| Artifact           | Path                                      |
| ------------------ | ----------------------------------------- |
| Vite cache         | `$TEMP/WoodworkingShop/.vite_cache`       |
| ESLint cache       | `$TEMP/WoodworkingShop/.eslintcache`      |
| Vitest coverage    | `$TEMP/WoodworkingShop/coverage`          |
| Playwright results | `$TEMP/WoodworkingShop/test-results`      |
| Playwright report  | `$TEMP/WoodworkingShop/playwright-report` |
| Lighthouse output  | `$TEMP/WoodworkingShop/.lighthouseci`     |
| TS build info      | `node_modules/.tmp/` (npm-managed)        |

Workspace root contains **only** source, configuration, and documentation.

---

## Release Quality Gates (Must Pass)

Every release requires all gates green:

1. `npm run typecheck` — zero errors
2. `npm run lint` — zero warnings (`--max-warnings 0`)
3. `npm run lint:md` — zero markdown issues
4. `npm run format:check` — zero formatting drift
5. `npm test` — all unit tests pass
6. `npm run build` — clean production build
7. `npm run bundle:check` — within budget limits
8. `npm run test:e2e` — all E2E + a11y tests pass

If any gate fails, the release is blocked until root cause is fixed (not suppressed).

---

## Continuous Enhancement Rules

1. **No suppression-first fixes** — fix root cause, never disable the check.
2. **No dead code** — unused exports, unreachable branches, and stale tests are removed immediately.
3. **No dead docs** — documentation must reflect current implementation. Stale sections are removed or updated in the same commit.
4. **No dead config** — disabled rules, commented-out settings, and unused config keys are deleted.
5. **Every behavior change includes tests** — or a justified test update.
6. **Docs update with code** — roadmap, architecture, and changelog stay mutually consistent.
7. **Badges reflect reality** — version badges, test counts, and status indicators are updated with each release.
8. **Intermediate files never in workspace** — all caches, reports, and build telemetry go to `$TEMP`.

---

## Legacy Consolidation

| Content                        | Location                                                           |
| ------------------------------ | ------------------------------------------------------------------ |
| Completed sprints (historical) | [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)                   |
| Release details                | [CHANGELOG.md](CHANGELOG.md)                                       |
| Architecture baseline          | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                       |
| Copilot coding conventions     | [.github/copilot-instructions.md](.github/copilot-instructions.md) |

This file contains **only** forward-looking execution priorities.
