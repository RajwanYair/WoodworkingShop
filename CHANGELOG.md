# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.9.0] — 2026-04-20

### Added

- `tests/helpers.ts` — shared test fixtures (`cfg()`, `mockSheet`, `mockPart`)
- `tests/assertions.ts` — reusable assertion helpers (`expectBilingualNames`, `expectSequentialSteps`, `expectBilingualSteps`)
- `it.each` parameterized test for material bilingual names in `materials.test.ts`
- npm cache in Pages workflow for faster deploys

### Changed

- Consolidated duplicate `cfg()` helper from 3 test files into shared `tests/helpers.ts`
- Consolidated duplicate `mockSheet`/`mockPart` from dxf + gcode tests into `tests/helpers.ts`
- Replaced 6× inline bilingual name assertions with shared `expectBilingualNames()`
- Replaced 2× inline sequential step assertions with shared `expectSequentialSteps()`
- Release workflow: consolidated 4 separate check steps into single `npm run ci`
- Updated ARCHITECTURE.md directory layout (added `download.ts`, test helpers, fixed `index.html` location)
- Disabled MD022/MD024 in markdownlint config (false positives on CODEOWNERS and changelog)

### Removed

- `public/icons.svg` — unused social brand icon sprite (bluesky, discord, github, x)
- Legacy Python entries from `.gitignore` (`__pycache__`, `.mypy_cache`, `*.pyc`)

## [2.8.0] — 2026-04-20

### Added

- `eslint-plugin-jsx-a11y` — accessibility linting for all JSX components
- `@vitest/coverage-v8` — test coverage reporting with thresholds (60% statements/lines)
- `triggerDownload()` shared utility — deduplicated 5 Blob+anchor download patterns
- `npm run clean` script — cross-platform build artifact cleanup via `rimraf`
- PNG icon fallbacks (192×192, 512×512) for PWA manifest
- CI/deploy badges in README
- Component tree and state flow Mermaid diagrams in `ARCHITECTURE.md`
- Coverage step in CI workflow (Node 22 only)
- Auto-extracted changelog notes in release workflow

### Changed

- Service worker cache versioned to `cabinet-planner-v2.8.0` (was hardcoded `v1`)
- PWA manifest SVG icon: `purpose` changed from `any maskable` to `any` (per spec)
- ESLint config: added jsx-a11y recommended ruleset
- Release workflow: body auto-generated from CHANGELOG.md section

### Fixed

- 11 accessibility lint errors across `CabinetSelector`, `Header`, `OnboardingOverlay`, `Sidebar`
  - Replaced `autoFocus` prop with `ref` callback focus
  - Replaced `<nav role="tablist">` with `<div role="tablist">`
  - Added `tabIndex`, keyboard listeners, and ARIA roles to modal overlays
  - Removed redundant `role="complementary"` on `<aside>` elements

### Removed

- `src/assets/hero.png`, `react.svg`, `vite.svg` — unused Vite scaffold assets
- `.mypy_cache/` — leftover Python type-checker cache
- Vestigial Python (`*.py`) and Makefile sections from `.editorconfig`

## [2.7.0] — 2026-04-20

### Added

- `docs/ARCHITECTURE.md` — full architecture documentation with Mermaid diagrams
- `CHANGELOG.md` — adopting Keep a Changelog format with SemVer
- `.prettierrc.json` + `.prettierignore` — Prettier formatting standards
- `eslint-config-prettier` — ESLint/Prettier integration
- `npm run format` / `npm run format:check` scripts
- `.vscode/extensions.json` — recommended VS Code extensions
- `.vscode/tasks.json` — build/lint/test task shortcuts
- `.vscode/launch.json` — Chrome debug launch config
- SHA-256 checksums in release workflow artifacts
- Format check step in CI and release workflows

### Changed

- Enabled TypeScript strict mode (`strict: true` in `tsconfig.app.json`)
- Updated `.vscode/settings.json` with formatter, ESLint, and TypeScript SDK config
- Updated README with tech stack table, dev commands, troubleshooting, deploy instructions
- Updated `.github/CONTRIBUTING.md` — Node.js/web project instructions (was Python)
- Updated `.github/SECURITY.md` — npm audit, removed Python references
- Updated `.github/CODEOWNERS` — web project paths
- Updated `.github/dependabot.yml` — npm ecosystem (was pip)
- Updated `.github/PULL_REQUEST_TEMPLATE.md` — web verification checklist
- Updated all issue templates — web/browser context (was Python)
- Updated `pages.yml` to use `npm ci` and `npm run build` consistently
- `chunkSizeWarningLimit` set to 1600 for expected @react-pdf/renderer chunk
- `.editorconfig` updated — added TS/TSX indent rules

### Fixed

- `useTouchGestures.ts` — removed unused `ref` parameter, fixed `React.Touch` type mismatch
- `cabinet-store.ts` — replaced missing `pushHistory()` call with inline history logic
- `bom-export.ts` — removed unused `_BomRow` interface
- `CabinetPreview.tsx` — updated `useTouchGestures()` call site for new signature

### Removed

- `legacy/` directory — Python plan generators, ruff config, requirements.txt, reference files
- `generate_md_svgs.py` — Python SVG generator script
- `svg/` directory — generated SVG assets (replaced with Mermaid in Markdown)
- `release-notes.tmp` — temporary file

## [2.6.0]

### Added

- G-code export for CNC routers
- BOM CSV export for multi-cabinet projects
- Touch gesture support (pinch-to-zoom, swipe)

## [2.5.0]

### Added

- Desk and wardrobe furniture types
- Custom Materials Editor (persisted in localStorage)
- Shaker door style option
- SVG export for preview views
- G-code export for CNC cut sheets
- Help / onboarding overlay (5-step walkthrough)
- Focus trap in modals, Escape key dismissal
- ARIA labels, roles, and expanded states across interactive elements
- 197 tests across 18 test files

## Version Bump Rules

- **Major** (X.0.0): Breaking changes to config format, engine API, or store shape
- **Minor** (x.Y.0): New features, new furniture types, new export formats
- **Patch** (x.y.Z): Bug fixes, documentation, CI changes, dependency updates
