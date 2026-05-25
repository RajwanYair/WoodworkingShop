# Cabinet Planner — User Guide

> Version 3.72 · React 19 + TypeScript 6 · Progressive Web App

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Workflow Overview](#workflow-overview)
3. [Configurator Tab](#configurator-tab)
4. [Preview Tab](#preview-tab)
5. [Cut Sheets Tab](#cut-sheets-tab)
6. [Assembly Tab](#assembly-tab)
7. [PDF Export Tab](#pdf-export-tab)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Sharing & URL State](#sharing--url-state)
10. [Dark Mode & Accessibility](#dark-mode--accessibility)
11. [Tips & Tricks](#tips--tricks)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

Open the app at <https://rajwanyair.github.io/WoodworkingShop/>.

No account or installation required. All data is stored locally in your browser
(`localStorage`). The app works offline once cached by the service worker.

---

## Workflow Overview

```text
Configure → Preview → Cut Sheets → Assembly → PDF Export
```

Each tab builds on the previous. Work left-to-right for a full project:

| Step | Tab        | Output                                         |
| ---- | ---------- | ---------------------------------------------- |
| 1    | Configure  | Cabinet dimensions, materials, doors, drawers  |
| 2    | Preview    | SVG front / side / top / back / 3-D views      |
| 3    | Cut Sheets | Optimized sheet layouts, DXF, G-code, BOM      |
| 4    | Assembly   | Step-by-step illustrated assembly instructions |
| 5    | PDF Export | Print-ready PDF with all plans and cut lists   |

---

## Configurator Tab

### Furniture Types

| Type      | Description                                   |
| --------- | --------------------------------------------- |
| Cabinet   | Standard carcass with doors, drawers, shelves |
| Bookshelf | Open or glass-door shelving unit              |
| Desk      | Low carcass with drawer pedestals             |
| Wardrobe  | Tall cabinet with hanging rail and shelves    |
| Panel     | Single flat panel (for custom parts)          |

### Dimensions

- **Width / Height / Depth** — in millimetres (toggle to inches with the unit button).
- **Toe Kick Height** — set to 0 for wall cabinets or base with no kick.

### Materials

- **Carcass Material** — main structural panels (sides, top, bottom).
- **Back Panel Material** — thinner panel or omit for open-back designs.
- Each material has a known thickness, weight, and grain direction.

### Doors & Handles

| Door Style | Description                 |
| ---------- | --------------------------- |
| Flat       | Simple slab door            |
| Shaker     | Recessed panel insert       |
| Glass      | Glass panel (hardware only) |
| None       | No doors                    |

Door reveal (gap) is configurable per-millimetre.

### Drawers

- Up to 6 drawers. Heights can be equal or custom-per-drawer.
- Slide types: Standard, Soft-Close, Full-Extension.

### Validation

The configurator highlights problems in real time:

| Severity   | Example                                   |
| ---------- | ----------------------------------------- |
| 🔴 Error   | Carcass too narrow for material thickness |
| 🟡 Warning | Door aspect ratio may cause warping       |
| 🔵 Info    | Manufacturing note                        |

---

## Preview Tab

Displays 5 orthographic views plus a simplified 3-D perspective:

- **Front** — face view with doors and handles
- **Side** — left profile showing depth and toe kick
- **Top** — plan view showing depth and back position
- **Back** — back panel (or open-back indicator)
- **3-D** — isometric-style rendered view

### Interactions

| Action            | Effect                          |
| ----------------- | ------------------------------- |
| Pinch / scroll    | Zoom in/out                     |
| Drag              | Pan                             |
| Double-tap        | Reset zoom                      |
| Export SVG button | Download current view as `.svg` |

---

## Cut Sheets Tab

### Optimizer

The MaxRects BSSF algorithm packs all parts onto standard sheets, minimising
waste. The smart optimizer groups parts by material first, then packs per sheet.

### Understanding the Layout

- Each coloured rectangle is a part. Parts with grain direction get a grain indicator.
- Hover over a part to highlight it across all views.
- The yield percentage shows how much of the sheet is used.
- **Colour-blind mode** switches to the Wong 2011 palette (accessible to deuteranopes).

### Exports

| Format  | Command          | Use Case                        |
| ------- | ---------------- | ------------------------------- |
| DXF     | Download DXF     | CAD software, CNC router import |
| G-code  | Download G-code  | Direct CNC machine              |
| BOM CSV | Download BOM     | Parts list for ordering         |
| ERP CSV | Download ERP CSV | Shop-floor / MRP system import  |

### Saw Kerf

Adjust the saw kerf (blade width) in the optimizer toolbar. The default is 3 mm.
Increase for table saws, decrease for fine band saws.

---

## Assembly Tab

Step-by-step illustrated instructions generated from the cabinet configuration.

1. Prepare all panels and apply edge banding.
2. Drill shelf pin holes and hinge mounting points.
3. Assemble the carcass (sides + top/bottom with dado or pocket joints).
4. Fit the back panel into the rebate.
5. Hang doors and adjust Euro hinges.
6. Install drawer slides and fit drawer boxes.
7. Attach handles and toe kick.

Each step includes part names, dimensions, and hardware quantities.

---

## PDF Export Tab

Generates a print-ready PDF including:

- Cover page with project name and date
- Configurator summary
- All preview views
- Cut sheet layouts (colour-coded)
- Parts and hardware tables
- Assembly instructions

**Print** from the PDF viewer, or use the floating print button (`Ctrl+P`).

---

## Keyboard Shortcuts

| Shortcut                  | Action                        |
| ------------------------- | ----------------------------- |
| `Alt+1`                   | Go to Configurator tab        |
| `Alt+2`                   | Go to Preview tab             |
| `Alt+3`                   | Go to Cut Sheets tab          |
| `Alt+4`                   | Go to Assembly tab            |
| `Alt+5`                   | Go to PDF Export tab          |
| `Alt+D`                   | Toggle dark mode              |
| `Ctrl+Z`                  | Undo last change              |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo                          |
| `Ctrl+Shift+S`            | Save named snapshot           |
| `Ctrl+P`                  | Print current view            |
| `?`                       | Open keyboard shortcuts help  |
| `Arrow Left / Right`      | Navigate tab bar when focused |
| `Home / End`              | Jump to first / last tab      |

---

## Sharing & URL State

The URL automatically reflects the current configuration (diff from defaults only).
Share the URL to reproduce the exact design on another machine.

### Compact Sharing

Use the API `compressConfigToBase64(config)` from `src/utils/url-state.ts` to
produce a single `?c=` base64url parameter that is 30–50% shorter for configs
with many non-default fields.

### Project Names

Add `?pn=MyKitchen` to the URL to name the project. The name appears in the
PDF cover page and print headers.

### Templates

Use `?tpl=kitchen-base` (or other template IDs) to pre-load a named template.

---

## Dark Mode & Accessibility

- **Dark mode**: `Alt+D` or the moon icon in the header.
- **High contrast**: available in the sidebar settings.
- **RTL (Hebrew)**: change language to עברית in the header. All layouts use
  logical CSS properties (`ms-*`, `me-*`, `start-*`, `end-*`) for full RTL support.
- **Screen reader**: all interactive elements have `aria-label` or `<label for>`.
  Status regions use `role="status"` and `aria-live="polite"`.
- **Keyboard**: full keyboard navigation with roving tabindex on the tab bar.

---

## Tips & Tricks

- **Undo/redo** works across all configurator changes — use `Ctrl+Z` freely.
- **Snapshots**: `Ctrl+Shift+S` saves a named point-in-time copy. Access
  snapshots from the Snapshots panel in the sidebar.
- **Custom shelf positions**: switch shelf spacing to "Custom" and enter
  heights from the interior bottom edge.
- **Multiple cabinets**: use the "Add Cabinet" button to build a room layout.
  Each cabinet has independent configuration.
- **Combined cut sheets**: enable "Combine all cabinets" in the optimizer
  toolbar to pack all cabinets onto shared sheets for a single order.
- **Sheet size overrides**: click the sheet header in the Cut Sheets tab to
  change the default sheet size for that material.
- **Colour-blind mode**: the toggle is in the Cut Sheets toolbar.

---

## Troubleshooting

| Symptom                         | Cause                   | Fix                                                   |
| ------------------------------- | ----------------------- | ----------------------------------------------------- |
| Preview is blank                | SVG not loaded          | Refresh the page                                      |
| Cut sheets show 0% yield        | No parts generated      | Check configurator for red errors                     |
| PDF is empty                    | Lazy chunk not loaded   | Switch to PDF tab and wait for `Loading…` to complete |
| URL too long to share           | Many non-default fields | Use the compact base64 URL format                     |
| Cabinet data lost after refresh | localStorage cleared    | Use Ctrl+Shift+S to save before closing               |
| App offline shows stale UI      | Service worker cache    | Hard-refresh (`Ctrl+Shift+R`) to bust the cache       |
