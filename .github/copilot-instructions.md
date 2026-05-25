# Cabinet Planner — GitHub Copilot Instructions

> These instructions give Copilot context about this project's architecture,
> conventions, and constraints so suggestions stay consistent with the codebase.
> **Current release: v3.72.0** · **Next target: v3.73.0** (Phase 17.3 — test efficiency & DX elevation)

## Tech Stack

| Layer        | Technology                                                                    |
| ------------ | ----------------------------------------------------------------------------- |
| UI framework | React 19 + TypeScript 6 (strict)                                              |
| Build tool   | Vite 8 (Rolldown bundler)                                                     |
| CSS          | Tailwind CSS v4 (`@import "tailwindcss"` syntax — no `@tailwind` directives)  |
| State        | Zustand 5 — single store at `src/store/cabinet-store.ts` with undo/redo       |
| i18n         | i18next 26 + react-i18next — EN, HE (RTL), AR (RTL), DE, ES, FR               |
| Tests        | Vitest 4 (unit + bench) + Playwright 1.60 (E2E) + axe-core (a11y)             |
| PDF          | `@react-pdf/renderer` — PDFs rendered off the main thread                     |
| Node         | ≥ 22; packages hoisted to parent `MyScripts/node_modules/` via npm workspaces |

## Project Structure

```text
src/
  engine/       Pure TypeScript (no React): dimensions → parts → cut-optimizer → assembly
  store/        Zustand store — cabinet-store.ts, custom-materials-store.ts, room-store.ts, toast-store.ts
  components/   React components grouped by feature: configurator/ preview/ optimizer/ assembly/ pdf/ layout/
  utils/        Export helpers: bom-export, dxf-export, gcode-export, url-state, project-storage
  i18n/         en.json + he.json + ar.json + de.json + es.json + fr.json
                MUST update en.json AND he.json for every new key; other languages copy the en value at minimum
  workers/      Web Workers (?worker import suffix); bom-export.worker.ts, cut-optimizer.worker.ts
.github/
  actions/
    setup-node/ composite action — checkout + setup-node + npm ci (used by ci.yml to avoid repetition)
tests/
  engine/       Unit tests for pure engine functions (80% coverage required)
  store/        Zustand store action tests
  utils/        Utility function tests
  e2e/          Playwright smoke + accessibility tests
  bench/        Vitest benchmark tests (results gated by config/bench-budget.json)
```

## Coding Conventions

- **Zero suppression rule**: no `eslint-disable`, no `@ts-ignore`, no `@ts-nocheck`, no `as any`
- **TypeScript strictness**: `noImplicitOverride`, `allowUnreachableCode: false`, `allowUnusedLabels: false` are enforced — do not add unreachable branches or unused labels
- **`erasableSyntaxOnly: true`**: no `enum`, no `namespace`, no `const enum` — use `as const` objects or union types instead
- **i18n parity**: every new `t('key')` call must have matching entries in both `en.json` and `he.json`
- **Engine functions are pure**: `src/engine/` has no side effects, no React imports, fully tested
- **react-refresh rule**: component files (`src/components/**/*.tsx`) must export **only** React components. Extract non-component exports (utilities, constants) to separate `.ts` files. Example: `compute-offcuts.ts` alongside `SheetCard.tsx`.
- **ARIA via jsx-a11y**: `eslint-plugin-jsx-a11y` enforces correctness at lint time —
  do NOT add redundant `role="list"` / `role="listitem"` on semantic `<ul>` / `<li>`;
  do NOT attach `onKeyDown` to non-interactive `<div>` (use `useFocusTrap` or document-level listener)
- **ESLint plugins (7 total)**: jsx-a11y, react-hooks, react-refresh, react, regexp, no-only-tests, testing-library.
  No sonarjs, no promise plugin. `--max-warnings 0` is enforced in CI.
- **RTL-safe layout**: use Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) not `ml-*`/`mr-*`
- **No hardcoded colours**: use `wood-*` design tokens or Tailwind semantic classes
- **CSS via Stylelint**: `stylelint.config.js` + `package.json#browserslist` (canonical — read by both Stylelint and VS Code language services) drives compatibility.
  Run `npm run lint:css` before commit; auto-fix with `npx stylelint --fix "src/**/*.css"`
- **Tool configs stay at root**: do NOT move `vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `eslint.config.js`, `stylelint.config.js`, `typedoc.json`,
  or `tsconfig.*.json` into subdirs. These match Vite/React/ESLint defaults and moving
  them creates churn without benefit. Only docs and non-tool assets go in `docs/`
- **Test style**: use `it.each` for parametrised negative/positive test pairs; group related assertions in one `it` rather than one `expect` per `it`

## Key Patterns

### Store (Zustand)

```ts
// Read state
const { config, cabinets } = useCabinetStore();
// Update state (always return full slice)
set((state) => ({ ...state, config: { ...state.config, width } }));
// Mutate from outside React
useCabinetStore.getState().setConfig({ width: 800 });
```

### Translation

```tsx
const { t } = useTranslation();
// Always use dot-namespaced keys matching en.json / he.json structure
<label>{t('config.width')}</label>;
```

### Testing engine functions

```ts
// Import directly — no store or React needed
import { generateParts } from '../../src/engine/parts';
import { cfg } from '../helpers'; // test factory — builds CabinetConfig from DEFAULT_CONFIG + overrides
```

### Worker imports (Vite)

```ts
// src/workers/cut-optimizer.worker.ts
import CutOptimizerWorker from './workers/cut-optimizer.worker?worker';
// Never import workers directly in unit tests — use sync fallback
```

### Non-component exports from component directories

When a component file needs a utility function that would violate `react-refresh/only-export-components`:

```ts
// ❌ Wrong — mixing component and non-component exports in the same file
export function computeOffcuts(sheet: CutSheet) { ... }
export function SheetCard(...) { ... }

// ✅ Correct — extract to a sibling .ts file
// src/components/optimizer/compute-offcuts.ts
export function computeOffcuts(sheet: CutSheet) { ... }
// src/components/optimizer/SheetCard.tsx
import { computeOffcuts } from './compute-offcuts';
export function SheetCard(...) { ... }
```

## Cut Optimizer Coordinate System

The MaxRects BSSF cut-optimizer uses:

- `x` → across the sheet width (`sheetWidth`)
- `y` → along the sheet length / grain direction (`sheetLength`)
- `p.x + p.width ≤ sheetWidth` and `p.y + p.length ≤ sheetLength`

## What Copilot Should Never Do

- Add `// eslint-disable-*` comments
- Use `as any` or `as unknown as T` without a type guard
- Import `@supabase/supabase-js`, `valibot`, `zod` — these are not WoodworkingShop dependencies
- Add features not requested (no unsolicited refactors, no extra docstrings)
- Hardcode pixel values — use Tailwind utility classes
- Skip the `he.json` update when adding i18n keys
- Use IE-only or deprecated browser APIs — the project targets modern evergreen browsers only (`not ie 11` in `package.json#browserslist`)
- Add `enum` or `namespace` — use `as const` objects or union types (TypeScript 6 `erasableSyntaxOnly`)
- Add `sonarjs` or `promise` ESLint plugins — not in this project's config
- Add JS-style `//` comments inside `.json` files — use `.jsonc` extension for comment-annotated JSON
- Leave disabled/suppressed config options without a JSDoc-style justification comment
- Introduce dead code, dead imports, or dead config entries (run `npm run dead:check` to verify)

## VS Code Snippets

`.vscode/snippets.code-snippets` provides:

- `iteach` — `it.each` parametrised test
- `deach` — `describe.each` parametrised suite
- `zsel` — Zustand store selector
- `t18` — i18n `t()` call with parity reminder
- `jsdoc` — JSDoc block skeleton
- `rfc` — React functional component with TypeScript props

## Copilot Prompts

`.github/prompts/` contains reusable agent prompts:

- `split-component.prompt.md` — agent workflow for splitting large React component files into focused sub-components (≤ 600 L each)
- `test-factory.prompt.md` — agent workflow for converting repetitive `it` blocks to `it.each` tables (target ≤ 400 L per file)

## Workflows

- **`npm run quality`** — typecheck + lint + lint:css + lint:md + format:check + i18n:coverage (no test)
- **`npm run check`** — `quality` + `npm test` (full pre-commit gate)
- **`npm run ci`** — `check` + build + bundle:check + bench:check (full CI gate)

## Intermediate Files & Caching

- All intermediate build files, ESLint caches (`.eslintcache`), Vite caches (`.vite_cache`), Playwright test results, and test reports **MUST** be written to paths inside the OS `$TEMP` or `tempfile.gettempdir()` directory. We never pollute the root workspace or `node_modules/.cache` with intermediate build telemetry.
- `skipLibCheck: true` is set in all tsconfigs due to `@react-pdf/types` shipping `const enum` in `.d.ts` files (TS18055 under `verbatimModuleSyntax`). Remove once upstream fixes `primitive.d.ts`.
