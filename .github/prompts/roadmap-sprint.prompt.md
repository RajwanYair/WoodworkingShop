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

## Steps

1. Read the target file(s) to understand current structure.
2. Plan the split/refactor (identify logical sections, shared state, extraction candidates).
3. Implement the changes file-by-file.
4. Run `npm run quality` — zero errors, zero warnings.
5. Run `npm test` — all tests pass, same count or more.
6. Update `ROADMAP.md` to mark the sprint item `DONE`.
7. Append a brief entry to `CHANGELOG.md` under `[Unreleased]`.

## Quality gates before marking DONE

- `npm run quality` → 0 errors
- `npm test` → all pass
- `npm run dead:check` → no orphaned exports
- Target file size reduced to goal (≤ 400 L for test files, ≤ 600 L for components, ≤ 300 L for engine files)
