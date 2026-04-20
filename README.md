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


![Tech Stack](svg/README-table-01.svg)


## Quick Start

```bash
npm install
npm run dev        # development server at localhost:5173
npm run test       # run unit tests
npm run build      # production build → dist/
```

## Project Structure


![Project Structure](svg/README-diagram-02.svg)


## License

MIT
