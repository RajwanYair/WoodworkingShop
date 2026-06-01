---
mode: agent
description: Split a large React component file into focused sub-components following project conventions.
---

# Split Component

You are refactoring a large React component in the WoodworkingShop Cabinet Planner project.

## Task

Split the component at `${file}` (currently ${lineCount} lines) into focused sub-components.

## Mandatory constraints

- **`react-refresh/only-export-components`**: Each `.tsx` file must export **only** React components. Extract any utility functions, constants, or types to sibling `.ts` files.
- **No `as any`**, no `eslint-disable`, no `@ts-ignore`.
- **`erasableSyntaxOnly: true`**: Use `as const` objects and union types — never `enum` or `namespace`.
- **RTL-safe layout**: Use Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) — never `ml-*`/`mr-*`.
- **ARIA**: Do not add redundant `role="list"` on `<ul>` or attach `onKeyDown` to non-interactive `<div>`.
- **i18n parity**: Any new `t('key')` call must have matching entries in both `en.json` **and** `he.json`.
- Keep each new file ≤ 600 lines.

## Steps

1. Read the full source file with `read_file`.
2. Identify logical sections (e.g. header, body rows, footer, sidebar, control panel).
3. For each section create a new `.tsx` file in a `<FeatureName>/` sub-directory alongside the original.
4. Extract non-component helpers to matching `.ts` sibling files.
5. Update the original file to import and compose the new sub-components.
6. Run `npm run quality` — fix any lint or type errors before finishing.
7. Run `npm test` — confirm no regressions.

## Target directory layout (example — adapt to the actual component)

```text
src/components/<feature>/
  index.tsx           ← thin orchestrator (≤ 80 lines)
  <Feature>Header.tsx
  <Feature>Body.tsx
  <Feature>Footer.tsx
  <feature>-utils.ts  ← non-component helpers extracted here
```

Do not create files for sections that are fewer than 30 lines — keep those inline.

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.
