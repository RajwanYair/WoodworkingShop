---
mode: agent
tools:
  - read_file
  - create_file
  - replace_string_in_file
  - run_in_terminal
  - grep_search
  - file_search
---

# Lighthouse CI Setup & Tuning

## Goal

Configure Lighthouse CI automation so GitHub Actions gates on:

- FCP < 1.2 s
- TBT < 200 ms
- LCP < 2.5 s
- CLS < 0.1
- Performance ≥ 90
- Accessibility ≥ 95

## Steps

### 1 — Verify `scripts/lighthouse.js`

Read the file. It should build the app (`npm run build`), serve it locally,
run `lighthouse` on the local URL, parse the JSON report, and `process.exit(1)`
if any threshold is missed.

### 2 — Create / update `.github/workflows/lighthouse.yml`

```yaml
name: Lighthouse CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup-node
      - run: npm run build
      - run: node scripts/lighthouse.js
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### 3 — Tune budget values

Budgets live in `scripts/lighthouse.js` (constants at the top). Update:

```js
const BUDGETS = { fcp: 1200, tbt: 200, lcp: 2500, cls: 0.1, perf: 90, a11y: 95 };
```

### 4 — Add `LHCI_GITHUB_APP_TOKEN` to repo secrets (manual)

Instruct user: Settings → Secrets → `LHCI_GITHUB_APP_TOKEN` (from the
[lighthouse-ci GitHub App](https://github.com/apps/lighthouse-ci)).

### 5 — Run gate

```bash
npm run build && node scripts/lighthouse.js
```

Report pass/fail and any regressions to fix.
