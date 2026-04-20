# Cabinet Planner — Interactive Woodworking Design Tool

A React single-page application for designing pantry/storage cabinets with real-time preview, cut-sheet optimization, and PDF export.

**[Live Demo →](https://rajwanyair.github.io/WoodworkingShop/)**

## Features

- **Interactive Configurator** — sliders and selectors for dimensions, materials, shelves, doors, handles, edge banding
- **5-View SVG Preview** — Front (closed/open), Side, Top, Back with dimension annotations and part tooltips
- **Smart Optimizer** — 5 strategies (reduce depth, co-nest strips, adjust width/height, material swap) to minimize sheet waste
- **Cut Sheet Optimizer** — FFD 2D bin-packing with per-sheet yield visualization
- **PDF Export** — full build plan: cover page, specifications, parts table, hardware BOM, cut diagrams
- **Save/Load** — persist cabinet configurations in localStorage
- **Shareable URLs** — config encoded in URL query params; copy-link button
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
| Testing | Vitest (63 engine unit tests) |
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
    materials.ts    # Material database, defaults, constraints
    dimensions.ts   # Derived dimensions from config
    parts.ts        # Parts list generation
    hardware.ts     # Hardware BOM generation
    cut-optimizer.ts    # FFD 2D bin-packing
    smart-optimizer.ts  # 5-strategy optimization engine
  components/
    layout/         # Header, Sidebar
    configurator/   # DimensionSliders, MaterialSelector, DoorConfig, etc.
    preview/        # CabinetPreview (SVG with DimLine, PartRect)
    optimizer/      # OptimizerView, SmartOptimizerPanel, Tables
    pdf/            # CabinetPdfDocument, PdfExportPanel
  store/            # Zustand store (cabinet-store.ts)
  utils/            # URL state, localStorage helpers
  i18n/             # en.json, he.json
tests/
  engine/           # Vitest unit tests for all engine modules
```

## License

MIT
