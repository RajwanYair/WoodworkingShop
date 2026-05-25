---
mode: agent
description: Diagnose and fix all failures reported by the quality gate (typecheck, lint, format, i18n, CSS).
---

# Fix Quality Gate

You are fixing failing quality gate checks in the Cabinet Planner project.

## Task

Run `npm run quality` and fix **every** reported error or warning until the gate passes with 0 issues.

## Quality gate components

| Check         | Command                 | Common failures                              |
| ------------- | ----------------------- | -------------------------------------------- |
| Typecheck     | `npm run typecheck`     | TS2322, TS2339, TS6133 (unused), TS18028     |
| Lint          | `npm run lint`          | ESLint rules, react-refresh, jsx-a11y        |
| CSS Lint      | `npm run lint:css`      | Stylelint, unknown at-rules, property order  |
| Markdown Lint | `npm run lint:md`       | MD010, MD040, MD060 table alignment          |
| Format        | `npm run format:check`  | Prettier diffs — run `npm run format` to fix |
| i18n Coverage | `npm run i18n:coverage` | Missing keys in `he.json` / `en.json`        |

## Steps

1. Run `npm run quality 2>&1` and capture the full output.
2. Group errors by check type.
3. Fix each category in order:

   a. **Format first** — run `npm run format` (auto-fixes Prettier diffs, no code risk)

   b. **i18n** — for each missing key in `he.json`, add the matching `en.json` value verbatim (to be translated later); both files must have identical key sets

   c. **CSS lint** — fix property ordering or unknown rules flagged by Stylelint; never suppress with `/* stylelint-disable */`

   d. **TypeScript** — fix type errors. Never use `as any`, `@ts-ignore`, or `@ts-nocheck`

   e. **ESLint** — fix lint errors. Never use `eslint-disable`. Common patterns:
   - `react-refresh/only-export-components` → extract utilities to sibling `.ts`
   - `jsx-a11y/*` → use semantic HTML, not ARIA overrides
   - `no-unused-vars` / `TS6133` → remove dead imports

   f. **Markdown** — run `npx markdownlint-cli2 --fix "**/*.md"` then fix remaining manually

4. After each category, re-run the specific check to confirm it passes.
5. Run `npm run quality` to confirm **all** checks pass simultaneously.
6. Run `npm test` to confirm no regressions.

## Constraints

- **Zero suppression rule**: no `eslint-disable`, no `@ts-ignore`, no `as any` — fix the root cause
- **erasableSyntaxOnly**: no `enum` or `namespace` — use `as const` / union types
- **i18n parity**: if you add a `t('key')` call, add the key to BOTH `en.json` AND `he.json`
- **Do not move config files** to subdirs (they must stay at workspace root)
