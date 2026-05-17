<div align="center">
  <img src="banner.svg" alt="Cabinet Planner" width="100%"/>
</div>

# 🏛 Architecture

Cabinet Planner is a client-side React SPA (no backend). All computation — dimensions, parts, hardware, cut-sheet optimization, cost estimation — runs in the browser.

## ⚡ High-Level Data Flow

```mermaid
graph LR
  UI["🎛 Configurator UI"] -->|"patch config"| Store["🗄 Zustand Store"]
  Store -->|config| Engine["⚙ Engine Module\n(pure TypeScript)"]
  Engine -->|"parts · hardware\ndimensions · cost"| Store
  Store --> Preview["🖼 SVG Preview\n(6 views)"]
  Store --> Optimizer["📐 Cut Optimizer\n(MaxRects)"]
  Optimizer --> Smart["🧠 Smart Optimizer\n(5 strategies)"]
  Store --> Assembly["🔩 Assembly Guide"]
  Store --> PDF["📄 PDF Export"]
  Store --> Exports["💾 DXF · G-code · CSV"]
```

## 📁 Directory Layout

```text
src/
├── main.tsx                 # React 19 entry point
├── App.tsx                  # Root component: tabs, keyboard shortcuts, layout
├── index.css                # Tailwind theme, print styles, RTL support
├── engine/                  # Pure TypeScript computation (no React)
│   ├── types.ts             # Domain types: CabinetConfig, Part, HardwareItem, etc.
│   ├── materials.ts         # Material database, constraints, defaults
│   ├── dimensions.ts        # Derived dimensions from config
│   ├── parts.ts             # Part list generation
│   ├── hardware.ts          # Hardware BOM generation
│   ├── cut-optimizer.ts     # FFD bin-packing for cut sheets
│   ├── smart-optimizer.ts   # 5 optimization strategies
│   ├── assembly.ts          # Assembly step generation
│   ├── cost-estimator.ts    # Cost breakdown calculation
│   └── index.ts             # Barrel exports
├── components/
│   ├── configurator/        # Config panel: sliders, selectors, material editor
│   ├── preview/             # SVG cabinet views (6 views + isometric 3D)
│   ├── optimizer/           # Cut sheet visualization, smart optimizer, comparison
│   ├── assembly/            # Step-by-step assembly guide
│   ├── pdf/                 # @react-pdf/renderer document + export panel
│   └── layout/              # Header, sidebar, toast, onboarding overlay
├── store/
│   ├── cabinet-store.ts     # Main Zustand store: config, derived state, undo/redo
│   ├── custom-materials-store.ts  # User-defined materials
│   └── toast-store.ts       # Notification queue
├── hooks/
│   └── useTouchGestures.ts  # Pinch-zoom and swipe gestures
├── i18n/
│   ├── index.ts             # i18next setup
│   ├── en.json              # English translations
│   └── he.json              # Hebrew translations (RTL)
├── utils/
│   ├── bom-export.ts        # CSV bill of materials export
│   ├── download.ts          # Shared file download helper
│   ├── dxf-export.ts        # AutoCAD R12 DXF export for CNC
│   ├── gcode-export.ts      # G-code export for CNC routers
│   ├── local-storage.ts     # localStorage persistence
│   ├── units.ts             # Metric ↔ imperial conversion
│   └── url-state.ts         # URL query param serialization
└── assets/                  # Static assets (favicon, etc.)

public/
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker (cache-first)
├── robots.txt               # Search engine directives
├── sitemap.xml              # Sitemap
└── 404.html                 # GitHub Pages SPA fallback

tests/                       # Vitest unit tests (mirrors src/ structure)
  ├── helpers.ts             # Shared test fixtures (cfg, mockSheet, mockPart)
  ├── assertions.ts          # Reusable test assertions (bilingual, sequential)
.github/
├── workflows/
│   ├── ci.yml               # CI: typecheck → lint → test → build
│   ├── release.yml          # Release: build + GitHub Release with artifacts
│   └── pages.yml            # Deploy to GitHub Pages on push to main
├── ISSUE_TEMPLATE/          # Bug report, feature request
├── PULL_REQUEST_TEMPLATE.md
├── CODEOWNERS
├── CONTRIBUTING.md
├── SECURITY.md
└── dependabot.yml
```

## ⚙ Engine Module

The engine is a set of pure functions with no React dependency. All functions take a `CabinetConfig` and return derived data:

| Function            | Input                            | Output                                                       |
| ------------------- | -------------------------------- | ------------------------------------------------------------ |
| `computeDimensions` | `CabinetConfig`                  | `DerivedDimensions` (internal measurements, hinge positions) |
| `generateParts`     | `CabinetConfig`                  | `Part[]` (bilingual names, dimensions, edge banding)         |
| `generateHardware`  | `CabinetConfig`                  | `HardwareItem[]` (hinges, screws, cam locks, etc.)           |
| `optimizeCutSheets` | `Part[]`                         | `OptimizationResult` (sheet layouts, yield %, waste)         |
| `findOptimizations` | `CabinetConfig`                  | `OptimizationSuggestion[]` (5 strategies with scores)        |
| `estimateCost`      | `Part[], HardwareItem[], config` | `CostBreakdown` (per-material, hardware, total)              |

## 🗄 State Management

A single Zustand store (`cabinet-store.ts`) holds:

- **Project state**: array of `CabinetEntry` (name + config), active index
- **Derived state**: dimensions, parts, hardware, optimization (recomputed on config change)
- **Undo/redo**: past/future stacks of cabinet arrays (max 50 entries)
- **UI state**: active tab, dark mode, color-blind mode, unit system

Two supplementary stores:

- `custom-materials-store.ts` — user-defined materials persisted to localStorage
- `toast-store.ts` — notification queue with auto-dismiss

## 📦 Build & Deploy

- **Bundler**: Vite 6 with React plugin + Tailwind CSS plugin
- **Code splitting**: `@react-pdf/renderer` is split into a separate chunk via `manualChunks` and lazy-loaded
- **Deploy target**: GitHub Pages (base path: `/WoodworkingShop/`)
- **PWA**: service worker in `public/sw.js` with cache-first strategy

## 🪑 Supported Furniture Types

| Type        | Parts                                                  | Features                     |
| ----------- | ------------------------------------------------------ | ---------------------------- |
| `cabinet`   | Top, bottom, sides, shelves, back, doors, kick plate   | Doors, drawers (0–4), hinges |
| `bookshelf` | Top, bottom, sides, shelves, back, kick plate          | Open front (no doors)        |
| `desk`      | Desktop, legs, back panel, modesty panel, shelf        | Adjustable height            |
| `wardrobe`  | Top, bottom, sides, shelves, back, doors, hanging rail | Rail + shelf combo           |

## 🧩 Component Tree

```mermaid
graph TD
  App[App.tsx]
  App --> Header["🎛 Header\n(tabs · undo/redo · dark mode · lang · ?)"]
  App --> Sidebar["🔧 ConfiguratorPanel\n(presets · dims · materials · doors · drawers)"]
  App --> Preview["🖼 CabinetPreview\n(6 views · SVG/PNG export)"]
  App --> Optimizer["📐 Optimizer\n(cut sheets · smart optimizer · comparison)"]
  App --> Assembly["🔩 AssemblyGuide\n(steps · progress · tips)"]
  App --> PDF["📄 PdfExportPanel\n(full build plan)"]

  Sidebar --> PresetsPanel["⚡ PresetsPanel\n(6 quick-start templates)"]
  Sidebar --> DimSliders["📏 DimensionSliders\n(w·h·d·kick height)"]
  Sidebar --> MatSel["🪵 MaterialSelector"]
  Sidebar --> DoorConfig["🚪 DoorConfig"]
  Sidebar --> DrawerConfig["🗂 DrawerConfig\n(per-drawer heights)"]
  Sidebar --> ShelfConfig["📚 ShelfConfig"]

  Preview --> FrontClosed["Front (closed)"]
  Preview --> FrontOpen["Front (open) — draggable shelves"]
  Preview --> SideView["Side"]
  Preview --> TopView["Top"]
  Preview --> BackView["Back"]
  Preview --> Iso3D["Isometric 3D"]
```

## 🔄 State Flow

```mermaid
sequenceDiagram
  participant U as User
  participant C as Configurator
  participant S as Zustand Store
  participant E as Engine
  participant V as Preview/Optimizer

  U->>C: Adjust dimension/material
  C->>S: patch config
  S->>S: Push undo history
  S->>E: computeDimensions(config)
  E-->>S: DerivedDimensions
  S->>E: generateParts(config)
  E-->>S: Part[]
  S->>E: generateHardware(config)
  E-->>S: HardwareItem[]
  S->>E: optimizeCutSheets(parts)
  E-->>S: OptimizationResult
  S-->>V: Re-render with new state
```

## Cut Optimizer Pipeline (v3.1.0+)

The cut optimizer uses a Maximal Rectangles (MaxRects) algorithm with the
Best Short Side Fit (BSSF) heuristic. Parts are queued in descending
max-side order, then each part probes every free rectangle on every open
sheet in both orientations before opening a new sheet.

```mermaid
flowchart TD
  parts[Part[] from generateParts] --> group{Group by material}
  group --> queue[Sort queue by max-side desc, area desc]
  queue --> next{More parts?}
  next -- no --> done[Return CutSheet[] with yieldPercent]
  next -- yes --> probe[Try each free rect on every sheet,<br/>both orientations]
  probe --> score[Score: BSSF<br/>min leftover side wins]
  score --> place{Any fit?}
  place -- yes --> split[Split free rect L-shape,<br/>prune contained rects]
  place -- no --> newSheet[Open new sheet]
  newSheet --> split
  split --> next
```
