# WoodworkingShop — Agent Context

> **v5.35.0** · React 19 · TypeScript 6 · Vite 8 · Vitest 4 · Playwright 1.61 · i18next 26 · Zustand 5 · Tailwind CSS v4 · MIT · Node ≥ 22.

## Current Sprint — Phase 81

- v5.35.0 (Phase 73) is released after the full CI/E2E matrix passed.
- Sprints 371–376 are complete; Sprint 376 T3 passed three consecutive local mobile Lighthouse runs without changing thresholds.
- Sprint 377 T4 is complete; T1–T3 moved to S431/S439. Sprint 313 T1–T4 are complete, including physical-camera acceptance on 2026-10-10.
- All 337 Sprint 375 locale review records are approved; the 19 new diagnostics strings per AR/DE/ES/FR locale are tracked separately as pending review.
- Sprints 313 and 315 are complete; Sprint 315's native OS file-launch behavior remains unverified and is explicitly outside browser-level acceptance.
- Phase 81 (Sprints 420–425) is the next release target, v5.36.0.
- Sprints 420–434 cover toolchain modernization and the Phase 81–85 architecture refactor.
- Release order and sprint contracts: [ROADMAP.md §7.2](ROADMAP.md).

## Source of Truth

- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) contains shared architecture, conventions, patterns, and quality commands.
- [`.github/instructions/`](.github/instructions/) contains path-scoped rules; follow the files matching the code being changed.
- [ROADMAP.md](ROADMAP.md) is the active plan; [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md) and [CHANGELOG.md](CHANGELOG.md) are historical records.
- Architecture and APIs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/API-BOUNDARIES.md](docs/API-BOUNDARIES.md), and [docs/PLUGIN-API.md](docs/PLUGIN-API.md).

Use the narrowest relevant instructions and source-of-truth docs; avoid duplicating their details here.
