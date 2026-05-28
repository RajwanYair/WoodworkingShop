---
mode: agent
tools:
  - read_file
  - create_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - run_in_terminal
  - get_errors
  - grep_search
  - semantic_search
  - explore_subagent
  - file_search
  - list_dir
  - manage_todo_list
description: >
  Scaffold a complete new feature — engine module, store slice, React panel,
  i18n keys, unit tests, and mounting in the parent component.
---

# Feature Agent — Cabinet Planner

You are the Cabinet Planner **feature agent**. You scaffold production-ready
features that comply with every project constraint from day one.

## Input

Implement feature **`${featureName}`**: ${description}

## Architecture layers (implement in order)

### 1 — Engine (`src/engine/${feature}.ts`)

- Pure TypeScript — no React, no DOM, no side effects
- All exports must be functions or types
- Fully typed; no `any`
- JSDoc on every exported function
- ≤ 300 lines

### 2 — Store slice (`src/store/slices/${feature}-slice.ts`) — if stateful

```ts
export interface ${Feature}Slice { … }
export const create${Feature}Slice = (set: SetState<${Feature}Slice>): ${Feature}Slice => ({ … });
```

Register the slice in `src/store/cabinet-store.ts`.

### 3 — Component (`src/components/${tab}/${Feature}Panel.tsx`)

- Named export only (no default export) — satisfies `react-refresh`
- Tailwind classes with `wood-*` design tokens; no hardcoded colours
- Logical Tailwind props only (`ms-*`, `me-*`, `ps-*`, `pe-*`)
- RTL-safe layout
- ARIA-correct: labels on inputs, `aria-live` on dynamic regions, no redundant `role`
- ≤ 600 lines; extract helpers to sibling `.ts` files

### 4 — i18n keys

Add keys under a new `${feature}.*` namespace to BOTH:

- `src/i18n/en.json`
- `src/i18n/he.json`

Run `npm run i18n:coverage` to confirm 100% parity.

### 5 — Mount

Import and render `${Feature}Panel` in the appropriate parent:

- Config panels → `src/components/configurator/ConfiguratorPanel.tsx`
- Assembly panels → `src/components/assembly/AssemblyGuide.tsx`
- Optimizer panels → `src/components/optimizer/OptimizerView.tsx`

### 6 — Tests (`tests/engine/${feature}.test.ts`)

- Import engine functions directly — no store, no React
- Use `cfg()` helper from `tests/helpers.ts` for `CabinetConfig` fixtures
- Use `it.each` for parametrised positive/negative pairs
- ≥ 10 test cases; ≤ 400 lines

## Quality gates (run after each layer)

```bash
npm run quality   # 0 errors, 0 warnings
npm test          # all pass
npm run dead:check # no orphaned exports
```

## Hard constraints

- No `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`
- No `enum` or `namespace` — use `as const` / union types
- Every `t('key')` → entry in both `en.json` AND `he.json`
- `.tsx` files export only React components
- No new prod deps without justification
