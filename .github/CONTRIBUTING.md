<div align="center">
  <img src="../docs/banner.svg" alt="Cabinet Planner" width="100%"/>
</div>

# 🤝 Contributing to Cabinet Planner

[![CI](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/ci.yml/badge.svg)](https://github.com/RajwanYair/WoodworkingShop/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](../tsconfig.json)
[![ESLint](https://img.shields.io/badge/ESLint-0%20warnings-4b32c3?logo=eslint)](../eslint.config.js)
[![Prettier](https://img.shields.io/badge/code%20style-prettier-f7b93e?logo=prettier)](../.prettierrc)

Thank you for your interest in contributing! Every improvement — bug fix, feature, translation, or doc update — is appreciated.

---

## 🧭 Contribution Workflow

```mermaid
flowchart LR
    F([Fork repo]) --> C([Clone locally])
    C --> B([Create branch\nfeat/my-feature])
    B --> D([Develop + test\nnpm run check])
    D --> P([Open Pull Request])
    P --> CI([CI passes\ntypecheck·lint·test·build])
    CI --> R([Review & merge])
```

---

## ⚡ Quick Setup

**Prerequisites:** Node.js ≥ 20, npm 10+, Git

```bash
# 1 — fork on GitHub, then clone your fork
git clone https://github.com/<your-username>/WoodworkingShop.git
cd WoodworkingShop

# 2 — install
npm ci

# 3 — start dev server  →  http://localhost:5173/WoodworkingShop/
npm run dev

# 4 — full gate check (run before every commit)
npm run check   # typecheck + lint + format:check + test
```

---

## 📐 Coding Standards

### TypeScript

| Rule | Detail |
|---|---|
| **Strict mode** | `tsconfig.json` has `strict: true` |
| **No `any`** | Explicit types required everywhere |
| **Type imports** | `import type { Foo }` for type-only references |
| **Unused vars** | Enforced by ESLint — fix, don't suppress |

### Style

- **Prettier** auto-formats on save (`.prettierrc` in repo root). Run `npm run format`.  
- **ESLint** enforces correctness (`npm run lint`). Zero warnings allowed — this is a hard CI gate.

### i18n

All UI strings must exist in **both** `src/i18n/en.json` **and** `src/i18n/he.json`.  
Run `npm run i18n:coverage` to verify parity.

### Engine vs UI

`src/engine/` is **pure TypeScript** — no React imports, no DOM. Keep it that way so it stays testable without jsdom.

---

## 💬 Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|---|---|
| `feat:` | New feature or behaviour |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Restructure without behaviour change |
| `test:` | Add or update tests |
| `ci:` | CI / workflow change |
| `chore:` | Maintenance (deps, config) |

**Example:** `feat(engine): add per-drawer custom heights`

---

## ✅ Pull Request Checklist

Before opening a PR:

- [ ] `npm run check` passes (typecheck + lint + format + tests)
- [ ] `npm run build` produces 0 warnings
- [ ] New logic is covered by unit tests in `tests/`
- [ ] i18n: keys added to **both** `en.json` and `he.json`
- [ ] No hardcoded absolute paths, no `console.log` left in
- [ ] CHANGELOG.md updated if the change is user-visible

---

## 🏛 Architecture Overview

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the full module map, data flow diagram, and design decisions.

```
src/engine/     ← pure TypeScript; no React; all computation
src/components/ ← React UI components
src/store/      ← Zustand state stores
src/i18n/       ← EN + HE translation files
tests/          ← Vitest unit tests (mirrors src/ layout)
```

