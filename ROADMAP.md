# Roadmap

> Last updated: 2026-06-01
> Current app version: v5.30.0
> Next release target: v5.31.0
> Strategy: best-in-class, local-first, production-grade woodworking planning platform

## 1. Why This Reset Exists

This roadmap is a full re-decision document, not a sprint log.
It consolidates previous direction, keeps what is strong, and re-opens every major engineering decision for improvement across:

- Frontend architecture and UX quality
- Core engine correctness and export contracts
- Backend/data/infrastructure and deployment workflows
- Toolchain versions and dev experience
- VS Code, Copilot, MCP, GitHub integration governance

Historical execution details remain in:

- [CHANGELOG.md](CHANGELOG.md)
- [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 2. Product North Star

Build the most reliable local-first cabinet/furniture planning app for real workshop execution:

- Deterministic geometry and cut planning
- Trustworthy manufacturing outputs (PDF/DXF/G-code)
- Fast authoring and iteration for multi-cabinet projects
- Strong accessibility, i18n, and RTL support
- Zero-suppression production discipline

## 3. Decision Ledger (Rethink + Final Direction)

### 3.1 Frontend

| Area              | Current                | Decision | Upgrade Direction                                                  |
| ----------------- | ---------------------- | -------- | ------------------------------------------------------------------ |
| UI framework      | React 19 + TS 6        | Keep     | Add stricter component boundaries and route-level error resilience |
| Styling           | Tailwind v4 + tokens   | Keep     | Add visual regression snapshots and token audit pipeline           |
| State             | Zustand slices         | Keep     | Add selector stability profiling and stale-update detection        |
| Preview rendering | SVG + WebGL hybrid     | Keep     | Expand camera/input contract tests, remove pseudo-3D fallbacks     |
| UX quality        | Mixed journey coverage | Improve  | Add explicit journey matrix with blocking e2e checks               |

### 3.2 Backend/Data/API

| Area          | Current                        | Decision | Upgrade Direction                                           |
| ------------- | ------------------------------ | -------- | ----------------------------------------------------------- |
| App topology  | Local-first SPA                | Keep     | Treat optional cloud as strict adapter interface            |
| Persistence   | IndexedDB + JSON export/import | Keep     | Harden schema registry and migration matrix                 |
| API usage     | Optional integrations          | Keep     | Add capability contracts and explicit offline behavior docs |
| Database      | No mandatory central DB        | Keep     | Evaluate optional sync backend behind feature flags only    |
| Privacy model | Client-first                   | Keep     | Add governance for any telemetry with default-off posture   |

### 3.3 Architecture/Methods

| Area              | Current                         | Decision | Upgrade Direction                                          |
| ----------------- | ------------------------------- | -------- | ---------------------------------------------------------- |
| Engine purity     | Strong                          | Keep     | Increase property-based tests and invariant guards         |
| Testing           | Unit + e2e + bench + a11y       | Keep     | Add golden export fixtures and contract drift checks       |
| Docs              | Strong volume, uneven freshness | Improve  | Add ownership/freshness contracts and validation           |
| Config governance | Good, growing complexity        | Improve  | Remove drift, enforce no disabled/suspended options policy |

### 3.4 Tooling/Infra

| Area              | Current                    | Decision | Upgrade Direction                                          |
| ----------------- | -------------------------- | -------- | ---------------------------------------------------------- |
| Build             | Vite 8 + TS 6              | Keep     | Add deterministic release reproducibility checks           |
| CI/CD             | GitHub Actions             | Keep     | Harden workflow supply chain, provenance, and permissions  |
| SBOM              | Present                    | Keep     | Add release-level attestation and verification checklist   |
| Workspace tooling | Rich VS Code/Copilot stack | Keep     | Reduce no-value extension noise and enforce profile policy |

## 4. Best-in-Class Benchmark Comparison

The table below compares workflow quality against top-class adjacent applications and extracts concrete methods to adopt.

| Capability               | WoodworkingShop (today)                          | Fusion 360       | SketchUp + OpenCutList | Cabinet Vision / PolyBoard | Shapr3D    | Method To Harvest                                          |
| ------------------------ | ------------------------------------------------ | ---------------- | ---------------------- | -------------------------- | ---------- | ---------------------------------------------------------- |
| Parametric control       | Strong config model, limited expression graphing | Excellent        | Medium                 | Excellent                  | Medium     | Add named expressions + dependency graph inspector         |
| Manufacturing confidence | Good exports, improving contracts                | Excellent        | Good                   | Excellent                  | Medium     | Golden export fixtures + strict schema versioning          |
| Multi-project workflow   | Good local model                                 | Good cloud model | Medium                 | Good                       | Medium     | Add first-class project templates and batch verification   |
| Optimization             | Strong MaxRects                                  | Medium           | Good                   | Excellent                  | Medium     | Multi-stock/kerf/grain strategy matrix with explainability |
| Accessibility + RTL      | Excellent differentiator                         | Medium           | Low                    | Low                        | Medium     | Keep leadership; enforce keyboard journey blocking tests   |
| Offline resilience       | Excellent                                        | Limited          | Medium                 | Low                        | Medium     | Keep local-first edge and harden migration guarantees      |
| Extensibility            | Internal plugin/API foundations                  | SDK-level        | Plugin ecosystem       | Macro ecosystem            | Limited    | Versioned plugin API with compatibility checker            |
| Team governance          | Strong scripts, still maturing                   | Enterprise       | Community              | Enterprise                 | Enterprise | Add policy-as-code for prompts/agents/workflows/extensions |

## 5. Consolidated Legacy Plan

Legacy roadmap material is considered superseded by this execution model.
Consolidation status:

- Completed sprint narrative moved to [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)
- Release narrative remains in [CHANGELOG.md](CHANGELOG.md)
- Architecture deep-dive remains in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- This roadmap remains the only forward strategy source

## 6. Production Readiness Gates (Blocking)

All release candidates must pass every gate:

1. Correctness: typecheck/lint/tests pass with zero suppressions
2. Security: dependency review + secret scan + workflow governance pass
3. Exports: golden contract tests for PDF/DXF/G-code pass
4. Accessibility: WCAG automation + keyboard journey matrix pass
5. i18n: EN/HE parity and locale coverage pass
6. Performance: bundle and benchmark budgets pass
7. Governance: prompts/agents/instructions/mcp/extensions/template sync validations pass
8. Reproducibility: release artifacts include checksum + SBOM + provenance

## 7. Program Plan (v5.30.0)

### Phase A: Governance and Template Convergence

1. Normalize governance assets and sync them to parent MyScripts template catalog
2. Enforce extension policy with no-value recommendations removed
3. Finalize MCP server governance matrix and ownership
4. Validate all AI assets: agents/prompts/instructions/hooks/workflows

### Phase B: Domain Correctness and Export Contracts

1. Add deterministic multi-cabinet export/import contract suite
2. Add golden fixtures for PDF/DXF/G-code outputs
3. Expand engine invariants and property-based coverage for geometry domains
4. Verify all critical calculators against boundary matrices

### Phase C: UX and Reliability Hardening

1. Keyboard-first journey tests for all primary tabs
2. Error boundary and recovery flow for every export and project load path
3. 3D preview interaction parity checks (drag/orbit/zoom/reset)
4. Cut-sheet and summary layouts stress-tested for long text + RTL

### Phase D: Release and Verification

1. Run full local quality gates and full CI pipeline
2. Generate release artifacts, checksums, SBOM, attestation
3. Publish release with immutable notes and verification summary
4. Post-release audit: docs freshness + template sync + extension policy compliance

## 8. VS Code, Copilot, MCP, and GitHub Integration Plan

### VS Code Extensions

- Keep only value-positive recommendations for this TS-first stack
- Keep non-relevant language stacks in unwantedRecommendations
- Add periodic extension drift review in quality cycle

### Copilot Assets

- Keep AGENTS.md + .github/agents + .github/prompts + .github/instructions aligned by contract
- Require acceptance checklists in prompt/agent templates
- Keep version references aligned with current release

### MCP

- Keep every server documented with explicit purpose and owner
- Keep secret-bearing servers using prompt-backed secret inputs only
- Validate metadata and governance in CI

### GitHub Actions

- Keep supply chain hardened with minimal permissions and provenance
- Keep policy validations blocking in CI
- Keep release workflow deterministic and reproducible

## 9. Root Hygiene and Repository Structure Policy

- Root should contain only top-level project essentials
- New operational artifacts belong under docs, scripts, config, or .github, not root
- Dead code/docs/config are blocked by dead-check and governance scripts
- Intermediate outputs must stay in TEMP locations

## 10. Immediate Execution Backlog (Next 10 Items)

1. ~~Complete template sync rollout to MyScripts parent templates~~ — DONE (v5.30.0)
2. ~~Add script to diff template assets against source for drift reporting~~ — DONE (v5.30.0)
3. ~~Add export golden fixture baseline command~~ — DONE (v5.30.0)
4. ~~Add PDF warning budget and rendering regression check~~ — DONE (v5.30.0)
5. ~~Add component boundary budget exceptions list (minimal and explicit)~~ — DONE (v5.30.0)
6. Add docs ownership file and freshness date policy
7. Add MCP ownership table in docs
8. Add extension review log with keep/remove rationale
9. Add release readiness report generator command
10. Cut v5.30.0 only after all gates and audits pass — DONE

## 11. Definition of Done For Best-in-Class Claim

The project can claim best-in-class when:

- Domain correctness is demonstrably stable via invariant and property tests
- Export outputs are contract-tested and reproducible across environments
- Accessibility and multilingual workflows are continuously enforced
- Governance automation prevents silent drift across code, docs, workflows, and AI assets
- Parent MyScripts template receives and validates this governance baseline
