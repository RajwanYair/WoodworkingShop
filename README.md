# Cabinet Planner — Interactive Woodworking Design Tool

A React single-page application for designing pantry/storage cabinets with real-time preview, cut-sheet optimization, and PDF export.

**[Live Demo →](https://rajwanyair.github.io/WoodworkingShop/)**

## Features

- **Interactive Configurator** — sliders and selectors for dimensions, materials, shelves, doors, handles, edge banding
- **5-View SVG Preview** — Front (closed/open), Side, Top, Back with dimension annotations and part tooltips
- **Draggable Shelves** — drag shelves in Front (Open) view to reposition; auto-switches to custom spacing
- **Smart Optimizer** — 5 strategies (reduce depth, co-nest strips, adjust width/height, material swap) to minimize sheet waste
- **Comparison View** — side-by-side original vs optimized config with diff summary
- **Interactive Cut Sheets** — hover to highlight parts, waste hatch patterns, per-part dimensions and legend
- **PDF Export** — full build plan: cover, specs, parts table, hardware BOM, cut diagrams, drilling guide, assembly sequence, shopping list
- **Cost Estimator** — per-material sheet costs, hardware, edge banding with total estimate in sidebar
- **Export/Import** — save/load configs to localStorage or download/upload as JSON files
- **Shareable URLs** — config encoded in URL query params; copy-link button
- **Print-Friendly** — @media print CSS hides UI chrome, optimizes tables and SVGs for paper
- **PWA / Offline** — service worker with cache-first strategy; installable web app
- **Bilingual** — English + Hebrew (RTL) with i18next
- **Dark Mode** — toggle with Tailwind CSS dark variant
- **Accessible** — ARIA landmarks, keyboard navigation, skip-to-content

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| i18n | i18next + react-i18next |
| PDF | @react-pdf/renderer 4 |
| Testing | Vitest (92 unit tests across 7 files) |
| CI | GitHub Actions (Node 20+22 matrix) |
| Deploy | GitHub Pages |

## Quick Start

```bash
npm install
npm run dev        # development server at localhost:5173
npm run test       # run unit tests
npm run build      # production build → dist/
```

## Project Structure

```
src/
  engine/           # Pure TypeScript calculation engine
    types.ts        # Domain types (CabinetConfig, Part, etc.)
    materials.ts    # Material database, defaults, constraints, prices
    dimensions.ts   # Derived dimensions from config
    parts.ts        # Parts list generation
    hardware.ts     # Hardware BOM generation
    cut-optimizer.ts    # FFD 2D bin-packing
    smart-optimizer.ts  # 5-strategy optimization engine
    cost-estimator.ts   # Price calculation engine
  components/
    layout/         # Header, Sidebar (with cost estimate)
    configurator/   # DimensionSliders, MaterialSelector, DoorConfig, SaveLoad, CostEstimate
    preview/        # CabinetPreview (SVG with draggable shelves)
    optimizer/      # OptimizerView (interactive), SmartOptimizerPanel, ComparisonView, Tables
    pdf/            # CabinetPdfDocument (8+ pages), PdfExportPanel
  store/            # Zustand store (cabinet-store.ts)
  utils/            # URL state, localStorage helpers
  i18n/             # en.json, he.json
tests/
  engine/           # Unit tests for engine modules + smart optimizer
  utils/            # URL state round-trip tests
```

## License

MIT
