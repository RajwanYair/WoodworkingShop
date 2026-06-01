---
mode: agent
description: Execute a roadmap sprint item end-to-end — implement feature, pass quality gates, commit.
---

# Roadmap Sprint

You are executing a sprint item in the Cabinet Planner project (currently Phase 21).

## Current Phase — Phase 21: Marketplace + Build UX (v4.2.0)

| Sprint | Feature                  | Status |
| ------ | ------------------------ | ------ |
| 87     | Plugin Marketplace Panel | DONE   |
| 88     | Finish/Paint Calculator  | DONE   |
| 89     | Project Build Log        | WIP    |
| 90     | Focus/Kiosk Mode         | TODO   |
| 91     | Release v4.2.0           | TODO   |

**Next up**: Sprint 89 — Project Build Log (`src/components/assembly/BuildLogPanel.tsx`)

## Task

Execute sprint **${sprintId}** — `${description}`.

## Mandatory constraints

- **Zero suppression**: no `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`
- **`erasableSyntaxOnly: true`**: no `enum`, no `namespace` — use `as const` / union types
- **i18n parity**: any new `t('key')` → entry in both `en.json` AND `he.json`
- **react-refresh**: `.tsx` files export only React components; utilities → sibling `.ts`
- **Engine purity**: `src/engine/` — no React imports, no DOM, no side effects
- **Test style**: `it.each` for parametrised pairs; group related assertions in one `it`
- **No dead imports**: verify with `npm run dead:check` after changes
- **RTL layout**: use Tailwind logical props (`ms-*`, `me-*`, `start-*`, `end-*`)

## Steps

1. Read the target file(s) to understand current structure.
2. Plan the implementation (engine function → store slice → React component → i18n keys).
3. Implement the changes file-by-file following the layered architecture.
4. Add unit tests for any new engine functions.
5. Run `npm run quality` — zero errors, zero warnings.
6. Run `npm test` — all tests pass, same count or more.
7. Update `ROADMAP.md` to mark the sprint item `DONE`.
8. Append a brief entry to `CHANGELOG.md` under `[Unreleased]`.

## Quality gates before marking DONE

- `npm run quality` → 0 errors
- `npm test` → all pass
- `npm run dead:check` → no orphaned exports
- `npm run bundle:check` → bundle within budget

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.
