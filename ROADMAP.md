# Roadmap

This roadmap replaces legacy sprint fragments with a production-focused program plan.
Historical details are consolidated in [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md).

## North Star

Build the best-in-class browser-based cabinet planning application for professional and advanced DIY workflows:

- Fast: sub-second interactions and predictable optimization latency.
- Accurate: manufacturing-grade outputs (BOM, DXF, G-code, PDF).
- Accessible: WCAG 2.2 AA by default, no waivers.
- Reliable: strict type/lint/test/build gates across local and CI.
- Portable: no backend dependency required for core workflows.

## Strategic Re-Decision Summary

| Area                   | Previous posture                                    | New production posture                                                                                 |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Product planning       | Mixed historical + future tasks in one file         | Single forward plan in this file, history archived in [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md) |
| Quality waivers        | Some disabled validators/filters and legacy waivers | No disabled checks as a default posture; fix root cause first                                          |
| Architecture narrative | Drifted from implemented reality                    | Align docs with actual runtime, workflows, and constraints                                             |
| Tooling ownership      | Project-local and ad hoc conventions                | Shared tooling baseline under MyScripts, project-specific overrides documented                         |
| Release readiness      | Feature-first sequencing                            | Reliability-first sequencing (gates, observability, reproducibility)                                   |

## Competitive Benchmark and Harvest Plan

The table below compares category leaders and the methods we should harvest.

| Product                | Strength to learn from              | Current project gap                        | Action to harvest                                                        |
| ---------------------- | ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Fusion 360             | End-to-end manufacturability checks | Limited advanced manufacturing constraints | Add joinery + collision + tolerance checks to engine validation phase    |
| SketchUp + OpenCutList | Mature plugin ecosystem             | No extension API                           | Define plugin contract and safe extension surface (v4 program)           |
| CutList Optimizer      | Optimization UX clarity             | Limited optimization explainability        | Add "why this layout" explainer and part-level placement rationale       |
| Polyboard              | Detailed cabinetry rule modeling    | Partial parametric rule depth              | Expand rule graph (hinge clearances, shelf loading, panel nesting rules) |
| Cabinet Vision         | Enterprise workflow integration     | No ERP/MRP export adapters                 | Add standardized CSV/JSON schema adapters for downstream systems         |
| Onshape (cloud CAD)    | Collaboration and versioning        | Local-only project history                 | Add optional project snapshot/version timeline with diff                 |
| Figma (design systems) | Token discipline and consistency    | Design token docs drift                    | Enforce token audit and visual regression per release                    |

### Harvested Best Methods to Implement

1. Explainable optimization results (decision transparency).
2. Formal rule engine for manufacturing constraints.
3. Versioned project snapshots and diff workflow.
4. Public extension points with stability guarantees.
5. Stronger interoperability schemas for external systems.

## Production Program (v3.45.0 to v4.0.0)

## Phase 1: Stability and Trust (v3.45.0)

- Remove residual waivers/suppressions from code, config, and docs.
- Enforce zero warnings across lint/typecheck/tests in CI and local.
- Align README, architecture docs, and roadmap with current implementation.
- Ensure generated artifacts are not kept in root workspace state.
- Add release checklist automation script and pre-release validation task.

Exit criteria:

- `npm run ci` passes locally and in CI.
- No disabled quality rules without explicit architectural justification.
- Documentation reflects real versions, test counts, and workflow topology.

## Phase 2: Performance and Determinism (v3.46.0)

- Expand worker coverage for heavy computations where latency spikes.
- Add deterministic fixtures for optimizer regression testing.
- Add profile-driven thresholds for large multi-cabinet projects.
- Improve memoization boundaries and cache invalidation policy.

Exit criteria:

- Stable optimization runtime under agreed thresholds.
- No performance regressions in benchmark suite.

## Phase 3: Accessibility and UX Excellence (v3.47.0)

- Strengthen keyboard-only workflow end-to-end.
- Add accessibility smoke checks for all major tabs and dialogs.
- Add focus order and screen-reader narration tests for critical journeys.
- Establish explicit "no allowlist" axe policy for first-party UI.

Exit criteria:

- All accessibility tests pass without allowlists.
- No unresolved major/minor keyboard or focus defects.

## Phase 4: Domain Intelligence (v3.48.0)

- Introduce manufacturing constraint validation layer.
- Add assembly-risk warnings (deflection, unsupported spans, conflict hints).
- Improve material substitution recommendations with rationale.

Exit criteria:

- Users receive actionable, explainable warnings before export.
- Domain validation failures are test-covered and localized.

## Phase 5: Interoperability and Ecosystem (v3.49.0)

- Normalize export schemas for ERP/MRP/CAM ingestion.
- Add machine-readable version metadata to export bundles.
- Publish extension API draft and compatibility policy.

Exit criteria:

- External tool ingestion verified with sample adapters.
- Extension API draft validated with at least one pilot plugin.

## Phase 6: v4.0.0 Launch Readiness

- Finalize architecture hardening and extensibility boundaries.
- Complete quality and security release checklist.
- Publish migration notes and deprecation plan.

Exit criteria:

- Full CI suite green.
- Release artifacts reproducible and validated.
- Documentation and support runbooks complete.

## Frontend and Backend Reconsideration

This product remains frontend-centric by design, but production readiness requires explicit boundaries.

Frontend enhancement priorities:

- Improve render segmentation for large project previews.
- Add visual regression tests for core configurator and preview states.
- Harden error boundaries around heavy tabs and export workflows.

Backend/infrastructure posture:

- Keep backend optional for core planner operations.
- Define optional service endpoints only for collaboration/version history.
- Keep local-first workflow as a non-negotiable baseline.

Database direction (optional track):

- Current: localStorage/session persistence.
- Next optional step: IndexedDB for larger project sets and snapshots.
- Future optional service: remote sync with conflict-safe merge model.

## Toolchain and Environment Standardization

Common development tools should be centralized under the parent MyScripts scope.

Baseline:

- Node runtime and package manager policy managed one level up where practical.
- Shared reusable tooling assets are maintained under `../.tools` (MyScripts scope).
- Project-level scripts remain authoritative for build/test/release.
- Temporary/intermediate outputs must be written to OS TEMP paths (for example `%TEMP%/WoodworkingShop`) rather than workspace-root folders.

Operational policy:

- Treat `coverage`, `dist`, and `test-results` as generated artifacts only.
- Never treat generated output as source-of-truth documentation.

## Legacy Roadmap Consolidation

Legacy roadmap items are consolidated as:

- Completed historical sprints: [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)
- Delivered release details: [CHANGELOG.md](CHANGELOG.md)
- Current architecture baseline: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

This file now contains only forward-looking execution priorities.

## Release Quality Gates (Must Pass)

1. `npm run typecheck`
2. `npm run lint`
3. `npm run lint:md`
4. `npm run format:check`
5. `npm test`
6. `npm run build`
7. `npm run test:e2e`

If any gate fails, release is blocked until root cause is fixed.

## Continuous Enhancement Rules

1. No suppression-first fixes.
2. No dead code, dead docs, or dead config retained.
3. Every behavior change must include tests or a justified test update.
4. Docs must be updated in the same change set as behavior changes.
5. Keep roadmap, architecture, and changelog mutually consistent.
