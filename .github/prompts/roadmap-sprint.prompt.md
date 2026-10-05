---
mode: agent
description: Execute a roadmap sprint item through a tracked issue and reviewed pull request.
---

# Roadmap Sprint

You are executing the current roadmap sprint item in the Cabinet Planner project. Read the active roadmap and issue status; do not rely on a hardcoded phase or sprint table in this prompt.

## GitHub Workflow (required before editing)

1. Read `.github/DEVELOPMENT-WORKFLOW.md`.
2. Find or create the sprint's GitHub issue with scope, dependencies, acceptance criteria, and ROADMAP sprint/phase reference.
3. Fetch and inspect the latest base; preserve local edits and create `issue-<number>-<short-slug>` from `origin/main`.
4. Do not implement on shared `main` or push feature work to it. Submit an issue-linked PR with verification and known gaps; completion requires merge and acceptance evidence.
5. Stop before editing if the issue cannot be registered or the working branch cannot be isolated.

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
