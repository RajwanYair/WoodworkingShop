# WoodworkingShop — GitHub Copilot Instructions

> **Current release: v5.35.0**; next: v5.36.0 (Phase 81). Active sprint/status: [AGENTS.md](../AGENTS.md); archived work: [docs/SPRINT-HISTORY.md](../docs/SPRINT-HISTORY.md). Until the owning Phase 81-85 sprint runs, keep the layout below; do not create `src/app/`, `src/features/`, `src/ui/` or `src/platform/` early.

## Stack

React 19, TypeScript 6 (strict), Vite 8/Rolldown, Tailwind CSS v4 (`@import "tailwindcss"`), Zustand 5, i18next 26, Vitest 4, Playwright 1.61, axe-core, `@react-pdf/renderer`, Node >= 22. Six locales: EN, HE, AR, DE, ES, FR. Run `npm ci` at the repository root; dependencies install into the repository-local `node_modules/` from `package-lock.json`.

## Architecture

- `src/engine/`: pure TypeScript; no React or side effects. Engine tests use shared factories, never the store or React.
- `src/store/`: Zustand store slices; use `getState().action()` outside React.
- `src/components/`: feature-grouped React UI. Each `.tsx` exports React components only; move helpers/constants to sibling `.ts` files.
- `src/utils/`, `src/workers/`, `src/i18n/`: exports/storage, `?worker` imports, and six locale JSON files. Unit tests use synchronous worker fallbacks.
- `tests/`: engine, store, utils, component, E2E and benchmark suites. Engine coverage is gated at 80%.
- `.github/instructions/` contains path-scoped rules; follow the rules matching files you change.

## Rules

- No `eslint-disable`, `@ts-ignore`, `@ts-nocheck` or `as any`. Keep strict TypeScript checks; `erasableSyntaxOnly` forbids `enum` and `namespace` (use `as const` or unions).
- Every translation key must exist in all locales; update EN and HE, and use the EN value as the minimum for AR/DE/ES/FR.
- Component files export components only. Do not add redundant list roles to `<ul>/<li>` or `onKeyDown` to non-interactive `<div>`; use `useFocusTrap` or a document listener.
- Use Tailwind logical properties (`ms-*`, `me-*`, `start-*`, `end-*`), not `ml-*`/`mr-*`; use `wood-*` tokens or semantic colors, not hardcoded colors.
- Stylelint compatibility comes from `package.json#browserslist` and `stylelint.config.js`; run `npm run lint:css` for CSS changes.
- Keep Vite, Vitest, Playwright, ESLint, Stylelint, TypeDoc and TypeScript configs at the repo root. Put docs and non-tool assets in `docs/`.
- Use `it.each` for parameterized cases and group related assertions. ESLint runs with zero warnings; do not add dependencies, plugins, deprecated APIs or unrequested features. Target `package.json#browserslist`.
- JSON does not support comments; use JSONC where needed. Justify disabled options and run `npm run dead:check` when changing exports/dependencies.

## Optimizer Coordinates

MaxRects BSSF: `x` is across `sheetWidth`; `y` follows sheet length/grain. Each part must satisfy `p.x + p.width <= sheetWidth` and `p.y + p.length <= sheetLength`.

## Validation

- `npm run quality`: typecheck, lint, CSS/Markdown lint, format check and i18n coverage, sequentially; use for diagnosis.
- `npm run quality:fast`: same checks in parallel. `npm run check` adds unit tests and is the pre-commit gate.
- `npm run ci`: full check, build, bundle and benchmark gates. `npm run release:build` runs build, bundle check and SBOM after `npm run check`.

## Temporary Files

Write build/test intermediates, caches, Playwright results and reports under OS `$TEMP` (or `tempfile.gettempdir()`), never the workspace or `node_modules/.cache`. Coverage: `/tmp/WoodworkingShop/coverage/` on Linux/CI; `%TEMP%\WoodworkingShop\coverage\` on Windows. Keep `skipLibCheck: true` until `@react-pdf/types` fixes its `const enum` declaration (TS18055 with `verbatimModuleSyntax`).
