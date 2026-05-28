---
mode: agent
description: >
  Comprehensive workspace health check — clean generated files, run all quality
  gates, verify $TEMP enforcement, audit dependencies, and confirm production readiness.
---

# Workspace Maintenance

Run a full workspace health check and fix every issue found.

## Steps (run in order — each must pass before the next)

### 1 — Clean generated files

Ensure no intermediate files exist in the workspace root:

```bash
# Remove any stray generated files
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue `
  dist, coverage, playwright-report, test-results, .lighthouseci, .eslintcache
```

Verify that:

- `.eslintcache` → should be in `$TEMP\WoodworkingShop\`
- `.vite_cache` → should be in `$TEMP\WoodworkingShop\.vite_cache\`
- `coverage/` → should be in `$TEMP\WoodworkingShop\coverage\`
- `tsconfig.tsbuildinfo` → should be in `$TEMP\WoodworkingShop\`
- `playwright-report/` → should be in `$TEMP\WoodworkingShop\`

### 2 — Quality gate

```bash
npm run quality
```

Fix every error and warning. Zero suppressions (`eslint-disable`, `@ts-ignore`, `as any`).

### 3 — Full test suite

```bash
npm test
```

All tests must pass. No `.only`, no `.skip`. If failures exist → run the `debug` agent.

### 4 — Dead code audit

```bash
npm run dead:check
```

Remove every orphaned export/file found. If a false positive, add to `knip.entry` in `package.json`.

### 5 — Bundle budget

```bash
npm run build && npm run bundle:check
```

If over budget: profile with `npm run bundle:check` and split large chunks.
Update `config/bundle-budget.json` only with a justification comment.

### 6 — Benchmark gate

```bash
npm run bench:check
```

All benchmarks must be within thresholds in `config/bench-budget.json`.

### 7 — Security audit

```bash
npm audit --audit-level=moderate
```

Zero high/critical vulnerabilities. For moderate: document in `SECURITY.md`.

### 8 — Dependency freshness

```bash
npx npm-check-updates --format group --target minor
```

Review outdated packages. Apply non-breaking minor/patch updates.

### 9 — i18n coverage

```bash
npm run i18n:coverage
```

Must show 100% coverage across all 6 locales (en, he, ar, de, es, fr).

### 10 — Markdown lint

```bash
npm run lint:md
```

Fix all markdown formatting issues.

### 11 — Format check

```bash
npm run format:check
```

If failing, run `npm run format` to auto-fix.

### 12 — Final CI gate

```bash
npm run ci
```

Must pass completely before marking workspace as production-ready.

## Definition of Done

- [ ] `npm run ci` exits 0
- [ ] `npm run dead:check` reports zero issues
- [ ] `npm audit` reports zero high/critical
- [ ] No generated files in workspace root (only in `$TEMP`)
- [ ] `dist/` only created during build (never committed)
- [ ] Working tree is clean

## Reporting

After completion, summarise:

1. Issues found and fixed
2. Any remaining known issues with mitigation plan
3. Packages updated
4. Current test/coverage numbers
