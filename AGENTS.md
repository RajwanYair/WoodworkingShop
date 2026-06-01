# Cabinet Planner — AI Agent Context

> Browser-based woodworking design tool · React 19 + TypeScript 6 + Vite 8
> **v5.29.9** · MIT · Node ≥ 22 · [Live demo](https://rajwanyair.github.io/WoodworkingShop/)

## What It Does

Configure any cabinet/furniture piece → live 6-view SVG preview → MaxRects cut-sheet optimizer → export PDF build plan, DXF, G-code, or BOM. **No server, no account.** Full RTL support (Hebrew/Arabic).

## Active Sprint — Phase 60 (Sprints 285+)

| Sprint | Feature | Status |
| ------ | ------- | ------ |
| 172    | TBD     | TODO   |

## Tech Stack

| Layer | Tech                                                                    |
| ----- | ----------------------------------------------------------------------- |
| UI    | React 19 · TypeScript 6 strict (`erasableSyntaxOnly`) · Tailwind CSS v4 |
| State | Zustand 5 — single store with undo/redo + slices                        |
| i18n  | i18next 26 — EN, HE (RTL), AR (RTL), DE, ES, FR                         |
| Build | Vite 8 (Rolldown bundler)                                               |
| Tests | Vitest 4 (unit + bench) · Playwright 1.60 (E2E + axe-core a11y)         |
| PDF   | `@react-pdf/renderer` off main thread                                   |
| Lint  | ESLint 10 flat config · Prettier 3 · Stylelint 17 · `--max-warnings 0`  |

## Layout

```text
src/
  engine/      Pure TS — no React, no DOM, no side effects. All computation.
  store/       Zustand — cabinet-store.ts + slices + custom-materials + toast
  components/  React UI — configurator/ preview/ optimizer/ assembly/ pdf/sections/ layout/
  utils/       Export helpers — bom, dxf, gcode, url-state, project-storage
  i18n/        en.json + he.json + ar.json + de.json + es.json + fr.json
  workers/     Web Workers (?worker import suffix)
tests/         Vitest unit tests mirroring src/
.github/       CI workflows, prompts/, agents/, instructions/, actions/
```

## Key Commands

```bash
npm run quality       # typecheck + lint + lint:css + lint:md + format:check + i18n:coverage
npm run check         # quality:fast + npm test  (pre-commit gate)
npm run ci            # check + build + bundle:check + bench:check  (full CI gate)
npm run release:build # build + bundle:check + sbom (no tests; run after check)
npm run dead:check    # knip — find unused exports/files
npx vitest run        # run unit tests directly
```

## Non-Negotiable Rules

| Rule                      | Detail                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **Zero suppression**      | No `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`                          |
| **No enum/namespace**     | Use `as const` objects or union types (`erasableSyntaxOnly`)                        |
| **i18n parity**           | Every `t('key')` → entry in both `en.json` AND `he.json`                            |
| **Engine purity**         | `src/engine/` — no React imports, no DOM, no side effects                           |
| **react-refresh**         | Component `.tsx` exports only React components; utilities → sibling `.ts`           |
| **RTL layout**            | Tailwind logical props (`ms-*`, `me-*`, `start-*`, `end-*`), never `ml-*`/`mr-*`    |
| **7 ESLint plugins**      | jsx-a11y, react-hooks, react-refresh, react, regexp, no-only-tests, testing-library |
| **Intermediates → $TEMP** | No build artifacts/caches in workspace root                                         |
| **≤ 8 prod deps**         | No additions without removing one or proving > 50 KB savings                        |
| **browserslist**          | Canonical source: `package.json#browserslist` only — no `.browserslistrc`           |

## Key Patterns

```ts
// Store — read
const { config, cabinets } = useCabinetStore();
// Store — write
set((s) => ({ ...s, config: { ...s.config, width } }));
// Store — outside React
useCabinetStore.getState().setConfig({ width: 800 });

// i18n
const { t } = useTranslation();
<label>{t('config.width')}</label>;  // key must exist in en.json + he.json

// Tests — use it.each for parametrised pairs; group related expects in one it()
import { cfg } from '../helpers'; // builds CabinetConfig from DEFAULT_CONFIG + overrides
```

## Never Add

- `@supabase/supabase-js`, `valibot`, `zod` — not project deps
- `enum` or `namespace` — forbidden by `erasableSyntaxOnly`
- `sonarjs` or `promise` ESLint plugins
- IE-only or deprecated browser APIs
- Hardcoded pixel values — use Tailwind classes
- JS-style `//` comments inside `.json` files — use `.jsonc` extension
- Features not explicitly requested

## Docs

- Architecture decisions & diagrams → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Active roadmap → [ROADMAP.md](ROADMAP.md) (Phase 33 — active)
- Sprint history → [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md)
- Plugin API → [docs/PLUGIN-API.md](docs/PLUGIN-API.md)

## Copilot Prompts

`.github/prompts/` contains reusable agent prompts:

| Prompt                        | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `new-feature.prompt.md`       | Add a full feature panel (engine → store → UI → i18n → mount) |
| `fix-quality.prompt.md`       | Diagnose and fix all quality gate failures                    |
| `fix-tests.prompt.md`         | Diagnose and fix all failing unit tests                       |
| `i18n-add-keys.prompt.md`     | Add i18n keys with en/he parity validation                    |
| `roadmap-sprint.prompt.md`    | Execute the current roadmap sprint item end-to-end            |
| `roadmap-tracking.prompt.md`  | Track and update ROADMAP.md sprint progress                   |
| `release.prompt.md`           | Full release workflow: bump → CHANGELOG → tag → GH release    |
| `split-component.prompt.md`   | Split large React components (≤ 600 L target)                 |
| `test-factory.prompt.md`      | Convert repetitive tests to `it.each` tables                  |
| `bundle-optimize.prompt.md`   | Bundle size analysis and chunk optimization                   |
| `a11y-audit.prompt.md`        | WCAG 2.2 AA accessibility audit and remediation               |
| `perf-debug.prompt.md`        | Lighthouse / runtime performance diagnosis                    |
| `security-audit.prompt.md`    | OWASP Top 10 security audit for client-side SPA               |
| `dead-code.prompt.md`         | Find and remove unused exports/files via Knip                 |
| `dependency-audit.prompt.md`  | Security + outdated + license audit of all deps               |
| `clean-generated.prompt.md`   | Verify generated files go to $TEMP, clean leaks               |
| `lighthouse-ci.prompt.md`     | Set up Lighthouse CI GitHub Actions gates                     |
| `csp-hardening.prompt.md`     | Content Security Policy header hardening                      |
| `pwa-audit.prompt.md`         | PWA manifest, service worker, and install-prompt audit        |
| `code-review.prompt.md`       | Structured code review against all project conventions        |
| `dependency-update.prompt.md` | Review and apply Dependabot dependency updates                |

## Copilot Agents

`.github/agents/` contains pre-configured agent mode definitions:

| Agent      | Purpose                                                       |
| ---------- | ------------------------------------------------------------- |
| `sprint`   | Execute the current WIP sprint item end-to-end                |
| `release`  | Full automated release workflow                               |
| `feature`  | Scaffold a complete new feature (engine + store + UI + i18n)  |
| `debug`    | Diagnose and fix test/build/type failures without suppression |
| `a11y`     | WCAG 2.2 AA accessibility audit and remediation               |
| `i18n`     | i18n key management with full 6-locale parity                 |
| `security` | OWASP Top 10 security audit and CSP hardening                 |
| `perf`     | Lighthouse CI setup and Core Web Vitals tuning                |
| `cleanup`  | Production cleanup — dead code, lint, $TEMP enforcement       |

## MCP Servers (`.vscode/mcp.json`)

| Server               | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `github`             | Official GitHub MCP — PRs, issues, Actions, code search |
| `filesystem`         | Scoped workspace file access                            |
| `fetch`              | Retrieve web content and API responses                  |
| `playwright`         | Browser automation for E2E debugging                    |
| `gitkraken`          | Git ops, blame, diff, PR workflow                       |
| `memory`             | Persistent agent notes across sessions                  |
| `sequentialthinking` | Multi-step problem decomposition                        |
| `context7`           | Up-to-date library documentation (React, Vite, etc.)    |
| `cloudflare`         | Cloudflare Pages/Workers management                     |
| `brave-search`       | Web search fallback for docs not in Context7            |
