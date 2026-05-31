# Roadmap

> Strategic reset: 2026-05-31
> Current release: v5.29.1
> Target release line: v5.29.x

This roadmap is rewritten from first principles and now serves as the single forward strategy document. Historical details are consolidated and preserved in:

- [CHANGELOG.md](CHANGELOG.md)
- [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Product Mission

Deliver a best-in-class, local-first woodworking planning application that is:

- Accurate enough for real shop-floor output
- Fast and stable on commodity hardware
- Accessible and multilingual by default
- Secure and privacy-preserving without server lock-in
- Maintainable under strict no-suppression engineering rules

## Non-Negotiable Product Gates

| Dimension     | Gate                                           | Enforcement                 |
| ------------- | ---------------------------------------------- | --------------------------- |
| Correctness   | No lint/type/test suppressions in product code | CI + code review            |
| Reliability   | `npm run ci` must pass before release          | required status checks      |
| Accessibility | WCAG 2.2 AA automated + manual keyboard paths  | e2e + QA checklist          |
| Security      | No unresolved high/critical findings           | dependency + workflow scans |
| i18n          | Full EN/HE parity, all locales complete        | i18n coverage scripts       |
| Performance   | Bundle + Lighthouse budgets pass               | CI budgets                  |
| Cleanliness   | No dead code/docs/config                       | knip + docs ownership       |

## Strategic Re-Decisions (Full Stack)

### Frontend

| Topic      | Decision                                        | Rationale                                               | Improvement Actions                                           |
| ---------- | ----------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| UI runtime | Keep React 19 + TS 6 + Vite 8                   | Strong ecosystem, mature build speed                    | Add stricter component boundary linting and file size budgets |
| Styling    | Keep Tailwind v4 tokenized model                | Predictable output, excellent DX                        | Add visual regression snapshots for key flows                 |
| Rendering  | Keep SVG-first preview                          | Deterministic for manufacturing dimensions              | Add golden screenshot + dimension annotation checks           |
| State      | Keep Zustand single store with slices           | Low overhead and explicit action contracts              | Add selector performance profiling and stale selector checks  |
| UX quality | Move from ad-hoc checks to tested user journeys | Production confidence requires journey-level validation | Add first-run wizard, recovery UX, error boundaries coverage  |

### Backend, Data, and Infrastructure

| Topic             | Decision                                        | Rationale                          | Improvement Actions                                     |
| ----------------- | ----------------------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| Core architecture | Keep local-first SPA without mandatory backend  | Preserves zero-install and privacy | Formalize optional cloud boundary as adapter layer      |
| Persistence       | Keep IndexedDB/file exports as critical path    | Offline-first is core value        | Add schema registry + migration test matrix             |
| API integrations  | Keep external APIs optional and feature-flagged | App must run without network       | Introduce capability contract docs per API              |
| Database          | No central DB in critical path                  | Avoid coupling and lock-in         | Evaluate optional sync DB only behind adapter interface |
| Infra             | Keep static hosting and GH Actions CI/CD        | Simple, robust deployment          | Add release provenance and signed artifact verification |

### Language, Architecture, and Methods

| Topic                  | Decision                                        | Rationale                               | Improvement Actions                                                |
| ---------------------- | ----------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Language               | Keep strict TypeScript 6 (`erasableSyntaxOnly`) | Compile-time safety, modern TS pipeline | Add invariant assertion utilities for domain-critical calculations |
| Engine architecture    | Keep pure `src/engine` modules                  | Deterministic and testable core         | Expand property-based tests for geometry/math domains              |
| Component architecture | Keep feature directories                        | Current mental model is good            | Split oversized files and eliminate cross-layer imports            |
| Testing strategy       | Keep unit + bench + e2e + a11y                  | Balanced confidence surface             | Add export contract golden files and mutation-risk suites          |
| Docs strategy          | Keep docs close to code + generated API docs    | Strong maintainability                  | Add docs freshness checks and ownership map                        |

## Best-in-Class Comparison (Method Harvest)

Comparison is capability-focused and used to harvest proven engineering methods.

| Capability           | WoodworkingShop                  | SketchUp + OpenCutList  | Fusion 360                 | Cabinet Vision / PolyBoard | CutList Optimizer | Method to Harvest                                            |
| -------------------- | -------------------------------- | ----------------------- | -------------------------- | -------------------------- | ----------------- | ------------------------------------------------------------ |
| Onboarding           | Zero-install web/PWA             | Desktop + plugin setup  | Desktop + account flow     | Heavy desktop install      | Web               | Add guided first project flow with sane defaults             |
| Parametric modeling  | Config-driven rules              | Partial plugin-driven   | Advanced constraints graph | Advanced constraints graph | Minimal           | Introduce named expressions + dependency DAG inspection      |
| Optimization         | MaxRects BSSF                    | Good sheet optimization | Add-on dependent           | Industry-grade nesting     | Strong 2D nesting | Add kerf-aware, grain-locked, multi-stock optimization mode  |
| Manufacturing export | PDF/DXF/G-code                   | DXF/PDF                 | Full CAM ecosystem         | CNC-centric                | PDF/CSV           | Add golden-file contract tests and schema-versioned exports  |
| Offline resilience   | Strong local-first               | Medium                  | Weak                       | Weak                       | Medium            | Keep local-first and add storage migration guarantees        |
| Accessibility        | WCAG effort already present      | Limited                 | Partial                    | Limited                    | Limited           | Add keyboard path regression matrix + focus-order tests      |
| i18n + RTL           | Strong multilingual support      | Limited                 | Medium                     | Medium                     | Limited           | Keep as differentiator and enforce 100% locale parity        |
| Observability        | Privacy-first, currently partial | Vendor-centric          | Vendor-centric             | Vendor-centric             | Minimal           | Add opt-in structured telemetry with strict privacy controls |
| Extensibility        | Internal plugin API              | Ruby plugin model       | SDK model                  | Macro model                | None              | Version plugin API separately with compatibility promises    |

### Harvested Backlog (Prioritized)

| Priority | Work Item                                        | Source Inspiration                | Target   |
| -------- | ------------------------------------------------ | --------------------------------- | -------- |
| P0       | Storage schema registry + migration tests        | Figma-like document evolution     | Phase 53 |
| P0       | Export golden-file contracts (PDF/DXF/G-code)    | CAM-grade release discipline      | Phase 53 |
| P0       | Keyboard journey regression suite                | Enterprise a11y QA practices      | Phase 53 |
| P1       | Named parameter expression engine + graph viewer | Fusion/Cabinet Vision parametrics | Phase 54 |
| P1       | Multi-stock kerf-aware optimizer mode            | Cut optimization specialists      | Phase 54 |
| P1       | Plugin API independent semver                    | VS Code extension ecosystem model | Phase 54 |

## Consolidated Legacy Content

This file no longer duplicates completed sprint narratives. Legacy and archival sources:

| Legacy Scope                     | Canonical File                                   |
| -------------------------------- | ------------------------------------------------ |
| Completed sprint stories         | [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md) |
| Versioned release notes          | [CHANGELOG.md](CHANGELOG.md)                     |
| Long-form architecture narrative | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     |
| Claim verification baseline      | [docs/CLAIM-AUDIT.md](docs/CLAIM-AUDIT.md)       |

## Program Plan: Phase 53 (Best-in-Class Upgrade)

### Sprint 250: Architecture and Data Contracts

| Deliverable             | Acceptance Criteria                                            |
| ----------------------- | -------------------------------------------------------------- |
| Storage schema registry | Every persisted artifact has explicit schema version           |
| Migration suite         | Backward migration tests pass for all supported versions       |
| API boundary docs       | Optional cloud/API integration points documented and versioned |

### Sprint 251: Export and Manufacturing Correctness

| Deliverable                | Acceptance Criteria                               |
| -------------------------- | ------------------------------------------------- |
| Golden export fixtures     | PDF/DXF/G-code fixtures checked in and stable     |
| Export contract tests      | CI validates no breaking export drift             |
| Production checksum policy | Release artifacts include deterministic checksums |

### Sprint 252: Frontend Reliability and Accessibility

| Deliverable                     | Acceptance Criteria                                |
| ------------------------------- | -------------------------------------------------- |
| Keyboard journey matrix         | Core user journeys covered by keyboard-first tests |
| Focus and live-region hardening | No a11y regressions in automated scans             |
| Error-recovery UX               | User-facing fallback and recovery flows tested     |

### Sprint 253: Developer Experience and VS Code/GitHub Integration

| Deliverable               | Acceptance Criteria                                             |
| ------------------------- | --------------------------------------------------------------- |
| Extension profile cleanup | Workspace extension set is value-focused and documented         |
| Prompt/agent refresh      | `.github/agents` and `.github/prompts` aligned with phase goals |
| MCP governance            | `.vscode/mcp.json` audited and each server has purpose + owner  |
| Workflow hardening        | CI/release/workflow checks are non-optional and reproducible    |

### Sprint 254: Release v5.29.0

| Deliverable               | Acceptance Criteria                                       |
| ------------------------- | --------------------------------------------------------- |
| Pre-release gate          | `npm run ci` and required security checks pass            |
| Release artifacts         | Dist archive, checksum, SBOM, and release notes generated |
| Post-release verification | Smoke tests + docs link verification complete             |

## Program Plan: Phase 54 (Priority Execution Window)

### Sprint 255: Roadmap Consolidation and Governance

| Deliverable                    | Acceptance Criteria                                                |
| ------------------------------ | ------------------------------------------------------------------ |
| Roadmap refresh                | Priorities reflect implemented state and next 5 sprint commitments |
| Governance carry-over cleanup  | Security/user guide version references aligned with release line   |
| Execution checklist alignment  | Sprint-level tasks map to reproducible commands and owners         |

### Sprint 256: VS Code Extension Policy Hardening

| Deliverable                    | Acceptance Criteria                                                        |
| ------------------------------ | -------------------------------------------------------------------------- |
| Recommendation set cleanup     | Required extension list removes low-value/noise extensions                 |
| Unwanted profile expansion     | Unrelated language stacks moved to `unwantedRecommendations`               |
| Workspace validator stability  | Non-applicable language servers disabled for this TypeScript-only project |

### Sprint 257: MCP and GitHub Integration Governance

| Deliverable                    | Acceptance Criteria                                                      |
| ------------------------------ | ------------------------------------------------------------------------ |
| MCP server governance matrix   | Each server has purpose, tier (core/optional), and owner                 |
| GitHub release flow validation | Tag/release flow documented and tested against current branch protection |
| Secret handling policy         | External MCP keys handled only via VS Code secret inputs                 |

### Sprint 258: Plugin API SemVer Decoupling

| Deliverable                    | Acceptance Criteria                                                   |
| ------------------------------ | --------------------------------------------------------------------- |
| Dedicated plugin API version   | Plugin API semver is explicit and independent from app package semver |
| Compatibility helpers          | Runtime helpers expose compatibility decisions for plugin marketplace |
| Regression tests               | Unit coverage verifies version comparisons and compatibility checks   |

### Sprint 259: Release v5.29.2

| Deliverable                    | Acceptance Criteria                                       |
| ------------------------------ | --------------------------------------------------------- |
| Full quality gate              | `npm run check` passes on clean tree                      |
| Release metadata               | Changelog and package versions updated for v5.29.2        |
| Published release              | Git tag + GitHub Release created from final sprint commit |

## VS Code and GitHub Integration Enhancement Plan

### VS Code Extensions Policy

| Category  | Rule                                                                            |
| --------- | ------------------------------------------------------------------------------- |
| Required  | Keep only extensions that enforce quality or accelerate core TS/React workflow  |
| Optional  | Visual-only extensions must justify measurable value                            |
| Unwanted  | Language stacks unrelated to this repo should stay in `unwantedRecommendations` |
| Stability | Disable language servers irrelevant to this workspace (e.g. Ruff/Python here)   |

### Copilot, Agents, Prompts, Instructions, Skills

| Area           | Improvement                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| Agents         | Add explicit “definition of done” checklists per agent mode                   |
| Prompts        | Add output contracts (files changed, tests run, acceptance list)              |
| Instructions   | Remove duplication and conflicting rules; keep one source of truth per domain |
| Skills         | Ensure every reusable skill references current tooling versions               |
| Copilot config | Prefer strict, deterministic defaults over convenience-only toggles           |

### GitHub Actions and Hooks

| Area     | Improvement                                                                |
| -------- | -------------------------------------------------------------------------- |
| CI       | Keep full quality gate blocking and visible in PR checks                   |
| Release  | Keep preflight check before publish; add provenance evidence               |
| Security | Maintain codeql/dependency/secret scanning as required checks              |
| Hooks    | Ensure local hooks mirror CI gate logic and stay fast enough for daily use |

### MCP Strategy

| Server Type      | Policy                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| Core servers     | GitHub, filesystem, fetch, context7, playwright, memory                    |
| Optional servers | Cloudflare, GitKraken, Brave Search only when actively used                |
| Security         | API keys via secret storage only, never plain text                         |
| Performance      | Remove or disable servers with no demonstrated value in this project cycle |

## Root Structure and Cleanup Policy

Tool configuration files that are expected at root by ecosystem tooling stay at root (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `stylelint.config.js`, `typedoc.json`, `tsconfig*.json`).

Everything else follows these rules:

1. Docs in `docs/`
2. Scripts in `scripts/`
3. Static assets in `public/`
4. Feature code under `src/` by layer
5. No dead file survives past the PR that made it dead

## Parent Workspace (`MyScripts`) Alignment Plan

This repository can be used as the hardened reference template for sibling projects in `MyScripts` via a controlled sync process:

| Sync Asset                  | Source in This Repo                                                    | Parent Target Pattern                                     |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| CI quality workflow pattern | `.github/workflows/ci.yml`                                             | `MyScripts/templates/<template>/.github/workflows/ci.yml` |
| Release gate pattern        | `.github/workflows/release.yml`                                        | same as above                                             |
| VS Code baseline            | `.vscode/settings.json`, `.vscode/extensions.json`, `.vscode/mcp.json` | `MyScripts/templates/<template>/.vscode/*`                |
| Agent/prompt baseline       | `.github/agents/*`, `.github/prompts/*`, `.github/instructions/*`      | template folders                                          |

Sync is done only by explicit template version bumps and validation runs, never by ad-hoc copy/paste.

## Production Readiness Checklist (Must Pass)

| Check           | Command / Method                  | Target                     |
| --------------- | --------------------------------- | -------------------------- |
| Type and lint   | `npm run quality`                 | pass                       |
| Full gate       | `npm run ci`                      | pass                       |
| Dead code       | `npm run dead:check`              | 0 issues                   |
| i18n            | `npm run i18n:coverage`           | 100%                       |
| Security        | dependency + workflow scans       | 0 unresolved high/critical |
| Build artifacts | temp policy and checksums         | compliant                  |
| Release         | tag workflow and artifact publish | reproducible               |

## Continuous Improvement Rules

1. No suppression-based fixes. Resolve root causes.
2. No stale docs, dead config, or dead code in main.
3. No intermediate artifacts outside `$TEMP`.
4. No architecture drift without an ADR update.
5. No non-blocking quality checks in release path.
6. No extension/tool addition without measurable workflow value.

## Open Questions Requiring Explicit Decision

1. Should optional cloud sync stay experimental or graduate to supported module in v5.30?
2. Should plugin API semver be decoupled from app semver starting phase 54?
3. Should export logic move into isolated packages under `src/engine/export` after contract tests land?
