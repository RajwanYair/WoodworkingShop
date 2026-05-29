# Cabinet Planner — GitHub Copilot Instructions

> These instructions give Copilot context about this project's architecture,
> conventions, and constraints so suggestions stay consistent with the codebase.
> **Current release: v5.24.0** · **Next target: v5.25.0** (Phase 49)

## Active Sprint — Phase 49 (Sprints 230–234)

> **Status**: PLANNING · **Goal**: TBD

| Sprint | Feature         | Status |
| ------ | --------------- | ------ |
| 230    | TBD             | TODO   |
| 231    | TBD             | TODO   |
| 232    | TBD             | TODO   |
| 233    | TBD             | TODO   |
| 234    | Release v5.25.0 | TODO   |

## Completed — Phase 48 (Sprints 225–229)

| Sprint | Feature                                                   | Status |
| ------ | --------------------------------------------------------- | ------ |
| 225    | Kerf bending calculator — engine + UI panel + tests       | DONE   |
| 226    | Dado/rabbet joint calculator — engine + UI panel + tests  | DONE   |
| 227    | Finishing coat calculator — engine + UI panel + tests     | DONE   |
| 228    | Wood turning speed calculator — engine + UI panel + tests | DONE   |
| 229    | Frame and panel calculator — engine + UI panel + tests    | DONE   |

## Completed — Phase 47 (Sprints 220–224)

| Sprint | Feature                                                  | Status |
| ------ | -------------------------------------------------------- | ------ |
| 220    | Cabinet door sizing calculator — engine                  | DONE   |
| 221    | Face frame calculator — engine + UI panel + tests        | DONE   |
| 222    | Cabinet door sizing calculator — UI panel                | DONE   |
| 223    | Drawer box sizing calculator — engine + UI panel + tests | DONE   |
| 224    | Screw pull-out strength estimator — engine + UI + tests  | DONE   |

## Completed — Phase 46 (Sprints 215–219)

| Sprint | Feature                                                  | Status |
| ------ | -------------------------------------------------------- | ------ |
| 215    | SVG quality improvements + VS Code / Copilot integration | DONE   |
| 216    | TBD                                                      | DONE   |
| 217    | TBD                                                      | DONE   |
| 218    | TBD                                                      | DONE   |
| 219    | Release v5.22.0                                          | DONE   |

## Completed — Phase 45 (Sprints 210–214)

- Sprint 210: Finger joint calculator — DONE
- Sprint 211: Wood screw pilot hole calculator — DONE
- Sprint 212: Glue-up time calculator — DONE
- Sprint 213: Bandsaw blade speed calculator — DONE
- Sprint 214: Tablesaw blade height calculator — DONE

## Completed — Phase 44 (Sprints 205–209)

| Sprint | Feature                            | Status |
| ------ | ---------------------------------- | ------ |
| 205    | Mortise & tenon calculator         | DONE   |
| 206    | Shelf deflection calculator        | DONE   |
| 207    | Router bit depth-of-cut calculator | DONE   |
| 208    | Biscuit joinery calculator         | DONE   |
| 209    | Sanding progression planner        | DONE   |

## Completed — Phase 43 (Sprints 200–204)

| Sprint | Feature                           | Status |
| ------ | --------------------------------- | ------ |
| 200    | Miter & compound angle calculator | DONE   |
| 201    | Shelf pin spacing calculator      | DONE   |
| 202    | Drawer slide calculator           | DONE   |
| 203    | Wood drying time estimator        | DONE   |
| 204    | Dovetail layout calculator        | DONE   |

## Completed — Phase 42 (Sprints 195–199)

| Sprint | Feature                        | Status |
| ------ | ------------------------------ | ------ |
| 195    | Pocket hole joinery calculator | DONE   |
| 196    | Veneer calculator              | DONE   |
| 197    | Clamp pressure calculator      | DONE   |
| 198    | Drill press speed calculator   | DONE   |
| 199    | Board-feet calculator          | DONE   |

## Completed — Phase 41 (Sprints 190–194)

| Sprint | Feature                       | Status |
| ------ | ----------------------------- | ------ |
| 190    | Wood movement calculator      | DONE   |
| 191    | Toolpath feed rate calculator | DONE   |
| 192    | Cabinet weight estimator      | DONE   |
| 193    | Dowel joint calculator        | DONE   |
| 194    | Panel layout label generator  | DONE   |

## Completed — Phase 40 (Sprints 182–186)

| Sprint | Feature                  | Status |
| ------ | ------------------------ | ------ |
| 182    | Material cost tracker    | DONE   |
| 183    | Shop inventory manager   | DONE   |
| 184    | Cabinet template library | DONE   |
| 185    | Edge banding calculator  | DONE   |
| 186    | Release v5.16.0          | DONE   |

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
  instructions/ scoped Copilot instruction files (engine, components, store, tests, i18n)
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
- `iteachobj` — `it.each` with object table rows
- `deach` — `describe.each` parametrised suite
- `zsel` — Zustand store selector
- `zmsel` — Zustand multi-field shallow selector
- `t18` — i18n `t()` call with parity reminder
- `t18ns` — i18n namespaced translation hook
- `jsdoc` — JSDoc block skeleton
- `rfc` — React functional component with TypeScript props
- `hook` — custom React hook template
- `eng` — pure engine function template (no React, no DOM)
- `engguard` — engine boundary guard with RangeError
- `slice` — Zustand store slice with getter/setter
- `storetest` — Zustand store action test
- `wrkr` — Comlink Web Worker expose pattern
- `vmock` — Vitest module mock
- `vspy` — Vitest spy with auto-restore
- `uefx` — useEffect with cleanup
- `umemo` — useMemo memoised value
- `ucb` — useCallback stable ref
- `arlive` — ARIA live region
- `tw-rtl` — Tailwind logical property class pair
- `result` — discriminated union Result type

## Copilot Instructions (scoped)

`.github/instructions/` contains `applyTo`-scoped instruction files auto-injected by Copilot:

- `engine.instructions.md` — applied to `src/engine/**` (pure TS rules, coordinate system)
- `components.instructions.md` — applied to `src/components/**/*.tsx` (RTL, ARIA, i18n, size)
- `store.instructions.md` — applied to `src/store/**` (slice pattern, selectors, no side effects)
- `tests.instructions.md` — applied to `tests/**` (it.each, helpers, coverage targets)
- `i18n.instructions.md` — applied to `src/i18n/**` and all source files (parity, key naming)
- `workers.instructions.md` — applied to `src/workers/**` (Comlink, no DOM, no React, no eval)
- `utils.instructions.md` — applied to `src/utils/**` (pure functions, input validation, testing)
- `security.instructions.md` — applied to `src/**` and `public/**` (OWASP A01–A10 rules)
- `svg.instructions.md` — applied to `src/components/**/*.tsx` and `docs/*.svg` (visual quality, filter IDs, hardware colors)

## Copilot Prompts

`.github/prompts/` contains reusable agent prompts:

- `new-feature.prompt.md` — add a full feature panel (engine → store → UI → i18n → mount)
- `split-component.prompt.md` — split large React component files into sub-components (≤ 600 L each)
- `test-factory.prompt.md` — convert repetitive `it` blocks to `it.each` tables (≤ 400 L per file)
- `roadmap-sprint.prompt.md` — execute a sprint item end-to-end
- `roadmap-tracking.prompt.md` — sync ROADMAP.md and copilot-instructions.md sprint statuses
- `release.prompt.md` — full release workflow: version bump → CHANGELOG → tag → GitHub Release
- `fix-quality.prompt.md` — diagnose and fix every quality gate failure (typecheck, lint, i18n, format)
- `fix-tests.prompt.md` — diagnose and fix all failing unit tests
- `i18n-add-keys.prompt.md` — add i18n keys with en/he parity validation
- `bundle-optimize.prompt.md` — bundle size analysis and chunk optimization
- `a11y-audit.prompt.md` — WCAG 2.2 AA accessibility audit and remediation
- `perf-debug.prompt.md` — Lighthouse / runtime performance diagnosis
- `security-audit.prompt.md` — OWASP Top 10 security audit for client-side SPA
- `dependency-update.prompt.md` — review and apply Dependabot dependency updates
- `code-review.prompt.md` — structured code review against all project conventions
- `lighthouse-ci.prompt.md` — set up Lighthouse CI GitHub Actions gates
- `csp-hardening.prompt.md` — Content Security Policy header hardening
- `pwa-audit.prompt.md` — PWA manifest, service worker, and install-prompt audit
- `workspace-maintenance.prompt.md` — comprehensive workspace health check (clean, lint, test, bundle, deps)

## Copilot Agents

`.github/agents/` contains pre-configured agent mode definitions:

- `sprint.agent.md` — execute the current WIP sprint item end-to-end
- `release.agent.md` — full automated release workflow
- `feature.agent.md` — scaffold a complete new feature (engine + store + UI + i18n)
- `debug.agent.md` — diagnose and fix test/build/type failures without suppression
- `a11y.agent.md` — WCAG 2.2 AA accessibility audit and remediation
- `i18n.agent.md` — i18n key management with full 6-locale parity
- `cleanup.agent.md` — dead code removal, lint fixes, $TEMP enforcement, production readiness
- `security.agent.md` — OWASP Top 10 security audit and CSP hardening
- `perf.agent.md` — Lighthouse CI setup, Core Web Vitals diagnosis and tuning
- `security.agent.md` — OWASP Top 10 security audit and CSP hardening
- `perf.agent.md` — Lighthouse CI setup, Core Web Vitals diagnosis and tuning

## Workflows

- **`npm run quality`** — typecheck + lint + lint:css + lint:md + format:check + i18n:coverage (sequential; good for debugging)
- **`npm run quality:fast`** — same checks run in parallel via `scripts/parallel-quality.js` (mirrors CI; use for release gate)
- **`npm run check`** — `quality:fast` + `npm test` (full pre-commit gate — runs quality in parallel)
- **`npm run ci`** — `check` + build + bundle:check + bench:check (full CI gate)
- **`npm run release:build`** — build + bundle:check + sbom (no tests; run after `npm run check`)

## Intermediate Files & Caching

- All intermediate build files, ESLint caches (`.eslintcache`), Vite caches (`.vite_cache`), Playwright test results, and test reports **MUST** be written to paths inside the OS `$TEMP` or `tempfile.gettempdir()` directory. We never pollute the root workspace or `node_modules/.cache` with intermediate build telemetry.
- Coverage output goes to `/tmp/WoodworkingShop/coverage/` (Linux/CI) or `%TEMP%\WoodworkingShop\coverage\` (Windows dev).
- `skipLibCheck: true` is set in all tsconfigs due to `@react-pdf/types` shipping `const enum` in `.d.ts` files (TS18055 under `verbatimModuleSyntax`). Remove once upstream fixes `primitive.d.ts`.
