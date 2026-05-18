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
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010'}}}%%
gantt
  title Cabinet Planner Major Feature Timeline
  dateFormat YYYY-MM-DD
  axisFormat v%d
  section v3.0 Foundation
    Core engine - cabinet, bookshelf, desk, wardrobe  :done, e300, 2026-03-01, 3d
    Cut optimizer - MaxRects BSSF                      :done, e301, after e300, 2d
    SVG preview - 6-view renderer plus isometric 3D   :done, e302, after e301, 2d
  section v3.1 Export
    DXF export for CNC cutting                         :done, e310, after e302, 2d
    G-code toolpaths, BOM CSV, URL state sharing       :done, e311, after e310, 2d
  section v3.2 UX and i18n
    Hebrew RTL, PWA offline, PDF export                :done, e320, after e311, 2d
    Smart Optimizer - 5 strategies                     :done, e321, after e320, 2d
  section v3.3 Precision
    Colour-blind mode, grain direction, deflection     :done, e330, after e321, 2d
    Assembly guide paginated plus show-all             :done, e331, after e330, 2d
  section v3.4 Quality of Life
    Dark-mode sync, cabinet duplication, print         :done, e340, after e331, 2d
    BOM area summary, waste cost badge, kick presets   :done, e341, after e340, 2d
  section v3.5 Materials
    Custom material editor, price overrides            :done, e350, after e341, 2d
    Saw kerf control, edge-banding rate                :done, e351, after e350, 2d
  section v3.6 Visualisation
    SVG icon library, enriched cut sheets              :done, e360, after e351, 2d
    Offcuts panel, hardware prices, shopping list      :done, e361, after e360, 2d
  section v3.7 Estimation
    Drawer slide types, material density and weight    :done, e370, after e361, 2d
    Scale bar, assembly checklist, material summary    :done, e371, after e370, 2d
  section v3.8 UX Polish
    Saw passes, sheet size overrides, PWA share        :done, e380, after e371, 2d
    Grain in BOM, Alt+D shortcut, sortable table       :done, e381, after e380, 2d
  section v3.9 Engineering
    Shelf deflection ratings, isometric enhancements   :done, e390, after e381, 5d
    Markdown polish, sw.js version sync                :done, e391, after e390, 2d
  section v3.10 Production
    MyScripts tooling, waiver removal, ROADMAP rewrite :active, e3100, after e391, 3d
```

## 🚀 CI/CD Pipeline

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010', 'edgeLabelBackground': '#fef7ed'}}}%%
graph TD
  push["Push or PR to main"] --> ci["CI workflow\nci.yml"]
  push --> pages["Pages workflow\npages.yml"]

  subgraph CI [CI - Runs on Node 20 and 22]
    ci --> tc["Typecheck\ntsc --noEmit"]
    tc --> lint["ESLint\n0 warnings"]
    lint --> mdlint["markdownlint"]
    mdlint --> fmt["format:check\nPrettier"]
    fmt --> test["Vitest unit tests\n288 tests"]
    test --> cov["Coverage report\nNode 22 only"]
    cov --> build["Vite build"]
    build --> bcheck["Bundle budget check\n2 MB gzip limit"]
    bcheck --> e2e["Playwright E2E\nChromium + Firefox"]
    e2e --> lhci["Lighthouse CI\nperf / a11y / SEO"]
  end

  subgraph Deploy [Deploy - on main push]
    pages --> dbuild["npm run build"]
    dbuild --> upload["Upload dist artifact"]
    upload --> ghpages["actions/deploy-pages\nGitHub Pages"]
  end

  subgraph Release [Release - on v-star tag]
    tag["git push --follow-tags"] --> rbuild["Build + quality check"]
    rbuild --> archive["dist.tar.gz + SHA-256"]
    archive --> ghrelease["gh release create\nauto-extract CHANGELOG"]
  end

  classDef trigger fill:#8b5022,stroke:#f0b040,color:#fff,font-weight:bold
  classDef step fill:#fae7c0,stroke:#c08040,color:#3a1806
  classDef gate fill:#3a7a50,stroke:#1e4a30,color:#fff,font-weight:bold
  class push,tag trigger
  class ghpages,ghrelease gate
  class tc,lint,mdlint,fmt,test,cov,build,bcheck,e2e,lhci,dbuild,upload,rbuild,archive step
```

## 📤 Export Pipeline

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010', 'edgeLabelBackground': '#fef7ed'}}}%%
graph LR
  config["CabinetConfig\nZustand store"] --> engine["Engine\ngenerateParts\ngenerateHardware"]
  engine --> parts["Part[]"]
  engine --> hw["HardwareItem[]"]
  parts --> opt["optimizeCutSheets\nMaxRects BSSF"]
  opt --> sheets["CutSheet[]\nwith placed rects"]

  parts --> bom["bom-export.ts\ngenerateBomCsv"]
  bom --> csv[("CSV download")]

  parts --> dxf["dxf-export.ts\ngenerateDxf"]
  dxf --> dxffile[("DXF download")]

  parts --> gcode["gcode-export.ts\ngenerateGcode"]
  gcode --> gcfile[("G-code download")]

  sheets --> pdf["PdfDocument.tsx\nreact-pdf/renderer"]
  hw --> pdf
  parts --> pdf
  pdf --> pdffile[("PDF download")]

  config --> preview["CabinetPreview.tsx\nSVG renderer"]
  preview --> svgpng[("SVG / PNG download")]

  config --> url["url-state.ts\npushConfigToUrl"]
  url --> share[("Clipboard / Web Share API")]

  classDef store fill:#3a7a50,stroke:#1e4a30,color:#fff,font-weight:bold
  classDef engine fill:#2a5a9a,stroke:#1a3a6e,color:#fff,font-weight:bold
  classDef file fill:#f0b040,stroke:#8b5022,color:#1a0806,font-weight:bold
  classDef output fill:#fae7c0,stroke:#c08040,color:#3a1806
  class config store
  class engine,opt engine
  class bom,dxf,gcode,pdf,preview,url file
  class csv,dxffile,gcfile,pdffile,svgpng,share output
```

## 📱 PWA Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010', 'edgeLabelBackground': '#fef7ed'}}}%%
graph TD
  browser["Browser / Install prompt"]

  subgraph SW [Service Worker - public/sw.js]
    sw["Cache-first strategy"]
    cache[("Cache Storage\napp shell + assets")]
    sw -- "cache miss" --> network["Network fetch"]
    sw -- "cache hit" --> cache
    network -- "cache update" --> cache
  end

  subgraph App [React SPA]
    app["App.tsx"]
    ls[("localStorage\npresets, materials,\ndark mode, undo")]
    urlp["URL query params\nconfig + project name"]
    app --- ls
    app --- urlp
  end

  browser --> sw
  sw --> app
  manifest["public/manifest.json\nname, icons, start_url"] --> browser

  classDef sw fill:#5a0fc8,stroke:#3a0a8a,color:#fff,font-weight:bold
  classDef app fill:#2a5a9a,stroke:#1a3a6e,color:#fff,font-weight:bold
  classDef storage fill:#f0b040,stroke:#8b5022,color:#1a0806
  class sw,cache sw
  class app,ls,urlp app
  class manifest,browser storage
```

## 🌐 i18n Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0b040', 'primaryTextColor': '#1a0e06', 'primaryBorderColor': '#8b5022', 'lineColor': '#7a4010'}}}%%
graph LR
  init["src/i18n/index.ts\ni18next.init()"]
  en["en.json\nEnglish LTR"]
  he["he.json\nHebrew RTL"]
  init --> en
  init --> he

  store["cabinet-store.ts\nlanguage state"]
  store -- "changeLanguage he" --> rtl["document dir=rtl\nTailwind RTL classes"]
  store -- "changeLanguage en" --> ltr["document dir=ltr"]

  comp["React components\nt('key.path')"]
  init --> comp
  en --> comp
  he --> comp

  ci["CI: i18n:coverage\ni18n-coverage.js\nverifies key parity"]
  en --> ci
  he --> ci

  classDef file fill:#3a7a50,stroke:#1e4a30,color:#fff,font-weight:bold
  classDef process fill:#fae7c0,stroke:#c08040,color:#3a1806
  classDef check fill:#2a5a9a,stroke:#1a3a6e,color:#fff
  class en,he file
  class init,store,comp process
  class ci check
```
