# Cabinet Planner — AI Agent Context

> Browser-based woodworking design tool · React 19 + TypeScript 6 + Vite 8
> **v5.34.0** · MIT · Node ≥ 22 · [Live demo](https://rajwanyair.github.io/WoodworkingShop/)

## What It Does

Configure any cabinet/furniture piece → live 6-view SVG preview → MaxRects cut-sheet optimizer → export PDF build plan, DXF, G-code, or BOM. **No server, no account.** Full RTL support (Hebrew/Arabic).

## Current Delivery State

The active phase, release train, sprint contracts, and acceptance criteria are maintained in [ROADMAP.md](ROADMAP.md). Do not copy a sprint snapshot here.

## Tech Stack

React 19 · TypeScript 6 · Vite 8 · Vitest 4 · Playwright 1.61 · i18next 26 · Zustand 5 · Tailwind CSS v4.

## Architecture and Commands

The repository map, canonical scripts, and command descriptions are maintained in [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Project Rules

Detailed coding, testing, accessibility, i18n, and tooling rules live in [.github/copilot-instructions.md](.github/copilot-instructions.md) and the scoped files under [.github/instructions/](.github/instructions/). Follow those sources instead of duplicating rules here.

## Docs

Architecture → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Plugin API → [docs/PLUGIN-API.md](docs/PLUGIN-API.md) · User guide → [docs/USER-GUIDE.md](docs/USER-GUIDE.md) · Sprint history → [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md) · MCP/GitHub setup → [docs/MCP-GITHUB-GOVERNANCE.md](docs/MCP-GITHUB-GOVERNANCE.md).

Prompt, agent, skill, MCP, and scoped-instruction inventories are maintained at their source paths under `.github/` and `.vscode/mcp.json`; avoid maintaining duplicate catalog tables here.
