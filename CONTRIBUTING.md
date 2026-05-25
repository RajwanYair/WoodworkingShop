# Contributing to Cabinet Planner

Thank you for your interest in contributing! This document covers the
conventions you need to follow so your PR passes CI on the first try.

## Quick Start

```bash
# Node ≥ 22 required. Packages are hoisted to the parent workspaces root.
npm install           # from the WoodworkingShop directory
npm run quality       # typecheck + lint + css + md + format:check + i18n:coverage
npm run check         # quality + unit tests  (pre-commit gate)
npx vitest run        # run unit tests directly
```

## Non-Negotiable Rules

| Rule                    | Detail                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Zero suppression**    | No `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`                                        |
| **No enum / namespace** | Use `as const` objects or union types (`erasableSyntaxOnly`)                                      |
| **i18n parity**         | Every `t('key')` must have a matching entry in **both** `src/i18n/en.json` and `src/i18n/he.json` |
| **Engine purity**       | `src/engine/` must have no React imports, no DOM calls, no side effects                           |
| **react-refresh**       | `.tsx` files export React components only; utilities go in sibling `.ts` files                    |
| **RTL layout**          | Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) — never `ml-*` / `mr-*`          |

## Code Style

- **TypeScript strict** — `noImplicitOverride`, `allowUnreachableCode: false`, `erasableSyntaxOnly: true`
- **Tailwind CSS v4** — use `@import "tailwindcss"` syntax; no `@tailwind` directives
- **No hardcoded colours** — use `wood-*` design tokens or Tailwind semantic classes
- **No hardcoded pixel values** — use Tailwind utility classes

Run Prettier before committing:

```bash
npx prettier --write "src/**/*.{ts,tsx,css}" "tests/**/*.ts"
```

## Testing

- Tests live in `tests/` mirroring the `src/` structure.
- Use `it.each` for parametrised test pairs rather than duplicated `it` blocks.
- Group related assertions in one `it` instead of one `expect` per `it`.
- Engine tests import pure functions directly — no store, no React.
- Use the `cfg()` helper from `tests/helpers.ts` to build `CabinetConfig` fixtures.
- 80 % coverage on `src/engine/` is required; CI enforces this.

## i18n

Every new user-visible string needs a translation key:

```tsx
// ❌ Wrong
<button>Export</button>

// ✅ Correct
<button>{t('actions.export')}</button>
```

The key must exist in **both** `src/i18n/en.json` and `src/i18n/he.json`.
Other locales (AR, DE, ES, FR) should receive at minimum the English value.

Verify parity locally:

```bash
npm run i18n:coverage
```

## Adding a Production Dependency

The project enforces a hard limit of **7 production dependencies**.
Before adding one you must either remove an existing dep or prove it saves

> 50 KB of bundle size. See the Dependency Budget in `ROADMAP.md`.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(engine): add shelf-spacing auto-calculation
fix(pdf): landscape orientation for cut diagrams
test(validation): parameterise DOOR_TOO_SHORT cases with it.each
chore(deps): bump vite to 8.x
```

## Pull Request Checklist

Before opening a PR, verify that all of the following pass locally:

- [ ] `npm run quality` exits 0 (typecheck + lint + css + md + format + i18n)
- [ ] `npx vitest run` exits 0 (all unit tests pass)
- [ ] New `t('key')` calls have entries in both `en.json` and `he.json`
- [ ] No new `eslint-disable`, `@ts-ignore`, or `as any` added
- [ ] No hardcoded colours or pixel values
- [ ] Component `.tsx` files export only React components (utilities in sibling `.ts`)

## File Size Limits

Keep files below these thresholds to maintain navigability:

| Category                                 | Limit   |
| ---------------------------------------- | ------- |
| Test files (`tests/**/*.test.ts`)        | ≤ 400 L |
| Source files (`src/**/*.{ts,tsx}`)       | ≤ 600 L |
| CI workflows (`.github/workflows/*.yml`) | ≤ 80 L  |

If a file exceeds its limit, split it — see `.github/prompts/split-component.prompt.md`
and `.github/prompts/test-factory.prompt.md` for agent-guided workflows.

## Security

Please report security vulnerabilities privately via the process described in
[SECURITY.md](.github/SECURITY.md) rather than opening a public issue.
