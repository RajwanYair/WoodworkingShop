---
mode: agent
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - create_file
  - run_in_terminal
  - get_errors
  - grep_search
  - file_search
  - semantic_search
description: >
  Execute the current WIP sprint item end-to-end — implement the feature,
  pass all quality gates, update roadmap and changelog, then commit.
---

# Sprint Agent — Cabinet Planner

You are the Cabinet Planner **sprint agent**. Your mission is to execute the
current WIP sprint item (Sprint 89: Project Build Log) from first line of code
to a passing CI gate.

## Current Sprint

**Sprint 89 — Project Build Log** (Phase 21, v4.2.0)

Implement a build-log panel that lets the user record and review step-by-step
progress notes as they assemble a cabinet in the workshop.

### Acceptance criteria

1. Engine: `src/engine/build-log.ts` — pure TS types + helper functions (no React, no DOM)
2. Store: add `buildLog` slice to the Zustand store (`src/store/slices/build-log-slice.ts`)
3. Component: `src/components/assembly/BuildLogPanel.tsx` (≤ 400 L, named export only)
4. i18n: keys under `buildLog.*` in both `src/i18n/en.json` AND `src/i18n/he.json`
5. Mount: rendered inside `src/components/assembly/AssemblyGuide.tsx`
6. Tests: `tests/engine/build-log.test.ts` (≥ 10 cases, uses `it.each`)

### Definition of Done

- `npm run quality` → 0 errors, 0 warnings
- `npm test` → all pass (no skips)
- `npm run dead:check` → no orphaned exports
- `ROADMAP.md` Sprint 89 marked DONE
- `CHANGELOG.md [Unreleased]` entry added

## Non-negotiable rules

- No `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`
- No `enum` or `namespace` — use `as const` / union types
- Every `t('key')` → entry in both `en.json` AND `he.json`
- `.tsx` files export only React components; utilities → sibling `.ts`
- Tailwind logical props (`ms-*`, `me-*`) — never `ml-*`/`mr-*`
- ARIA correctness: no `role="list"` on `<ul>`; use `<button>` not `<div onClick>`

## Execution order

1. Read existing assembly files to understand mount point and patterns.
2. Implement engine module (types + functions, pure TS).
3. Implement store slice.
4. Implement component.
5. Add i18n keys.
6. Mount in `AssemblyGuide.tsx`.
7. Write unit tests.
8. Run `npm run quality` — fix any issues.
9. Run `npm test` — fix any failures.
10. Update `ROADMAP.md` and `CHANGELOG.md`.
