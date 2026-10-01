---
mode: agent
description: >
  Comprehensive workspace health check — clean generated files, run all quality
  gates, verify $TEMP enforcement, audit dependencies, and confirm production readiness.
---

# Workspace Maintenance

Run a full workspace health check and fix every issue found.

## Steps (run in order — each must pass before the next)

### 1 — Preflight and generated-file audit

Before changing files or running broad cleanup:

- Read applicable workspace and repository instructions.
- Run `git status --short --branch` and preserve all pre-existing user changes.
- Identify project roots from manifests and workflows; do not treat a multi-project workspace as one repository.
- Select quality gates from each repository's scripts and CI configuration. Do not report unconfigured or unavailable checks as passed.

Audit generated files without deleting or moving anything:

```bash
# Inspect common generated paths and their git status before proposing cleanup
git status --short --ignored -- dist coverage playwright-report test-results .lighthouseci .eslintcache
git check-ignore -v dist coverage playwright-report test-results .lighthouseci .eslintcache
```

Compare any findings with repository configuration and `$TEMP` policy. Only remove or relocate an artifact after confirming it is generated, safe to discard, and within the requested scope. Never use broad cleanup commands or make the working tree clean by deleting unrelated changes.

Verify configured temporary locations, for example:

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
npm outdated
```

Report outdated packages and compatibility evidence. Do not update dependencies or lockfiles unless the user requests dependency changes.

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
- [ ] Pre-existing user changes are preserved; any remaining working-tree changes are identified

## Reporting

After completion, summarise:

1. Issues found and fixed
2. Any remaining known issues with mitigation plan
3. Packages updated
4. Current test/coverage numbers

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.
