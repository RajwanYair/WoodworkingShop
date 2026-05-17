<div align="center">
  <img src="banner.svg" alt="Cabinet Planner" width="100%"/>
</div>

# 🏛 Architecture

Cabinet Planner is a client-side React SPA (no backend). All computation — dimensions, parts, hardware, cut-sheet optimization, cost estimation — runs in the browser.

## ⚡ High-Level Data Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010', 'edgeLabelBackground': '#fef7ed'}}}%%
graph LR
  UI["Configurator UI"]:::ui -->|"patch config"| Store[("Zustand Store")]:::store
  Store -->|config| Engine["Engine Module\npure TypeScript"]:::engine
  Engine -->|"parts, hardware, dims, cost"| Store
  Store --> Preview["SVG Preview\n6 views"]:::output
  Store --> Optimizer["Cut Optimizer\nMaxRects"]:::output
  Optimizer --> Smart["Smart Optimizer\n5 strategies"]:::output
  Store --> Assembly["Assembly Guide"]:::output
  Store --> PDF["PDF Export"]:::output
  Store --> Exports["DXF, G-code, CSV"]:::output

  classDef ui fill:#f0b040,stroke:#8b5022,color:#1a0806,font-weight:bold
  classDef store fill:#3a7a50,stroke:#1e4a30,color:#ffffff,font-weight:bold
  classDef engine fill:#2a5a9a,stroke:#1a3a6e,color:#ffffff,font-weight:bold
  classDef output fill:#fae7c0,stroke:#c08040,color:#3a1806
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
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010'}}}%%
graph TD
  App["App.tsx"]:::root

  subgraph Sidebar_["Configurator Sidebar"]
    Sidebar["ConfiguratorPanel"]:::config
    PresetsPanel["PresetsPanel\n6 quick-start templates"]:::sub
    DimSliders["DimensionSliders\nW, H, D, kick height"]:::sub
    MatSel["MaterialSelector"]:::sub
    DoorConfig["DoorConfig"]:::sub
    DrawerConfig["DrawerConfig\nper-drawer heights"]:::sub
    ShelfConfig["ShelfConfig"]:::sub
  end

  subgraph Preview_["Preview Panel"]
    Preview["CabinetPreview\n6 views, SVG/PNG export"]:::view
    FrontClosed["Front closed"]:::viewItem
    FrontOpen["Front open, draggable shelves"]:::viewItem
    SideView["Side"]:::viewItem
    TopView["Top"]:::viewItem
    BackView["Back"]:::viewItem
    Iso3D["Isometric 3D"]:::viewItem
  end

  Header["Header\ntabs, undo/redo, dark mode, lang"]:::layout
  Optimizer["Optimizer\ncut sheets, smart optimizer, comparison"]:::tab
  Assembly["AssemblyGuide\nsteps, progress, tips"]:::tab
  PDF["PdfExportPanel\nfull build plan"]:::tab

  App --> Header
  App --> Sidebar
  App --> Preview
  App --> Optimizer
  App --> Assembly
  App --> PDF

  Sidebar --> PresetsPanel
  Sidebar --> DimSliders
  Sidebar --> MatSel
  Sidebar --> DoorConfig
  Sidebar --> DrawerConfig
  Sidebar --> ShelfConfig

  Preview --> FrontClosed
  Preview --> FrontOpen
  Preview --> SideView
  Preview --> TopView
  Preview --> BackView
  Preview --> Iso3D

  classDef root fill:#8b5022,stroke:#f0b040,color:#ffffff,font-weight:bold
  classDef layout fill:#d4860a,stroke:#8b5022,color:#1a0806
  classDef config fill:#2a6a4a,stroke:#1a4030,color:#ffffff,font-weight:bold
  classDef sub fill:#e0f5ea,stroke:#4a9a6a,color:#1a3a28
  classDef view fill:#2a5a9a,stroke:#1a3a6e,color:#ffffff,font-weight:bold
  classDef viewItem fill:#dce8f8,stroke:#5a8fd0,color:#1a2840
  classDef tab fill:#7a3a10,stroke:#c08040,color:#fae7c0
```

## 🔄 State Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryBorderColor': '#8b5022', 'actorBkg': '#fae7c0', 'actorBorder': '#8b5022', 'activationBkgColor': '#f0b040', 'activationBorderColor': '#8b5022', 'sequenceNumberColor': '#1a0e06', 'signalColor': '#7a4010', 'signalTextColor': '#1a0e06'}}}%%
sequenceDiagram
  autonumber
  participant U as User
  participant C as Configurator
  participant S as Zustand Store
  participant E as Engine
  participant V as Preview / Optimizer

  U->>C: Adjust dimension or material
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
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010', 'edgeLabelBackground': '#fef7ed'}}}%%
flowchart TD
  parts["Part list from generateParts"]:::input --> group{"Group by material"}:::decision
  group --> queue["Sort: max-side desc, area desc"]:::process
  queue --> next{"More parts?"}:::decision
  next -- no --> done["Return CutSheet list\nwith yieldPercent"]:::output
  next -- yes --> probe["Try each free rect on every sheet\nboth orientations"]:::process
  probe --> score["Score: BSSF\nmin leftover side wins"]:::process
  score --> place{"Any fit?"}:::decision
  place -- yes --> split["Split free rect L-shape\nprune contained rects"]:::process
  place -- no --> newSheet["Open new sheet"]:::process
  newSheet --> split
  split --> next

  classDef input fill:#2a5a9a,stroke:#1a3a6e,color:#ffffff,font-weight:bold
  classDef decision fill:#f0b040,stroke:#8b5022,color:#1a0806,font-weight:bold
  classDef process fill:#fae7c0,stroke:#c08040,color:#3a1806
  classDef output fill:#3a7a50,stroke:#1e4a30,color:#ffffff,font-weight:bold
```

## 🗓 Sprint Release Timeline

Key milestones from v3.0.0 to the current release:

```mermaid
timeline
  title Cabinet Planner -- Major Feature Timeline
  section v3.0.0 (Foundation)
    Core engine  : Cabinet, bookshelf, desk, wardrobe part generation
    Cut optimizer : MaxRects BSSF algorithm, yield % per sheet
    SVG preview  : 6-view cabinet renderer, isometric 3D
  section v3.1.0 (Export and Sharing)
    DXF export   : AutoCAD R12 sheets for CNC cutting
    G-code export : Router-ready toolpaths
    BOM CSV      : Bill of materials with hardware
    URL state    : Shareable configuration links
  section v3.2.0 (UX and i18n)
    Hebrew i18n  : Full RTL support
    PWA          : Service worker, offline mode
    PDF export   : react-pdf/renderer full build plan
    Smart Optimizer : 5 strategies, depth, width, height, co-nest, material swap
  section v3.3.0 (Accessibility and Precision)
    Colour-blind mode  : Accessible part palette
    Grain direction    : Arrows on grain-locked materials
    Shelf deflection   : L/360 sag warning for long spans
    Assembly guide     : Paginated plus show-all, video links
  section v3.4.0 (Quality of Life)
    OS dark-mode sync  : Auto-detects system preference
    Cabinet duplication : One-click duplicate in project panel
    Print assembly     : Browser print with all steps visible
    BOM area summary   : Material total area plus board-feet
    Waste cost badge   : Per-sheet offcut cost estimate
    Kick presets       : 0 / 75 / 100 / 150 mm quick-select
    Grain legend       : Reminder row on grain-locked sheets
  section v3.5.0 (Materials and Export)
    Custom material editor : Inline edit with all fields
    Cabinet notes      : Freeform notes per cabinet
    Saw kerf control   : Configurable blade kerf in optimizer
    Material price overrides : Per-material price per sheet
    Edge-banding rate  : Configurable cost per metre
  section v3.6.0 (Visualisation and UI)
    SVG icon library   : 40+ inline SVG icon components
    Enriched cut sheets : Ruler ticks, drop shadows, part labels
    Usable offcuts panel : Grouped offcut inventory
    Hardware price overrides : Per-item price editing
    Shopping list panel : Supplier-ready material summary
    Project name field : Filename prefix plus document title
  section v3.7.0 (Estimation and Assembly)
    Drawer slide types : Standard, soft-close, full-extension
    Material density   : Panel weight estimation per cabinet
    100mm scale bar    : Reference ruler on cut sheets
    Assembly hardware checklist : Interactive print-friendly list
    Material usage summary : Area and cost per material group
    Weight in BOM CSV  : kg column in bill of materials
  section v3.8.0 (UX Polish)
    Saw passes stat    : Total cut count in Optimizer summary
    Sheet size overrides : Per-material sheet dimensions
    PWA share button   : Native share API with URL fallback
    Grain direction in BOM : Grain column in CSV export
    Dark mode shortcut : Alt+D keyboard shortcut
    Sortable parts table : Click column headers to sort
    Material color swatches : Visual swatch in selector
```
