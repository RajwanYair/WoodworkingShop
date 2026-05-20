# Cabinet Planner — GitHub Copilot Instructions

> These instructions give Copilot context about this project's architecture,
> conventions, and constraints so suggestions stay consistent with the codebase.

## Tech Stack

| Layer        | Technology                                                                    |
| ------------ | ----------------------------------------------------------------------------- |
| UI framework | React 19 + TypeScript 6 (strict)                                              |
| Build tool   | Vite 8 (Rolldown bundler)                                                     |
| CSS          | Tailwind CSS v4 (`@import "tailwindcss"` syntax — no `@tailwind` directives)  |
| State        | Zustand 5 — single store at `src/store/cabinet-store.ts` with undo/redo       |
| i18n         | i18next 26 + react-i18next — bilingual EN + HE (RTL)                          |
| Tests        | Vitest 4 (unit) + Playwright 1.60 (E2E) + axe-core (a11y)                     |
| PDF          | `@react-pdf/renderer` — PDFs rendered off the main thread                     |
| Node         | ≥ 22; packages hoisted to parent `MyScripts/node_modules/` via npm workspaces |

## Project Structure

```text
src/
  engine/       Pure TypeScript (no React): dimensions → parts → cut-optimizer → assembly
  store/        Zustand store — cabinet-store.ts, custom-materials-store.ts, toast-store.ts
  components/   React components grouped by feature: configurator/ preview/ optimizer/ assembly/ pdf/ layout/
  utils/        Export helpers: bom-export, dxf-export, gcode-export, url-state, project-storage
  i18n/         en.json + he.json — MUST update both for every new key
  workers/      Web Workers (?worker import suffix); bom-export.worker.ts, cut-optimizer.worker.ts
tests/
  engine/       Unit tests for pure engine functions (80% coverage required)
  store/        Zustand store action tests
  utils/        Utility function tests
  e2e/          Playwright smoke + accessibility tests
```

## Coding Conventions

- **Zero suppression rule**: no `eslint-disable`, no `@ts-ignore`, no `@ts-nocheck`, no `as any`
- **i18n parity**: every new `t('key')` call must have matching entries in both `en.json` and `he.json`
- **Engine functions are pure**: `src/engine/` has no side effects, no React imports, fully tested
- **ARIA via jsx-a11y**: `eslint-plugin-jsx-a11y` enforces correctness at lint time —
  do NOT add redundant `role="list"` / `role="listitem"` on semantic `<ul>` / `<li>`;
  do NOT attach `onKeyDown` to non-interactive `<div>` (use `useFocusTrap` or document-level listener)
- **RTL-safe layout**: use Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) not `ml-*`/`mr-*`
- **No hardcoded colours**: use `wood-*` design tokens or Tailwind semantic classes
- **CSS via Stylelint**: `stylelint.config.js` + `browserslist` field drives compatibility.
  Run `npm run lint:css` before commit; auto-fix with `npx stylelint --fix "src/**/*.css"`
- **Tool configs stay at root**: do NOT move `vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `eslint.config.js`, `stylelint.config.js`, `typedoc.json`,
  or `tsconfig.*.json` into subdirs. These match Vite/React/ESLint defaults and moving
  them creates churn without benefit. Only docs and non-tool assets go in `docs/`

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

## Intermediate Files & Caching

- All intermediate build files, ESLint caches (`.eslintcache`), Vite caches (`.vite_cache`), Playwright test results, and test reports **MUST** be written to paths inside the OS `$TEMP` or `tempfile.gettempdir()` directory. We never pollute the root workspace or `node_modules/.cache` with intermediate build telemetry.
