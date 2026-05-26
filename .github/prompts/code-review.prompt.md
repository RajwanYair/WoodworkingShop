---
mode: agent
description: Code review — check a PR or changed files against all project conventions and quality rules.
---

# Code Review

You are reviewing code changes in the Cabinet Planner project.

## Input

Review **`${target}`** (PR number, branch name, or file path).

## Review checklist

### Zero-suppression rule

- [ ] No `eslint-disable` or `eslint-disable-next-line` comments
- [ ] No `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` without a JSDoc justification comment
- [ ] No `as any` or `as unknown as T` without a type guard

### TypeScript

- [ ] No `enum` or `namespace` — use `as const` or union types
- [ ] All functions have explicit return types
- [ ] No `allowUnreachableCode` violations (dead branches)
- [ ] No unused imports (`TS6133`)

### React & Components

- [ ] `.tsx` files export only React components (no utility functions mixed in)
- [ ] No `ml-*`, `mr-*`, `pl-*`, `pr-*` Tailwind classes — use logical properties
- [ ] No hardcoded hex/rgb colours — use `wood-*` design tokens
- [ ] No `role="list"` on `<ul>` or `role="listitem"` on `<li>`
- [ ] No `onClick` on `<div>` — use `<button>`
- [ ] All `<input>` / `<select>` have `<label>` or `aria-label`

### i18n

- [ ] Every `t('key')` exists in both `en.json` AND `he.json`
- [ ] No hardcoded user-visible strings (must use `t()`)

### Engine purity

- [ ] `src/engine/` files have no React imports, no DOM APIs
- [ ] Pure functions — same input always produces same output

### Tests

- [ ] New engine functions have corresponding tests in `tests/engine/`
- [ ] Tests use `it.each` for parametrised cases
- [ ] No `.only` in tests

### Build

- [ ] No new prod dependencies without removing one or proven > 50 KB savings
- [ ] Bundle budget not exceeded (`npm run bundle:check`)

## How to report

For each issue found:

```text
FILE: src/components/foo/Bar.tsx
LINE: 42
RULE: react-refresh/only-export-components
ISSUE: Utility function `computeBar` exported from a component file
FIX: Extract `computeBar` to `src/components/foo/compute-bar.ts`
```

Rate severity: **Blocker** (must fix before merge) | **Warning** (should fix) | **Suggestion** (optional improvement)
