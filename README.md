# WoodworkingShop

[![CI — Generate & Verify PDFs](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/ci.yml/badge.svg)](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/ci.yml)
[![Deploy to Pages](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/pages.yml/badge.svg)](https://rajwanyair.github.io/WoodworkingShop/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Pantry cabinet plans — premium catalog with bilingual EN/HE PDF generation.

## Overview

Three cabinet-depth strategies inside one fixed external envelope, each generating
bilingual (English + Hebrew) PDF plans with full cut lists, elevation drawings,
isometric views, and material-yield cut sheets.

| Plan | Depth | 17 mm Sheets | Layout | Best Use |
|------|-------|-------------|--------|----------|
| **A** | 600 mm | 5 | Per-cabinet (large + small) | Kitchen — premium full-depth |
| **B** | 404 mm | 4 | Per-cabinet (large + small) | Storage room — balanced cost |
| **C** | 368 mm | 3 | Combined double-cabinet | Service zone — minimum sheets |
| **Unified** | All | — | Cross-plan comparison | Decision document |

All plans use **sandwich plywood** throughout (17 mm carcass + 4 mm backer).

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Generate all 12 PDFs
python pantry-cabinet-plans/plan-a/generate_plan_a_pdfs.py
python pantry-cabinet-plans/plan-b/generate_plan_b_pdfs.py
python pantry-cabinet-plans/plan-c/generate_plan_c_pdfs.py
python pantry-cabinet-plans/generate_unified_optimized_plans.py
```

## Project Structure

```
WoodworkingShop/
├── index.html                          # GitHub Pages landing
├── requirements.txt                    # Python dependencies
├── pantry-cabinet-plans/
│   ├── shared/
│   │   └── pdf_utils.py                # Shared rendering / catalog library
│   ├── plan-a/                         # Full-depth 600 mm
│   │   ├── generate_plan_a_pdfs.py
│   │   ├── double-pantry-cabinet-plan-plan-a.md
│   │   ├── large-cabinet/              # SVGs + PDFs
│   │   ├── small-cabinet/              # SVGs + PDFs
│   │   ├── plan-a-cut-plan-17mm.svg
│   │   └── plan-a-cut-plan-4mm.svg
│   ├── plan-b/                         # Balanced 404 mm
│   │   ├── generate_plan_b_pdfs.py
│   │   └── plan-b-optimized-depth.md
│   ├── plan-c/                         # Maximum optimisation 368 mm
│   │   ├── generate_plan_c_pdfs.py
│   │   └── plan-c-maximum-optimisation.md
│   └── generate_unified_optimized_plans.py
└── .github/
    └── workflows/
        ├── ci.yml                      # Multi-Python test matrix
        ├── release.yml                 # Tag → build → GH release
        └── pages.yml                   # Deploy to GitHub Pages
```

## PDF Catalog Features

Each generated PDF includes premium catalog-style pages:

- **Catalog cover** with accent bar, eyebrow tag, hero card, and stat mini-cards
- **Plan badge** identifying the edition variant (A / B / C)
- **Product card** with accent header, spec table, and recommendation blurb
- **Feature callout** with numbered design highlights
- **Edition footer** with catalog date and repo reference
- **Six elevation views** — front closed, front open, side, top, back, 3D isometric
- **Cut sheet layouts** — material yield plates with warm-tone part legend
- **Bilingual rendering** — full Hebrew RTL support via `python-bidi`

## Releases

Tagged releases (`v*`) automatically build all 12 PDFs and attach them to the
GitHub release. Download the latest from the
[Releases page](https://github.com/RajwanYair/WoodworkingShop/releases).

## Requirements

- Python 3.11+
- `reportlab >= 4.0` — PDF generation
- `python-bidi >= 0.6` — Hebrew visual-order text

## License

[MIT](LICENSE)
