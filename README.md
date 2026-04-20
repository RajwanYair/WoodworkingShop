# Cabinet Planner — Interactive Woodworking Design Tool

[![CI](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/ci.yml/badge.svg)](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/ci.yml)
[![Deploy](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/pages.yml/badge.svg)](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A React single-page application for designing pantry/storage cabinets with real-time preview, cut-sheet optimization, and PDF export.

**[Live Demo →](https://rajwanyair.github.io/WoodworkingShop/)**

## Features

- **Interactive Configurator** — sliders and selectors for dimensions, materials, shelves, doors, handles, edge banding
- **Multi-Cabinet Projects** — design multiple cabinets in one project with combined cut-sheet optimization
- **5-View + 3D SVG Preview** — Front (closed/open), Side, Top, Back, and Isometric 3D view with dimension annotations and part tooltips
- **Draggable Shelves** — drag shelves in Front (Open) view to reposition; auto-switches to custom spacing
- **Smart Optimizer** — 5 strategies (reduce depth, co-nest strips, adjust width/height, material swap) to minimize sheet waste
- **Comparison View** — side-by-side original vs optimized config with diff summary
- **Interactive Cut Sheets** — hover to highlight parts, waste hatch patterns, edge banding indicators, grain direction arrows, per-part dimensions
- **DXF Export** — export cut sheets as AutoCAD R12 DXF files for CNC routers (per-sheet or combined)
- **Color-Blind Safe Mode** — deuteranopia-safe Wong palette toggle for cut sheet visualization
- **Imperial/Metric Units** — toggle between mm and fractional inches (nearest 1/16")
- **Furniture Types** — cabinet, bookshelf, desk, and wardrobe presets with type-specific part generation
- **Assembly Guide** — step-by-step build instructions with progress bar, part highlighting, and pro tips
- **Toast Notifications** — real-time feedback for save, load, export, and error events
- **PDF Export** — full build plan: cover, specs, parts table, hardware BOM, cut diagrams, exploded assembly view, drilling guide, assembly sequence, shopping list
- **Cost Estimator** — per-material sheet costs, hardware, edge banding with total estimate in sidebar
- **Undo/Redo** — full history with Ctrl+Z / Ctrl+Y keyboard shortcuts
- **Keyboard Shortcuts** — Ctrl+Z undo, Ctrl+Y redo, Ctrl+P print, Alt+1-5 switch tabs
- **Responsive Design** — mobile-first layout with bottom sheet sidebar, scrollable tabs
- **Export/Import** — save/load configs to localStorage or download/upload as JSON files
- **Shareable URLs** — config encoded in URL query params; copy-link button
- **Print-Friendly** — @media print CSS hides UI chrome, optimizes tables and SVGs for paper
- **PWA / Offline** — service worker with cache-first strategy; installable web app
- **Bilingual** — English + Hebrew (RTL) with i18next
- **Dark Mode** — toggle with Tailwind CSS dark variant
- **Accessible** — ARIA landmarks, keyboard navigation, skip-to-content, color-blind support

## Tech Stack

| Category  | Technology                        |
| --------- | --------------------------------- |
| Framework | React 19                          |
| Language  | TypeScript 5.8 (strict)           |
| Styling   | Tailwind CSS 4                    |
| State     | Zustand 5                         |
| PDF       | @react-pdf/renderer 4             |
| i18n      | i18next 25                        |
| Build     | Vite 6                            |
| Test      | Vitest 4 + Testing Library        |
| Lint      | ESLint 9 (flat config) + Prettier |
| CI/CD     | GitHub Actions                    |
| Deploy    | GitHub Pages                      |

## Quick Start

```bash
npm ci             # install dependencies (deterministic)
npm run dev        # development server at localhost:5173
npm run test       # run 214+ unit tests
npm run build      # production build → dist/
```

## Development

```bash
npm run typecheck       # TypeScript strict mode check
npm run lint            # ESLint (0 warnings allowed)
npm run format          # Prettier formatting
npm run format:check    # Verify formatting (CI)
npm run check           # All of the above + tests
npm run ci              # check + build (full CI pipeline)
```

## Project Structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Deployment

The app auto-deploys to GitHub Pages on push to `main` via the Pages workflow.

For manual releases:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Tag: `git tag vX.Y.Z && git push --tags`
4. The release workflow builds and publishes artifacts to GitHub Releases

## Troubleshooting

| Issue                          | Solution                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `npm ci` fails                 | Ensure Node.js ≥ 20. Delete `node_modules` and retry                          |
| TypeScript errors              | Run `npm run typecheck` for details. Strict mode is enabled                   |
| Lint failures                  | Run `npm run lint` — 0 warnings policy. Fix root causes, no suppressions      |
| Build warning about chunk size | Expected for `@react-pdf/renderer` (~1.5 MB). It's code-split and lazy-loaded |
| Tests fail                     | Run `npm test` — requires `jsdom`. Check `vitest.config.ts`                   |

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

MIT
