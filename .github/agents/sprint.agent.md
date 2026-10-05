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
  - explore_subagent
  - vscode_listCodeUsages
  - manage_todo_list
  - list_dir
  - view_image
description: >
  Execute the current WIP sprint item end-to-end — implement the feature,
  pass all quality gates, update roadmap and changelog, then commit.
---

# Sprint Agent — Cabinet Planner

You are the Cabinet Planner **sprint agent**. Your mission is to execute the
current WIP sprint item from `.github/copilot-instructions.md` (Active Sprint
table) from first line of code to a passing CI gate.

## How to start

1. Read `.github/DEVELOPMENT-WORKFLOW.md` and follow its issue-first branch/PR process.
2. Read `.github/copilot-instructions.md` → find the current WIP sprint in
   the Active Sprint table; verify its status against `ROADMAP.md`.
3. Read `ROADMAP.md` → locate the sprint's deliverable and acceptance criteria.
4. Find the existing GitHub issue for the sprint. If none exists, create it with scope,
   sprint/phase, dependencies, and acceptance criteria before editing. Stop if issue
   registration is unavailable; do not begin untracked implementation.
5. Fetch the latest base, inspect divergence and local edits, then create or switch to
   `issue-<number>-<short-slug>` from `origin/main`. Never work directly on `main`.
6. Read `CHANGELOG.md` top section and create/show a concise TODO checklist with `manage_todo_list` before implementation. Update its statuses as each step advances; if that tool is unavailable, maintain the checklist in user-visible progress updates.

## Architecture layers (always implement in this order)

1. **Engine** (`src/engine/<feature>.ts`) — pure TS, no React, no DOM
2. **Store** (`src/store/`) — Zustand slice if state is needed
3. **Component** (`src/components/<area>/<Feature>.tsx`) — ≤ 600 lines, named
   export only; utilities in sibling `.ts` file
4. **i18n** — keys under `<feature>.*` in `src/i18n/en.json` AND `he.json`
   (and all 4 other locales with at least the English value)
5. **Mount** — add to parent component
6. **Tests** — `tests/engine/<feature>.test.ts` (≥ 10 cases, `it.each`)

## Definition of Done

- `npm run quality` → 0 errors, 0 warnings
- `npm test` → all pass (no skips, no only)
- `npm run dead:check` → no orphaned exports
- `ROADMAP.md` sprint row marked ✓ Done
- `CHANGELOG.md` `[Unreleased]` entry added
- Commit only on the issue branch using the repository's Conventional Commit format.
- Open/update a PR that references the issue and records acceptance evidence, checks, and known gaps.
- Never push feature work directly to `main`; do not merge without required checks and review.
- Report the sprint complete only after the PR is merged and its acceptance evidence is recorded.

## Rules

- No `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`
- No `enum` or `namespace` — use `as const` / union types
- Every `t('key')` → entry in both `en.json` AND `he.json` (and all 4 other locales)
- `.tsx` files export only React components; utilities → sibling `.ts`
- Tailwind logical props (`ms-*`, `me-*`, `start-*`, `end-*`) — never `ml-*`/`mr-*`
- ARIA correctness: no `role="list"` on `<ul>`; use `<button>` not `<div onClick>`
- Run `npx prettier --write <files>` before `npm run quality`
- All intermediate/generated files → `$TEMP` (never in workspace root)
