---
mode: agent
description: Execute a Phase 17.3 roadmap sprint item — reduce file sizes, improve test coverage, or tighten CI.
---

# Roadmap Sprint

You are executing a **Phase 17.3 (Test Efficiency & DX Elevation)** sprint item in the Cabinet Planner project.

## Phase 17.3 Sprint Items

| ID  | Task                                         | Status |
| --- | -------------------------------------------- | ------ |
| E1  | Shorten large test files with `it.each`      | TODO   |
| E2  | Split engine/utils files > 300 L             | TODO   |
| E4  | Trim component files to ≤ 600 L              | TODO   |
| E5  | Split `validation.ts` + `cabinet-store.ts`   | TODO   |
| E6  | Split `templates.ts` + `dxf-export.ts`       | TODO   |
| E8  | Docs consolidation                           | TODO   |
| E9  | JSDoc → TypeDoc conversion for engine/       | TODO   |
| E12 | Version bump 3.73.0 + CHANGELOG + GH release | TODO   |

## Task

Execute sprint item **${sprintId}** — `${description}`.

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
