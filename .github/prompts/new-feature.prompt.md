---
mode: agent
description: Add a new feature panel — engine function + React component + i18n keys + store integration + mounting.
---

# New Feature Panel

You are adding a new feature panel to the Cabinet Planner project.

## Task

Implement **${featureName}** — `${description}`.

## Architecture Pattern

Every new feature follows this layered pattern:

1. **Engine** (`src/engine/${feature}.ts`) — Pure TS computation. No React, no DOM, no side effects.
2. **Store** (if needed) — Add state/actions to the appropriate Zustand slice in `src/store/slices/`.
3. **Component** (`src/components/${tab}/${Feature}Panel.tsx`) — React UI. Only component exports.
4. **i18n** — Keys in both `src/i18n/en.json` AND `src/i18n/he.json` (parity required).
5. **Mount** — Import and render in the parent panel (e.g. `ConfiguratorPanel.tsx`, `AssemblyGuide.tsx`).

## Mandatory constraints

- **Zero suppression**: no `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`
- **`erasableSyntaxOnly: true`**: no `enum`, no `namespace` — use `as const` / union types
- **i18n parity**: every `t('key')` → entry in both `en.json` AND `he.json`
- **react-refresh**: `.tsx` files export only React components; utilities → sibling `.ts`
- **Engine purity**: `src/engine/` — no React imports, no DOM, no side effects
- **RTL-safe layout**: use Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`)
- **ARIA correctness**: no `role="list"` on `<ul>`; backdrop = `<button>` not `<div onClick>`
- **`useFocusTrap(ref, active, onEscape?)`**: 3 params for modal focus trapping

## Steps

1. Create the engine file (pure computation, fully typed, exported functions).
2. Add store state/actions if the feature requires persistence.
3. Create the panel component (named export, Tailwind classes, wood-\* tokens).
4. Add i18n keys to both `en.json` and `he.json`.
5. Mount the panel in the appropriate parent component.
6. Run `npm run quality` — zero errors, zero warnings.
7. Run `npx vitest run` — all tests pass.

## Quality gates

- `npm run quality` → 0 errors
- `npx vitest run` → all pass
- i18n coverage: 100% parity
