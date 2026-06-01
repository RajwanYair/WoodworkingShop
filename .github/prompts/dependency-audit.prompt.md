---
mode: agent
description: Run full dependency audit — check vulnerabilities, outdated packages, and license compliance.
---

# Dependency Audit

Comprehensive dependency health check for production readiness.

## Steps

### 1 — Security vulnerabilities

```bash
npm audit --audit-level=moderate 2>&1
```

Fix all `high` and `critical` findings. For `moderate` with no fix available,
document the justification in `CHANGELOG.md`.

### 2 — Outdated packages

```bash
npm outdated 2>&1
```

For each outdated package:

- If major bump: check breaking changes, update, test.
- If minor/patch: update directly.
- Run `npm run check` after each batch of updates.

### 3 — License compliance

Verify all production dependencies use MIT, Apache-2.0, ISC, or BSD licenses.

```bash
npx license-checker --production --onlyAllow "MIT;Apache-2.0;ISC;BSD-2-Clause;BSD-3-Clause;0BSD" 2>&1
```

### 4 — Bundle impact

After updates, verify bundle budget still passes:

```bash
npm run build && npm run bundle:check
```

## Rules

- Do not add new dependencies without removing one or proving > 50 KB savings.
- Keep ≤ 8 production dependencies.
- Update `package-lock.json` — never delete it.

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.
